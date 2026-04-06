'use client'
import { AnimatePresence, motion } from 'framer-motion'
import type { Team } from '@/lib/types'

export function Scoreboard({ teams, highlightTeamId }: { teams: Team[]; highlightTeamId?: string }) {
  const sorted = [...teams].sort((a, b) => b.token_balance - a.token_balance)

  return (
    <div className="w-full space-y-2">
      <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15', fontSize: '1.1rem', letterSpacing: '0.15em', textAlign: 'center' }}>
        CLASIFICACIÓN
      </h2>

      <AnimatePresence>
        {sorted.map((team, i) => {
          const isMe = team.id === highlightTeamId
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{
                background: isMe ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? '#facc15' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.2rem',
                color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#a3a3a3',
                width: 28,
                textAlign: 'center',
              }}>
                {`#${i + 1}`}
              </span>
              <span style={{ flex: 1, color: isMe ? '#facc15' : '#ffffff', fontWeight: isMe ? 700 : 400 }}>
                {team.name}
                {isMe && <span style={{ fontSize: '0.7rem', color: '#a3a3a3', marginLeft: 8 }}>◀ TU</span>}
              </span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15', fontWeight: 700 }}>
                {team.token_balance} T
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {sorted.length === 0 && (
        <p className="text-center py-6 text-sm" style={{ color: '#a3a3a3' }}>Esperando equipos...</p>
      )}
    </div>
  )
}
