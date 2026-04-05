'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { SpinWheel, SpinWheelRef } from '@/components/ui/SpinWheel'
import { PlayingCard } from '@/components/ui/PlayingCard'
import type { Team } from '@/lib/types'

const G = {
  primary: '#FFD700',
  dim: '#a3a3a3',
  border: '#FFD700',
  bg: '#0a0a0f',
  panel: '#111827',
  error: '#8B0000',
  green: '#4ade80',
}

const CARD_META: Record<string, { symbol: string; color: string; description: string; modifier: string }> = {
  'DOBLAR O NADA':    { symbol: 'X2', color: '#f87171', description: 'Si acierta gana el doble, si falla pierde TODO lo apostado.',   modifier: '×2 si acierta / −100% si falla' },
  'RED DE SEGURIDAD': { symbol: '-½', color: '#facc15', description: 'Si falla solo pierde la mitad de lo apostado.',                  modifier: '−50% si falla' },
  'TRANSFERENCIA':    { symbol: '+T', color: '#fb923c', description: 'Si acierta, roba +100T del equipo que más apostó.',              modifier: '+100T extra si acierta' },
  'CARTA OSCURA':     { symbol: '??', color: '#a3a3a3', description: 'Recibes una pista críptica antes de ver la pregunta completa.',  modifier: 'pista anticipada' },
  'FAROL':            { symbol: 'X3', color: '#4ade80', description: 'Si acierta, gana el TRIPLE de lo apostado.',                     modifier: '×3 si acierta' },
}

interface QuestionPayload {
  pregunta: string
  opciones: { A: string; B: string; C: string; D: string }
  respuesta_correcta: 'A' | 'B' | 'C' | 'D'
  indice_correcto: number
  trampa_explicada: string
  pista_criptica: string
  tema: string
  flavor_text: string
}

function normaliseQuestion(q: any): QuestionPayload {
  const ops = q.opciones ?? {}
  return {
    ...q,
    respuesta_correcta: (q.respuesta_correcta ?? 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D',
    opciones: {
      A: ops.A ?? ops.a ?? '',
      B: ops.B ?? ops.b ?? '',
      C: ops.C ?? ops.c ?? '',
      D: ops.D ?? ops.d ?? '',
    },
  }
}

type Phase =
  | 'idle'
  | 'cards'
  | 'answering'
  | 'spinning'
  | 'revealed'

interface LaTraicionProps {
  team: Team
  allTeams: Team[]
}

export function LaTraicion({ team, allTeams }: LaTraicionProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<QuestionPayload | null>(null)

  // Apuesta y carta — se fijan en 'cards', se usan en 'answering'
  const [betAmount, setBetAmount] = useState<number>(50)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [betConfirmed, setBetConfirmed] = useState(false)

  // Respuesta de la ruleta
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [answerConfirmed, setAnswerConfirmed] = useState(false)

  // Cartas
  const [myCards, setMyCards] = useState<string[]>([])
  const [cardsRevealed, setCardsRevealed] = useState(false) // auto-flip tras 1.5s
  const [betTimer, setBetTimer] = useState(0)

  // Ruleta
  const wheelRef = useRef<SpinWheelRef>(null)
  const questionRef = useRef<QuestionPayload | null>(null)

  // Resultado del settle (tokens ganados/perdidos esta ronda)
  const [settleResult, setSettleResult] = useState<{ earned: number } | null>(null)

  // Countdown durante la fase answering
  const [answerTimer, setAnswerTimer] = useState(0)

  // Pista críptica (CARTA OSCURA) — mostrar como banner en lugar de alert
  const [pistaOscura, setPistaOscura] = useState<string | null>(null)

  // Sync ref
  useEffect(() => { questionRef.current = question }, [question])

  // Realtime subscriptions — estables durante todo el nivel
  useEffect(() => {
    const privateChannel = supabase
      .channel(`private-team-${team.id}`)
      .on('broadcast', { event: 'cartas' }, (payload) => {
        if (payload.payload?.cards) {
          setMyCards(payload.payload.cards)
          setCardsRevealed(false) // empieza boca abajo
          setPhase('cards')
          setBetConfirmed(false)
          setBetTimer(30)
          // Auto-flip todas las cartas después de 1.5s
          setTimeout(() => setCardsRevealed(true), 1500)
        }
      })
      .on('broadcast', { event: 'pista_oscura' }, (payload) => {
        const pista = payload.payload?.pista
        if (pista) {
          setPistaOscura(pista)
          // Auto-dismiss después de 12s
          setTimeout(() => setPistaOscura(null), 12000)
        }
      })
      .subscribe()

    const globalChannel = supabase
      .channel('nivel3_global')
      .on('broadcast', { event: 'nivel3_ronda' }, (payload) => {
        const q = normaliseQuestion(payload.payload.question)
        setQuestion(q)
        setSelectedOption(null)
        setAnswerConfirmed(false)
        setSettleResult(null)
        setPhase('answering')
        setAnswerTimer(30)
        setBetConfirmed(true) // auto-confirma si no lo hicieron antes
      })
      .on('broadcast', { event: 'settle_results' }, (payload) => {
        const myResult = (payload.payload?.results ?? []).find(
          (r: { team_id: string; earned: number }) => r.team_id === team.id
        )
        if (myResult) setSettleResult({ earned: myResult.earned })
      })
      .on('broadcast', { event: 'spin_wheel' }, () => {
        setPhase('spinning')
        if (wheelRef.current && questionRef.current) {
          wheelRef.current.spinTo(questionRef.current.indice_correcto)
        }
      })
      .on('broadcast', { event: 'revealed' }, () => {
        setTimeout(() => setPhase('revealed'), 1000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(privateChannel)
      supabase.removeChannel(globalChannel)
    }
  }, [team.id])

  // Countdown timer durante fase 'cards'
  useEffect(() => {
    if (phase !== 'cards' || betTimer <= 0) return
    const id = setInterval(() => setBetTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, betTimer])

  // Countdown timer durante fase 'answering'
  useEffect(() => {
    if (phase !== 'answering' || answerTimer <= 0) return
    const id = setInterval(() => setAnswerTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, answerTimer])

  const MIN_BET = 50
  const maxBet = Math.max(MIN_BET, Math.floor(team.token_balance * 0.4))
  const canBet = team.token_balance >= MIN_BET

  const confirmBet = async () => {
    setBetConfirmed(true)
    await supabase.channel('nivel3_host').send({
      type: 'broadcast',
      event: 'bet_confirmed',
      payload: { team_id: team.id, bet: betAmount, card: selectedCard },
    })
  }

  const confirmAnswer = async () => {
    if (!selectedOption) return
    setAnswerConfirmed(true)
    await supabase.channel('nivel3_host').send({
      type: 'broadcast',
      event: 'team_voted',
      payload: { team_id: team.id, option: selectedOption, bet: betAmount, card: selectedCard },
    })
  }

  const handleWheelStop = () => {
    // Fallback local si el broadcast 'revealed' llega tarde
    setTimeout(() => setPhase((p) => (p === 'spinning' ? 'revealed' : p)), 1500)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="w-full flex flex-col items-center px-4 py-4 overflow-y-auto"
      style={{ background: G.bg, height: 'calc(100vh - 56px)', fontFamily: "'Exo 2', sans-serif", color: '#F5F5F5' }}
    >
      <div className="w-full flex flex-col items-center">


      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: G.primary, borderTopColor: 'transparent' }}
          />
          <h2
            style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.5rem' }}
          >
            EL CROUPIER ESTÁ BARAJEANDO...
          </h2>
          <p style={{ color: G.dim }}>Esperando que el host inicie la ronda</p>
        </div>
      )}

      {/* ── CARDS — equipos fijan apuesta ANTES de ver la pregunta ── */}
      {phase === 'cards' && (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <div className="text-center">
            <h2
              style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.3rem' }}
            >
              CASINO DE LA TRAICIÓN
            </h2>
            <p style={{ color: G.dim, fontSize: '0.85rem', marginTop: 4 }}>
              Fija tu apuesta y carta <strong style={{ color: '#fff' }}>antes</strong> de ver la
              pregunta
            </p>
          </div>

          {/* Timer */}
          {betTimer > 0 && (
            <div className="flex items-center justify-center gap-3">
              <span style={{ color: betTimer <= 10 ? G.error : G.dim, fontFamily: 'monospace', fontSize: '1.2rem' }}>
                {betTimer}s para apostar
              </span>
            </div>
          )}

          {/* Bet slider */}
          <div
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: G.panel, border: `1px solid ${G.border}40` }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                APUESTA
              </span>
              <span style={{ color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem' }}>
                {betAmount} T
              </span>
            </div>
            {canBet ? (
              <>
                <input
                  type="range"
                  min={MIN_BET}
                  max={maxBet}
                  step={50}
                  value={betAmount}
                  onChange={(e) => !betConfirmed && setBetAmount(Number(e.target.value))}
                  disabled={betConfirmed}
                  className="accent-[#FFD700] w-full"
                />
                <div className="flex justify-between text-xs" style={{ color: G.dim }}>
                  <span>{MIN_BET} T (mín)</span>
                  <span>{maxBet} T (máx — 40% de tu saldo)</span>
                </div>
              </>
            ) : (
              <p style={{ color: G.error, fontSize: '0.85rem', textAlign: 'center' }}>
                Saldo insuficiente para apostar (mínimo {MIN_BET} T)
              </p>
            )}
          </div>

          {/* Cartas */}
          <div className="flex flex-col gap-2">
            <span
              style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}
            >
              ELIGE UNA CARTA (opcional)
            </span>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: `${G.border}40 transparent` }}
            >
              {myCards.length === 0 && (
                <span style={{ color: G.dim, fontStyle: 'italic', fontSize: '0.9rem' }}>
                  No tienes cartas en esta ronda
                </span>
              )}
              {myCards.map((c, i) => {
                const meta = CARD_META[c] ?? { symbol: '?', description: 'Carta especial.' }
                return (
                  <PlayingCard
                    key={i}
                    name={c}
                    emoji={meta.symbol}
                    description={meta.description}
                    revealed={cardsRevealed}
                    flipDelay={i * 120}
                    selected={selectedCard === c}
                    onClick={() => {
                      if (!betConfirmed) setSelectedCard(c === selectedCard ? null : c)
                    }}
                    disabled={betConfirmed}
                    width={95}
                    height={136}
                  />
                )
              })}
            </div>
          </div>

          {/* Confirm */}
          {!betConfirmed ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={confirmBet}
              disabled={!canBet}
              style={{
                background: G.primary,
                color: '#000',
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 0 20px ${G.primary}60`,
              }}
            >
              CONFIRMAR APUESTA — {betAmount} T{selectedCard ? ` + ${selectedCard}` : ''}
            </motion.button>
          ) : (
            <div
              className="text-center py-4 rounded-xl flex flex-col gap-1"
              style={{ background: `${G.green}20`, border: `1px solid ${G.green}`, color: G.green }}
            >
              Apuesta bloqueada: <strong>{betAmount} T</strong>
              {selectedCard && (
                <span>
                  {' '}
                  · Carta: <strong>{selectedCard}</strong>
                </span>
              )}
              {selectedCard && CARD_META[selectedCard] && (
                <span style={{ fontSize: '0.8rem', color: G.primary, display: 'block' }}>
                  {CARD_META[selectedCard].modifier}
                </span>
              )}
              <span style={{ fontSize: '0.8rem', color: G.dim, marginTop: 2, display: 'block' }}>
                Esperando la pregunta del Croupier...
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── ANSWERING — pregunta + ruleta ── */}
      {(phase === 'answering' || phase === 'spinning' || phase === 'revealed') && question && (
        <div className="w-full max-w-5xl flex flex-col items-center gap-4">

          {/* Pista críptica — inline, solo visible si existe */}
          <AnimatePresence>
            {pistaOscura && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden"
              >
                <div
                  className="w-full rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{
                    background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)',
                    border: '1px solid #333',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="flex-1 flex flex-col gap-0.5">
                    <span style={{ fontFamily: "'Orbitron', sans-serif", color: '#666', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
                      CARTA OSCURA · PISTA CRÍPTICA
                    </span>
                    <p style={{ color: '#d4d4d4', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                      «{pistaOscura}»
                    </p>
                  </div>
                  <button
                    onClick={() => setPistaOscura(null)}
                    style={{ color: '#555', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, paddingTop: 2 }}
                  >
                    X
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pregunta */}
          <div
            className="w-full p-5 text-center text-lg font-bold rounded-xl"
            style={{
              background: G.panel,
              border: `2px solid ${G.border}`,
              boxShadow: `0 0 20px ${G.border}30`,
            }}
          >
            {question.pregunta}
          </div>

          <div className="flex flex-col md:flex-row w-full gap-8 items-start justify-center">
            {/* Ruleta */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <SpinWheel
                ref={wheelRef}
                options={[
                  question.opciones.A,
                  question.opciones.B,
                  question.opciones.C,
                  question.opciones.D,
                ]}
                onStop={handleWheelStop}
                size={280}
              />
            </div>

            {/* Panel de control */}
            <div className="flex-1 flex flex-col gap-4 min-w-[260px]">
              {/* Resumen de apuesta */}
              <div
                className="rounded-xl px-4 py-3 flex justify-between items-center"
                style={{ background: G.panel, border: `1px solid ${G.border}40` }}
              >
                <span style={{ color: G.dim, fontSize: '0.85rem' }}>Tu apuesta:</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>
                    {betAmount} T{selectedCard ? ` · ${selectedCard}` : ''}
                  </span>
                  {selectedCard && CARD_META[selectedCard] && (
                    <span style={{ fontSize: '0.72rem', color: CARD_META[selectedCard].color, opacity: 0.85 }}>
                      {CARD_META[selectedCard].modifier}
                    </span>
                  )}
                </div>
              </div>

              {phase === 'answering' && (
                <>
                  {/* Countdown */}
                  {answerTimer > 0 && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: G.dim, fontSize: '0.8rem' }}>Tiempo:</span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          color: answerTimer <= 10 ? G.error : G.primary,
                        }}
                      >
                        {answerTimer}s
                      </span>
                    </div>
                  )}
                  <p style={{ color: G.dim, fontSize: '0.85rem' }}>
                    Elige tu respuesta en la ruleta:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => !answerConfirmed && setSelectedOption(opt)}
                        style={{
                          background: selectedOption === opt ? `${G.primary}30` : G.panel,
                          border: `2px solid ${selectedOption === opt ? G.primary : '#333'}`,
                          color: '#fff',
                          padding: '10px 12px',
                          borderRadius: 8,
                          textAlign: 'left',
                          cursor: answerConfirmed ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ color: G.primary, fontWeight: 700 }}>{opt}: </span>
                        {question.opciones[opt]}
                      </button>
                    ))}
                  </div>

                  {!answerConfirmed ? (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={confirmAnswer}
                      disabled={!selectedOption}
                      style={{
                        background: selectedOption ? G.primary : '#333',
                        color: selectedOption ? '#000' : G.dim,
                        fontFamily: "'Orbitron', sans-serif",
                        fontWeight: 700,
                        padding: '12px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: selectedOption ? 'pointer' : 'not-allowed',
                        boxShadow: selectedOption ? `0 0 15px ${G.primary}50` : 'none',
                      }}
                    >
                      CONFIRMAR RESPUESTA
                    </motion.button>
                  ) : (
                    <div
                      className="text-center py-3 rounded-xl"
                      style={{
                        background: `${G.green}20`,
                        border: `1px solid ${G.green}`,
                        color: G.green,
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      VOTO BLOQUEADO: {selectedOption}
                    </div>
                  )}
                </>
              )}

              {phase === 'spinning' && (
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-center py-6"
                  style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.3rem' }}
                >
                  LA RULETA GIRA...
                </motion.div>
              )}

              {phase === 'revealed' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div
                    className="rounded-xl p-5 text-center"
                    style={{ background: '#1a0a2e', border: `2px solid ${G.error}`, boxShadow: `0 0 20px ${G.error}30` }}
                  >
                    <p style={{ color: '#fca5a5', fontStyle: 'italic', marginBottom: 8 }}>
                      «{question.flavor_text}»
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#ccc' }}>{question.trampa_explicada}</p>
                  </div>
                  <div
                    className="text-center text-2xl font-bold"
                    style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif" }}
                  >
                    Respuesta correcta: {question.respuesta_correcta}
                  </div>
                  {selectedOption && (
                    <div
                      className="text-center"
                      style={{
                        color: selectedOption === question.respuesta_correcta ? G.green : G.error,
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      {selectedOption === question.respuesta_correcta ? 'ACERTASTE' : 'FALLASTE'}
                    </div>
                  )}

                  {/* Resultado de tokens tras settle */}
                  {settleResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl p-4 text-center flex flex-col gap-1"
                      style={{
                        background: settleResult.earned >= 0 ? `${G.green}15` : `${G.error}15`,
                        border: `2px solid ${settleResult.earned >= 0 ? G.green : G.error}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '2rem',
                          fontFamily: "'Orbitron', sans-serif",
                          fontWeight: 700,
                          color: settleResult.earned >= 0 ? G.green : '#f87171',
                        }}
                      >
                        {settleResult.earned >= 0 ? '+' : ''}{settleResult.earned} T
                      </span>
                      {selectedCard && CARD_META[selectedCard] && (
                        <span style={{ fontSize: '0.8rem', color: G.dim }}>
                          {selectedCard} — {CARD_META[selectedCard].modifier}
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}


      </div>{/* fin zona scrollable */}
    </div>
  )
}
