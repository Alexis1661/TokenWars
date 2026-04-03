'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

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
    <div className="relative cup-badge flex items-center gap-2 px-4 py-2"
      style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--cup-gold)', fontSize: '1.1rem', border: '1px solid var(--cup-gold)', boxShadow: 'var(--glow-blue)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cup-gold)', display: 'inline-block' }} />
      <motion.span key={balance} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
        style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {balance.toLocaleString()} T
      </motion.span>
      <AnimatePresence>
        {showDelta && delta && delta !== 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: delta > 0 ? -30 : 30 }}
            transition={{ duration: 1.5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none font-black text-base"
            style={{ fontFamily: "'Orbitron', sans-serif", color: delta > 0 ? '#9333ea' : 'var(--cup-red)', WebkitTextStroke: '1px black' }}>
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
