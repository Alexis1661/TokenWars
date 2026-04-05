import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AI_BACKEND = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

const CARDS = [
  'DOBLAR O NADA',
  'RED DE SEGURIDAD',
  'TRANSFERENCIA',
  'CARTA OSCURA',
  'FAROL',
]

function shuffleSample(arr: string[], k: number): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const res = await fetch(`${AI_BACKEND}/nivel3/cartas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    // Fallback: asignar cartas localmente
    const sessionId = body.sessionId
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'Falta sessionId' }, { status: 400 })
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('session_id', sessionId)

    const teamCards: Record<string, string[]> = {}
    for (const t of teams ?? []) {
      teamCards[t.id] = shuffleSample(CARDS, 2)
    }
    return NextResponse.json({ ok: true, teamCards, fallback: true })
  }
}
