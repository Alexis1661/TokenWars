'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  seconds: number
  onExpire?: () => void
  /** Si se pasa, el tiempo restante se calcula a partir de este timestamp (global/servidor) */
  startedAt?: number
}

export function Timer({ seconds, onExpire, startedAt }: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const onExpireRef = useRef(onExpire)
  const expiredRef = useRef(false)

  // Mantener la referencia actualizada sin que cause re-render ni reinicio del interval
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  useEffect(() => {
    expiredRef.current = false
    const origin = startedAt ?? Date.now()

    const tick = () => {
      const elapsed = (Date.now() - origin) / 1000
      const left = Math.max(0, Math.ceil(seconds - elapsed))
      setRemaining(left)
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }

    tick() // primer tick inmediato
    const id = setInterval(tick, 500) // cada 500ms para respuesta visual suave
    return () => clearInterval(id)
  // Solo reiniciar si cambia la ronda (seconds o startedAt)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, startedAt])

  const pct = remaining / seconds
  const isDanger = remaining <= 5
  const isWarn   = remaining <= 10
  const color = isDanger ? '#f43f5e' : isWarn ? '#facc15' : '#00ff41'
  const r = 20
  const circ = 2 * Math.PI * r

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
        />
      </svg>
      <motion.div
        key={remaining <= 5 ? remaining : 'stable'}
        animate={isDanger ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color, lineHeight: 1,
          textShadow: isDanger ? `0 0 10px ${color}` : 'none' }}
      >
        {remaining}
      </motion.div>
    </div>
  )
}
