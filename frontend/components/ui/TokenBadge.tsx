'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { ShinyText } from '@/components/ui/ShinyText'

export function TokenBadge({ balance, delta }: { balance: number; delta?: number }) {
  const [showDelta, setShowDelta] = useState(false)
  useEffect(() => {
    if (delta && delta !== 0) {
      setShowDelta(true)
      const t = setTimeout(() => setShowDelta(false), 2000)
      return () => clearTimeout(t)
    }
  }, [delta, balance])

  return (
    <div className="relative flex items-center gap-2 px-4 py-2 rounded-lg border"
      style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)' }}>
      {/* Coin dot */}
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#facc15', display: 'inline-block', flexShrink: 0 }} />

      {/* Shiny balance number */}
      <motion.span key={balance} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
        <ShinyText
          text={`${balance.toLocaleString()} T`}
          speed={2.5}
          className="font-black"
          style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.05rem' }}
        />
      </motion.span>

      {/* Delta float-up */}
      <AnimatePresence>
        {showDelta && delta && delta !== 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: delta > 0 ? -30 : 30 }}
            transition={{ duration: 1.5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none font-black text-base"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: delta > 0 ? '#facc15' : '#f87171',
              WebkitTextStroke: '1px black',
            }}
          >
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
