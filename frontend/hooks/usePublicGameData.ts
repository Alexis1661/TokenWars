'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { GameSession, Team } from '@/lib/types'

interface PublicGameData {
  session: GameSession | null
  teams: Team[]
  isLoading: boolean
}

/**
 * Canal Público — escucha cambios globales que afectan la UI de TODOS los jugadores.
 * Suscribe a:
 *   - game_sessions (cambios de nivel/estado: lobby → level1, etc.)
 *   - teams         (actualizaciones de token_balance para el scoreboard en tiempo real)
 */
export function usePublicGameData(sessionId: string): PublicGameData {
  const [session, setSession] = useState<GameSession | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Carga inicial
  const fetchInitialData = useCallback(async () => {
    const [{ data: sessionData }, { data: teamsData }] = await Promise.all([
      supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('teams')
        .select('*')
        .eq('session_id', sessionId)
        .order('token_balance', { ascending: false }),
    ])
    if (sessionData) setSession(sessionData)
    if (teamsData) setTeams(teamsData)
    setIsLoading(false)
  }, [sessionId])

  useEffect(() => {
    fetchInitialData()

    const publicChannel = supabase
      .channel(`public-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          // Cambio de nivel o estado (lobby -> level1, etc.)
          setSession(payload.new as GameSession)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Actualizar scoreboard en tiempo real
          if (payload.eventType === 'INSERT') {
            setTeams((prev) =>
              [...prev, payload.new as Team].sort(
                (a, b) => b.token_balance - a.token_balance
              )
            )
          } else if (payload.eventType === 'UPDATE') {
            setTeams((prev) =>
              prev
                .map((t) => (t.id === (payload.new as Team).id ? (payload.new as Team) : t))
                .sort((a, b) => b.token_balance - a.token_balance)
            )
          } else if (payload.eventType === 'DELETE') {
            setTeams((prev) => prev.filter((t) => t.id !== (payload.old as Team).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(publicChannel)
    }
  }, [sessionId, fetchInitialData])

  return { session, teams, isLoading }
}
