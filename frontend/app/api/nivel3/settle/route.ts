import { NextRequest, NextResponse } from 'next/server'

const AI_BACKEND = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const res = await fetch(`${AI_BACKEND}/nivel3/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 503 })
  }
}
