'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Timer } from '@/components/ui/Timer'
import { Keyboard } from '@/components/ui/Keyboard'
import { DecryptedText } from '@/components/ui/DecryptedText'
import type { Level1Round } from '@/lib/types'
import Image from 'next/image'

const ROUND_SECONDS = 45
const INTRO_SECONDS = 15

// ── Paleta Dashboard (black / white / yellow) ──
const G = {
  primary:  '#facc15',   // yellow-400
  dim:      '#a3a3a3',   // neutral-400
  dark:     '#111827',   // gray-900
  glow:     'none',
  glowSoft: 'none',
  border:   'rgba(255,255,255,0.1)',
  bg:       '#030712',   // gray-950
  panel:    '#111827',   // gray-900
  error:    '#f87171',   // red-400
}

function countErrors(typed: string, target: string): number {
  let e = 0
  for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) e++
  return e
}

const ROUND_LORE: Record<number, { title: string, desc: string, highlight: string, desc2: string, mission: string, image: string }> = {
  1: {
    title: "ACTO 1: EL DESASTRE INICIAL",
    desc: "David acaba de armar su primer Agente en LangChain. Está probando un protocolo de ",
    highlight: "razonamiento paso por paso",
    desc2: ", pero la terminal le escupe registros puros de máquina, crudos y difíciles de interpretar a simple vista.",
    mission: "Aquí entras tú. Tu misión es interceptar el log de la izquierda, mirar qué dice la sección resaltada, y documentarla sin equivocarte para que David entienda qué piensa su IA.",
    image: "/images/estudiante_u.png"
  },
  2: {
    title: "ACTO 2: CONEXIÓN EN TIEMPO REAL",
    desc: "Tras el caos cognitivo, David activó el módulo de ",
    highlight: "estructuración de funciones",
    desc2: " nativo. Ahora la IA genera formatos compactos JSON buscando conectarse a ciegas con el servidor de notas de la universidad.",
    mission: "La máquina se mueve muy rápido. Atrapa la estructura JSON resaltada y traduce su intención a idioma humano antes de que ejecute la modificación.",
    image: "/images/estudiante_r2.png"
  },
  3: {
    title: "ACTO 3: FALLBACK DE EMERGENCIA",
    desc: "¡Alerta! El agente de David colapsó intentando inyectar código. Como última medida, el sistema desactivó las funciones estructuradas y volvió a su ",
    highlight: "bucle de deducción cíclica",
    desc2: " intentando razonar la salida del error.",
    mission: "Documenta exactamente los pensamientos críticos (`Thoughts`) o acciones que está sopesando en la línea central. Un error tuyo cerrará la brecha de conexión para siempre.",
    image: "/images/estudiante_r3.png"
  }
}

// ─── Pantalla de introducción (5 s) ───────────────────────
function IntroScreen({ round, onDone }: { round: Level1Round; onDone: () => void }) {
  const [countdown, setCountdown] = useState(INTRO_SECONDS)

  useEffect(() => {
    if (countdown <= 0) { onDone(); return }
    const id = setTimeout(() => setCountdown(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, onDone])

  const isReact = round.output_type === 'react'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex overflow-y-auto p-4 md:p-8"
      style={{ background: 'rgba(3,7,18,0.98)', fontFamily: 'monospace' }}
    >
      {/* Subtle grid scanline */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
        zIndex: 0,
      }} />

      <div className="relative z-10 m-auto flex flex-col items-center gap-6 w-full max-w-4xl py-4">

        {/* Header terminal */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: G.dim, fontSize: '0.72rem', letterSpacing: '0.2em' }}>
            TOKEN_WARS / NIVEL_1 / RONDA_{round.round_number}_DE_3
          </span>
          <motion.span
            key={countdown}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: countdown <= 3 ? G.error : G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem', textShadow: G.glow }}
          >
            [{countdown.toString().padStart(2, '0')}]
          </motion.span>
        </div>

        {/* Countdown ring */}
        <div className="relative" style={{ width: 80, height: 80 }}>
          <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <motion.circle cx="40" cy="40" r="32" fill="none" strokeWidth="4" strokeLinecap="round"
              stroke={G.primary}
              strokeDasharray={2 * Math.PI * 32}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 32 }}
              transition={{ duration: INTRO_SECONDS, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', textShadow: G.glow }}>
              {countdown}
            </span>
          </div>
        </div>

        {/* Titulo */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: G.dim, fontSize: '0.68rem', letterSpacing: '0.35em', marginBottom: 6 }}>
            {'>'} RONDA {round.round_number} DE 3 — NIVEL 1
          </p>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.6rem', textShadow: G.glow }}>
            HUMANO EN EL BUCLE
          </h2>
        </div>

        {/* Paneles */}
        <div className="flex flex-col gap-4 w-full">
          
          {/* Historia / Lore */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <p style={{ color: G.primary, fontSize: '0.68rem', letterSpacing: '0.2em', marginBottom: 2 }}>
              {'>'} TRANSMISIÓN ENTRANTE — {ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.title || ROUND_LORE[1].title}
            </p>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="md:w-[45%] flex-shrink-0 rounded-md overflow-hidden" style={{ border: `1px solid ${G.border}` }}>
                <Image src={ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.image || ROUND_LORE[1].image} alt="David y su agente" width={800} height={450} style={{ width: '100%', height: 'auto', display: 'block' }} className="grayscale opacity-75" />
              </div>
              <div className="flex flex-col gap-4 md:w-[55%]">
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.65 }}>
                  {ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.desc || ROUND_LORE[1].desc}
                  <span style={{ color: G.primary }}>{ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.highlight || ROUND_LORE[1].highlight}</span>
                  {ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.desc2 || ROUND_LORE[1].desc2}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.65 }}>
                  {ROUND_LORE[round.round_number as keyof typeof ROUND_LORE]?.mission || ROUND_LORE[1].mission}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tips y reglas abreviadas */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
          >
            {[
              { dot: G.primary, title: 'TRADUCCIÓN', text: 'Transcribe el párrafo.' },
              { dot: G.error,   title: 'PRECAUCIÓN', text: 'Si fallas, la pantalla parpadea.' },
              { dot: '#4ade80', title: 'BONUS +50T', text: 'Identifica el patrón al final.' },
            ].map(({ dot, title, text }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.border}`, borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 5px ${dot}` }} />
                  <span style={{ fontSize: '0.65rem', color: G.dim, letterSpacing: '0.1em' }}>{title}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{text}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>
          INICIANDO EN {countdown} SEGUNDOS — PREPARATE_
          <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>|</motion.span>
        </p>
      </div>
    </motion.div>
  )
}

// ─── Pantalla de resultados (3 s) ─────────────────────────
function ResultsScreen({ tokens, breakdown, roundNumber }: {
  tokens: number
  breakdown: Breakdown | null
  roundNumber: number
}) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  const rows = breakdown ? [
    { label: breakdown.completed ? 'Ronda completada' : 'Progreso parcial', value: breakdown.base, show: true },
    { label: 'Precision',   value: breakdown.accuracy, show: breakdown.completed },
    { label: 'Velocidad',   value: breakdown.speed,    show: breakdown.completed },
    { label: 'Tipo correcto (+bonus)', value: breakdown.bonus, show: breakdown.bonus > 0 },
  ].filter(r => r.show) : []

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
      style={{ background: 'rgba(3,7,18,0.97)', fontFamily: 'monospace' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
      }} />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm px-6">

        <p style={{ color: G.dim, fontSize: '0.68rem', letterSpacing: '0.3em' }}>
          RONDA {roundNumber} / 3 — RESULTADO
        </p>

        {/* Total tokens */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          style={{ textAlign: 'center' }}
        >
          <p style={{ color: G.dim, fontSize: '0.72rem', letterSpacing: '0.2em', marginBottom: 4 }}>
            TOKENS GANADOS
          </p>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '4rem', color: G.primary, lineHeight: 1, textShadow: G.glow }}>
            +{tokens}
          </p>
          <p style={{ color: G.dim, fontSize: '0.72rem', letterSpacing: '0.2em' }}>T</p>
        </motion.div>

        {/* Desglose */}
        {rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ width: '100%', background: G.panel, border: `1px solid ${G.border}`, borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {rows.map(({ label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{label}</span>
                <span style={{ color: value > 0 ? G.primary : G.dim, fontSize: '0.85rem', textShadow: value > 0 ? G.glowSoft : 'none' }}>
                  +{value} T
                </span>
              </motion.div>
            ))}
            <div style={{ height: 1, background: G.border, margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: G.primary, fontSize: '0.8rem', letterSpacing: '0.1em' }}>TOTAL</span>
              <span style={{ color: G.primary, fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', textShadow: G.glow }}>
                +{tokens} T
              </span>
            </div>
          </motion.div>
        )}

        {/* Countdown */}
        <motion.p
          key={countdown}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', letterSpacing: '0.2em' }}
        >
          SIGUIENTE RONDA EN {countdown}...
        </motion.p>
      </div>
    </motion.div>
  )
}

// ─── Componente principal ──────────────────────────────────
interface Breakdown { base: number; accuracy: number; speed: number; bonus: number; completed: boolean }

export function TypeOrDie({ round, teamId }: { round: Level1Round; teamId: string }) {
  // Parse trace si viene en JSON
  let tBefore = ''
  let tHighlight = round.technical_content || ''
  let tAfter = ''

  try {
    if (round.technical_content) {
      const parsed = JSON.parse(round.technical_content)
      if (parsed && parsed.trace_highlight) {
        tBefore = parsed.trace_before || ''
        tHighlight = parsed.trace_highlight || ''
        tAfter = parsed.trace_after || ''
      }
    }
  } catch { /* legacy */ }

  const [phase, setPhase] = useState<'intro' | 'playing' | 'results'>('intro')
  const [typedText, setTypedText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [identified, setIdentified] = useState<'react' | 'tool_calling' | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [shake, setShake] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [tokensEarned, setTokensEarned] = useState<number>(0)
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const keyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.body.classList.add('no-fluid')
    return () => document.body.classList.remove('no-fluid')
  }, [])

  const handleIntroEnd = useCallback(() => {
    setStartTime(Date.now())
    setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase === 'playing') textareaRef.current?.focus()
  }, [phase])

  const target = round.target_text
  const errorCount = countErrors(typedText, target)
  const pct = Math.min(typedText.length / target.length, 1)
  const isComplete = typedText.length >= target.length
  const canSubmit = isComplete && !!identified

  useEffect(() => {
    if (!typedText.length) return
    const last = typedText.length - 1
    if (typedText[last] !== target[last]) {
      setShake(true)
      setTimeout(() => setShake(false), 350)
    }
  }, [typedText, target])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitted) return
    const key = e.key
    const nextIndex = typedText.length
    const isError = key.length === 1 && nextIndex < target.length && key !== target[nextIndex]

    setActiveKey(key)
    if (isError) setErrorKey(key)
    else setErrorKey(null)

    if (keyTimerRef.current) clearTimeout(keyTimerRef.current)
    keyTimerRef.current = setTimeout(() => {
      setActiveKey(null)
      setErrorKey(null)
    }, 160)
  }, [submitted, typedText, target])

  useEffect(() => () => { if (keyTimerRef.current) clearTimeout(keyTimerRef.current) }, [])

  const handleSubmit = useCallback(async () => {
    if (submitted) return
    setSubmitted(true)
    setPhase('results')

    const finishTimeMs = Date.now() - startTime

    // Guardar submission
    await supabase.from('level1_submissions').upsert({
      round_id: round.id, team_id: teamId, typed_text: typedText,
      error_count: errorCount,
      finish_time_ms: isComplete ? finishTimeMs : null,
      identified_correctly: identified === round.output_type,
    })

    // Calcular tokens y obtener desglose
    try {
      const res = await fetch('/api/award-level1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: round.id, teamId }),
      })
      const data = await res.json()
      setTokensEarned(data.tokens ?? 0)
      setBreakdown(data.breakdown ?? null)
    } catch { /* silencioso */ }

    // Mostrar resultados 3 segundos y luego terminar la ronda
    setTimeout(() => {
      fetch('/api/finish-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: round.id }),
      }).catch(() => {})
    }, 3000)
  }, [submitted, startTime, round, teamId, typedText, errorCount, isComplete, identified])

  return (
    <>
      <AnimatePresence>
        {phase === 'intro' && (
          <IntroScreen key="intro" round={round} onDone={handleIntroEnd} />
        )}
      </AnimatePresence>

      {/* Layout de dos columnas */}
      <div className="relative z-10 flex gap-4 p-4 w-full" style={{ minHeight: 0 }}>

        {/* ── IZQUIERDA: terminal + teclado ── */}
        <div className="flex flex-col gap-3" style={{ flex: '0 0 44%', minWidth: 0 }}>

          {/* Header ronda */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="cup-badge">Ronda {round.round_number}/3</span>
            <span className="cup-badge">
              {round.output_type === 'react' ? 'ReAct' : 'Tool Calling'}
            </span>
          </div>

          {/* Terminal */}
          <div style={{ border: `1px solid ${G.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: `0 4px 20px rgba(0,0,0,0.7), ${G.glowSoft}`, flex: 1 }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              <span className="font-mono text-xs" style={{ color: G.dim, letterSpacing: '0.08em' }}>
                {round.output_type === 'react' ? 'agent_trace.log' : 'tool_call.json'}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3" style={{ background: G.bg, maxHeight: 240, overflow: 'auto' }}>
              {tBefore && (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {tBefore}
                </div>
              )}
              
              <div style={{ background: 'rgba(250,204,21,0.06)', borderLeft: `3px solid ${G.primary}`, padding: '8px 12px', borderRadius: '0 4px 4px 0' }}>
                <DecryptedText
                  text={tHighlight}
                  animateOn="view"
                  revealDirection="start"
                  sequential
                  speed={40}
                  className="text-xs font-mono"
                  style={{ color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                />
              </div>

              {tAfter && (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {tAfter}
                </div>
              )}
            </div>
          </div>

          {/* Teclado */}
          {!submitted && phase === 'playing' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Keyboard activeKey={activeKey} errorKey={errorKey} />
            </motion.div>
          )}
        </div>

        {/* ── DERECHA: zona de tipeo + stats ── */}
        <div className="flex flex-col gap-3" style={{ flex: 1, minWidth: 0 }}>

          {/* Timer + progress bar en una fila */}
          <div className="flex items-center gap-3">
            {phase === 'playing' && (
              <Timer
                seconds={ROUND_SECONDS}
                onExpire={handleSubmit}
                startedAt={round.started_at ? new Date(round.started_at).getTime() : undefined}
              />
            )}
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{
                  height: '100%',
                  background: isComplete ? '#22c55e' : errorCount > 5 ? '#f87171' : '#facc15',
                  borderRadius: 99,
                }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Zona de tipeo */}
          <motion.div
            animate={shake ? { x: [-8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
            className="relative cursor-text"
            style={{
              border: `1px solid ${shake ? 'rgba(244,63,94,0.7)' : G.border}`,
              borderRadius: 8,
              background: G.panel,
              boxShadow: shake ? `0 0 20px rgba(244,63,94,0.4)` : G.glowSoft,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              flex: 1,
            }}
            onClick={() => textareaRef.current?.focus()}
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>
                Documenta la acción resaltada:
              </p>
            </div>

            <div className="px-4 pb-4 select-none relative"
              style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '0.95rem', lineHeight: 1.85 }}>
              {target.split('').map((char, i) => {
                const typed = typedText[i]
                const isCursor = i === typedText.length
                let color = 'rgba(255,255,255,0.28)'
                let bg = 'transparent'
                if (typed !== undefined) {
                  color = typed === char ? '#ffffff' : G.error
                  bg = typed !== char ? 'rgba(248,113,113,0.12)' : 'transparent'
                }
                return (
                  <span key={i} className="relative" style={{ color, background: bg }}>
                    {isCursor && !submitted && (
                      <motion.span className="absolute -left-px top-1 bottom-0 w-0.5"
                        style={{ background: G.primary, borderRadius: 2 }}
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                      />
                    )}
                    {char}
                  </span>
                )
              })}
              {typedText.length >= target.length && !submitted && (
                <motion.span className="inline-block w-0.5 h-5 align-middle ml-px"
                  style={{ background: 'var(--cup-gold)', borderRadius: 2 }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
              )}
            </div>

            <textarea ref={textareaRef} value={typedText}
              onChange={(e) => !submitted && phase === 'playing' && setTypedText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitted || phase === 'intro'}
              className="absolute inset-0 opacity-0 resize-none cursor-text"
              aria-label="Campo de escritura"
            />
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Progreso', value: `${Math.round(pct * 100)}%`, color: pct === 1 ? G.primary : G.dim },
              { label: 'Errores', value: String(errorCount), color: errorCount === 0 ? '#22c55e' : G.error },
              { label: 'Chars', value: `${typedText.length}/${target.length}`, color: G.dim },
            ].map(({ label, value, color }) => (
              <div key={label} className="cup-panel text-center py-2 px-3">
                <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: G.dim }}>{label}</p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', lineHeight: 1, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Bonus identificacion */}
          <AnimatePresence>
            {isComplete && !submitted && phase === 'playing' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: G.panel, border: `1px solid ${G.primary}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontFamily: 'monospace', color: G.primary, textAlign: 'center', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                  {'>'} COMPLETADO — +50T BONUS: identifica el tipo de output
                </p>
                <div className="flex gap-3">
                  {(['react', 'tool_calling'] as const).map((type) => (
                    <button key={type} onClick={() => setIdentified(type)}
                      className="cup-btn flex-1 py-2 text-sm"
                      style={{
                        background: identified === type ? 'rgba(250,204,21,0.12)' : G.bg,
                        borderColor: identified === type ? G.primary : G.border,
                        color: identified === type ? G.primary : G.dim,
                        fontFamily: 'monospace',
                      }}>
                      {type === 'react' ? 'ReAct' : 'Tool Calling'}
                    </button>
                  ))}
                </div>
                <button onClick={handleSubmit} disabled={!canSubmit}
                  style={{ background: canSubmit ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canSubmit ? G.primary : G.border}`, borderRadius: 6, padding: '8px 0', fontFamily: 'monospace', color: canSubmit ? G.primary : G.dim, cursor: canSubmit ? 'pointer' : 'not-allowed', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
                  Enviar y reclamar tokens
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'results' && (
              <ResultsScreen
                key="results"
                tokens={tokensEarned}
                breakdown={breakdown}
                roundNumber={round.round_number}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
