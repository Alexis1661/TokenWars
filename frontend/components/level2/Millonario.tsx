'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Level2Question, AnswerOption, JokerType, Team } from '@/lib/types'

const G = {
  primary: '#facc15',
  dim:     '#a3a3a3',
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',
  panel:   '#111827',
  error:   '#f87171',
  green:   '#4ade80',
}

const JOKERS: { type: JokerType; label: string; cost: number }[] = [
  { type: 'fifty_fifty',  label: '50 / 50',        cost: 80  },
  { type: 'call_teacher', label: 'Llamar al Profe', cost: 120 },
  { type: 'spy',          label: 'Espía',           cost: 150 },
]

const OPTIONS: AnswerOption[] = ['a', 'b', 'c', 'd']

function optionText(q: Level2Question, opt: AnswerOption): string {
  return { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[opt]
}

// ─── Intro (solo pregunta 1) ──────────────────────────────
function IntroScreen({ questionNumber, onDone }: { questionNumber: number; onDone: () => void }) {
  const [cd, setCd] = useState(6)
  useEffect(() => {
    if (cd <= 0) { onDone(); return }
    const id = setTimeout(() => setCd(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [cd, onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 p-8"
      style={{ background: 'rgba(3,7,18,0.98)', fontFamily: 'monospace' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
      }} />
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-lg">
        <span style={{ color: G.dim, fontSize: '0.7rem', letterSpacing: '0.3em' }}>
          TOKEN_WARS / NIVEL_2 / PREGUNTA_{questionNumber}_DE_3
        </span>

        <div className="relative" style={{ width: 72, height: 72 }}>
          <svg className="-rotate-90" width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <motion.circle cx="36" cy="36" r="28" fill="none" strokeWidth="4" strokeLinecap="round"
              stroke={G.primary} strokeDasharray={2 * Math.PI * 28}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 28 }}
              transition={{ duration: 6, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem' }}>{cd}</span>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.6rem', textAlign: 'center' }}>
          ¿QUIÉN QUIERE SER<br/>MILLONARIO?
        </h2>

        <div className="grid grid-cols-2 gap-3 w-full">
          {[
            { title: 'OBJETIVO', body: 'Responde la pregunta de opción múltiple. Acertar otorga tokens según la dificultad.' },
            { title: 'COMODINES', body: 'Usa tokens para comprar ventajas: 50/50, llamar al profe o espiar a un rival.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 8, padding: '14px 16px' }}>
              <p style={{ color: G.primary, fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: 6 }}>{'>'} {title}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>
          INICIANDO EN {cd} SEGUNDOS_
          <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>|</motion.span>
        </p>
      </div>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────
interface MillonarioProps {
  question: Level2Question
  team: Team
  allTeams: Team[]
  revealed: boolean
  correctAnswers: Record<string, AnswerOption | null>
}

export function Millonario({ question, team, allTeams, revealed, correctAnswers }: MillonarioProps) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'locked'>('intro')
  const [selected, setSelected] = useState<AnswerOption | null>(null)
  const [jokerUsed, setJokerUsed] = useState<JokerType | null>(null)
  const [tokensSpent, setTokensSpent] = useState(0)
  const [eliminatedOptions, setEliminatedOptions] = useState<AnswerOption[]>([])
  const [spyTarget, setSpyTarget] = useState<string | null>(null)
  const [spyLoading, setSpyLoading] = useState(false)
  const [spyAnswer, setSpyAnswer] = useState<AnswerOption | null>(null)
  const [spyFetched, setSpyFetched] = useState(false)
  const [showSpyPicker, setShowSpyPicker] = useState(false)

  // Solo mostrar intro en la primera pregunta
  useEffect(() => {
    if (question.question_number !== 1) setPhase('playing')
  }, [question.question_number])

  const handleIntroEnd = useCallback(() => setPhase('playing'), [])

  const handleJoker = async (joker: JokerType) => {
    if (jokerUsed || phase !== 'playing') return
    const def = JOKERS.find(j => j.type === joker)!
    if (team.token_balance < def.cost) return

    if (joker === 'fifty_fifty') {
      const wrong = OPTIONS.filter(o => o !== question.correct_option)
      const toElim = wrong.sort(() => Math.random() - 0.5).slice(0, 2)
      setEliminatedOptions(toElim)
      if (selected && toElim.includes(selected)) setSelected(null)
      setJokerUsed(joker)
      setTokensSpent(def.cost)
      return
    }

    if (joker === 'spy') {
      setShowSpyPicker(true)
      return
    }

    // call_teacher: solo visual
    setJokerUsed(joker)
    setTokensSpent(def.cost)
  }

  const handleSpySelect = async (targetTeamId: string) => {
    setShowSpyPicker(false)
    setSpyTarget(targetTeamId)
    setSpyLoading(true)
    setSpyFetched(false)
    setJokerUsed('spy')
    setTokensSpent(150)

    const { data } = await supabase
      .from('level2_answers')
      .select('selected_option')
      .eq('question_id', question.id)
      .eq('team_id', targetTeamId)
      .maybeSingle()

    setSpyAnswer((data?.selected_option as AnswerOption) ?? null)
    setSpyLoading(false)
    setSpyFetched(true)
  }

  const handleLock = async () => {
    if (!selected || phase !== 'playing') return
    setPhase('locked')

    await supabase.from('level2_answers').upsert({
      question_id: question.id,
      team_id: team.id,
      selected_option: selected,
      joker_used: jokerUsed,
      joker_target_id: spyTarget,
      tokens_spent: tokensSpent,
      is_locked: true,
      answered_at: new Date().toISOString(),
    }, { onConflict: 'question_id,team_id' })
  }

  const diffLabel = { easy: 'FÁCIL', medium: 'MEDIA', hard: 'DIFÍCIL' }[question.difficulty]
  const diffColor = { easy: G.green, medium: G.primary, hard: G.error }[question.difficulty]
  const reward    = { easy: 150, medium: 250, hard: 400 }[question.difficulty]

  const myAnswer = revealed ? (correctAnswers[team.id] ?? null) : selected

  return (
    <>
      <AnimatePresence>
        {phase === 'intro' && question.question_number === 1 && (
          <IntroScreen key="intro" questionNumber={question.question_number} onDone={handleIntroEnd} />
        )}
      </AnimatePresence>

      {/* Modal selector de equipo espía */}
      <AnimatePresence>
        {showSpyPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}
              style={{ background: G.panel, border: `1px solid ${G.primary}`, borderRadius: 10, padding: 24, width: '100%', maxWidth: 320 }}
            >
              <p style={{ color: G.primary, fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: 14 }}>
                {'>'} ESPÍA — ¿A QUIÉN QUIERES ESPIAR?
              </p>
              <div className="flex flex-col gap-2">
                {allTeams.filter(t => t.id !== team.id).map(t => (
                  <button key={t.id} onClick={() => handleSpySelect(t.id)}
                    style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 6, padding: '10px 14px', color: '#fff', fontFamily: "'Exo 2', sans-serif", textAlign: 'left', cursor: 'pointer' }}>
                    {t.name}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSpyPicker(false)}
                style={{ marginTop: 12, background: 'transparent', border: 'none', color: G.dim, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace' }}>
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 p-4 w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="cup-badge">Pregunta {question.question_number}/3</span>
            <span className="cup-badge" style={{ color: diffColor, borderColor: diffColor }}>
              {diffLabel}
            </span>
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1rem' }}>
            +{reward} T
          </span>
        </div>

        {/* Pregunta */}
        <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: '18px 20px' }}>
          <p style={{ color: G.dim, fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: 8 }}>
            {'>'} PREGUNTA
          </p>
          <p style={{ color: '#fff', fontSize: '1.05rem', lineHeight: 1.65, fontFamily: "'Exo 2', sans-serif" }}>
            {question.question_text}
          </p>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(opt => {
            const isEliminated = eliminatedOptions.includes(opt)
            const isSelected   = !revealed && selected === opt
            const isCorrect    = revealed && opt === question.correct_option
            const isMyWrong    = revealed && myAnswer === opt && opt !== question.correct_option

            let borderColor = G.border
            let bgColor     = G.panel
            let textColor   = isEliminated ? 'rgba(255,255,255,0.18)' : '#fff'

            if (isSelected) { borderColor = G.primary; bgColor = 'rgba(250,204,21,0.08)'; textColor = G.primary }
            if (isCorrect)  { borderColor = G.green;   bgColor = 'rgba(74,222,128,0.12)'; textColor = G.green }
            if (isMyWrong)  { borderColor = G.error;   bgColor = 'rgba(248,113,113,0.10)'; textColor = G.error }

            const canClick = !isEliminated && !revealed && phase === 'playing'

            return (
              <motion.button
                key={opt}
                whileTap={canClick ? { scale: 0.97 } : {}}
                onClick={() => canClick && setSelected(opt)}
                disabled={!canClick}
                style={{
                  background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10,
                  padding: '14px 16px', textAlign: 'left', cursor: canClick ? 'pointer' : 'default',
                  opacity: isEliminated ? 0.25 : 1, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', color: borderColor, flexShrink: 0 }}>
                  {opt.toUpperCase()}
                </span>
                <span style={{ color: textColor, fontFamily: "'Exo 2', sans-serif", fontSize: '0.9rem', lineHeight: 1.4 }}>
                  {optionText(question, opt)}
                </span>
                {isCorrect  && <span style={{ marginLeft: 'auto', flexShrink: 0, color: G.green }}>✓</span>}
                {isMyWrong  && <span style={{ marginLeft: 'auto', flexShrink: 0, color: G.error }}>✗</span>}
              </motion.button>
            )
          })}
        </div>

        {/* Resultado del espía */}
        <AnimatePresence>
          {jokerUsed === 'spy' && (spyLoading || spyFetched) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(250,204,21,0.06)', border: `1px solid rgba(250,204,21,0.3)`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', color: G.primary, fontSize: '0.78rem' }}>
                {spyLoading
                  ? 'Consultando respuesta...'
                  : spyAnswer === null
                  ? 'El equipo aún no ha respondido'
                  : `${allTeams.find(t => t.id === spyTarget)?.name ?? 'Equipo'} eligió: ${spyAnswer.toUpperCase()}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comodines */}
        {phase === 'playing' && !revealed && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {JOKERS.map(j => {
              const canAfford = team.token_balance >= j.cost
              const active    = jokerUsed === j.type
              return (
                <button key={j.type}
                  onClick={() => handleJoker(j.type)}
                  disabled={!!jokerUsed || !canAfford}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 20,
                    border: `1px solid ${active ? G.primary : G.border}`,
                    background: active ? 'rgba(250,204,21,0.1)' : G.panel,
                    color: active ? G.primary : canAfford && !jokerUsed ? '#fff' : G.dim,
                    opacity: (!canAfford || (!!jokerUsed && !active)) ? 0.4 : 1,
                    cursor: !jokerUsed && canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: "'Exo 2', sans-serif", fontSize: '0.82rem', transition: 'all 0.12s',
                  }}
                >
                  {j.label}
                  <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: active ? G.primary : G.dim }}>
                    {j.cost}T
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Botón confirmar */}
        {phase === 'playing' && !revealed && (
          <button onClick={handleLock} disabled={!selected}
            className="cup-btn cup-btn-gold"
            style={{ padding: '13px', fontSize: '0.85rem', opacity: selected ? 1 : 0.35, cursor: selected ? 'pointer' : 'not-allowed' }}
          >
            Confirmar Respuesta
          </button>
        )}

        {/* Esperando reveal */}
        {phase === 'locked' && !revealed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: G.panel, border: `1px solid ${G.primary}`, borderRadius: 8, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: G.primary, borderTopColor: 'transparent', flexShrink: 0 }} />
            <div>
              <p style={{ color: G.primary, fontFamily: 'monospace', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                Respuesta bloqueada: {selected?.toUpperCase()}
              </p>
              <p style={{ color: G.dim, fontSize: '0.72rem', marginTop: 2 }}>
                Esperando que el profesor revele la respuesta...
              </p>
            </div>
          </motion.div>
        )}

        {/* Reveal — panel de resultados de todos los equipos */}
        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${G.border}` }}>
                <p style={{ color: G.primary, fontFamily: 'monospace', fontSize: '0.68rem', letterSpacing: '0.2em' }}>
                  {'>'} RESPUESTAS DEL SALÓN
                </p>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allTeams.map(t => {
                  const ans     = correctAnswers[t.id]
                  const correct = ans === question.correct_option
                  const isMe    = t.id === team.id
                  return (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', borderRadius: 6,
                      background: isMe ? 'rgba(255,255,255,0.04)' : 'transparent',
                    }}>
                      <span style={{ color: isMe ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: "'Exo 2', sans-serif", fontSize: '0.88rem' }}>
                        {isMe && <span style={{ color: G.primary, marginRight: 4 }}>▸</span>}
                        {t.name}
                      </span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.82rem', color: !ans ? G.dim : correct ? G.green : G.error }}>
                        {!ans ? '—' : `${ans.toUpperCase()} ${correct ? '✓' : '✗'}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}
