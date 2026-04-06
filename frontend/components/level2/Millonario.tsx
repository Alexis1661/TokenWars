'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Level2Question, AnswerOption, JokerType, Team } from '@/lib/types'
import Image from 'next/image'
import { Timer } from '@/components/ui/Timer'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'

const G = {
  primary: '#facc15',
  dim:     '#94a3b8',
  border:  'rgba(251,191,36,0.2)',
  bg:      '#020617',
  panel:   '#111827',
  error:   '#ef4444',
  green:   '#22c55e',
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

// ─── Intro (Lore) ──────────────────────────────
interface IntroProps {
  questionNumber: number
  startedAt: number
  duration: number
  onDone: () => void
}

function IntroScreen({ questionNumber, startedAt, duration, onDone }: IntroProps) {
  const [cd, setCd] = useState(duration)

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(duration - elapsed))
      setCd(left)
      if (left <= 0) onDone()
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [startedAt, duration, onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex overflow-y-auto p-4 md:p-8"
      style={{ background: '#020617', fontFamily: "'Exo 2', sans-serif" }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)',
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
            style={{ color: cd <= 3 ? G.error : G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem' }}
          >
            [{cd.toString().padStart(2, '0')}]
          </motion.span>
        </div>

        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.8rem', textAlign: 'center', textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
          ¿QUIÉN QUIERE SER MILLONARIO?
        </h2>

        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="md:w-[55%] flex flex-col gap-4" style={{ background: '#1e293b', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: '20px' }}>
            <p style={{ color: G.primary, fontSize: '0.68rem', letterSpacing: '0.2em' }}>{'>'} DESCANSO FATAL</p>
            <div className="w-full rounded-md overflow-hidden" style={{ border: `1px solid rgba(255,255,255,0.1)` }}>
              <Image src="/images/nivel2.png" alt="David viendo TV" width={800} height={450} style={{ width: '100%', height: 'auto', display: 'block' }} className="grayscale opacity-75" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.65 }}>
              Después de tanto programar al agente, David colapsó en su silla y encendió el televisor buscando relajar su mente. Para su mala suerte, el canal sintonizó la edición universitaria de "Quién quiere ser millonario". Las preguntas resultaron ser <strong>conceptos teóricos puros sobre Inteligencia Artificial</strong> y su mente ya no puede descansar sin tratar de resolverlas todas.
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
              { title: 'OBJETIVO', body: 'Conquista a la audiencia respondiendo las preguntas teóricas de opción múltiple. Acertar te otorgará tokens valiosos para tu equipo según la dificultad formulada.' },
              { title: 'COMODINES ESTRATÉGICOS', body: 'Gasta tus preciados tokens para asegurarte la victoria: elimina opciones con el 50/50, pide un consejo llamando al profesor, o espía remotamente la decisión de un equipo rival.' },
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

const INTRO_SECONDS = 15
const QUESTION_SECONDS = 30

// ─── Componente principal ─────────────────────────────────
interface MillonarioProps {
  question: Level2Question
  team: Team
  allTeams: Team[]
  revealed: boolean
  correctAnswers: Record<string, AnswerOption | null>
}

export function Millonario({ question, team, allTeams, revealed, correctAnswers }: MillonarioProps) {
  const [phase, setPhase] = useState<'waiting' | 'intro' | 'playing' | 'locked'>('waiting')
  const [selected, setSelected] = useState<AnswerOption | null>(null)
  const [jokerUsed, setJokerUsed] = useState<JokerType | null>(null)
  const [tokensSpent, setTokensSpent] = useState(0)
  const [eliminatedOptions, setEliminatedOptions] = useState<AnswerOption[]>([])
  const [spyTarget, setSpyTarget] = useState<string | null>(null)
  const [spyAnswer, setSpyAnswer] = useState<AnswerOption | null>(null)
  const [spyTargetLocked, setSpyTargetLocked] = useState(false)
  const spyChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [showSpyPicker, setShowSpyPicker] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)

  const handleLockRef = useRef<() => void>(() => {})

  // Mostrar scoreboard 4s después de revelar la respuesta
  useEffect(() => {
    if (!revealed) { setShowScoreboard(false); return }
    const id = setTimeout(() => setShowScoreboard(true), 4000)
    return () => clearTimeout(id)
  }, [revealed])

  // SINCRONIZACIÓN DE FASE POR TIEMPO
  useEffect(() => {
    if (!question.started_at) {
      setPhase('waiting')
      return
    }

    const tStart = new Date(question.started_at).getTime()
    const isFirstQuestion = question.question_number === 1
    const introDuration = isFirstQuestion ? INTRO_SECONDS : 0 // Saltarse intro si no es la pregunta 1

    const checkPhase = () => {
      const elapsed = (Date.now() - tStart) / 1000
      if (elapsed < 0) setPhase('waiting')
      else if (isFirstQuestion && elapsed < introDuration) {
        setPhase('intro')
      } else if (elapsed < (introDuration + QUESTION_SECONDS)) {
        if (phase !== 'locked') setPhase('playing')
      } else {
        setPhase('locked')
      }
    }

    checkPhase()
    const id = setInterval(checkPhase, 500)
    return () => clearInterval(id)
  }, [question.started_at, question.question_number, phase])

  const handleLock = useCallback(async () => {
    // Permitir bloquear si estamos en fase playing
    if (phase !== 'playing' || revealed) return
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
  }, [selected, jokerUsed, spyTarget, tokensSpent, question.id, team.id, phase, revealed])

  useEffect(() => { handleLockRef.current = handleLock }, [handleLock])

  useEffect(() => {
    return () => {
      if (spyChannelRef.current) {
        supabase.removeChannel(spyChannelRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (revealed && spyChannelRef.current) {
      supabase.removeChannel(spyChannelRef.current)
      spyChannelRef.current = null
    }
  }, [revealed])

  const handleJoker = async (joker: JokerType) => {
    // No permitir comodines fuera de fase playing
    if (jokerUsed || phase !== 'playing' || revealed) return
    const def = JOKERS.find(j => j.type === joker)!
    if (team.token_balance < def.cost) return

    if (joker === 'fifty_fifty') {
      const wrong = OPTIONS.filter(o => o !== question.correct_option)
      const toElim = wrong.sort(() => Math.random() - 0.5).slice(0, 2)
      setEliminatedOptions(toElim)
      if (selected && toElim.includes(selected)) setSelected(null)
      setJokerUsed(joker)
      setTokensSpent(0)
      fetch('/api/use-joker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: joker, cost: def.cost }),
      })
      return
    }
    if (joker === 'spy') { setShowSpyPicker(true); return }
    setJokerUsed(joker)
    setTokensSpent(0)
    fetch('/api/use-joker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: joker, cost: def.cost }),
    })
  }

  const handleSpySelect = async (tid: string) => {
    setShowSpyPicker(false)
    setSpyTarget(tid)
    setJokerUsed('spy')
    setTokensSpent(0)

    fetch('/api/use-joker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: 'spy', cost: 150 }),
    })

    // Fetch inicial
    const { data } = await supabase
      .from('level2_answers')
      .select('selected_option, is_locked')
      .eq('question_id', question.id)
      .eq('team_id', tid)
      .maybeSingle()
    
    if (data) {
      setSpyAnswer((data.selected_option as AnswerOption) ?? null)
      setSpyTargetLocked(data.is_locked ?? false)
    }

    // Suscripción Realtime para el espía
    const channel = supabase
      .channel(`spy-q${question.id}-t${tid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'level2_answers',
          filter: `question_id=eq.${question.id}`,
        },
        (payload: any) => {
          // Filtrar por el equipo objetivo de forma segura dentro del callback
          const newRow = payload.new;
          if (newRow && newRow.team_id === tid) {
            setSpyAnswer((newRow.selected_option as AnswerOption) ?? null)
            setSpyTargetLocked(newRow.is_locked ?? false)
          }
        }
      )
      .subscribe((status) => {
        console.log("Spy subscription status:", status);
      })

    spyChannelRef.current = channel
  }

  const handleSelection = async (opt: AnswerOption) => {
    if (phase !== 'playing' || revealed) return
    setSelected(opt)
    supabase.from('level2_answers').upsert({
      question_id: question.id, team_id: team.id, selected_option: opt, joker_used: jokerUsed, joker_target_id: spyTarget, tokens_spent: tokensSpent, is_locked: false,
    }, { onConflict: 'question_id,team_id' })
  }

  const diffLabel = { easy: 'FÁCIL', medium: 'MEDIA', hard: 'DIFÍCIL' }[question.difficulty]
  const diffColor = { easy: G.green, medium: G.primary, hard: G.error }[question.difficulty]
  const reward    = { easy: 150, medium: 250, hard: 400 }[question.difficulty]
  const myAnswer = revealed ? (correctAnswers[team.id] ?? null) : selected

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 md:p-8" style={{ background: '#020617' }}>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] opacity-[0.03] rotate-45"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      </div>

      <AnimatePresence>
        {phase === 'intro' && question.started_at && (
          <IntroScreen 
            key="intro" 
            questionNumber={question.question_number} 
            startedAt={new Date(question.started_at).getTime()}
            duration={INTRO_SECONDS}
            onDone={() => setPhase('playing')} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSpyPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/80">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-yellow-500/50 p-6 rounded-xl w-full max-w-sm">
              <p className="text-yellow-500 font-mono text-sm tracking-widest mb-4 uppercase">Elija un rival para espiar</p>
              <div className="flex flex-col gap-2">
                {allTeams.filter(t => t.id !== team.id).map(t => (
                  <button key={t.id} onClick={() => handleSpySelect(t.id)} className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white hover:border-yellow-500 transition-colors text-left">{t.name}</button>
                ))}
              </div>
              <button onClick={() => setShowSpyPicker(false)} className="mt-4 text-slate-500 text-xs">Cancelar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'waiting' && !revealed && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-black/80 backdrop-blur-sm"
          >
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-yellow-500 mb-2 font-orbitron">PREPARANDO PREGUNTA {question.question_number}</h2>
            <p className="text-white/60 font-mono text-sm max-w-sm">Sincronizando con el servidor para garantizar el juego limpio...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-5xl flex flex-col gap-8">
        
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-white text-lg font-bold font-orbitron">{team.name}</span>
              <span className="text-blue-400 text-[10px] font-bold uppercase tracking-widest opacity-70">Tu Equipo</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="flex flex-col">
              <span className="text-yellow-500 text-lg font-bold font-orbitron">{team.token_balance}</span>
              <span className="text-yellow-500/60 text-[10px] font-bold uppercase tracking-widest opacity-70">Mis Tokens</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="px-4 py-1 bg-blue-900/40 border border-blue-500/30 rounded-full flex flex-col items-center">
                <span className="text-[10px] text-blue-300 font-bold uppercase opacity-60">Pregunta</span>
                <span className="text-sm text-white font-orbitron">{question.question_number} / 3</span>
              </div>
              <div className="px-4 py-1 border rounded-full flex flex-col items-center" style={{ borderColor: diffColor + '44', backgroundColor: diffColor + '11' }}>
                <span className="text-[10px] uppercase font-bold opacity-60" style={{ color: diffColor }}>Nivel</span>
                <span className="text-sm font-orbitron font-bold" style={{ color: diffColor }}>{diffLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {phase === 'playing' && !revealed && (
              <Timer 
                seconds={QUESTION_SECONDS} 
                startedAt={question.started_at ? new Date(question.started_at).getTime() + (INTRO_SECONDS * 1000) : undefined} 
                onExpire={() => handleLockRef.current?.()} 
              />
            )}
            <div className="text-right flex flex-col items-end">
              <span className="text-yellow-500 text-3xl font-bold font-orbitron drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">+{reward}</span>
              <span className="text-yellow-500/40 text-[10px] font-bold uppercase tracking-widest">Tokens en juego</span>
            </div>
          </div>
        </header>

        <div className="relative flex items-center justify-center min-h-[160px]">
          <div className="absolute w-full h-[2px] bg-yellow-500/30" />
          <div className="relative z-10 w-full max-w-4xl bg-gradient-to-b from-blue-900 to-slate-900 border-4 border-yellow-500 p-8 rounded-[80px] shadow-[0_0_40px_rgba(250,204,21,0.15)] text-center">
            <p className="text-white text-xl md:text-2xl font-bold leading-relaxed">{question.question_text}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPTIONS.map(opt => {
            const isEliminated = eliminatedOptions.includes(opt)
            const isSelected   = !revealed && selected === opt
            const isCorrect    = revealed && opt === question.correct_option
            const isMyWrong    = revealed && myAnswer === opt && opt !== question.correct_option

            let bColor = 'rgba(59,130,246,0.5)', bg = 'from-slate-900 to-blue-950', sh = 'none'
            if (isSelected) { bColor = '#facc15'; bg = 'from-yellow-900/40 to-yellow-950/40'; sh = '0 0 20px rgba(250,204,21,0.2)' }
            if (isCorrect)  { bColor = '#22c55e'; bg = 'from-green-900/40 to-green-950/40'; sh = '0 0 20px rgba(34,197,94,0.3)' }
            if (isMyWrong)  { bColor = '#ef4444'; bg = 'from-red-900/40 to-red-950/40'; sh = '0 0 20px rgba(239,68,68,0.3)' }

            const canClick = !isEliminated && !revealed && phase === 'playing'
            return (
              <div key={opt} className="relative flex items-center">
                <div className="absolute w-full h-[1px] bg-yellow-500/20" />
                <button onClick={() => canClick && handleSelection(opt)} disabled={!canClick}
                  className={`relative z-10 w-full mx-4 py-4 px-8 border-2 rounded-full text-left transition-all duration-200 bg-gradient-to-r ${bg} ${canClick ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'} ${isEliminated ? 'opacity-10' : 'opacity-100'}`}
                  style={{ borderColor: bColor, boxShadow: sh }}
                >
                  <span className="font-orbitron font-bold text-yellow-500 mr-4">{opt.toUpperCase()}:</span>
                  <span className="text-white font-medium">{optionText(question, opt)}</span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {jokerUsed === 'spy' && spyTarget && !revealed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-center font-mono text-sm text-blue-300">
                {spyAnswer
                  ? `El rival ha marcado: ${spyAnswer.toUpperCase()}${spyTargetLocked ? ' (BLOQUEADO)' : ''}`
                  : 'El rival aún no decide.'}
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="flex flex-wrap items-center justify-between gap-6 pt-4">
            {!revealed && (
              <div className="flex gap-2">
                {JOKERS.map(j => {
                  const canAf = team.token_balance >= j.cost, act = jokerUsed === j.type
                  return (
                    <button key={j.type} onClick={() => handleJoker(j.type)} disabled={!!jokerUsed || !canAf || phase === 'locked'}
                      className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${act ? 'bg-yellow-500 border-yellow-400 text-black' : (canAf && !jokerUsed && phase !== 'locked' ? 'bg-blue-900/40 border-blue-500/50 text-white hover:bg-blue-800/40' : 'opacity-30 border-slate-700 text-slate-500 cursor-not-allowed')}`}
                    >
                      {j.label} <span className="text-[10px] ml-1 opacity-70">({j.cost}T)</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex gap-4">
              {phase === 'playing' && !revealed && (
                <button onClick={handleLock} disabled={!selected} className={`bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full tracking-widest ${!selected ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 shadow-[0_0_20px_rgba(250,204,21,0.3)]'}`}>Confirmar</button>
              )}
              {phase === 'locked' && !revealed && (
                <div className="flex items-center gap-3 px-6 py-3 bg-blue-950 border border-blue-500/50 rounded-full text-yellow-500 font-mono text-sm tracking-widest">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_#facc15]" />
                  <span>BLOQUEADO: {selected?.toUpperCase() || '?'}</span>
                </div>
              )}
            </div>
          </footer>

          <AnimatePresence>
            {showScoreboard && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                <Scoreboard teams={allTeams} highlightTeamId={team.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
