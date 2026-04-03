import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const INTRO_SECONDS = 10

export async function POST(req: NextRequest) {
  const { roundId } = await req.json()
  if (!roundId) return NextResponse.json({ error: 'Falta roundId' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Obtener info de la ronda actual
  const { data: round } = await admin
    .from('level1_rounds')
    .select('id, round_number, session_id, finished_at')
    .eq('id', roundId)
    .single()

  if (!round) return NextResponse.json({ error: 'Ronda no encontrada' }, { status: 404 })
  // Ya estaba terminada — no hacer nada (idempotente)
  if (round.finished_at) return NextResponse.json({ ok: true, alreadyDone: true })

  const now = new Date()

  // Marcar ronda actual como terminada
  await admin
    .from('level1_rounds')
    .update({ finished_at: now.toISOString() })
    .eq('id', roundId)

  // Si hay ronda siguiente, fijar su started_at = ahora + tiempo de intro
  // para que todos los clientes calculen el mismo tiempo restante global
  const nextStartedAt = new Date(now.getTime() + INTRO_SECONDS * 1000)

  await admin
    .from('level1_rounds')
    .update({ started_at: nextStartedAt.toISOString() })
    .eq('session_id', round.session_id)
    .eq('round_number', round.round_number + 1)

  return NextResponse.json({ ok: true })
}
