import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { teamId, questionId, jokerType, cost } = await req.json()

  if (!teamId || !questionId || !jokerType || !cost) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { error } = await admin.rpc('transfer_tokens', {
    p_team_id: teamId,
    p_amount: -cost,
    p_reason: 'joker_purchase',
    p_level: '2',
    p_ref_id: questionId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
