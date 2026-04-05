import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HonrarBody {
  decision: 'COMPARTIR' | 'ROBAR' | 'IGNORAR'
  leader_id: string
  second_id?: string
  all_team_ids: string[]
  punishment_yes_count?: number
}

export async function POST(req: NextRequest) {
  const body: HonrarBody = await req.json()
  const { decision, leader_id, second_id, all_team_ids, punishment_yes_count = 0 } = body

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const results: { team_id: string; earned: number; reason: string }[] = []

  try {
    if (decision === 'COMPARTIR') {
      for (const tid of all_team_ids) {
        if (tid === leader_id) continue
        await supabaseAdmin.rpc('transfer_tokens', {
          p_team_id: tid,
          p_amount: 200,
          p_reason: 'l3_honrar_compartir',
          p_level: '3',
          p_ref_id: leader_id,
        })
        results.push({ team_id: tid, earned: 200, reason: 'compartir' })
      }
    } else if (decision === 'ROBAR' && second_id) {
      // Robar 150T del segundo lugar
      await supabaseAdmin.rpc('transfer_tokens', {
        p_team_id: second_id,
        p_amount: -150,
        p_reason: 'l3_honrar_robado',
        p_level: '3',
        p_ref_id: leader_id,
      })
      await supabaseAdmin.rpc('transfer_tokens', {
        p_team_id: leader_id,
        p_amount: 150,
        p_reason: 'l3_honrar_robar',
        p_level: '3',
        p_ref_id: second_id,
      })
      results.push({ team_id: second_id, earned: -150, reason: 'robado' })
      results.push({ team_id: leader_id, earned: 150, reason: 'robar' })
    }

    // Castigo colectivo si aplica
    if (decision === 'ROBAR' && punishment_yes_count > 0) {
      const penalty = punishment_yes_count * 50
      await supabaseAdmin.rpc('transfer_tokens', {
        p_team_id: leader_id,
        p_amount: -penalty,
        p_reason: 'l3_castigo_colectivo',
        p_level: '3',
        p_ref_id: leader_id,
      })
      results.push({ team_id: leader_id, earned: -penalty, reason: 'castigo' })
    }

    return NextResponse.json({ ok: true, results })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
