import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { questionId } = await req.json()
  if (!questionId) return NextResponse.json({ error: 'Falta questionId' }, { status: 400 })

  const admin = getSupabaseAdmin()

  const { data: votes } = await admin
    .from('final_votes')
    .select('voted_team_id')
    .eq('question_id', questionId)

  if (!votes || votes.length === 0) {
    return NextResponse.json({ error: 'No hay votos registrados' }, { status: 400 })
  }

  // Count votes per team
  const counts: Record<string, number> = {}
  for (const v of votes) {
    counts[v.voted_team_id] = (counts[v.voted_team_id] ?? 0) + 1
  }

  const maxVotes = Math.max(...Object.values(counts))
  const tied = Object.entries(counts)
    .filter(([, c]) => c === maxVotes)
    .map(([id]) => id)

  let winnerTeamId = tied[0]

  // Break tie: lowest token_balance wins (benefit to underdog)
  if (tied.length > 1) {
    const { data: tiedTeams } = await admin
      .from('teams')
      .select('id, token_balance')
      .in('id', tied)
    if (tiedTeams && tiedTeams.length > 0) {
      winnerTeamId = tiedTeams.reduce((prev, curr) =>
        curr.token_balance < prev.token_balance ? curr : prev
      ).id
    }
  }

  await admin.rpc('transfer_tokens', {
    p_team_id: winnerTeamId,
    p_amount: 300,
    p_reason: 'final_vote_bonus',
    p_level: '3',
    p_ref_id: questionId,
  })

  return NextResponse.json({ ok: true, winnerTeamId, voteCount: maxVotes })
}
