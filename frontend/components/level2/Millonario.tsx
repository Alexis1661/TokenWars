'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Level2Question, AnswerOption, JokerType, Team } from '@/lib/types'
import Image from 'next/image'

const G = {
  primary: '#facc15',
  dim:     '#a3a3a3',
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',
  panel:   '#111827',
  error:   '#f87171',
  green:   '#4ade80',
  glow:    'none',
  glowSoft:'none',
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
  const [cd, setCd] = useState(15)
  useEffect(() => {
    if (cd <= 0) { onDone(); return }
    const id = setTimeout(() => setCd(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [cd, onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex overflow-y-auto p-4 md:p-8"
      style={{ background: 'rgba(3,7,18,0.98)', fontFamily: 'monospace' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
      }} />
      
      <div className="relative z-10 m-auto flex flex-col items-center gap-6 w-full max-w-4xl py-4">
        
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: G.dim, fontSize: '0.72rem', letterSpacing: '0.2em' }}>
            TOKEN_WARS / NIVEL_2 / PREGUNTA_{questionNumber}_DE_3
          </span>
          <motion.span
            key={cd}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: cd <= 3 ? G.error : G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem', textShadow: G.glow }}
          >
            [{cd.toString().padStart(2, '0')}]
          </motion.span>
        </div>

        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.8rem', textAlign: 'center', textShadow: G.glow }}>
          ¿QUIÉN QUIERE SER MILLONARIO?
        </h2>

        <div className="flex flex-col md:flex-row gap-6 w-full">
          
          {/* Historia Completa */}
          <div className="md:w-[55%] flex flex-col gap-4" style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 8, padding: '20px' }}>
            <p style={{ color: G.primary, fontSize: '0.68rem', letterSpacing: '0.2em' }}>
              {'>'} DESCANSO FATAL
            </p>
            <div className="w-full rounded-md overflow-hidden" style={{ border: `1px solid ${G.border}` }}>
              <Image src="/images/nivel2.png" alt="David viendo TV" width={800} height={450} style={{ width: '100%', height: 'auto', display: 'block' }} className="grayscale opacity-75" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.65 }}>
              Después de tanto programar al agente, David colapsó en su silla y encendió el televisor buscando relajar su mente. Para su mala suerte, el canal sintonizó la edición universitaria de "Quién quiere ser millonario". Las preguntas resultaron ser <strong>conceptos teóricos puros sobre Inteligencia Artificial</strong> y su mente ya no puede descansar sin tratar de resolverlas todas.
            </p>
          </div>

          {/* Reglas Laterales */}
          <div className="md:w-[45%] flex flex-col gap-4">
            
            {/* Reloj animado (moved to lateral para dar espacio) */}
            <div className="flex items-center justify-center py-2">
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <motion.circle cx="40" cy="40" r="32" fill="none" strokeWidth="4" strokeLinecap="round"
                    stroke={G.primary} strokeDasharray={2 * Math.PI * 32}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 32 }}
                    transition={{ duration: 15, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', textShadow: G.glow }}>
                    {cd}
                  </span>
                </div>
              </div>
            </div>

            {[
              { title: 'OBJETIVO', body: 'Conquista a la audiencia respondiendo las preguntas teóricas de opción múltiple. Acertar te otorgará tokens valiosos para tu equipo según la dificultad formulada.' },
              { title: 'COMODINES ESTRATÉGICOS', body: 'Gasta tus preciados tokens para asegurarte la victoria: elimina opciones con el 50/50, pide un consejo llamando al profesor, o espía remotamente la decisión de un equipo rival.' },
            ].map(({ title, body }) => (
              <div key={title} style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 8, padding: '16px 20px' }}>
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
  const [spyTargetLocked, setSpyTargetLocked] = useState(false)
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
      .select('selected_option, is_locked')
      .eq('question_id', question.id)
      .eq('team_id', targetTeamId)
      .maybeSingle()

    setSpyAnswer((data?.selected_option as AnswerOption) ?? null)
    setSpyTargetLocked(data?.is_locked ?? false)
    setSpyLoading(false)
    setSpyFetched(true)

    setTimeout(() => {
      setSpyFetched(false)
    }, 3000)
  }

  const handleSelection = async (opt: AnswerOption) => {
    setSelected(opt)
    if (phase !== 'playing' || revealed) return

    supabase.from('level2_answers').upsert({
      question_id: question.id,
      team_id: team.id,
      selected_option: opt,
      joker_used: jokerUsed,
      joker_target_id: spyTarget,
      tokens_spent: tokensSpent,
      is_locked: false,
    }, { onConflict: 'question_id,team_id' }).then(() => {})
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
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 md:p-8" style={{ background: '#03050a' }}>
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

      {/* Estilos locales para los efectos de TV vieja */}
      <style>{`
        @keyframes scanlineGlitch {
          0% { transform: translateY(-100%); opacity: 0.05; }
          4% { opacity: 0.4; transform: translateY(0%); }
          8% { opacity: 0.05; transform: translateY(100%); }
          100% { transform: translateY(100%); opacity: 0.05; }
        }
        @keyframes signalFlicker {
          0%, 96% { filter: contrast(1) brightness(1); transform: none; opacity: 1; }
          96.5% { filter: contrast(1.5) hue-rotate(15deg) brightness(1.2); transform: skewX(1deg) translateX(4px); opacity: 0.8; }
          97% { filter: contrast(1) invert(0.1); transform: skewX(-2deg) translateX(-6px); opacity: 0.6; }
          97.5% { filter: contrast(1.2) hue-rotate(-10deg); transform: skewX(2deg) translateY(2px); opacity: 0.9; }
          98% { filter: contrast(1) brightness(1); transform: none; opacity: 1; }
          100% { filter: contrast(1) brightness(1); transform: none; opacity: 1; }
        }
      `}</style>

      {/* MARCO DEL TELEVISOR (TV BEZEL - ESTILO MADERA RETRO) */}
      <div className="relative w-full max-w-4xl mx-auto rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.95)] flex mt-6"
           style={{ 
             background: '#7B4A3A', 
             border: '10px solid #4A281E', 
             borderBottomWidth: '24px',
             borderRightWidth: '35px',
             padding: '16px 100px 16px 16px', 
             boxShadow: 'inset 4px 4px 10px rgba(255,255,255,0.2), inset -4px -4px 10px rgba(0,0,0,0.4)',
             maxHeight: '90vh'
           }}>
           
        {/* Antenas retro de conejo */}
        <div className="absolute top-[-60px] left-[35%] w-2 h-20 bg-[#a3a3a3] rotate-[-20deg] origin-bottom border-2 border-[#555] rounded-t-full shadow-lg -z-10">
          <div className="absolute top-[-6px] left-[-4px] w-3 h-3 bg-[#777] rounded-full" />
        </div>
        <div className="absolute top-[-75px] left-[40%] w-2 h-24 bg-[#a3a3a3] rotate-[30deg] origin-bottom border-2 border-[#555] rounded-t-full shadow-lg -z-10">
          <div className="absolute top-[-6px] left-[-4px] w-3 h-3 bg-[#777] rounded-full" />
        </div>
        
        {/* PANTALLA CRÍTICA (TV SCREEN) */}
        <div className="relative w-full h-full rounded-[24px] overflow-auto flex flex-col py-4 md:py-6 border-[12px] border-[#131111]" 
             style={{ 
               background: 'radial-gradient(circle at 50% 40%, #0c1840 0%, #010308 80%)', 
               boxShadow: 'inset 0 0 30px rgba(0,0,0,0.95)',
               animation: 'signalFlicker 8s infinite'
             }}>
          
          {/* Efectos visuales de CRT (Scanlines, Viñeta, Ruido estático) */}
          <div className="pointer-events-none absolute inset-0 z-[60] opacity-40 mix-blend-overlay" 
               style={{ background: 'linear-gradient(rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.4) 50%)', backgroundSize: '100% 4px' }} />
          
          {/* Glitch Overlay Blanco intermitente (Bad Signal) */}
          <div className="pointer-events-none absolute inset-0 w-full h-[150px] bg-white opacity-10 z-[61] mix-blend-overlay"
               style={{ animation: 'scanlineGlitch 6s infinite linear' }} />
          
          <div className="pointer-events-none absolute inset-0 z-[60] shadow-[inset_0_0_120px_rgba(0,0,0,0.9)]" />
          <div className="pointer-events-none absolute inset-0 z-[60] bg-blue-400 opacity-[0.02] mix-blend-color-dodge" />

          {/* CONTENIDO ORIGINAL DE MILLONARIO */}
          <div className="relative z-10 flex flex-col gap-5 p-2 w-full max-w-3xl mx-auto overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.1em', background: 'linear-gradient(90deg, #1e3a8a, transparent)', padding: '4px 12px', borderRadius: 20, border: '1px solid #3b82f6' }}>
              PREGUNTA {question.question_number} / 3
            </span>
            <span style={{ color: diffColor, fontSize: '0.8rem', fontWeight: 'bold', border: `1px solid ${diffColor}`, borderRadius: 20, padding: '4px 12px' }}>
              {diffLabel}
            </span>
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24', fontSize: '1.4rem', textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>
            +{reward} <span style={{ fontSize: '1rem' }}>TOKENS</span>
          </span>
        </div>

        {/* Pregunta */}
        <div className="relative flex items-center justify-center w-full" style={{ minHeight: 120 }}>
          <div className="absolute w-full h-[2px] bg-[#fbbf24] top-1/2 -mt-[1px] -z-10 opacity-50" />
          <div style={{
            background: 'linear-gradient(180deg, #1e3a8a 0%, #0a1128 100%)',
            border: '2px solid #fbbf24',
            borderRadius: 60,
            padding: '24px 48px',
            boxShadow: '0 0 15px rgba(251,191,36,0.2), inset 0 0 20px rgba(0,0,0,0.8)',
            maxWidth: '90%',
            textAlign: 'center'
          }}>
            <p style={{ color: '#fff', fontSize: '1.2rem', lineHeight: 1.5, fontFamily: "'Exo 2', sans-serif", fontWeight: 500 }}>
              {question.question_text}
            </p>
          </div>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {OPTIONS.map(opt => {
            const isEliminated = eliminatedOptions.includes(opt)
            const isSelected   = !revealed && selected === opt
            const isCorrect    = revealed && opt === question.correct_option
            const isMyWrong    = revealed && myAnswer === opt && opt !== question.correct_option

            let borderColor = '#3b82f6' // Blue border by default
            let bgColor     = 'linear-gradient(180deg, #172554 0%, #080f26 100%)'
            let textColor   = isEliminated ? 'rgba(255,255,255,0.18)' : '#fff'
            let optLetterColor = '#fbbf24' // Gold letter

            if (isSelected) { borderColor = '#fbbf24'; bgColor = 'linear-gradient(180deg, #b45309 0%, #451a03 100%)'; textColor = '#fff' }
            if (isCorrect)  { borderColor = '#4ade80'; bgColor = 'linear-gradient(180deg, #166534 0%, #052e16 100%)'; optLetterColor = '#4ade80' }
            if (isMyWrong)  { borderColor = '#f87171'; bgColor = 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)'; optLetterColor = '#f87171' }

            const canClick = !isEliminated && !revealed && phase === 'playing'

            return (
              <div key={opt} className="relative flex items-center w-full">
                <div className="absolute w-full h-[2px] bg-[#fbbf24] top-1/2 -mt-[1px] -z-10 opacity-30" />
                <motion.button
                  whileTap={canClick ? { scale: 0.98 } : {}}
                  onClick={() => canClick && handleSelection(opt)}
                  disabled={!canClick}
                  className="w-full mx-auto"
                  style={{
                    background: bgColor, border: `2px solid ${borderColor}`, borderRadius: 40,
                    padding: '16px 32px', textAlign: 'left', cursor: canClick ? 'pointer' : 'default',
                    opacity: isEliminated ? 0.25 : 1, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: isSelected ? '0 0 15px rgba(251,191,36,0.4)' : 'none',
                    maxWidth: '95%'
                  }}
                >
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', color: optLetterColor, flexShrink: 0, fontWeight: 700 }}>
                    {opt.toUpperCase()}:
                  </span>
                  <span style={{ color: textColor, fontFamily: "'Exo 2', sans-serif", fontSize: '1rem', lineHeight: 1.4 }}>
                    {optionText(question, opt)}
                  </span>
                </motion.button>
              </div>
            )
          })}
        </div>

        {/* Resultado del espía */}
        <AnimatePresence>
          {jokerUsed === 'spy' && (spyLoading || spyFetched) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'rgba(250,204,21,0.06)', border: `1px solid rgba(250,204,21,0.3)`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', color: G.primary, fontSize: '0.78rem' }}>
                {spyLoading
                  ? 'Consultando respuesta...'
                  : spyAnswer === null
                  ? 'El equipo aún no ha seleccionado ninguna opción.'
                  : spyTargetLocked
                    ? `${allTeams.find(t => t.id === spyTarget)?.name ?? 'Equipo'} ya bloqueó la respuesta: ${spyAnswer.toUpperCase()}`
                    : `${allTeams.find(t => t.id === spyTarget)?.name ?? 'Equipo'} ha seleccionado '${spyAnswer.toUpperCase()}', pero pueden cambiar de decisión aún.`}
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
        
        </div>

        {/* Panel lateral de controles (Estilo TV de perillas) */}
        <div className="absolute right-[18px] top-1/2 -translate-y-1/2 flex flex-col items-center gap-8">
          {/* Dial grande superior */}
          <div className="w-14 h-14 rounded-full bg-[#111] border-[4px] border-[#25150f] flex items-center justify-center rotate-[30deg] shadow-[inset_0_0_5px_rgba(0,0,0,1),_3px_3px_5px_rgba(0,0,0,0.6)] cursor-pointer hover:rotate-[45deg] transition-transform">
            <div className="w-10 h-2.5 bg-[#4A281E] rounded-full" />
          </div>
          
          {/* Dial pequeño inferior */}
          <div className="w-10 h-10 rounded-full bg-[#111] border-[3px] border-[#25150f] flex items-center justify-center -rotate-[15deg] shadow-[inset_0_0_5px_rgba(0,0,0,1),_2px_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:rotate-[-5deg] transition-transform">
            <div className="w-6 h-1.5 bg-[#4A281E] rounded-full" />
          </div>
          
          {/* Rejilla de la bocina (Speaker Grill) */}
          <div className="flex flex-col gap-2 mt-4 items-center">
            <div className="w-10 h-1.5 bg-[#4A281E] rounded-full shadow-inner opacity-80" />
            <div className="w-10 h-1.5 bg-[#4A281E] rounded-full shadow-inner opacity-80" />
            <div className="w-10 h-1.5 bg-[#4A281E] rounded-full shadow-inner opacity-80" />
            <div className="w-10 h-1.5 bg-[#4A281E] rounded-full shadow-inner opacity-80" />
          </div>
          
          {/* Indicador de encendido en el panel */}
          <div className="mt-6 flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-900 shadow-[0_0_10px_#ef4444,inset_0_0_2px_#fff]" />
          </div>
        </div>

      </div>

    </div>
  )
}
