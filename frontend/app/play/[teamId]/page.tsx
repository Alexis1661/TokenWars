'use client'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { usePublicGameData } from '@/hooks/usePublicGameData'
import { useTeamData } from '@/hooks/useTeamData'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { TokenBadge } from '@/components/ui/TokenBadge'
import { TypeOrDie } from '@/components/level1/TypeOrDie'
import { Millonario } from '@/components/level2/Millonario'
import { LaTraicion } from '@/components/level3/LaTraicion'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Level1Round, Level2Question, Level3Question, AnswerOption } from '@/lib/types'

export default function PlayPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team: teamBase, transactions, isLoading: teamLoading } = useTeamData(teamId)
  const sessionId = teamBase?.session_id ?? ''
  const { session, teams, isLoading: sessionLoading } = usePublicGameData(sessionId)
  // Usar el equipo del array público para tener token_balance siempre actualizado
  // (usePublicGameData recibe los updates de Realtime correctamente)
  const team = teams.find((t) => t.id === teamId) ?? teamBase

  // Datos de la ronda/pregunta activa
  const [activeRound, setActiveRound] = useState<Level1Round | null>(null)
  const [activeQuestion2, setActiveQuestion2] = useState<Level2Question | null>(null)
  const [correctAnswers2, setCorrectAnswers2] = useState<Record<string, AnswerOption | null>>({})
  const [activeQuestion3, setActiveQuestion3] = useState<Level3Question | null>(null)

  // Cargar la ronda activa y suscribirse a cambios de rondas
  const fetchActiveRound = useCallback((sid: string) => {
    supabase
      .from('level1_rounds')
      .select('*')
      .eq('session_id', sid)
      .is('finished_at', null)
      .order('round_number')
      .limit(1)
      .single()
      .then(({ data }) => setActiveRound(data ?? null))
  }, [])

  // Cargar contenido según el nivel actual
  useEffect(() => {
    if (!session) return

    if (session.status === 'level1') {
      fetchActiveRound(session.id)

      // Suscripción Realtime: cuando una ronda se marca como finished, cargar la siguiente
      const channel = supabase
        .channel(`rounds-${session.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'level1_rounds',
          filter: `session_id=eq.${session.id}`,
        }, () => {
          fetchActiveRound(session.id)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    if (session.status === 'level2') {
      const loadActiveQ2 = () =>
        supabase
          .from('level2_questions')
          .select('*')
          .eq('session_id', session.id)
          .is('revealed_at', null)
          .order('question_number')
          .limit(1)
          .single()
          .then(({ data }) => {
            setActiveQuestion2(data ?? null)
            setCorrectAnswers2({})
          })

      loadActiveQ2()

      const q2Channel = supabase
        .channel(`level2-questions-${session.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'level2_questions',
          filter: `session_id=eq.${session.id}`,
        }, async (payload) => {
          const updated = payload.new as Level2Question
          if (updated.revealed_at) {
            setActiveQuestion2(prev => prev?.id === updated.id ? updated : prev)

            const { data: answers } = await supabase
              .from('level2_answers')
              .select('team_id, selected_option')
              .eq('question_id', updated.id)

            const map: Record<string, AnswerOption | null> = {}
            for (const ans of answers ?? []) map[ans.team_id] = ans.selected_option as AnswerOption | null
            setCorrectAnswers2(map)

            setTimeout(() => loadActiveQ2(), 5000)
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(q2Channel) }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cup-bg)', color: 'var(--cup-red)', fontFamily: "'Orbitron', sans-serif", fontSize: '1.5rem' }}>
        Equipo o sesión no encontrada.
      </div>
    )
  }

  const lastTx = transactions[0]
  const delta = lastTx ? lastTx.amount : undefined
  const hasScoreboard = session.status !== 'finished' && session.status !== 'lobby' && session.status !== 'level2'

  return (
    <main className="min-h-screen cup-stars-bg" style={{ background: 'var(--cup-bg)', paddingBottom: hasScoreboard ? 180 : 0 }}>

      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 sticky top-0 z-10"
        style={{ borderBottom: '1px solid var(--cup-gold-dark)', background: 'var(--cup-bg2)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cup-gold)', boxShadow: 'var(--glow-blue)' }} />
          <div>
            <p className="text-xs uppercase" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em', lineHeight: 1 }}>Equipo</p>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-cream)', fontSize: '1.3rem', lineHeight: 1 }}>{team.name}</h1>
          </div>
        </div>
        <TokenBadge balance={team.token_balance} delta={delta} />
      </header>

      {/* Contenido */}
      <div className={session.status === 'level1' ? '' : 'p-4'}>
        {session.status === 'lobby' && <LobbyScreen hostCode={session.host_code} />}
        {session.status === 'level1' && activeRound && <TypeOrDie key={activeRound.id} round={activeRound} teamId={team.id} />}
        {session.status === 'level1' && !activeRound && <WaitingScreen message="Esperando la próxima ronda..." />}
        {session.status === 'level2' && activeQuestion2 && (
          <Millonario
            key={activeQuestion2.id}
            question={activeQuestion2}
            team={team}
            allTeams={teams}
            revealed={!!activeQuestion2.revealed_at}
            correctAnswers={correctAnswers2}
          />
        )}
        {session.status === 'level2' && !activeQuestion2 && <WaitingScreen message="Esperando la siguiente pregunta..." />}
        {session.status === 'level3' && activeQuestion3 && (
          <LaTraicion question={activeQuestion3} team={team} allTeams={teams} revealed={!!activeQuestion3.revealed_at} />
        )}
        {session.status === 'level3' && !activeQuestion3 && <WaitingScreen message="Esperando la siguiente ronda..." />}
        {session.status === 'finished' && (
          <div className="py-12 text-center flex flex-col items-center gap-6">
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '2.5rem' }}
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
          style={{ borderTop: '1px solid var(--cup-gold-dark)', background: 'var(--cup-bg2)' }}>
          <Scoreboard teams={teams} highlightTeamId={team.id} />
        </aside>
      )}
    </main>
  )
}

function LobbyScreen({ hostCode }: { hostCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-8 text-center">
      <motion.div
        className="animate-float"
        style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', border: '1px solid rgba(168,85,247,0.5)', boxShadow: 'var(--glow-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="6" y="13" width="20" height="3" rx="1.5" fill="rgba(168,85,247,0.9)" />
          <rect x="14.5" y="5" width="3" height="20" rx="1.5" fill="rgba(168,85,247,0.9)" />
          <circle cx="7" cy="22" r="3" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
          <circle cx="25" cy="22" r="3" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
        </svg>
      </motion.div>
      <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '2rem' }}
        className="cup-text-outline">TOKEN WARS</h2>

      <div className="cup-panel px-10 py-5 text-center">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>
          Código de sesión
        </p>
        <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-red)', fontSize: '3.5rem', letterSpacing: '0.2em', lineHeight: 1 }}>
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
      <p style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Exo 2', sans-serif", fontSize: '1.1rem' }}>{message}</p>
    </div>
  )
}
