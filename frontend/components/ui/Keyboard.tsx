'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

const WIDE_KEYS: Record<string, number> = {
  'BACKSPACE': 1.8,
  'CAPS': 1.4,
  'SHIFT': 2,
  'SPACE': 5,
  'ENTER': 1.6,
}

interface Props {
  activeKey: string | null
  errorKey?: string | null
}

function Key({ label, active, error, flex }: { label: string; active: boolean; error: boolean; flex?: number }) {
  return (
    <motion.div
      animate={
        active
          ? { scale: [1, 0.88, 1], y: [0, 2, 0] }
          : error
          ? { x: [0, -3, 3, -2, 0] }
          : {}
      }
      transition={{ duration: active ? 0.18 : 0.15, ease: 'easeOut' }}
      style={{
        flex: flex ?? 1,
        minWidth: flex ? `${flex * 28}px` : '28px',
        height: 32,
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: label.length > 1 ? '0.48rem' : '0.7rem',
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: '0.05em',
        userSelect: 'none',
        transition: 'background 0.12s, box-shadow 0.12s, border-color 0.12s',
        background: active
          ? 'rgba(168,85,247,0.55)'
          : error
          ? 'rgba(244,63,94,0.35)'
          : 'rgba(168,85,247,0.07)',
        border: `1px solid ${active ? 'rgba(168,85,247,0.9)' : error ? 'rgba(244,63,94,0.6)' : 'rgba(168,85,247,0.2)'}`,
        boxShadow: active
          ? '0 0 10px rgba(168,85,247,0.7), inset 0 1px 0 rgba(255,255,255,0.15)'
          : error
          ? '0 0 8px rgba(244,63,94,0.5)'
          : 'inset 0 -2px 0 rgba(0,0,0,0.4)',
        color: active ? '#fff' : error ? 'rgba(244,63,94,0.9)' : 'rgba(232,224,248,0.5)',
      }}
    >
      {label === 'SPACE' ? '' : label}
    </motion.div>
  )
}

export function Keyboard({ activeKey, errorKey }: Props) {
  const norm = (k: string | null) => k?.toUpperCase() ?? null

  const ak = norm(activeKey)
  const ek = norm(errorKey)

  const isActive = (k: string) => ak === k || (k === 'SPACE' && ak === ' ')
  const isError  = (k: string) => ek === k || (k === 'SPACE' && ek === ' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 8px', background: 'rgba(9,8,15,0.8)', borderRadius: 10, border: '1px solid rgba(168,85,247,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      {/* Row 0 – digits */}
      <div style={{ display: 'flex', gap: 3 }}>
        {ROWS[0].map(k => <Key key={k} label={k} active={isActive(k)} error={isError(k)} />)}
        <Key label="BACK" active={isActive('BACKSPACE')} error={isError('BACKSPACE')} flex={1.8} />
      </div>
      {/* Row 1 – QWERTY */}
      <div style={{ display: 'flex', gap: 3, paddingLeft: 8 }}>
        {ROWS[1].map(k => <Key key={k} label={k} active={isActive(k)} error={isError(k)} />)}
      </div>
      {/* Row 2 – ASDF + Enter */}
      <div style={{ display: 'flex', gap: 3, paddingLeft: 14 }}>
        {ROWS[2].map(k => <Key key={k} label={k} active={isActive(k)} error={isError(k)} />)}
        <Key label="ENTER" active={isActive('ENTER')} error={isError('ENTER')} flex={1.6} />
      </div>
      {/* Row 3 – ZXCV */}
      <div style={{ display: 'flex', gap: 3, paddingLeft: 28 }}>
        {ROWS[3].map(k => <Key key={k} label={k} active={isActive(k)} error={isError(k)} />)}
      </div>
      {/* Spacebar */}
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
        <Key label="SPACE" active={isActive('SPACE') || isActive(' ')} error={isError('SPACE') || isError(' ')} flex={5} />
      </div>
    </div>
  )
}
