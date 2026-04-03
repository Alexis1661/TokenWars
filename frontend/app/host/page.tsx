'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { usePublicGameData } from '@/hooks/usePublicGameData'
import { useHostGameData } from '@/hooks/useHostGameData'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { supabase } from '@/lib/supabase'
import type { SessionStatus } from '@/lib/types'

const LEVEL_ORDER: SessionStatus[] = ['lobby', 'level1', 'level2', 'level3', 'finished']
const LEVEL_LABELS: Record<string, string> = {
  level1: '⌨️ Type or Die',
  level2: '🎙️ Millonario',
  level3: '🗡️ La Traición',
  finished: '🏆 Final',
}

// ─────────────────────────────────────────────────────────
// Pantalla 1 — Crear sesión
// ─────────────────────────────────────────────────────────
function CreateSession() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!password) return
    setLoading(true); setError('')
    const res = await fetch('/api/create-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Contraseña incorrecta'); setLoading(false); return }
    router.push(`/host?sessionId=${data.id}`)
  }

  return (
    <main className="min-h-screen cup-stars-bg flex flex-col items-center justify-center p-8 relative"
      style={{ background: 'var(--cup-bg)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <div className="text-6xl mb-2">🎛️</div>
          <h1 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '2.8rem', lineHeight: 1 }}
            className="cup-text-outline">PANEL DEL<br/>PROFESOR</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--cup-gold-dark)' }}>Token Wars — Control de Juego</p>
        </div>

        <div className="cup-panel p-6 flex flex-col gap-4">
          <div className="cup-divider text-sm">★ Acceso Restringido ★</div>

          <input type="password" value={password} autoFocus
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Contraseña de acceso"
            className="cup-input text-lg"
          />

          {error && (
            <p className="text-center text-sm font-bold" style={{ color: 'var(--cup-red)' }}>⚠ {error}</p>
          )}

          <button onClick={handleCreate} disabled={loading || !password} className="cup-btn cup-btn-gold text-xl py-4">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Creando partida...
                </span>
              : '🚀 Crear partida'}
          </button>
        </div>
      </motion.div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────
// Pantalla 2 — Lobby
// ─────────────────────────────────────────────────────────
function LobbyScreen({ sessionId, hostCode, teams, onStart, starting }: {
  sessionId: string
  hostCode: string
  teams: ReturnType<typeof usePublicGameData>['teams']
  onStart: () => void
  starting: boolean
}) {
  return (
    <main className="min-h-screen cup-stars-bg flex flex-col relative overflow-hidden"
      style={{ background: 'var(--cup-bg)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(212,160,23,0.06) 0%, transparent 70%)' }} />

      {/* ZONA PROYECTABLE */}
      <section className="flex-1 flex flex-col items-center justify-center gap-5 p-8 relative">

        <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold-dark)', letterSpacing: '0.3em', fontSize: '0.85rem' }}>
          — CÓDIGO DE SESIÓN —
        </p>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          style={{
            fontFamily: "'Lilita One', cursive",
            color: 'var(--cup-gold)',
            fontSize: 'clamp(5rem, 20vw, 12rem)',
            lineHeight: 1,
            WebkitTextStroke: '4px var(--cup-black)',
            textShadow: '6px 6px 0 var(--cup-black)',
            letterSpacing: '0.1em',
          }}
        >
          {hostCode}
        </motion.div>

        <div className="cup-divider w-64 text-sm" style={{ color: 'var(--cup-gold)' }}>
          Entra en /join
        </div>

        {/* Equipos conectados */}
        <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-2">
          <AnimatePresence>
            {teams.map((team) => (
              <motion.span key={team.id}
                initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                className="cup-badge flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {team.name}
              </motion.span>
            ))}
          </AnimatePresence>
          {teams.length === 0 && (
            <p className="animate-pulse text-sm" style={{ color: 'var(--cup-gold-dark)' }}>Esperando equipos...</p>
          )}
        </div>
      </section>

      {/* Panel inferior del host */}
      <section className="p-5 relative" style={{ borderTop: '4px solid var(--cup-gold)', background: 'var(--cup-bg2)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-cream)', fontSize: '1.4rem' }}>
              <span style={{ color: 'var(--cup-gold)' }}>{teams.length}</span> equipo{teams.length !== 1 ? 's' : ''} conectado{teams.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--cup-gold-dark)' }}>{sessionId.slice(0, 20)}...</p>
          </div>
          <button onClick={onStart} disabled={starting || teams.length === 0}
            className="cup-btn cup-btn-gold text-xl px-8 py-4">
            {starting ? '▶ Iniciando...' : '▶ Iniciar juego'}
          </button>
        </div>
      </section>
    </main>
  )
}

// ─────────────────────────────────────────────────────────
// Pantalla 3 — Dashboard
// ─────────────────────────────────────────────────────────
function GameDashboard({ session, teams, events, answeredTeamIds, betsCount, onAdvance, advancing }: {
  session: ReturnType<typeof usePublicGameData>['session']
  teams: ReturnType<typeof usePublicGameData>['teams']
  events: ReturnType<typeof useHostGameData>['events']
  answeredTeamIds: ReturnType<typeof useHostGameData>['answeredTeamIds']
  betsCount: number
  onAdvance: () => void
  advancing: boolean
}) {
  if (!session) return null
  const currentIndex = LEVEL_ORDER.indexOf(session.status)
  const nextStatus = LEVEL_ORDER[currentIndex + 1]

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--cup-bg)' }}>

      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '4px solid var(--cup-gold)', background: 'var(--cup-bg2)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '1.4rem', lineHeight: 1 }}>TOKEN WARS</h1>
            <p className="font-mono text-xs" style={{ color: 'var(--cup-gold-dark)' }}>{session.host_code}</p>
          </div>
        </div>

        <div className="cup-badge text-base px-4 py-1" style={{ background: 'var(--cup-red)' }}>
          {LEVEL_LABELS[session.status] ?? session.status}
        </div>

        <div className="flex gap-3">
          {[
            { label: 'Equipos', val: teams.length },
            { label: 'Respondieron', val: answeredTeamIds.size },
            { label: 'Apuestas', val: betsCount },
          ].map(({ label, val }) => (
            <div key={label} className="cup-panel text-center px-4 py-2" style={{ boxShadow: '3px 3px 0 var(--cup-black)' }}>
              <p className="text-xs" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Lilita One', cursive" }}>{label}</p>
              <p style={{ fontFamily: "'Lilita One', cursive", fontSize: '1.8rem', lineHeight: 1, color: 'var(--cup-red)' }}>{val}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        <section className="p-6" style={{ borderRight: '3px solid var(--cup-gold-dark)' }}>
          <Scoreboard teams={teams} />
        </section>

        <section className="p-6 flex flex-col gap-4">
          {/* Feed */}
          <div className="cup-panel-dark flex-1 overflow-hidden" style={{ minHeight: 200 }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '2px solid var(--cup-gold-dark)' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
                ACTIVIDAD EN VIVO
              </span>
            </div>
            <div className="p-4 space-y-1 overflow-y-auto max-h-56">
              {events.length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: 'var(--cup-gold-dark)' }}>Sin actividad aún...</p>
              )}
              {[...events].reverse().map((ev, i) => {
                const team = teams.find((t) => t.id === ev.teamId)
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between py-1"
                    style={{ borderBottom: '1px solid rgba(212,160,23,0.15)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--cup-gold)' }}>★</span>
                      <span style={{ color: 'var(--cup-cream)', fontFamily: "'Lilita One', cursive" }}>{team?.name ?? 'Equipo'}</span>
                      <span className="text-sm" style={{ color: 'var(--cup-gold-dark)' }}>→ {ev.type.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: 'var(--cup-gold-dark)' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Botón avanzar */}
          {nextStatus && nextStatus !== 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-2xl py-5">
              {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS[nextStatus]}`}
            </button>
          )}
          {nextStatus === 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn text-2xl py-5" style={{ background: 'var(--cup-red)' }}>
              🏆 Terminar juego
            </button>
          )}
          {!nextStatus && (
            <div className="cup-panel text-center py-5">
              <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-red)', fontSize: '1.5rem' }}>🏆 ¡Juego terminado!</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────
// Orquestador
// ─────────────────────────────────────────────────────────
function HostPageInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') ?? ''
  if (!sessionId) return <CreateSession />
  return <HostSession sessionId={sessionId} />
}

function HostSession({ sessionId }: { sessionId: string }) {
  const { session, teams, isLoading } = usePublicGameData(sessionId)
  const { events, answeredTeamIds, betsCount } = useHostGameData(sessionId)
  const [advancing, setAdvancing] = useState(false)

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)', color: 'var(--cup-red)', fontFamily: "'Lilita One', cursive", fontSize: '1.5rem' }}>
      Sesión no encontrada.
    </div>
  )

  const currentIndex = LEVEL_ORDER.indexOf(session.status)
  const nextStatus = LEVEL_ORDER[currentIndex + 1]

  const advanceLevel = async () => {
    if (!nextStatus || advancing) return
    setAdvancing(true)
    await supabase.from('game_sessions').update({
      status: nextStatus, current_level: currentIndex + 1,
      ...(nextStatus === 'level1' ? { started_at: new Date().toISOString() } : {}),
      ...(nextStatus === 'finished' ? { ended_at: new Date().toISOString() } : {}),
    }).eq('id', sessionId)
    setAdvancing(false)
  }

  if (session.status === 'lobby') {
    return <LobbyScreen sessionId={sessionId} hostCode={session.host_code} teams={teams} onStart={advanceLevel} starting={advancing} />
  }
  return (
    <GameDashboard session={session} teams={teams} events={events}
      answeredTeamIds={answeredTeamIds} betsCount={betsCount}
      onAdvance={advanceLevel} advancing={advancing} />
  )
}

export default function HostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)' }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <HostPageInner />
    </Suspense>
  )
}
