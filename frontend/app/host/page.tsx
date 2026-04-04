'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { usePublicGameData } from '@/hooks/usePublicGameData'
import { useHostGameData } from '@/hooks/useHostGameData'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { supabase } from '@/lib/supabase'
import type { SessionStatus } from '@/lib/types'

const LEVEL_ORDER: SessionStatus[] = ['lobby', 'level1', 'level2', 'level3', 'finished']
const LEVEL_LABELS: Record<string, string> = {
  level1: 'Type or Die',
  level2: 'Millonario',
  level3: 'La Traición',
  finished: 'Final',
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
          <motion.div className="animate-float mx-auto mb-4"
            style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', border: '1px solid rgba(168,85,247,0.5)', boxShadow: 'var(--glow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" stroke="rgba(168,85,247,0.8)" strokeWidth="1.5"/>
              <rect x="8" y="12" width="16" height="2" rx="1" fill="rgba(168,85,247,0.6)"/>
              <rect x="8" y="16" width="10" height="2" rx="1" fill="rgba(168,85,247,0.4)"/>
              <rect x="20" y="24" width="8" height="2" rx="1" fill="rgba(168,85,247,0.3)" transform="translate(-4 0)"/>
            </svg>
          </motion.div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '2.4rem', lineHeight: 1 }}
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
              : 'Crear partida'}
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

        <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)', letterSpacing: '0.3em', fontSize: '0.85rem' }}>
          — CÓDIGO DE SESIÓN —
        </p>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: 'var(--cup-gold)',
            fontSize: 'clamp(5rem, 20vw, 12rem)',
            lineHeight: 1,
            WebkitTextStroke: '1px rgba(168,85,247,0.5)',
            textShadow: '0 0 30px rgba(168,85,247,0.8), 0 0 60px rgba(168,85,247,0.4)',
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
      <section className="p-5 relative" style={{ borderTop: '1px solid var(--cup-gold-dark)', background: 'var(--cup-bg2)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-cream)', fontSize: '1.4rem' }}>
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
function GameDashboard({ session, teams, events, answeredTeamIds, betsCount, onAdvance, advancing, activeRoundNumber, onEndRound, endingRound }: {
  session: ReturnType<typeof usePublicGameData>['session']
  teams: ReturnType<typeof usePublicGameData>['teams']
  events: ReturnType<typeof useHostGameData>['events']
  answeredTeamIds: ReturnType<typeof useHostGameData>['answeredTeamIds']
  betsCount: number
  onAdvance: () => void
  advancing: boolean
  activeRoundNumber: number | null
  onEndRound: () => void
  endingRound: boolean
}) {
  const [showEndModal, setShowEndModal] = useState(false)
  const [ending, setEnding] = useState(false)

  if (!session) return null
  const currentIndex = LEVEL_ORDER.indexOf(session.status)
  const nextStatus = LEVEL_ORDER[currentIndex + 1]

  const handleEndEarly = async () => {
    setEnding(true)
    await supabase.from('game_sessions').update({
      status: 'finished',
      ended_at: new Date().toISOString(),
    }).eq('id', session.id)
    setEnding(false)
    setShowEndModal(false)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--cup-bg)' }}>

      {/* Modal — Terminar partida anticipadamente */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            key="end-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 16 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="cup-panel p-6 w-full max-w-sm flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">!</div>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-red)', fontSize: '1.8rem', lineHeight: 1 }}>
                  ¿Terminar ahora?
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif" }}>
                  Se cerrará la partida para todos los equipos y se mostrará el marcador final. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEndModal(false)}
                  className="cup-btn flex-1 text-base py-3"
                  style={{ background: 'var(--cup-bg3)', color: 'var(--cup-cream)' }}>
                  Cancelar
                </button>
                <button onClick={handleEndEarly} disabled={ending}
                  className="cup-btn flex-1 text-base py-3"
                  style={{ background: 'var(--cup-red)', color: 'var(--cup-cream)' }}>
                  {ending ? 'Terminando...' : 'Sí, terminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--cup-gold-dark)', background: 'var(--cup-bg2)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(168,85,247,0.8)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1.4rem', lineHeight: 1 }}>TOKEN WARS</h1>
            <p className="font-mono text-xs" style={{ color: 'var(--cup-gold-dark)' }}>{session.host_code}</p>
          </div>
        </div>

        <div className="cup-badge text-base px-4 py-1" style={{ background: 'var(--cup-red)' }}>
          {LEVEL_LABELS[session.status] ?? session.status}
        </div>

        <div className="flex items-center gap-3">
          {[
            { label: 'Equipos', val: teams.length },
            { label: 'Respondieron', val: answeredTeamIds.size },
            { label: 'Apuestas', val: betsCount },
          ].map(({ label, val }) => (
            <div key={label} className="cup-panel text-center px-4 py-2">
              <p className="text-xs" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Orbitron', sans-serif" }}>{label}</p>
              <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.8rem', lineHeight: 1, color: 'var(--cup-red)' }}>{val}</p>
            </div>
          ))}
          {session.status !== 'finished' && (
            <button onClick={() => setShowEndModal(true)}
              className="cup-btn text-sm px-3 py-2"
              style={{ background: 'rgba(180,30,30,0.15)', border: '2px solid var(--cup-red)', color: 'var(--cup-red)' }}
              title="Terminar partida anticipadamente">
              Finalizar
            </button>
          )}
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
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
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
                      <span style={{ color: 'var(--cup-cream)', fontFamily: "'Orbitron', sans-serif" }}>{team?.name ?? 'Equipo'}</span>
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

          {/* Controles — Level 1: gestión de rondas */}
          {session.status === 'level1' && (
            <div className="flex flex-col gap-3">
              <div className="cup-panel px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>RONDA ACTIVA</p>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1.6rem', lineHeight: 1 }}>
                    {activeRoundNumber !== null ? `${activeRoundNumber} / 3` : 'Todas terminadas'}
                  </p>
                </div>
                {activeRoundNumber !== null && (
                  <button onClick={onEndRound} disabled={endingRound}
                    className="cup-btn cup-btn-gold px-6 py-3">
                    {endingRound ? 'Terminando...' : `Terminar ronda ${activeRoundNumber}`}
                  </button>
                )}
              </div>
              {activeRoundNumber === null && (
                <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-xl py-4">
                  {advancing ? 'Avanzando...' : `Pasar a ${LEVEL_LABELS['level2']}`}
                </button>
              )}
            </div>
          )}

          {/* Controles — otros niveles */}
          {session.status !== 'level1' && nextStatus && nextStatus !== 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-2xl py-5">
              {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS[nextStatus]}`}
            </button>
          )}
          {session.status !== 'level1' && nextStatus === 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn text-2xl py-5" style={{ background: 'var(--cup-red)' }}>
              Terminar juego
            </button>
          )}
          {!nextStatus && (
            <div className="cup-panel text-center py-5">
              <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-red)', fontSize: '1.5rem' }}>¡Juego terminado!</p>
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
  useEffect(() => {
    document.body.classList.add('no-fluid')
    return () => document.body.classList.remove('no-fluid')
  }, [])

  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') ?? ''
  if (!sessionId) return <CreateSession />
  return <HostSession sessionId={sessionId} />
}

function HostSession({ sessionId }: { sessionId: string }) {
  const { session, teams, isLoading } = usePublicGameData(sessionId)
  const { events, answeredTeamIds, betsCount } = useHostGameData(sessionId)
  const [advancing, setAdvancing] = useState(false)
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null)
  const [endingRound, setEndingRound] = useState(false)

  // Track ronda activa durante level1
  useEffect(() => {
    if (!session || session.status !== 'level1') { setActiveRoundNumber(null); return }
    supabase
      .from('level1_rounds')
      .select('round_number')
      .eq('session_id', sessionId)
      .is('finished_at', null)
      .order('round_number')
      .limit(1)
      .single()
      .then(({ data }) => setActiveRoundNumber(data?.round_number ?? null))

    const channel = supabase.channel(`host-rounds-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'level1_rounds', filter: `session_id=eq.${sessionId}` },
        () => {
          supabase.from('level1_rounds').select('round_number').eq('session_id', sessionId).is('finished_at', null).order('round_number').limit(1).single()
            .then(({ data }) => setActiveRoundNumber(data?.round_number ?? null))
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, sessionId])

  const endCurrentRound = async () => {
    if (endingRound || activeRoundNumber === null) return
    setEndingRound(true)
    // Obtener id de la ronda activa
    const { data: round } = await supabase
      .from('level1_rounds')
      .select('id')
      .eq('session_id', sessionId)
      .eq('round_number', activeRoundNumber)
      .is('finished_at', null)
      .single()
    if (round) {
      await fetch('/api/finish-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: round.id }),
      })
    }
    setEndingRound(false)
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)', color: 'var(--cup-red)', fontFamily: "'Orbitron', sans-serif", fontSize: '1.5rem' }}>
      Sesión no encontrada.
    </div>
  )

  const currentIndex = LEVEL_ORDER.indexOf(session.status)
  const nextStatus = LEVEL_ORDER[currentIndex + 1]

  const advanceLevel = async () => {
    if (!nextStatus || advancing) return
    setAdvancing(true)
    const now = new Date()
    await supabase.from('game_sessions').update({
      status: nextStatus, current_level: currentIndex + 1,
      ...(nextStatus === 'level1' ? { started_at: now.toISOString() } : {}),
      ...(nextStatus === 'finished' ? { ended_at: now.toISOString() } : {}),
    }).eq('id', sessionId)

    // Al iniciar level1: fijar started_at de la ronda 1 = ahora + intro (10s)
    if (nextStatus === 'level1') {
      const introMs = 10 * 1000
      const round1Start = new Date(now.getTime() + introMs)
      await supabase.from('level1_rounds')
        .update({ started_at: round1Start.toISOString() })
        .eq('session_id', sessionId)
        .eq('round_number', 1)
    }

    setAdvancing(false)
  }

  if (session.status === 'lobby') {
    return <LobbyScreen sessionId={sessionId} hostCode={session.host_code} teams={teams} onStart={advanceLevel} starting={advancing} />
  }
  return (
    <GameDashboard session={session} teams={teams} events={events}
      answeredTeamIds={answeredTeamIds} betsCount={betsCount}
      onAdvance={advanceLevel} advancing={advancing}
      activeRoundNumber={activeRoundNumber}
      onEndRound={endCurrentRound} endingRound={endingRound} />
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
