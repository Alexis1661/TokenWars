import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * Verifica si un teamId guardado en localStorage sigue siendo válido
 * y devuelve el estado actual de la sesión para redirigir al jugador.
 */
export async function POST(req: NextRequest) {
  const { teamId } = await req.json()
  if (!teamId) return NextResponse.json({ valid: false })

  const admin = getSupabaseAdmin()

  const { data: team } = await admin
    .from('teams')
    .select('id, name, session_id, token_balance')
    .eq('id', teamId)
    .single()

  if (!team) return NextResponse.json({ valid: false })

  const { data: session } = await admin
    .from('game_sessions')
    .select('id, status, host_code')
    .eq('id', team.session_id)
    .single()

  if (!session || session.status === 'finished') {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({
    valid: true,
    teamId: team.id,
    teamName: team.name,
    sessionStatus: session.status,
    hostCode: session.host_code,
  })
}
