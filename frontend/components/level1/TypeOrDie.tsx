'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Timer } from '@/components/ui/Timer'
import type { Level1Round } from '@/lib/types'

function countErrors(typed: string, target: string): number {
  let e = 0
  for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) e++
  return e
}

export function TypeOrDie({ round, teamId }: { round: Level1Round; teamId: string }) {
  const [typedText, setTypedText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [identified, setIdentified] = useState<'react' | 'tool_calling' | null>(null)
  const [startTime] = useState(Date.now())
  const [shake, setShake] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const target = round.target_text
  const errorCount = countErrors(typedText, target)
  const pct = Math.min(typedText.length / target.length, 1)
  const isComplete = typedText.length >= target.length
  const canSubmit = isComplete && !!identified

  useEffect(() => {
    if (!typedText.length) return
    const last = typedText.length - 1
    if (typedText[last] !== target[last]) {
      setShake(true); setTimeout(() => setShake(false), 350)
    }
  }, [typedText, target])

  const handleSubmit = async () => {
    if (submitted) return
    setSubmitted(true)
    const finishTimeMs = Date.now() - startTime
    await supabase.from('level1_submissions').upsert({
      round_id: round.id, team_id: teamId, typed_text: typedText,
      error_count: errorCount,
      finish_time_ms: isComplete ? finishTimeMs : null,
      identified_correctly: identified === round.output_type,
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="cup-badge" style={{ background: 'var(--cup-red)', fontSize: '1rem' }}>
            Ronda {round.round_number}/3
          </span>
          <span className="cup-badge" style={{
            background: round.output_type === 'react' ? '#4a1d8a' : '#0a5c6e',
            fontSize: '0.85rem',
          }}>
            {round.output_type === 'react' ? '🔄 ReAct' : '🛠️ Tool Calling'}
          </span>
        </div>
        <Timer seconds={90} onExpire={handleSubmit} />
      </div>

      {/* Contexto técnico — terminal estilo retro */}
      <div style={{ border: '4px solid var(--cup-black)', borderRadius: 4, overflow: 'hidden', boxShadow: '5px 5px 0 var(--cup-black)' }}>
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'var(--cup-red)', borderBottom: '3px solid var(--cup-black)' }}>
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e', border: '2px solid var(--cup-black)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#ff6059', border: '2px solid var(--cup-black)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#28ca42', border: '2px solid var(--cup-black)' }} />
          </div>
          <span className="font-mono text-xs" style={{ color: 'var(--cup-cream)', letterSpacing: '0.1em' }}>
            {round.output_type === 'react' ? '📋 agent_trace.log' : '📦 tool_call.json'}
          </span>
        </div>
        <pre className="font-mono text-sm p-4 whitespace-pre-wrap leading-relaxed select-none"
          style={{ background: '#0d0400', color: '#d4ffa0' }}>
          {round.technical_content}
        </pre>
      </div>

      {/* Zona de tipeo — con efecto de pergamino */}
      <motion.div
        animate={shake ? { x: [-8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative cursor-text"
        style={{ border: '4px solid var(--cup-black)', borderRadius: 4, background: 'var(--cup-parchment)', boxShadow: shake ? '5px 5px 0 var(--cup-red)' : '5px 5px 0 var(--cup-black)' }}
        onClick={() => textareaRef.current?.focus()}
      >
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold-dark)' }}>
            ✍️ Escribe exactamente este párrafo
          </p>
        </div>

        {/* Texto con colores */}
        <div className="px-4 pb-4 text-base leading-8 select-none font-sans relative"
          style={{ fontFamily: "'Boogaloo', cursive", fontSize: '1rem' }}>
          {target.split('').map((char, i) => {
            const typed = typedText[i]
            const isCursor = i === typedText.length
            let color = '#8b7340'
            let bg = 'transparent'
            if (typed !== undefined) {
              color = typed === char ? '#1a0800' : '#c41010'
              bg = typed !== char ? 'rgba(196,16,16,0.15)' : 'transparent'
            }
            return (
              <span key={i} className="relative" style={{ color, background: bg }}>
                {isCursor && !submitted && (
                  <motion.span className="absolute -left-px top-1 bottom-0 w-0.5"
                    style={{ background: 'var(--cup-red)' }}
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  />
                )}
                {char}
              </span>
            )
          })}
          {typedText.length >= target.length && !submitted && (
            <motion.span className="inline-block w-0.5 h-5 align-middle ml-px"
              style={{ background: 'var(--cup-red)' }}
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
            />
          )}
        </div>

        <textarea ref={textareaRef} value={typedText}
          onChange={(e) => !submitted && setTypedText(e.target.value)}
          disabled={submitted}
          className="absolute inset-0 opacity-0 resize-none cursor-text"
          aria-label="Campo de escritura"
        />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Progreso', value: `${Math.round(pct * 100)}%`, ok: pct === 1 },
          { label: 'Errores', value: String(errorCount), ok: errorCount === 0 },
          { label: 'Chars', value: `${typedText.length}/${target.length}`, ok: null },
        ].map(({ label, value, ok }) => (
          <div key={label} className="cup-panel text-center py-2 px-3" style={{ boxShadow: '3px 3px 0 var(--cup-black)' }}>
            <p className="text-xs" style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold-dark)' }}>{label}</p>
            <p style={{
              fontFamily: "'Lilita One', cursive", fontSize: '1.3rem', lineHeight: 1,
              color: ok === null ? 'var(--cup-black)' : ok ? '#166534' : 'var(--cup-red)',
            }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 12, background: 'rgba(0,0,0,0.2)', border: '3px solid var(--cup-black)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div style={{
          height: '100%',
          background: isComplete ? '#166534' : errorCount > 5 ? 'var(--cup-red)' : 'var(--cup-gold)',
          borderRight: '2px solid var(--cup-black)',
        }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Bonus identificación */}
      <AnimatePresence>
        {isComplete && !submitted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="cup-panel p-4 flex flex-col gap-3">
            <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-red)', textAlign: 'center', fontSize: '1.1rem' }}>
              ¡Completado! Bonus +50T — ¿Qué tipo de output es?
            </p>
            <div className="flex gap-3">
              {(['react', 'tool_calling'] as const).map((type) => (
                <button key={type} onClick={() => setIdentified(type)}
                  className="cup-btn flex-1 py-3 text-base"
                  style={{ background: identified === type ? 'var(--cup-red)' : 'var(--cup-bg2)', color: 'var(--cup-cream)', border: '3px solid var(--cup-black)', boxShadow: identified === type ? '4px 4px 0 var(--cup-red-dark)' : '4px 4px 0 var(--cup-black)' }}>
                  {type === 'react' ? '🔄 ReAct' : '🛠️ Tool Calling'}
                </button>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit} className="cup-btn cup-btn-gold py-3 text-lg">
              ✅ Enviar y reclamar tokens
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="cup-panel text-center py-6">
            <p className="text-4xl mb-2">🚀</p>
            <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-red)', fontSize: '1.5rem' }}>¡Enviado!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--cup-gold-dark)' }}>Esperando a los demás equipos...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
