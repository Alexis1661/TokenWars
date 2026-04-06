import { NextRequest, NextResponse } from 'next/server'
import { seedGame } from '@/lib/seedGame'

/**
 * POST /api/seed-session
 * Ruta mantenida para compatibilidad con el backend Python y herramientas externas.
 * Internamente usa seedGame() directamente (sin HTTP adicional).
 */
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'Falta sessionId' }, { status: 400 })

  try {
    await seedGame(sessionId)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
