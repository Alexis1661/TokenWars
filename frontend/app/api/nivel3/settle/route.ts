import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AI_BACKEND = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

interface TeamBet {
  team_id: string
  option: string
  bet: number
  card: string | null
}

function calculateSettle(correct_option: string, team_bets: TeamBet[]) {
  const transferencia_winners: string[] = []
  const results: { team_id: string; earned: number }[] = []

  for (const b of team_bets) {
    const is_correct = b.option === correct_option
    const bet = b.bet ?? 0
    const card = b.card
    let earned = 0

    if (card === 'DOBLAR O NADA') {
      earned = is_correct ? bet * 2 : -bet
    } else if (card === 'RED DE SEGURIDAD') {
      earned = is_correct ? bet : -Math.floor(bet / 2)
    } else if (card === 'FAROL') {
      earned = is_correct ? bet * 3 : -bet
    } else if (card === 'TRANSFERENCIA') {
      if (is_correct) {
        earned = bet + 100
        transferencia_winners.push(b.team_id)
      } else {
        earned = -bet
      }
    } else {
      // Normal bet (includes CARTA OSCURA — hint only, no modifier)
      earned = is_correct ? bet : -bet
    }

    results.push({ team_id: b.team_id, earned })
  }

  // TRANSFERENCIA post-processing: deduct 100T from highest bettor (excluding winners)
  if (transferencia_winners.length > 0) {
    const others = team_bets.filter((b) => !transferencia_winners.includes(b.team_id))
    if (others.length > 0) {
      const maxBet = Math.max(...others.map((b) => b.bet ?? 0))
      const target = others.find((b) => (b.bet ?? 0) === maxBet)
      if (target) {
        const r = results.find((r) => r.team_id === target.team_id)
        if (r) r.earned -= 100
      }
    }
  }

  return results
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { correct_option, team_bets } = body as { correct_option: string; team_bets: TeamBet[] }

  // Try Python backend first
  try {
    const res = await fetch(`${AI_BACKEND}/nivel3/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    // Fall through to local fallback
  }

  // Fallback: calculate and apply tokens locally
  if (!correct_option || !Array.isArray(team_bets)) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const results = calculateSettle(correct_option, team_bets)

  for (const r of results) {
    try {
      await supabaseAdmin.rpc('transfer_tokens', {
        p_team_id: r.team_id,
        p_amount: r.earned,
        p_reason: 'l3_bet_settled_fallback',
        p_level: '3',
        p_ref_id: r.team_id,
      })
    } catch (e) {
      console.error(`Error transferring to ${r.team_id}:`, e)
    }
  }

  return NextResponse.json({ ok: true, results, fallback: true })
}
