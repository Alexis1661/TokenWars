'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function Timer({ seconds, onExpire }: { seconds: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => { setRemaining(seconds) }, [seconds])
  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return }
    const id = setTimeout(() => setRemaining(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onExpire])

  const pct = remaining / seconds
  const isDanger = remaining <= 5
  const isWarn = remaining <= 15

  const color = isDanger ? '#c41010' : isWarn ? '#d4a017' : '#166534'
  const r = 20
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        {/* Panel cuadrado estilo Cuphead dentro del círculo */}
        <motion.div
          key={remaining}
          animate={isDanger ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontFamily: "'Lilita One', cursive", fontSize: '1.1rem', color, lineHeight: 1 }}
        >
          {remaining}
        </motion.div>
      </div>
    </div>
  )
}
