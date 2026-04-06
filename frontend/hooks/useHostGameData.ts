'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Level2Answer, Level3Bet, Level1Submission } from '@/lib/types'

interface HostEvent {
  type: 'level1_submission' | 'level2_answer' | 'level3_bet'
  teamId: string
  timestamp: string
}

interface HostGameData {
  /** Eventos recientes visibles solo para el host */
  events: HostEvent[]
  /**
   * Conjunto de team_ids que ya respondieron la pregunta activa de nivel 2.
   * Rastreado POR PREGUNTA (question_id → Set<team_id>) para evitar falsos
   * positivos si hay múltiples sesiones activas simultáneamente.
   */
  answeredTeamIds: Set<string>
  /** Respuestas por pregunta: { [questionId]: Set<teamId> } */
  answersByQuestion: Record<string, Set<string>>
  /** Apuestas registradas (sin revelar monto ni objetivo hasta el reveal) */
  betsCount: number
  /** Submissions de nivel 1 registradas */
  submissionsCount: number
}

/**
 * Canal Privado — SOLO para la pantalla del HOST / Profesor.
 * El host ve quién respondió (check en pantalla), pero el contenido
 * de las respuestas se mantiene oculto para el resto de los equipos
 * porque este hook solo corre en /host.
 *
 * Suscribe a:
 *   - level1_submissions (INSERT)
 *   - level2_answers     (INSERT) — rastreado por question_id para filtrar sesiones cruzadas
 *   - level3_bets        (INSERT) — registra que hubo apuesta, sin revelar objetivo
 */
export function useHostGameData(sessionId: string): HostGameData {
  const [events, setEvents] = useState<HostEvent[]>([])
  // answersByQuestion: { [questionId]: Set<teamId> }
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, Set<string>>>({})
  const [betsCount, setBetsCount] = useState(0)
  const [submissionsCount, setSubmissionsCount] = useState(0)

  useEffect(() => {
    const hostChannel = supabase
      .channel(`host-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'level1_submissions',
        },
        (payload) => {
          const submission = payload.new as Level1Submission
          setSubmissionsCount((n) => n + 1)
          setEvents((prev) => [
            ...prev,
            {
              type: 'level1_submission',
              teamId: submission.team_id,
              timestamp: submission.submitted_at,
            },
          ])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'level2_answers',
        },
        (payload) => {
          const answer = payload.new as Level2Answer
          // Rastrear por question_id para que sesiones paralelas no interfieran
          setAnswersByQuestion((prev) => {
            const existing = prev[answer.question_id] ?? new Set<string>()
            const updated = new Set(existing)
            updated.add(answer.team_id)
            return { ...prev, [answer.question_id]: updated }
          })
          setEvents((prev) => [
            ...prev,
            {
              type: 'level2_answer',
              teamId: answer.team_id,
              timestamp: answer.answered_at ?? new Date().toISOString(),
            },
          ])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'level3_bets',
        },
        (payload) => {
          const bet = payload.new as Level3Bet
          setBetsCount((n) => n + 1)
          setEvents((prev) => [
            ...prev,
            {
              type: 'level3_bet',
              teamId: bet.bettor_team_id,
              timestamp: bet.created_at,
            },
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hostChannel)
    }
  }, [sessionId])

  // answeredTeamIds es la unión de todos los question buckets (compatibilidad con UI existente)
  const answeredTeamIds = new Set<string>(
    Object.values(answersByQuestion).flatMap((s) => Array.from(s))
  )

  return { events, answeredTeamIds, answersByQuestion, betsCount, submissionsCount }
}
