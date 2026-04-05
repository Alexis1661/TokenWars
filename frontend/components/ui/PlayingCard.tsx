'use client'
import { motion } from 'framer-motion'

export interface PlayingCardProps {
  name: string
  emoji: string
  description: string
  /** false = boca abajo, true = carta revelada */
  revealed: boolean
  /** true = seleccionada para usar esta ronda */
  selected: boolean
  onClick: () => void
  disabled?: boolean
  /** ms de delay antes de auto-flip (para stagger entre cartas) */
  flipDelay?: number
}

export function PlayingCard({
  name,
  emoji,
  description,
  revealed,
  selected,
  onClick,
  disabled = false,
  flipDelay = 0,
}: PlayingCardProps) {
  return (
    <div
      onClick={() => !disabled && revealed && onClick()}
      style={{
        width: 120,
        height: 172,
        perspective: '900px',
        cursor: disabled || !revealed ? 'default' : 'pointer',
        flexShrink: 0,
      }}
    >
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.65, delay: flipDelay / 1000, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* ── CARA TRASERA (boca abajo) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: 12,
            background: 'linear-gradient(145deg, #1a0a2e 0%, #0d1b2a 100%)',
            border: '2px solid #FFD700',
            boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            overflow: 'hidden',
          }}
        >
          {/* Marco interior decorativo */}
          <div
            style={{
              position: 'absolute',
              inset: 7,
              border: '1px solid rgba(255,215,0,0.35)',
              borderRadius: 7,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,215,0,0.04) 0px, rgba(255,215,0,0.04) 1px, transparent 1px, transparent 8px)',
            }}
          />
          <span style={{ fontSize: '2.2rem', opacity: 0.5 }}>🂠</span>
          <span
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.45rem',
              color: 'rgba(255,215,0,0.4)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            CASINO
          </span>
        </div>

        {/* ── CARA DELANTERA (revelada) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 12,
            background: 'linear-gradient(145deg, #12052a 0%, #0a1020 100%)',
            border: `2px solid ${selected ? '#FFD700' : 'rgba(255,215,0,0.3)'}`,
            boxShadow: selected
              ? '0 0 18px rgba(255,215,0,0.55), 0 6px 20px rgba(0,0,0,0.6)'
              : '0 6px 20px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px 8px',
            overflow: 'hidden',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Corner markers */}
          <span
            style={{
              position: 'absolute',
              top: 5,
              left: 8,
              fontSize: '0.75rem',
              lineHeight: 1,
              opacity: 0.7,
            }}
          >
            {emoji}
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: 5,
              right: 8,
              fontSize: '0.75rem',
              lineHeight: 1,
              opacity: 0.7,
              transform: 'rotate(180deg)',
            }}
          >
            {emoji}
          </span>

          {/* Main emoji */}
          <span style={{ fontSize: '2.4rem', lineHeight: 1, marginTop: 8 }}>{emoji}</span>

          {/* Card name */}
          <span
            style={{
              color: '#FFD700',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.5rem',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.3,
              letterSpacing: '0.04em',
              marginTop: 6,
            }}
          >
            {name}
          </span>

          {/* Divider */}
          <div
            style={{
              width: '80%',
              height: 1,
              background: 'rgba(255,215,0,0.25)',
              margin: '5px 0',
            }}
          />

          {/* Description */}
          <span
            style={{
              color: '#b0b0b0',
              fontSize: '0.5rem',
              textAlign: 'center',
              lineHeight: 1.35,
              flexGrow: 1,
            }}
          >
            {description}
          </span>

          {selected && (
            <div
              style={{
                marginTop: 4,
                background: 'rgba(255,215,0,0.15)',
                border: '1px solid #FFD700',
                borderRadius: 4,
                padding: '2px 6px',
                color: '#FFD700',
                fontSize: '0.45rem',
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              ✓ ACTIVA
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
