'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { DecryptedText } from '@/components/ui/DecryptedText'

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'tw_device_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

export default function JoinPage() {
  const router = useRouter()
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [hostCode, setHostCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reconnecting, setReconnecting] = useState(true)
  const [reconnectInfo, setReconnectInfo] = useState<{ teamName: string; hostCode: string } | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.classList.add('no-fluid')
    return () => document.body.classList.remove('no-fluid')
  }, [])

  // Al cargar: verificar si hay una sesión activa guardada en localStorage
  useEffect(() => {
    const savedTeamId = localStorage.getItem('tw_team_id')
    if (!savedTeamId) { setReconnecting(false); return }

    fetch('/api/reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: savedTeamId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setReconnectInfo({ teamName: data.teamName, hostCode: data.hostCode })
        }
        setReconnecting(false)
      })
      .catch(() => setReconnecting(false))
  }, [])

  const handleReconnect = () => {
    const savedTeamId = localStorage.getItem('tw_team_id')
    if (savedTeamId) router.push(`/play/${savedTeamId}`)
  }

  const handleDismissReconnect = () => {
    localStorage.removeItem('tw_team_id')
    setReconnectInfo(null)
  }

  const handleCodeSubmit = () => {
    if (hostCode.length !== 6) { setError('El código tiene 6 caracteres'); return }
    setError(''); setStep('name')
    setTimeout(() => nameRef.current?.focus(), 100)
  }

  const handleJoin = async () => {
    if (!teamName.trim()) { setError('Escribe el nombre de tu equipo'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostCode: hostCode.toUpperCase().trim(), teamName: teamName.trim(), deviceId: getDeviceId() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al unirse'); setLoading(false); return }
      localStorage.setItem('tw_team_id', data.teamId)
      router.push(`/play/${data.teamId}`)
    } catch { setError('Error de red. Intenta de nuevo.'); setLoading(false) }
  }

  // Mientras verifica localStorage
  if (reconnecting) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
          <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>Verificando sesión...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen cup-stars-bg flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--cup-bg)' }}>

      {/* Modal de reconexión */}
      <AnimatePresence>
        {reconnectInfo && (
          <motion.div
            key="reconnect-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="cup-panel p-6 w-full max-w-sm flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="text-4xl mb-2"></div>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1.8rem', lineHeight: 1 }}>
                  ¡Partida activa!
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif" }}>
                  Encontramos tu sesión anterior
                </p>
              </div>

              <div className="rounded" style={{ background: 'rgba(0,0,0,0.1)', border: '2px solid var(--cup-gold-dark)', padding: '12px 16px' }}>
                <p className="text-xs" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Orbitron', sans-serif" }}>EQUIPO</p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-red)', fontSize: '1.5rem' }}>
                  {reconnectInfo.teamName}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--cup-gold-dark)', letterSpacing: '0.15em' }}>
                  Sesión: <span style={{ color: 'var(--cup-cream)' }}>{reconnectInfo.hostCode}</span>
                </p>
              </div>

              <button onClick={handleReconnect} className="cup-btn cup-btn-gold text-xl py-3">
                ¡Reincorporarme!
              </button>

              <button onClick={handleDismissReconnect}
                className="text-sm text-center py-2"
                style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif" }}>
                No, unirme a otra sesión
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <DecryptedText
            text="TOKEN WARS"
            animateOn="view"
            revealDirection="center"
            className="cup-text-outline"
            parentClassName="block mb-1"
            speed={150}
            maxIterations={40}
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '2.5rem', lineHeight: 1, fontWeight: 'bold' }}
          />
        </div>

        {/* Card principal */}
        <div className="cup-panel p-6 flex flex-col gap-5">

          {/* Título del paso */}
          <div className="cup-divider text-base">
            {step === 'code' ? '★ Ingresa el Código ★' : '★ Nombre del Equipo ★'}
          </div>

          <AnimatePresence mode="wait">

            {/* PASO 1 — Código */}
            {step === 'code' && (
              <motion.div key="code"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <p className="text-center text-sm" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif" }}>
                  El profe lo proyecta en la pantalla
                </p>

                <input
                  autoFocus value={hostCode}
                  onChange={(e) => { setHostCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                  maxLength={6} placeholder="XXXXXX"
                  className="cup-input text-center tracking-[0.4em] font-black"
                  style={{ fontSize: '2.5rem', letterSpacing: '0.4em', color: 'var(--cup-red)', fontFamily: "'Orbitron', sans-serif" }}
                />

                {/* Indicadores */}
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-2 flex-1 rounded-sm transition-all"
                      style={{ background: i < hostCode.length ? 'var(--cup-red)' : 'rgba(0,0,0,0.15)', border: '1px solid rgba(168,85,247,0.2)' }} />
                  ))}
                </div>

                {error && <p className="text-center text-sm font-bold" style={{ color: 'var(--cup-red)' }}>⚠ {error}</p>}

                <button onClick={handleCodeSubmit} disabled={hostCode.length !== 6} className="cup-btn cup-btn-gold text-xl py-3">
                  Continuar →
                </button>
              </motion.div>
            )}

            {/* PASO 2 — Nombre */}
            {step === 'name' && (
              <motion.div key="name"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                {/* Badge del código */}
                <button onClick={() => { setStep('code'); setError('') }}
                  className="flex items-center justify-between px-4 py-2 rounded"
                  style={{ background: 'rgba(0,0,0,0.08)', border: '2px solid var(--cup-gold-dark)' }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-red)', fontSize: '1.5rem', letterSpacing: '0.2em' }}>{hostCode}</span>
                  <span className="text-xs" style={{ color: 'var(--cup-gold-dark)' }}>← cambiar</span>
                </button>

                <p className="text-center text-sm" style={{ color: 'var(--cup-gold-dark)' }}>¡Ponle un nombre épico!</p>

                <input ref={nameRef} value={teamName}
                  onChange={(e) => { setTeamName(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  maxLength={30} placeholder="Los Transformers..."
                  className="cup-input text-xl font-bold"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                />

                {error && <p className="text-center text-sm font-bold" style={{ color: 'var(--cup-red)' }}>⚠ {error}</p>}

                <button onClick={handleJoin} disabled={loading || !teamName.trim()} className="cup-btn cup-btn-gold text-xl py-3">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                        Entrando...
                      </span>
                    : '¡A la batalla!'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--cup-gold-dark)' }}>
          Token Wars · El juego de los agentes
        </p>
      </div>
    </main>
  )
}
