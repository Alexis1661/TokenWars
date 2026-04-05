import { NextRequest, NextResponse } from 'next/server'

const AI_BACKEND = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const res = await fetch(`${AI_BACKEND}/nivel3/cartas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'Backend unavailable' }, { status: 503 })
  }
}
