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
      style={{ background: 'var(--cup-gold)', color: 'var(--cup-black)', fontSize: '1.1rem' }}>
      <span>💰</span>
      <motion.span key={balance} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
        style={{ fontFamily: "'Lilita One', cursive" }}>
        {balance.toLocaleString()} T
      </motion.span>
      <AnimatePresence>
        {showDelta && delta && delta !== 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: delta > 0 ? -30 : 30 }}
            transition={{ duration: 1.5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none font-black text-base"
            style={{ fontFamily: "'Lilita One', cursive", color: delta > 0 ? '#166534' : 'var(--cup-red)', WebkitTextStroke: '1px black' }}>
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
