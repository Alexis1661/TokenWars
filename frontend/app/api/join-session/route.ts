import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { hostCode, teamName, deviceId } = await req.json()

  if (!hostCode || !teamName || !deviceId) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
  }

  // 1. Buscar sesión por host_code
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('game_sessions')
    .select('id, status')
    .eq('host_code', hostCode.toUpperCase().trim())
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Código de sesión inválido' }, { status: 404 })
  }

  if (session.status !== 'lobby') {
    return NextResponse.json({ error: 'La partida ya comenzó' }, { status: 409 })
  }

  // 2. Crear equipo (o recuperarlo si el nombre ya existe en esta sesión)
  const { data: existingTeam } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('session_id', session.id)
    .eq('name', teamName.trim())
    .single()

  let teamId: string

  if (existingTeam) {
    teamId = existingTeam.id
  } else {
    // Contar equipos existentes para display_order
    const { count } = await supabaseAdmin
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)

    const { data: newTeam, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        session_id: session.id,
        name: teamName.trim(),
        token_balance: 0,
        display_order: count ?? 0,
      })
      .select('id')
      .single()

    if (teamError || !newTeam) {
      return NextResponse.json({ error: 'No se pudo crear el equipo' }, { status: 500 })
    }

    teamId = newTeam.id
  }

  // 3. Registrar miembro (upsert por device_id para evitar duplicados)
  await supabaseAdmin.from('team_members').upsert(
    { team_id: teamId, display_name: teamName.trim(), device_id: deviceId },
    { onConflict: 'team_id,device_id' }
  )

  return NextResponse.json({ teamId, sessionId: session.id })
}
