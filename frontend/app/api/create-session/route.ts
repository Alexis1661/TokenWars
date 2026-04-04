import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const HOST_PASSWORD = process.env.HOST_PASSWORD ?? 'tokenwars2025'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== HOST_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  // 1. Crear la sesión
  const { data, error } = await supabaseAdmin
    .from('game_sessions')
    .insert({ status: 'lobby', current_level: 0 })
    .select('id, host_code')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error al crear sesión' }, { status: 500 })
  }

  // 2. Disparar el seed en background usando el backend Python (LangChain)
  //    Si no está corriendo, cae al seed interno de Next.js como fallback
  const pythonBackendUrl = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

  fetch(`${pythonBackendUrl}/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: data.id }),
  }).catch(() => {
    // Fallback: Python backend no disponible → usar la API interna de Next.js
    console.warn('[seed] Python backend no disponible, usando fallback interno...')
    const baseUrl = req.nextUrl.origin
    fetch(`${baseUrl}/api/seed-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: data.id }),
    }).catch((err) => console.error('[seed-session fallback] Error:', err))
  })

  // 3. Responder inmediatamente con los datos de la sesión
  return NextResponse.json(data)
}
