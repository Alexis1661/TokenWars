'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="min-h-screen cup-stars-bg flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{ background: 'var(--cup-bg)' }}>

      {/* Viñeta */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Orbes de luz decorativos */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', top: '10%', left: '50%', transform: 'translateX(-50%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Corner pos="top-4 left-4" />
      <Corner pos="top-4 right-4 scale-x-[-1]" />
      <Corner pos="bottom-4 left-4 scale-y-[-1]" />
      <Corner pos="bottom-4 right-4 scale-[-1]" />

      <motion.div
        className="relative flex flex-col items-center gap-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >

        {/* Logo */}
        <div className="text-center">
          {/* Icono animado sin emoji — cuadrado con animación float */}
          <motion.div
            className="animate-float mx-auto mb-4"
            style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', border: '1px solid rgba(168,85,247,0.5)', boxShadow: 'var(--glow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="13" width="20" height="3" rx="1.5" fill="rgba(168,85,247,0.9)" />
              <rect x="14.5" y="5" width="3" height="20" rx="1.5" fill="rgba(168,85,247,0.9)" />
              <circle cx="7" cy="22" r="3" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
              <circle cx="25" cy="22" r="3" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
            </svg>
          </motion.div>

          <motion.h1
            className="cup-text-outline"
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', lineHeight: 1, fontSize: 'clamp(3rem, 12vw, 5rem)' }}
            initial={{ letterSpacing: '0.3em', opacity: 0 }}
            animate={{ letterSpacing: '0.08em', opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            TOKEN<br />WARS
          </motion.h1>

          <div className="cup-divider mt-3">El juego de los agentes</div>

          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {['ReAct', 'Tool Calling', 'Prompt Eng.'].map((t, i) => (
              <motion.span key={t} className="cup-badge"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}>
                {t}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-4 w-full">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link href="/join" className="cup-btn cup-btn-gold block text-center text-xl py-4 px-6 no-underline">
              Unirse a partida
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link href="/host" className="cup-btn cup-btn-dark block text-center text-lg py-3 px-6 no-underline">
              Panel del Profesor
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </main>
  )
}

function Corner({ pos }: { pos: string }) {
  return (
    <div className={`absolute ${pos} w-16 h-16 pointer-events-none`}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4 L4 24 M4 4 L24 4" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 4 L16 16" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
        <circle cx="4" cy="4" r="3" fill="#a855f7"/>
        <circle cx="24" cy="4" r="1.5" fill="#a855f7" opacity="0.5"/>
        <circle cx="4" cy="24" r="1.5" fill="#a855f7" opacity="0.5"/>
      </svg>
    </div>
  )
}
