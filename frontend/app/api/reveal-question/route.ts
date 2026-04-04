import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { questionId } = await req.json()
  if (!questionId) return NextResponse.json({ error: 'Falta questionId' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // 1. Obtener la pregunta
  const { data: question, error: qErr } = await admin
    .from('level2_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (qErr || !question) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
  if (question.revealed_at) return NextResponse.json({ ok: true, alreadyRevealed: true })

  // 2. Marcar como revelada
  await admin
    .from('level2_questions')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', questionId)

  // 3. Obtener todas las respuestas
  const { data: answers } = await admin
    .from('level2_answers')
    .select('*')
    .eq('question_id', questionId)

  if (!answers || answers.length === 0) return NextResponse.json({ ok: true })

  // 4. Procesar cada equipo
  await Promise.allSettled(
    answers.map(async (ans) => {
      const isCorrect = ans.selected_option === question.correct_option
      const tokensEarned = isCorrect ? question.tokens_reward : 0

      // Actualizar la respuesta
      await admin
        .from('level2_answers')
        .update({ is_correct: isCorrect, tokens_earned: tokensEarned })
        .eq('id', ans.id)

      // Otorgar tokens si acertó
      if (isCorrect && tokensEarned > 0) {
        await admin.rpc('transfer_tokens', {
          p_team_id: ans.team_id,
          p_amount: tokensEarned,
          p_reason: 'level2_correct',
          p_level: '2',
          p_ref_id: questionId,
        })
      }

      // Descontar comodín si usó uno
      if (ans.joker_used && ans.tokens_spent > 0) {
        await admin.rpc('transfer_tokens', {
          p_team_id: ans.team_id,
          p_amount: -ans.tokens_spent,
          p_reason: 'joker_purchase',
          p_level: '2',
          p_ref_id: questionId,
        })
      }
    })
  )

  return NextResponse.json({ ok: true })
}
