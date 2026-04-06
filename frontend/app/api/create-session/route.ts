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

  // 2. Seed del juego — AWAITEADO (no fire-and-forget).
  //    En Vercel, los fetch en background se cancelan cuando la función devuelve la respuesta,
  //    dejando la sesión sin contenido y haciendo que los niveles aparezcan vacíos.
  //    Intentamos el backend Python con timeout de 5s; si falla, usamos el seed interno.
  const pythonBackendUrl = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

  let seeded = false
  console.log(`[create-session] Sesión creada id=${data.id} code=${data.host_code}`)
  console.log(`[create-session] AI_BACKEND_URL=${pythonBackendUrl}`)

  // Intento 1: Python backend (LangChain) con timeout agresivo
  console.log('[create-session] Intentando Python backend...')
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const pyRes = await fetch(`${pythonBackendUrl}/seed`, {
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
      console.warn(`[create-session] Python backend respondió HTTP ${pyRes.status}, usando fallback...`)
    }
  } catch (err) {
    console.warn('[create-session] Python backend no disponible:', err instanceof Error ? err.message : err)
  }

  // Intento 2: seed interno de Next.js (Groq directo, sin LangChain)
  if (!seeded) {
    console.log('[create-session] Ejecutando seed interno (Groq)...')
    const t0 = Date.now()
    try {
      const baseUrl = req.nextUrl.origin
      console.log(`[create-session] POST ${baseUrl}/api/seed-session`)
      const seedRes = await fetch(`${baseUrl}/api/seed-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.id }),
      })
      if (seedRes.ok) {
        seeded = true
        console.log(`[create-session] Seed interno OK en ${Date.now() - t0}ms`)
      } else {
        const errBody = await seedRes.json().catch(() => ({}))
        console.error(`[create-session] Seed interno HTTP ${seedRes.status} en ${Date.now() - t0}ms:`, errBody)
      }
    } catch (err) {
      console.error(`[create-session] Seed interno error de red en ${Date.now() - t0}ms:`, err instanceof Error ? err.message : err)
    }
  }

  if (!seeded) {
    console.error(`[create-session] FALLO TOTAL — eliminando sesión huérfana id=${data.id}`)
    // Limpiar la sesión huérfana para no dejar basura en la DB
    await supabaseAdmin.from('game_sessions').delete().eq('id', data.id)
    return NextResponse.json(
      { error: 'No se pudo generar el contenido del juego. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  console.log(`[create-session] LISTO — sesión ${data.id} con contenido generado`)
  // 3. Responder con los datos de la sesión (seed completado)
  return NextResponse.json(data)
}
