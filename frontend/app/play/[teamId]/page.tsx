'use client'
import { useParams } from 'next/navigation'
import { usePublicGameData } from '@/hooks/usePublicGameData'
import { useTeamData } from '@/hooks/useTeamData'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { TokenBadge } from '@/components/ui/TokenBadge'
import { TypeOrDie } from '@/components/level1/TypeOrDie'
import { Millonario } from '@/components/level2/Millonario'
import { LaTraicion } from '@/components/level3/LaTraicion'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Level1Round, Level2Question, Level3Question } from '@/lib/types'

export default function PlayPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team, transactions, isLoading: teamLoading } = useTeamData(teamId)
  const sessionId = team?.session_id ?? ''
  const { session, teams, isLoading: sessionLoading } = usePublicGameData(sessionId)

  // Datos de la ronda/pregunta activa
  const [activeRound, setActiveRound] = useState<Level1Round | null>(null)
  const [activeQuestion2, setActiveQuestion2] = useState<Level2Question | null>(null)
  const [activeQuestion3, setActiveQuestion3] = useState<Level3Question | null>(null)

  // Cargar contenido según el nivel actual
  useEffect(() => {
    if (!session) return

    if (session.status === 'level1') {
      supabase
        .from('level1_rounds')
        .select('*')
        .eq('session_id', session.id)
        .is('finished_at', null)
        .order('round_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveRound(data))
    }

    if (session.status === 'level2') {
      supabase
        .from('level2_questions')
        .select('*')
        .eq('session_id', session.id)
        .is('revealed_at', null)
        .order('question_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveQuestion2(data))
    }

    if (session.status === 'level3') {
      supabase
        .from('level3_questions')
        .select('*')
        .eq('session_id', session.id)
        .is('revealed_at', null)
        .order('question_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveQuestion3(data))
    }
  }, [session])

  if (teamLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)' }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (!team || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)', color: 'var(--cup-red)', fontFamily: "'Lilita One', cursive", fontSize: '1.5rem' }}>
        Equipo o sesión no encontrada.
      </div>
    )
  }

  const lastTx = transactions[0]
  const delta = lastTx ? lastTx.amount : undefined
  const hasScoreboard = session.status !== 'finished' && session.status !== 'lobby'

  return (
    <main className="min-h-screen cup-stars-bg" style={{ background: 'var(--cup-bg)', paddingBottom: hasScoreboard ? 180 : 0 }}>

      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 sticky top-0 z-10"
        style={{ borderBottom: '4px solid var(--cup-gold)', background: 'var(--cup-bg2)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          <div>
            <p className="text-xs uppercase" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Lilita One', cursive", letterSpacing: '0.1em', lineHeight: 1 }}>Equipo</p>
            <h1 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-cream)', fontSize: '1.3rem', lineHeight: 1 }}>{team.name}</h1>
          </div>
        </div>
        <TokenBadge balance={team.token_balance} delta={delta} />
      </header>

      {/* Contenido */}
      <div className="p-4">
        {session.status === 'lobby' && <LobbyScreen hostCode={session.host_code} />}
        {session.status === 'level1' && activeRound && <TypeOrDie round={activeRound} teamId={team.id} />}
        {session.status === 'level1' && !activeRound && <WaitingScreen message="Esperando la próxima ronda..." />}
        {session.status === 'level2' && activeQuestion2 && (
          <Millonario question={activeQuestion2} team={team} allTeams={teams} revealed={!!activeQuestion2.revealed_at} correctAnswers={{}} />
        )}
        {session.status === 'level2' && !activeQuestion2 && <WaitingScreen message="Esperando la siguiente pregunta..." />}
        {session.status === 'level3' && activeQuestion3 && (
          <LaTraicion question={activeQuestion3} team={team} allTeams={teams} revealed={!!activeQuestion3.revealed_at} />
        )}
        {session.status === 'level3' && !activeQuestion3 && <WaitingScreen message="Esperando la siguiente ronda..." />}
        {session.status === 'finished' && (
          <div className="py-12 text-center flex flex-col items-center gap-6">
            <p className="text-6xl">🏆</p>
            <h2 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '2.5rem' }}
              className="cup-text-outline">¡JUEGO TERMINADO!</h2>
            <div className="w-full max-w-sm">
              <Scoreboard teams={teams} highlightTeamId={team.id} />
            </div>
          </div>
        )}
      </div>

      {/* Scoreboard fijo abajo */}
      {hasScoreboard && (
        <aside className="fixed bottom-0 left-0 right-0 z-10 p-3"
          style={{ borderTop: '4px solid var(--cup-gold)', background: 'var(--cup-bg2)' }}>
          <Scoreboard teams={teams} highlightTeamId={team.id} />
        </aside>
      )}
    </main>
  )
}

function LobbyScreen({ hostCode }: { hostCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-8 text-center">
      <div className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>🎮</div>
      <h2 style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold)', fontSize: '2rem' }}
        className="cup-text-outline">TOKEN WARS</h2>

      <div className="cup-panel px-10 py-5 text-center">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-gold-dark)' }}>
          Código de sesión
        </p>
        <p style={{ fontFamily: "'Lilita One', cursive", color: 'var(--cup-red)', fontSize: '3.5rem', letterSpacing: '0.2em', lineHeight: 1 }}>
          {hostCode}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm animate-pulse" style={{ color: 'var(--cup-gold-dark)' }}>
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Conectado — esperando al profesor
      </div>
    </div>
  )
}

function WaitingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: 'rgba(212,160,23,0.2)' }} />
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--cup-gold)', borderTopColor: 'transparent' }} />
      </div>
      <p style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Boogaloo', cursive", fontSize: '1.1rem' }}>{message}</p>
    </div>
  )
}
