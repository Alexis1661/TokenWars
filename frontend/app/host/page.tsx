'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { usePublicGameData } from '@/hooks/usePublicGameData'
import { useHostGameData } from '@/hooks/useHostGameData'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { supabase } from '@/lib/supabase'
import type { SessionStatus, Level2Question, Level3Question } from '@/lib/types'

const G = {
  primary: '#FFD700',
  dim: '#a3a3a3',
  green: '#4ade80',
}

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
          <div className="cup-divider text-sm">Acceso Restringido</div>

          <input type="password" value={password} autoFocus
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Contraseña de acceso"
            className="cup-input text-lg"
          />

          {error && (
            <p className="text-center text-sm font-bold" style={{ color: 'var(--cup-red)' }}>{error}</p>
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
function GameDashboard({ session, teams, events, answeredTeamIds, betsCount, onAdvance, advancing, activeRoundNumber, onEndRound, endingRound, activeQuestion2, onRevealQ2, revealingQ2, casinoAutomated, casinoRound, casinoStatus, casinoTimer, casinoBetsCount, casinoVotesCount, setCasinoAutomated, setCasinoStatus, setCasinoTimer, level3ChannelRef, onJumpToLevel, onDealCards, onSendQuestion }: {
  session: ReturnType<typeof usePublicGameData>['session']
  teams: ReturnType<typeof usePublicGameData>['teams']
  events: ReturnType<typeof useHostGameData>['events']
  answeredTeamIds: Set<string>
  betsCount: number
  onAdvance: () => void
  advancing: boolean
  activeRoundNumber: number | null
  onEndRound: () => void
  endingRound: boolean
  activeQuestion2: Level2Question | null
  onRevealQ2: () => void
  revealingQ2: boolean
  casinoAutomated: boolean
  casinoRound: number
  casinoStatus: string
  casinoTimer: number
  casinoBetsCount: number
  casinoVotesCount: number
  setCasinoAutomated: (v: boolean) => void
  setCasinoStatus: (s: any) => void
  setCasinoTimer: (t: number) => void
  level3ChannelRef: React.RefObject<any>
  onJumpToLevel: (target: SessionStatus) => void
  onDealCards: () => Promise<void>
  onSendQuestion: (round: number) => Promise<void>
}) {
  const router = useRouter()
  const [showEndModal, setShowEndModal] = useState(false)
  const [ending, setEnding] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showDevJump, setShowDevJump] = useState(false)
  const [seedingTokens, setSeedingTokens] = useState(false)

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

      {/* Modal — Salir del panel sin terminar la sesión */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            key="exit-modal"
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
                <div className="text-3xl mb-2"></div>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: '#3b82f6', fontSize: '1.4rem', lineHeight: 1 }}>
                  ¿Salir del panel?
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif" }}>
                  La sesión seguirá activa. Puedes volver usando el mismo link con el <strong style={{ color: 'var(--cup-cream)' }}>sessionId</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="cup-btn flex-1 text-base py-3"
                  style={{ background: 'var(--cup-bg3)', color: 'var(--cup-cream)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => router.push('/host')}
                  className="cup-btn flex-1 text-base py-3"
                  style={{ background: '#1e40af', color: '#fff' }}
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* DEV — Saltar a nivel */}
          <div className="relative">
            <button
              onClick={() => setShowDevJump((v) => !v)}
              className="cup-btn text-xs px-3 py-2"
              style={{ background: 'rgba(30,80,180,0.15)', border: '2px solid #3b82f6', color: '#3b82f6' }}
              title="Saltar a nivel (modo pruebas)"
            >
              DEV
            </button>
            {showDevJump && (
              <div
                className="absolute right-0 top-full mt-2 z-50 flex flex-col gap-2 p-3 rounded-xl"
                style={{ background: 'var(--cup-bg2)', border: '1px solid #3b82f6', minWidth: 180 }}
              >
                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1">Saltar a nivel</p>
                {(['level1', 'level2', 'level3'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => { onJumpToLevel(lvl); setShowDevJump(false) }}
                    disabled={session.status === lvl || advancing}
                    className="cup-btn text-sm py-2"
                    style={{
                      opacity: session.status === lvl ? 0.4 : 1,
                      background: session.status === lvl ? '#111' : undefined,
                      textAlign: 'left',
                    }}
                  >
                    {session.status === lvl ? '▶ ' : ''}{LEVEL_LABELS[lvl] ?? lvl}
                  </button>
                ))}

                <div style={{ height: 1, background: '#3b82f630', margin: '4px 0' }} />
                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Tokens</p>
                <button
                  className="cup-btn text-sm py-2"
                  disabled={seedingTokens}
                  style={{ textAlign: 'left', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#22c55e' }}
                  onClick={async () => {
                    setSeedingTokens(true)
                    await Promise.all(
                      teams
                        .filter((t) => t.token_balance < 500)
                        .map((t) =>
                          supabase
                            .from('teams')
                            .update({ token_balance: 500 })
                            .eq('id', t.id)
                        )
                    )
                    setSeedingTokens(false)
                    setShowDevJump(false)
                  }}
                >
                  {seedingTokens ? 'Dando...' : 'Dar 500T a todos'}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowExitModal(true)}
            className="cup-btn text-sm px-3 py-2"
            style={{ background: 'rgba(30,80,180,0.12)', border: '1px solid #3b82f6', color: '#3b82f6' }}
            title="Salir del panel (la sesión continúa)"
          >
            Salir
          </button>

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
                      <span style={{ color: 'var(--cup-gold)' }}>-</span>
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

          {/* Controles — Level 2 */}
          {session.status === 'level2' && (
            <div className="flex flex-col gap-3">
              <div className="cup-panel px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>PREGUNTA ACTIVA</p>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1.6rem', lineHeight: 1 }}>
                    {activeQuestion2 ? `${activeQuestion2.question_number} / 3` : 'Todas reveladas'}
                  </p>
                  {activeQuestion2 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--cup-gold-dark)' }}>
                      {{ easy: 'FÁCIL — 150T', medium: 'MEDIA — 250T', hard: 'DIFÍCIL — 400T' }[activeQuestion2.difficulty]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-right" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Orbitron', sans-serif" }}>
                    {answeredTeamIds.size}/{teams.length} CONFIRMARON
                  </p>
                  {activeQuestion2 && !activeQuestion2.started_at && (
                    <button 
                      onClick={async () => {
                        await supabase.from('level2_questions').update({ started_at: new Date().toISOString() }).eq('id', activeQuestion2.id)
                      }}
                      className="cup-btn py-3 text-sm font-bold" style={{ background: '#5b21b6', color: 'white' }}>
                      ▶ Iniciar Fase de Pregunta
                    </button>
                  )}
                  {activeQuestion2 && activeQuestion2.started_at && !activeQuestion2.revealed_at && (
                    <button onClick={onRevealQ2} disabled={revealingQ2}
                      className="cup-btn cup-btn-gold px-6 py-3">
                      {revealingQ2 ? 'Revelando...' : 'Revelar Respuesta'}
                    </button>
                  )}
                  {(!activeQuestion2 || activeQuestion2.revealed_at) && (
                    <p className="text-xs" style={{ color: 'var(--cup-gold-dark)' }}>Esperando siguiente...</p>
                  )}
                </div>
              </div>
              {!activeQuestion2 && (
                <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-xl py-4">
                  {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS['level3']}`}
                </button>
              )}
            </div>
          )}

          {/* Controles — Level 3 (Casino) */}
          {session.status === 'level3' && (
            <div className="flex flex-col gap-3">
              <div className="cup-panel px-4 py-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>SISTEMA DEL CROUPIER (NIVEL 3)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: casinoAutomated ? G.green : G.dim }}>[{casinoAutomated ? 'AUTOMÁTICO' : 'MANUAL'}]</span>
                    <button onClick={() => setCasinoAutomated(!casinoAutomated)} className="w-8 h-4 bg-slate-800 rounded-full relative border border-white/10">
                      <motion.div animate={{ x: casinoAutomated ? 16 : 0 }} className="w-3.5 h-3.5 bg-yellow-500 rounded-full" />
                    </button>
                  </div>
                </div>

                {casinoAutomated ? (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-white/70">Estado:</span>
                      <span className="text-sm font-bold uppercase tracking-widest" style={{ color: G.primary }}>
                        {casinoStatus === 'idle' && 'Esperando Inicio'}
                        {casinoStatus === 'intro' && 'Lore: El Casino'}
                        {casinoStatus === 'seeding' && 'Repartiendo Cartas...'}
                        {casinoStatus === 'cards' && 'Fase de Apuestas'}
                        {casinoStatus === 'answering' && 'Votacion Activa'}
                        {casinoStatus === 'spinning' && 'Ruleta Girando...'}
                        {casinoStatus === 'revealed' && 'Resultados'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-white/70">Ronda:</span>
                      <span className="text-lg font-orbitron text-yellow-500">{casinoRound} / 4</span>
                    </div>
                    {(casinoStatus === 'intro' || casinoStatus === 'cards' || casinoStatus === 'answering') && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-mono text-yellow-500/60 uppercase">
                          <span>{casinoTimer}s restantes</span>
                          <span>
                            {casinoStatus === 'intro' ? 'Intro Cinema' : `${(casinoStatus === 'cards' ? casinoBetsCount : casinoVotesCount)} / ${teams.length} listos`}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                          <motion.div animate={{ width: `${(casinoTimer / (casinoStatus === 'intro' ? 15 : 30)) * 100}%` }} className="h-full bg-yellow-500" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const start = Date.now();
                          setCasinoStatus('intro');
                          setCasinoTimer(15);
                          level3ChannelRef.current?.send({ type: 'broadcast', event: 'nivel3_intro', payload: { started_at: start } });
                        }}
                        className="cup-btn py-2 text-sm" style={{ background: '#3b82f6' }}
                      >
                        Re-lanzar Intro
                      </button>
                      <button
                        onClick={() => onDealCards()}
                        className="cup-btn cup-btn-gold py-2 text-sm"
                      >
                        Repartir Cartas
                      </button>
                      <button
                        onClick={() => onSendQuestion(Math.max(casinoRound, 1))}
                        className="cup-btn cup-btn-gold py-2 text-sm"
                      >
                        Generar Pregunta
                      </button>
                      <button
                        onClick={() => level3ChannelRef.current?.send({ type: 'broadcast', event: 'spin_wheel', payload: {} })}
                        className="cup-btn py-2 text-sm"
                        style={{ background: '#5b21b6' }}
                      >
                        Girar Ruleta
                      </button>
                      <button
                        onClick={() => level3ChannelRef.current?.send({ type: 'broadcast', event: 'revealed', payload: {} })}
                        className="cup-btn py-2 text-sm"
                        style={{ background: '#22c55e' }}
                      >
                        Revelar / Liquidar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={onAdvance} disabled={advancing} className="cup-btn text-xl py-4 mt-4" style={{ background: 'var(--cup-red)' }}>
                {advancing ? 'Terminando...' : 'TERMINAR JUEGO'}
              </button>
            </div>
          )}

          {/* Controles — otros niveles (excluye level3 que tiene su propio bloque) */}
          {session.status !== 'level1' && session.status !== 'level2' && session.status !== 'level3' && nextStatus && nextStatus !== 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-2xl py-5">
              {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS[nextStatus]}`}
            </button>
          )}
          {session.status !== 'level1' && session.status !== 'level2' && session.status !== 'level3' && nextStatus === 'finished' && (
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
  const [activeQuestion2, setActiveQuestion2] = useState<Level2Question | null>(null)
  const [revealingQ2, setRevealingQ2] = useState(false)

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

  // Track pregunta activa durante level2
  useEffect(() => {
    if (!session || session.status !== 'level2') { setActiveQuestion2(null); return }

    const loadQ2 = () =>
      supabase
        .from('level2_questions')
        .select('*')
        .eq('session_id', sessionId)
        .is('revealed_at', null)
        .order('question_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveQuestion2(data ?? null))

    loadQ2()

    const channel = supabase.channel(`host-q2-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'level2_questions',
        filter: `session_id=eq.${sessionId}`,
      }, () => { loadQ2() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, sessionId])

  // --- CASINO AUTOMATION (LEVEL 3) ---
  const [casinoAutomated, setCasinoAutomated] = useState(true);
  const [casinoRound, setCasinoRound] = useState(0);
  // 'cards' = bet phase (no question yet), 'answering' = question visible
  const [casinoStatus, setCasinoStatus] = useState<'idle' | 'intro' | 'seeding' | 'cards' | 'answering' | 'spinning' | 'revealed'>('idle');
  const [casinoTimer, setCasinoTimer] = useState(0);
  // Timestamp (ms) when the current phase started — sent in broadcasts so teams sync to the same clock
  const phaseStartedAtRef = useRef<number>(0);
  // Stable refs for closures in event handlers (avoid stale captures)
  const casinoStatusRef = useRef<string>('idle');
  const teamsLengthRef = useRef<number>(0);
  const level3ChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Prevent duplicate question generation when effect re-runs
  const questionSentRef = useRef(false);
  // Votos de respuesta acumulados: { [teamId]: { option, bet, card } }
  const casinoVotesRef = useRef<Record<string, { option: string; bet: number; card: string | null }>>({});
  // Conteo de votos recibidos (state para re-render en host UI)
  const [casinoVotesCount, setCasinoVotesCount] = useState(0);
  // Apuestas/cartas fijadas en fase cards: { [teamId]: { bet, card } }
  const casinoCardBetsRef = useRef<Record<string, { bet: number; card: string | null }>>({});
  // Pregunta actual (necesaria para el settle)
  const casinoQuestionRef = useRef<{ respuesta_correcta: string; pista_criptica?: string } | null>(null);
  // Cartas asignadas por equipo (se guardan al inicio para reenviar en cada ronda)
  const casinoTeamCardsRef = useRef<Record<string, string[]>>({});
  // Ref del array de equipos para evitar closures obsoletas en setTimeout callbacks
  const teamsRef = useRef<typeof teams>([]);
  // Conteo de apuestas confirmadas (bet_confirmed broadcasts)
  const [casinoBetsCount, setCasinoBetsCount] = useState(0);

  // Sync refs with state/props so event-handler closures always see fresh values
  useEffect(() => { casinoStatusRef.current = casinoStatus; }, [casinoStatus]);
  useEffect(() => { teamsLengthRef.current = teams.length; teamsRef.current = teams; }, [teams]);

  // Maintain Level 3 Channel (global broadcast)
  useEffect(() => {
    if (!session || session.status !== 'level3') return;

    const chan = supabase.channel('nivel3_global', { config: { broadcast: { self: true } } }).subscribe();
    level3ChannelRef.current = chan;

    return () => { supabase.removeChannel(chan) };
  }, [session?.status]);

  // Escuchar eventos de los equipos en nivel3_host
  useEffect(() => {
    if (!session || session.status !== 'level3') return;

    const hostChan = supabase
      .channel('nivel3_host', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'bet_confirmed' }, (payload) => {
        const { team_id, bet, card } = payload.payload ?? {};
        if (team_id) {
          casinoCardBetsRef.current[team_id] = { bet: Number(bet) || 50, card: card ?? null };
          const newCount = Object.keys(casinoCardBetsRef.current).length;
          setCasinoBetsCount(newCount);
          // Avanzar inmediatamente si todos los equipos confirmaron su apuesta
          if (casinoStatusRef.current === 'cards' && newCount >= teamsLengthRef.current && teamsLengthRef.current > 0) {
            setCasinoTimer(0);
          }
        }
      })
      .on('broadcast', { event: 'team_voted' }, (payload) => {
        const { team_id, option, bet, card } = payload.payload ?? {};
        if (team_id) {
          casinoVotesRef.current[team_id] = { option, bet: Number(bet) || 50, card: card ?? null };
          const voteCount = Object.keys(casinoVotesRef.current).length;
          setCasinoVotesCount(voteCount);
          // Avanzar inmediatamente si todos los equipos ya votaron
          if (casinoStatusRef.current === 'answering' && voteCount >= teamsLengthRef.current && teamsLengthRef.current > 0) {
            setCasinoTimer(0);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(hostChan) };
  }, [session?.status]);

  // Helper: enviar cartas a todos los equipos vía nivel3_global (canal ya suscrito por el host).
  // Usar canales privados sin suscripción previa falla silenciosamente en la primera ronda.
  const sendCardsToTeams = (teamCards: Record<string, string[]>, startedAt: number) => {
    level3ChannelRef.current?.send({
      type: 'broadcast',
      event: 'cartas_all',
      payload: { cards_by_team: teamCards, started_at: startedAt },
    });
  };

  const ALL_CARDS = [
    'DOBLAR O NADA',
    'RED DE SEGURIDAD',
    'TRANSFERENCIA',
    'CARTA OSCURA',
    'FAROL',
  ];

  function shuffleSample(arr: string[], k: number): string[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, k);
  }

  // Helper: repartir 2 cartas aleatorias distintas a cada equipo
  // Nunca repite las 2 cartas de la ronda anterior (excluye las previas del pool)
  const dealCards = async (startedAt: number = Date.now()) => {
    const teamCards: Record<string, string[]> = {};
    for (const t of teams) {
      const prev = casinoTeamCardsRef.current[t.id] ?? [];
      const pool = ALL_CARDS.filter((c) => !prev.includes(c));
      // Si el pool filtrado tiene al menos 2 cartas úsalo; si no (edge case), usa todo el mazo
      teamCards[t.id] = shuffleSample(pool.length >= 2 ? pool : ALL_CARDS, 2);
    }
    casinoTeamCardsRef.current = teamCards;
    sendCardsToTeams(teamCards, startedAt);
  };

  // Helper: generar y enviar pregunta del Croupier
  const sendQuestion = async (round: number) => {
    const topics = ['langchain', 'react', 'tool_calling', 'comparativa'];
    const topic = topics[(round - 1) % topics.length];
    try {
      const res = await fetch('/api/nivel3/pregunta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      }).then((r) => r.json());
      if (res.ok && res.question) {
        casinoQuestionRef.current = res.question;
        // Enviar pista críptica a equipos con CARTA OSCURA antes de la pregunta
        const pistaEquipos = Object.entries(casinoCardBetsRef.current)
          .filter(([, v]) => v.card === 'CARTA OSCURA');
        for (const [tid] of pistaEquipos) {
          supabase.channel(`private-team-${tid}`)
            .send({ type: 'broadcast', event: 'pista_oscura', payload: { pista: res.question.pista_criptica } });
        }
        // Pequeño delay para que la pista llegue antes que la pregunta
        await new Promise((r) => setTimeout(r, 300));
        const answerStartedAt = Date.now();
        phaseStartedAtRef.current = answerStartedAt;
        level3ChannelRef.current?.send({
          type: 'broadcast', event: 'nivel3_ronda',
          payload: { question: res.question, started_at: answerStartedAt },
        });
      }
    } catch { /* fallback silencioso */ }
  };

  // ── Efecto 1: TRANSICIONES de estado (no maneja timers, solo lógica) ───────
  useEffect(() => {
    if (!session || session.status !== 'level3' || !casinoAutomated) return;

    // 1. Iniciamos Nivel 3 -> Mostrar Intro (solo una vez)
    if (casinoRound === 0 && casinoStatus === 'idle') {
      if (!level3ChannelRef.current) return;
      
      setCasinoStatus('intro');
      setCasinoTimer(15);
      
      // Delay de seguridad para que los clientes se conecten
      setTimeout(() => {
        const start = Date.now();
        level3ChannelRef.current?.send({ 
          type: 'broadcast', 
          event: 'nivel3_intro', 
          payload: { started_at: start } 
        });
      }, 1000);
      return;
    }

    // 2. Intro terminada -> Preparar primer set de cartas
    if (casinoStatus === 'intro' && casinoTimer === 0 && casinoRound === 0) {
      setCasinoStatus('seeding');
      setCasinoBetsCount(0);
      casinoCardBetsRef.current = {};
      
      setTimeout(async () => {
        const startedAt = Date.now();
        phaseStartedAtRef.current = startedAt;
        await dealCards(startedAt); // Envía 'cartas' broadcast
        setCasinoRound(1);
        setCasinoStatus('cards');
        setCasinoTimer(30);
      }, 2000);
      return;
    }

    // Timer de apuestas (cards) expirado → pasar a answering
    if (casinoStatus === 'cards' && casinoTimer === 0) {
      questionSentRef.current = false;
      setCasinoVotesCount(0);
      casinoVotesRef.current = {};
      setCasinoStatus('answering');
      setCasinoTimer(30);
      return;
    }

    // Entramos a answering → generar pregunta UNA sola vez
    if (casinoStatus === 'answering' && !questionSentRef.current) {
      questionSentRef.current = true;
      casinoVotesRef.current = {};
      sendQuestion(casinoRound);
      return;
    }

    // Timer de respuestas (answering) expirado → girar ruleta
    if (casinoStatus === 'answering' && casinoTimer === 0) {
      setCasinoStatus('spinning');
      setCasinoTimer(-1);
      level3ChannelRef.current?.send({ type: 'broadcast', event: 'spin_wheel', payload: {} });

      setTimeout(() => {
        // Liquidar tokens y construir vitrina de resultados
        const q = casinoQuestionRef.current;
        const votes = casinoVotesRef.current;
        const currentTeams = teamsRef.current;
        const SHOWCASE_PER_TEAM_MS = 3000;
        const SCOREBOARD_MS = 8000; // tiempo que ven el scoreboard antes de la próxima ronda

        const doSettle = async () => {
          if (q && Object.keys(votes).length > 0) {
            const teamBets = Object.entries(votes).map(([team_id, v]) => ({
              team_id, option: v.option, bet: v.bet, card: v.card,
            }));
            try {
              const res = await fetch('/api/nivel3/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correct_option: q.respuesta_correcta, team_bets: teamBets }),
              }).then((r) => r.json());
              if (res.ok) {
                level3ChannelRef.current?.send({
                  type: 'broadcast', event: 'settle_results',
                  payload: { results: res.results ?? [], correct: q.respuesta_correcta },
                });
              }
            } catch { /* silencioso */ }
          }

          // Esperar que los equipos vean el resultado + scoreboard antes de la próxima ronda
          setTimeout(() => {
            if (casinoRound < 4) {
              questionSentRef.current = false;
              setCasinoBetsCount(0);
              setCasinoVotesCount(0);
              casinoCardBetsRef.current = {};
              casinoVotesRef.current = {};
              const nextStartedAt = Date.now();
              phaseStartedAtRef.current = nextStartedAt;
              setCasinoRound((r) => r + 1);
              setCasinoStatus('cards');
              setCasinoTimer(30);
              dealCards(nextStartedAt);
            } else {
              // Todas las rondas completadas → terminar el juego automáticamente
              setCasinoStatus('idle');
              supabase.from('game_sessions').update({
                status: 'finished',
                ended_at: new Date().toISOString(),
              }).eq('id', sessionId);
            }
          }, SCOREBOARD_MS);
        };

        level3ChannelRef.current?.send({ type: 'broadcast', event: 'revealed', payload: {} });
        setCasinoStatus('revealed');
        doSettle();
      }, 8000);
    }
  // casinoTimer en deps para detectar cuando llega a 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, casinoRound, casinoStatus, casinoAutomated, casinoTimer, sessionId]);

  // ── Efecto 2: COUNTDOWN — separado para que la limpieza siempre funcione ─
  useEffect(() => {
    if (!session || session.status !== 'level3' || !casinoAutomated) return;
    if (!['intro', 'cards', 'answering'].includes(casinoStatus) || casinoTimer <= 0) return;

    const id = setInterval(() => setCasinoTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [session?.status, casinoStatus, casinoTimer, casinoAutomated]);

  const revealCurrentQuestion2 = async () => {
    if (revealingQ2 || !activeQuestion2) return
    setRevealingQ2(true)
    await fetch('/api/reveal-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: activeQuestion2.id }),
    })
    setRevealingQ2(false)
  }
  // Ref estable para usar en efectos sin incluirlo como dep
  const revealQ2Ref = useRef(revealCurrentQuestion2)
  useEffect(() => { revealQ2Ref.current = revealCurrentQuestion2 })

  // Level 2 — auto-start: cuando carga una pregunta sin started_at, iniciarla
  useEffect(() => {
    if (session?.status !== 'level2' || !activeQuestion2 || activeQuestion2.started_at) return
    supabase.from('level2_questions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', activeQuestion2.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion2?.id, session?.status])

  // Level 2 — per-question answer counter (se resetea al cambiar de pregunta)
  const q2AnswerBaseRef = useRef(0)
  const trackedQ2IdRef = useRef<string | null>(null)
  if (activeQuestion2?.id !== trackedQ2IdRef.current) {
    trackedQ2IdRef.current = activeQuestion2?.id ?? null
    q2AnswerBaseRef.current = answeredTeamIds.size
  }
  const currentQ2Answers = answeredTeamIds.size - q2AnswerBaseRef.current

  // Level 2 — auto-reveal cuando todos los equipos respondieron
  useEffect(() => {
    if (
      session?.status !== 'level2' ||
      !activeQuestion2?.started_at ||
      activeQuestion2.revealed_at ||
      teams.length === 0 ||
      currentQ2Answers < teams.length
    ) return
    revealQ2Ref.current()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ2Answers, teams.length, activeQuestion2?.id, activeQuestion2?.started_at, activeQuestion2?.revealed_at, session?.status])

  // Level 2 — auto-reveal cuando expira el timer
  useEffect(() => {
    if (session?.status !== 'level2' || !activeQuestion2?.started_at || activeQuestion2.revealed_at) return
    const INTRO_MS = activeQuestion2.question_number === 1 ? 15000 : 0
    const expireAt = new Date(activeQuestion2.started_at).getTime() + INTRO_MS + 30000
    const delay = expireAt - Date.now()
    if (delay <= 0) { revealQ2Ref.current(); return }
    const id = setTimeout(() => revealQ2Ref.current(), delay)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion2?.id, activeQuestion2?.started_at, activeQuestion2?.revealed_at, session?.status])

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

  /** Salta directamente a cualquier nivel sin pasar por los anteriores (modo dev/pruebas) */
  const jumpToLevel = async (target: SessionStatus) => {
    if (advancing) return
    setAdvancing(true)
    const targetIndex = LEVEL_ORDER.indexOf(target)
    const now = new Date()
    await supabase.from('game_sessions').update({
      status: target,
      current_level: targetIndex,
      ...(target === 'level1' ? { started_at: now.toISOString() } : {}),
      ...(target === 'finished' ? { ended_at: now.toISOString() } : {}),
    }).eq('id', sessionId)

    if (target === 'level1') {
      const round1Start = new Date(now.getTime() + 10_000)
      await supabase.from('level1_rounds')
        .update({ started_at: round1Start.toISOString() })
        .eq('session_id', sessionId)
        .eq('round_number', 1)
    }

    if (target === 'level3') {
      // Si el status ya era level3 (salto DEV dentro del mismo nivel), Supabase Realtime
      // no dispara porque el valor no cambia y LaTraicion no se desmonta.
      // Reseteamos el estado del croupier y avisamos a los equipos para que vuelvan a la intro.
      setCasinoRound(0)
      setCasinoStatus('idle')
      setCasinoTimer(0)
      setCasinoBetsCount(0)
      setCasinoVotesCount(0)
      casinoVotesRef.current = {}
      casinoCardBetsRef.current = {}
      questionSentRef.current = false
      setTimeout(() => {
        level3ChannelRef.current?.send({
          type: 'broadcast',
          event: 'nivel3_reset',
          payload: {},
        })
      }, 400)
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
      onJumpToLevel={jumpToLevel}
      activeRoundNumber={activeRoundNumber}
      onEndRound={endCurrentRound} endingRound={endingRound}
      activeQuestion2={activeQuestion2}
      onRevealQ2={revealCurrentQuestion2}
      revealingQ2={revealingQ2}
      casinoAutomated={casinoAutomated}
      casinoRound={casinoRound}
      casinoStatus={casinoStatus}
      casinoTimer={casinoTimer}
      casinoBetsCount={casinoBetsCount}
      casinoVotesCount={casinoVotesCount}
      setCasinoAutomated={setCasinoAutomated}
      setCasinoStatus={setCasinoStatus}
      setCasinoTimer={setCasinoTimer}
      level3ChannelRef={level3ChannelRef}
      onDealCards={dealCards}
      onSendQuestion={sendQuestion} />
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
