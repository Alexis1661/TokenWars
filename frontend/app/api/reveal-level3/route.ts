import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { questionId } = await req.json()
  if (!questionId) return NextResponse.json({ error: 'Falta questionId' }, { status: 400 })

  const admin = getSupabaseAdmin()

  const { data: question, error: qErr } = await admin
    .from('level3_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (qErr || !question) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
  if (question.revealed_at) return NextResponse.json({ ok: true, alreadyRevealed: true })

  // 1. Mark revealed
  await admin
    .from('level3_questions')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', questionId)

  // 2. Get all answers and mark is_correct
  const { data: answers } = await admin
    .from('level3_answers')
    .select('*')
    .eq('question_id', questionId)

  const correctMap: Record<string, boolean> = {}
  await Promise.allSettled(
    (answers ?? []).map(async (ans) => {
      const isCorrect = question.is_final
        ? null
        : ans.selected_option === question.correct_option
      correctMap[ans.team_id] = isCorrect ?? false
      await admin
        .from('level3_answers')
        .update({ is_correct: isCorrect })
        .eq('id', ans.id)
    })
  )

  // 3. Settle all bets
  const { data: bets } = await admin
    .from('level3_bets')
    .select('*')
    .eq('question_id', questionId)

  await Promise.allSettled(
    (bets ?? []).map(async (bet) => {
      // Target answered incorrectly (or no answer) → bettor wins
      const targetCorrect = correctMap[bet.target_team_id] ?? false
      const won = !targetCorrect

      await admin.rpc('transfer_tokens', {
        p_team_id: bet.bettor_team_id,
        p_amount: won ? bet.amount : -bet.amount,
        p_reason: won ? 'bet_won' : 'bet_lost',
        p_level: '3',
        p_ref_id: questionId,
      })

      await admin
        .from('level3_bets')
        .update({ won, settled_at: new Date().toISOString() })
        .eq('id', bet.id)
    })
  )

  return NextResponse.json({ ok: true })
}
