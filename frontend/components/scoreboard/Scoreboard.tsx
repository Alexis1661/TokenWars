'use client'
import { AnimatePresence, motion } from 'framer-motion'
import type { Team } from '@/lib/types'

const MEDAL = ['🥇', '🥈', '🥉']

export function Scoreboard({ teams, highlightTeamId }: { teams: Team[]; highlightTeamId?: string }) {
  return (
    <div className="w-full space-y-2">
      <h2 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '1.4rem', letterSpacing: '0.15em', textAlign: 'center' }}>
        ★ SCOREBOARD ★
      </h2>

      <AnimatePresence>
        {teams.map((team, i) => {
          const isMe = team.id === highlightTeamId
          return (
            <motion.div key={team.id} layoutId={team.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                background: isMe ? 'var(--cup-gold)' : i === 0 ? '#fff8e7' : 'var(--cup-cream)',
                border: '3px solid var(--cup-black)',
                boxShadow: `4px 4px 0 ${isMe ? 'var(--cup-red)' : 'var(--cup-black)'}`,
                borderRadius: 4,
              }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="text-xl w-8 text-center flex-shrink-0">
                {i < 3 ? MEDAL[i] : <span style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-black)', fontSize: '1rem' }}>{i + 1}</span>}
              </span>
              <span className="flex-1 font-bold truncate" style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-black)', fontSize: '1.05rem' }}>
                {team.name}
                {isMe && <span style={{ color: 'var(--cup-red)', fontSize: '0.75rem', marginLeft: 6 }}>(tú)</span>}
              </span>
              <motion.div key={team.token_balance}
                initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}
                className="flex items-center gap-1">
                <span style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-red)', fontSize: '1.2rem' }}>
                  {team.token_balance.toLocaleString()}
                </span>
                <span style={{ color: 'var(--cup-gold-dark)', fontSize: '0.8rem', fontFamily: "'Lilita One', cursive" }}>T</span>
              </motion.div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {teams.length === 0 && (
        <p className="text-center py-6 text-sm" style={{ color: 'var(--cup-gold-dark)' }}>Esperando equipos...</p>
      )}
    </div>
  )
}
