'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { SpinWheel, SpinWheelRef } from '@/components/ui/SpinWheel'
import { PlayingCard } from '@/components/ui/PlayingCard'
import { Timer } from '@/components/ui/Timer'
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
  | 'intro'
  | 'cards'
  | 'answering'
  | 'spinning'
  | 'revealed'
  | 'scoreboard'

// ─── Intro (Lore) ──────────────────────────────
interface IntroProps {
  startedAt: number
  duration: number
  onDone: () => void
}

function IntroScreen({ startedAt, duration, onDone }: IntroProps) {
  const [cd, setCd] = useState(duration)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(duration - elapsed))
      setCd(left)
      if (left <= 0) onDoneRef.current()
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [startedAt, duration])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex overflow-y-auto p-4 md:p-8"
      style={{ background: '#020617', fontFamily: "'Exo 2', sans-serif" }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)',
      }} />
      
      <div className="relative z-10 m-auto flex flex-col items-center gap-6 w-full max-w-4xl py-4">
        
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: G.dim, fontSize: '0.72rem', letterSpacing: '0.2em' }}>
            TOKEN_WARS / NIVEL_3 / EL_CASINO_DE_LA_TRAICIÓN
          </span>
          <motion.span
            key={cd}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: cd <= 3 ? G.error : G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem' }}
          >
            [{cd.toString().padStart(2, '0')}]
          </motion.span>
        </div>

        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.8rem', textAlign: 'center', textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
          EL CASINO DE LA TRAICIÓN
        </h2>

        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="md:w-[55%] flex flex-col gap-4" style={{ background: '#1e293b', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: '20px' }}>
            <p style={{ color: G.primary, fontSize: '0.68rem', letterSpacing: '0.2em' }}>{'>'} LA ÚLTIMA APUESTA</p>
            <div className="w-full rounded-md overflow-hidden" style={{ border: `1px solid rgba(255,255,255,0.1)` }}>
              <img src="/images/casino.png" alt="David en el Casino" style={{ width: '100%', height: 'auto', display: 'block', filter: 'grayscale(0.5) contrast(1.1)' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.65 }}>
              Inspirado (u obsesionado) por los premios de <em>"¿Quién quiere ser Millonario?"</em>, David decidió que la teoría no era suficiente. Convencido de que su conocimiento del azar es superior, terminó en los rincones oscuros del <strong>Casino de la Traición</strong>. Aquí, los tokens no solo se ganan con respuestas; se arriesgan en la ruleta y se defienden con honor... o con una puñalada por la espalda.
            </p>
          </div>

          <div className="md:w-[45%] flex flex-col gap-4">
            <div className="flex items-center justify-center py-2">
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <motion.circle cx="40" cy="40" r="32" fill="none" strokeWidth="4" strokeLinecap="round"
                    stroke={G.primary} strokeDasharray={2 * Math.PI * 32}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 32 }}
                    transition={{ duration: duration, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem' }}>{cd}</span>
                </div>
              </div>
            </div>
            {[
              { title: 'OBJETIVO', body: 'Usa tus tokens para apostar en la ruleta del Croupier. Cada acierto técnico multiplica tu apuesta, pero un fallo en estos rincones clandestinos puede ser devastador.' },
              { title: 'CARTAS DE PODER', body: 'Al inicio de cada ronda recibirás cartas únicas. Úsalas sabiamente para doblar tus ganancias, protegerte de la bancarrota o espiar las jugadas de tus rivales.' },
            ].map(({ title, body }) => (
              <div key={title} style={{ background: '#1e293b', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: '16px 20px' }}>
                <p style={{ color: G.primary, fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: 6 }}>{'>'} {title}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Lluvia de monedas ─────────────────────────
function CoinRain() {
  const coins = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: 3 + Math.random() * 94,
    delay: Math.random() * 1.2,
    duration: 0.8 + Math.random() * 0.7,
    size: 1.1 + Math.random() * 0.7,
    rotate: Math.random() * 360,
  })), [])
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          initial={{ y: -50, opacity: 1, rotate: c.rotate }}
          animate={{ y: '110vh', opacity: [1, 1, 0.6, 0], rotate: c.rotate + 180 }}
          transition={{ duration: c.duration, delay: c.delay, ease: [0.3, 0, 0.9, 1] }}
          style={{ position: 'absolute', top: 0, left: `${c.x}%`, fontSize: `${c.size}rem`, userSelect: 'none', color: '#FFD700', fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold' }}
        >
          T
        </motion.div>
      ))}
    </div>
  )
}

const LA_TRAICION_INTRO_SECONDS = 15;

interface LaTraicionProps {
  team: Team
  allTeams: Team[]
}

export function LaTraicion({ team, allTeams }: LaTraicionProps) {
  // Intro arranca inmediatamente al montar (no depende de broadcast que puede perderse)
  const [introStartedAt, setIntroStartedAt] = useState<number>(() => Date.now())
  const [phase, setPhase] = useState<Phase>('intro')
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
  // Timestamps de inicio de fase (sincronizan el timer con el host, igual que L1/L2)
  const [betStartedAt, setBetStartedAt] = useState<number | null>(null)
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null)

  // Ruleta
  const wheelRef = useRef<SpinWheelRef>(null)
  const questionRef = useRef<QuestionPayload | null>(null)

  // Resultado del settle (tokens ganados/perdidos esta ronda)
  const [settleResult, setSettleResult] = useState<{ earned: number } | null>(null)

  // Pista críptica (CARTA OSCURA) — mostrar como banner en lugar de alert
  const [pistaOscura, setPistaOscura] = useState<string | null>(null)
  // Contador animado para ganancias + lluvia de monedas
  const [displayedEarned, setDisplayedEarned] = useState(0)
  const [showCoinRain, setShowCoinRain] = useState(false)

  // Sync ref
  useEffect(() => { questionRef.current = question }, [question])

  // Contador animado de tokens ganados/perdidos (easing cuadrático)
  useEffect(() => {
    if (!settleResult) { setDisplayedEarned(0); setShowCoinRain(false); return }
    const target = settleResult.earned
    setShowCoinRain(target > 0)
    const duration = 900
    const start = Date.now()
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration)
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      setDisplayedEarned(Math.round(target * ease))
      if (p >= 1) { setDisplayedEarned(target); clearInterval(id) }
    }, 30)
    return () => clearInterval(id)
  }, [settleResult])

  // Realtime subscriptions — estables durante todo el nivel
  useEffect(() => {
    const privateChannel = supabase
      .channel(`private-team-${team.id}`)
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
      .on('broadcast', { event: 'cartas_all' }, (payload) => {
        const myCards: string[] | undefined = payload.payload?.cards_by_team?.[team.id]
        if (myCards && myCards.length > 0) {
          setMyCards(myCards)
          setCardsRevealed(false)
          setPhase('cards')
          setBetConfirmed(false)
          setBetStartedAt(payload.payload.started_at ?? Date.now())
          setTimeout(() => setCardsRevealed(true), 1500)
        }
      })
      .on('broadcast', { event: 'nivel3_ronda' }, (payload) => {
        const q = normaliseQuestion(payload.payload.question)
        setQuestion(q)
        setSelectedOption(null)
        setAnswerConfirmed(false)
        setSettleResult(null)
        setPhase('answering')
        setBetConfirmed(true) // auto-confirma si no lo hicieron antes
        // Timestamp del host → todos los equipos tienen el mismo reloj de cuenta regresiva
        setAnswerStartedAt(payload.payload.started_at ?? Date.now())
      })
      .on('broadcast', { event: 'settle_results' }, (payload) => {
        const myResult = (payload.payload?.results ?? []).find(
          (r: { team_id: string; earned: number }) => r.team_id === team.id
        )
        if (myResult) {
          setSettleResult({ earned: myResult.earned })
          // Tras ver el resultado animado (4s), ir al scoreboard
          setTimeout(() => setPhase((p) => (p === 'revealed' ? 'scoreboard' : p)), 4000)
        }
      })
      .on('broadcast', { event: 'spin_wheel' }, () => {
        setPhase('spinning')
        if (wheelRef.current && questionRef.current) {
          wheelRef.current.spinTo(questionRef.current.indice_correcto)
        }
      })
      .on('broadcast', { event: 'revealed' }, () => {
        setTimeout(() => setPhase((p) => (p === 'spinning' ? 'revealed' : p)), 1000)
        // Fallback: si settle_results no llega, igual transicionamos al scoreboard
        setTimeout(() => setPhase((p) => (p === 'revealed' ? 'scoreboard' : p)), 8000)
      })
      .on('broadcast', { event: 'nivel3_reset' }, () => {
        // El host saltó a level3 mientras ya estábamos en level3 (DEV mode).
        // LaTraicion no se desmonta (Realtime no dispara si status no cambia),
        // así que reseteamos el estado manualmente y volvemos a mostrar la intro.
        setIntroStartedAt(Date.now())
        setPhase('intro')
        setQuestion(null)
        setBetConfirmed(false)
        setAnswerConfirmed(false)
        setSelectedOption(null)
        setSettleResult(null)
        setMyCards([])
        setPistaOscura(null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(privateChannel)
      supabase.removeChannel(globalChannel)
    }
  }, [team.id])

  // Ref para leer la phase actual sin incluirla como dep del efecto de vitrina
  const phaseRef = useRef<Phase>('idle')
  useEffect(() => { phaseRef.current = phase }, [phase])

  const MIN_BET = 50
  const maxBet = Math.max(MIN_BET, Math.floor(team.token_balance * 0.4))
  const canBet = team.token_balance >= MIN_BET

  // Refs para que handleBetExpire no capture valores obsoletos
  const betAmountRef = useRef(betAmount)
  const selectedCardRef = useRef(selectedCard)
  const betConfirmedRef = useRef(betConfirmed)
  const canBetRef = useRef(canBet)
  useEffect(() => { betAmountRef.current = betAmount }, [betAmount])
  useEffect(() => { selectedCardRef.current = selectedCard }, [selectedCard])
  useEffect(() => { betConfirmedRef.current = betConfirmed }, [betConfirmed])
  useEffect(() => { canBetRef.current = canBet }, [canBet])

  const confirmBet = async () => {
    setBetConfirmed(true)
    await supabase.channel('nivel3_host').send({
      type: 'broadcast',
      event: 'bet_confirmed',
      payload: { team_id: team.id, bet: betAmount, card: selectedCard },
    })
  }

  // Auto-confirmar apuesta cuando el timer expira (para no bloquear al host)
  const handleBetExpire = useCallback(() => {
    if (!betConfirmedRef.current && canBetRef.current) {
      setBetConfirmed(true)
      supabase.channel('nivel3_host').send({
        type: 'broadcast',
        event: 'bet_confirmed',
        payload: { team_id: team.id, bet: betAmountRef.current, card: selectedCardRef.current },
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

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
      style={{ background: G.bg, height: 'calc(100vh - 56px)', fontFamily: "'Exo 2', sans-serif", color: '#F5F5F5', position: 'relative' }}
    >
      {/* Viñeta de atmósfera casino */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(0,0,0,0.82) 100%)' }} />

      {/* Lluvia de monedas al ganar */}
      <AnimatePresence>{showCoinRain && <CoinRain key="coinrain" />}</AnimatePresence>

      <AnimatePresence>
        {phase === 'intro' && (
          <IntroScreen
            key={introStartedAt}
            startedAt={introStartedAt}
            duration={LA_TRAICION_INTRO_SECONDS}
            onDone={() => setPhase('idle')}
          />
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col items-center">

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <div
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: G.primary, borderTopColor: 'transparent', boxShadow: `0 0 18px ${G.primary}80, 0 0 40px ${G.primary}30` }}
            />
          </div>
          <motion.h2
            animate={{ textShadow: [`0 0 8px ${G.primary}80`, `0 0 24px ${G.primary}`, `0 0 8px ${G.primary}80`] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.5rem' }}
          >
            EL CROUPIER ESTÁ BARAJEANDO...
          </motion.h2>
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

          {/* Timer — sincronizado con el host (mismo timestamp) */}
          {betStartedAt && !betConfirmed && (
            <div className="flex items-center justify-center gap-3">
              <Timer
                seconds={30}
                startedAt={betStartedAt}
                onExpire={handleBetExpire}
              />
              <span style={{ color: G.dim, fontFamily: 'monospace', fontSize: '1rem' }}>
                para apostar
              </span>
            </div>
          )}

          {/* Bet panel — fichas de casino + slider */}
          <div
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: `radial-gradient(ellipse at 30% 20%, #1a2234, ${G.panel})`, border: `1px solid ${G.border}50`, boxShadow: `inset 0 0 30px rgba(0,0,0,0.4)` }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.12em' }}>
                APUESTA
              </span>
              <motion.span
                key={betAmount}
                initial={{ scale: 1.2, color: '#fff' }}
                animate={{ scale: 1, color: G.primary }}
                style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.6rem', fontWeight: 700, textShadow: `0 0 12px ${G.primary}60` }}
              >
                {betAmount} T
              </motion.span>
            </div>
            {canBet ? (
              <>
                {/* Fichas de casino */}
                <div className="flex gap-3 flex-wrap justify-center">
                  {Array.from(new Set([50, 100, 200, 500].filter(v => v < maxBet))).concat([maxBet]).map((chip) => {
                    const active = betAmount === chip
                    return (
                      <motion.button
                        key={chip}
                        whileTap={{ scale: 0.88 }}
                        whileHover={!betConfirmed ? { scale: 1.08 } : {}}
                        onClick={() => !betConfirmed && setBetAmount(chip)}
                        disabled={betConfirmed}
                        style={{
                          width: 56, height: 56, borderRadius: '50%',
                          background: active ? G.primary : '#12102a',
                          border: `3px dashed ${active ? G.primary : 'rgba(255,215,0,0.35)'}`,
                          color: active ? '#000' : G.primary,
                          fontFamily: "'Orbitron', sans-serif",
                          fontSize: chip === maxBet ? '0.55rem' : '0.62rem',
                          fontWeight: 700,
                          cursor: betConfirmed ? 'default' : 'pointer',
                          boxShadow: active ? `0 0 14px ${G.primary}90, 0 0 30px ${G.primary}40` : '0 2px 8px rgba(0,0,0,0.5)',
                          transition: 'background 0.15s, box-shadow 0.15s',
                          flexShrink: 0,
                        }}
                      >
                        {chip === maxBet ? 'MAX' : `${chip}T`}
                      </motion.button>
                    )
                  })}
                </div>
                {/* Slider fino como fallback */}
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
                  <span>{maxBet} T (máx 40%)</span>
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
              whileTap={{ scale: 0.95 }}
              whileHover={{ boxShadow: `0 0 12px ${G.primary}, 0 0 30px ${G.primary}90, 0 0 60px ${G.primary}40` }}
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
                boxShadow: `0 0 8px ${G.primary}80, 0 0 20px ${G.primary}40`,
                letterSpacing: '0.05em',
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
            {/* Ruleta con marco dorado */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div style={{
                borderRadius: '50%',
                padding: 3,
                background: 'conic-gradient(#FFD700 0deg, #b8860b 90deg, #FFD700 180deg, #8B6914 270deg, #FFD700 360deg)',
                boxShadow: '0 0 28px rgba(255,215,0,0.55), 0 0 60px rgba(255,215,0,0.18), inset 0 0 12px rgba(0,0,0,0.4)',
              }}>
                <div style={{ borderRadius: '50%', overflow: 'hidden', display: 'block', lineHeight: 0 }}>
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
              </div>
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
                  {/* Countdown — sincronizado con el host */}
                  {answerStartedAt && !answerConfirmed && (
                    <div className="flex items-center gap-3">
                      <Timer seconds={30} startedAt={answerStartedAt} />
                      <span style={{ color: G.dim, fontSize: '0.85rem' }}>para responder</span>
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
                      animate={settleResult.earned < -100
                        ? { opacity: 1, scale: 1, x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0] }
                        : { opacity: 1, scale: 1 }
                      }
                      transition={{ duration: settleResult.earned < -100 ? 0.55 : 0.3 }}
                      className="rounded-xl p-4 text-center flex flex-col gap-1"
                      style={{
                        background: settleResult.earned >= 0
                          ? `radial-gradient(ellipse at 50% 0%, ${G.green}30, ${G.green}08)`
                          : `radial-gradient(ellipse at 50% 0%, ${G.error}30, ${G.error}08)`,
                        border: `2px solid ${settleResult.earned >= 0 ? G.green : G.error}`,
                        boxShadow: settleResult.earned >= 0
                          ? `0 0 20px ${G.green}40`
                          : `0 0 20px ${G.error}40`,
                      }}
                    >
                      <motion.span
                        key={displayedEarned}
                        style={{
                          fontSize: '2.2rem',
                          fontFamily: "'Orbitron', sans-serif",
                          fontWeight: 700,
                          color: settleResult.earned >= 0 ? G.green : '#f87171',
                          textShadow: settleResult.earned >= 0
                            ? `0 0 12px ${G.green}80`
                            : `0 0 12px ${G.error}80`,
                          display: 'block',
                        }}
                      >
                        {displayedEarned >= 0 ? '+' : ''}{displayedEarned} T
                      </motion.span>
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


      {/* ── SCOREBOARD — clasificación al finalizar cada ronda ── */}
      {phase === 'scoreboard' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg flex flex-col gap-4 py-4"
        >
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.1rem', letterSpacing: '0.15em', textAlign: 'center' }}>
            CLASIFICACIÓN
          </h2>
          {[...allTeams]
            .sort((a, b) => b.token_balance - a.token_balance)
            .map((t, i) => {
              const isMe = t.id === team.id
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4 rounded-xl px-4 py-3"
                  style={{
                    background: isMe ? `${G.primary}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isMe ? G.primary : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : G.dim, width: 28, textAlign: 'center' }}>
                    {`#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, color: isMe ? G.primary : '#fff', fontWeight: isMe ? 700 : 400 }}>
                    {t.name}
                    {isMe && <span style={{ fontSize: '0.7rem', color: G.dim, marginLeft: 8 }}>◀ TU</span>}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontWeight: 700 }}>
                    {t.token_balance} T
                  </span>
                </motion.div>
              )
            })}
        </motion.div>
      )}

      </div>
    </div>
  )
}
