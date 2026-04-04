'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, TokenTransaction } from '@/lib/types'

/**
 * Hook para la vista del equipo (/play/[teamId]).
 * Solo carga los datos del equipo propio + historial de transacciones.
 */
export function useTeamData(teamId: string) {
  const [team, setTeam] = useState<Team | null>(null)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [{ data: teamData }, { data: txData }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase
        .from('token_transactions')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (teamData) setTeam(teamData)
    if (txData) setTransactions(txData)
    setIsLoading(false)
  }, [teamId])

  useEffect(() => {
    fetchData()

    const teamChannel = supabase
      .channel(`team-${teamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
        (payload) => setTeam((prev) => prev ? { ...prev, ...(payload.new as Team) } : payload.new as Team)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'token_transactions', filter: `team_id=eq.${teamId}` },
        (payload) => {
          setTransactions((prev) => [payload.new as TokenTransaction, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(teamChannel)
    }
  }, [teamId, fetchData])

  return { team, transactions, isLoading }
}
