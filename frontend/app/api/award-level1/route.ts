import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ROUND_SECONDS = 45

export async function POST(req: NextRequest) {
  const { roundId, teamId } = await req.json()
  if (!roundId || !teamId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const admin = getSupabaseAdmin()

  const [{ data: sub }, { data: round }] = await Promise.all([
    admin.from('level1_submissions').select('*').eq('round_id', roundId).eq('team_id', teamId).single(),
    admin.from('level1_rounds').select('output_type, target_text').eq('id', roundId).single(),
  ])

  if (!sub || !round) return NextResponse.json({ tokens: 0, breakdown: {} })

  const targetLen = round.target_text?.length ?? 1
  const errors    = sub.error_count ?? 0
  const finishedMs         = sub.finish_time_ms ?? null
  const identifiedCorrectly = sub.identified_correctly ?? false

  let base = 0, accuracy = 0, speed = 0, bonus = 0

  if (finishedMs !== null) {
    base     = 100
    accuracy = Math.max(0, 80 - errors * 5)
    const speedRatio = Math.max(0, 1 - finishedMs / (ROUND_SECONDS * 1000))
    speed    = Math.round(speedRatio * 70)
  } else {
    // No completó
    const typedLen = sub.typed_text?.length ?? 0
    const progress = Math.min(typedLen / targetLen, 1)
    base = Math.max(0, Math.round(progress * 50) - errors * 2)
  }

  if (identifiedCorrectly) bonus = 50

  const tokens = base + accuracy + speed + bonus

  // Obtener balance actual
  const { data: team } = await admin.from('teams').select('token_balance').eq('id', teamId).single()
  const currentBalance = team?.token_balance ?? 0
  const newBalance = currentBalance + tokens

  if (tokens > 0) {
    await Promise.allSettled([
      admin.from('teams').update({ token_balance: newBalance }).eq('id', teamId),
      admin.from('token_transactions').insert({
        team_id: teamId,
        amount: tokens,
        reason: 'Nivel 1 — ronda completada',   // columna correcta
        level: '1',
        created_at: new Date().toISOString(),
      }),
    ])
  }

  return NextResponse.json({
    tokens,
    newBalance,
    breakdown: { base, accuracy, speed, bonus, completed: finishedMs !== null },
  })
}
