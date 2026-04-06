import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { seedGame } from '@/lib/seedGame'

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

  console.log(`[create-session] Sesión creada id=${data.id} code=${data.host_code}`)

  // 2. Intentar seed con el backend Python primero (si está configurado y no es el mismo host)
  const pythonBackendUrl = process.env.AI_BACKEND_URL ?? ''
  let seeded = false

  if (pythonBackendUrl && !pythonBackendUrl.includes('localhost')) {
    console.log(`[create-session] Intentando Python backend: ${pythonBackendUrl}/seed`)
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const pyRes = await fetch(`${pythonBackendUrl.replace(/\/$/, '')}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.id }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (pyRes.ok) {
        seeded = true
        console.log('[create-session] Python backend seed OK')
      } else {
        console.warn(`[create-session] Python backend HTTP ${pyRes.status}, usando seedGame directo...`)
      }
    } catch (err) {
      console.warn('[create-session] Python backend falló:', err instanceof Error ? err.message : err)
    }
  } else {
    console.log('[create-session] AI_BACKEND_URL no configurado o es localhost, usando seedGame directo')
  }

  // 3. Fallback: llamar seedGame() directamente (sin HTTP interno — funciona en Railway/Vercel)
  if (!seeded) {
    try {
      await seedGame(data.id)
      seeded = true
    } catch (err) {
      console.error('[create-session] seedGame() falló:', err instanceof Error ? err.message : err)
    }
  }

  if (!seeded) {
    console.error(`[create-session] FALLO TOTAL — eliminando sesión huérfana id=${data.id}`)
    await supabaseAdmin.from('game_sessions').delete().eq('id', data.id)
    return NextResponse.json(
      { error: 'No se pudo generar el contenido del juego. Verifica GROQ_API_KEY y SUPABASE_SERVICE_ROLE_KEY en Railway.' },
      { status: 500 }
    )
  }

  console.log(`[create-session] LISTO — sesión ${data.id} lista para jugar`)
  return NextResponse.json(data)
}
