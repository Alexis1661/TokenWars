# Level 3 — La Traición: Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Level 3 ("La Traición") by adding two backend API routes, fully rewriting the team UI component, adding Realtime subscriptions, and building host controls for reveal/voting.

**Architecture:** Two new API routes handle reveal+bet settlement and final vote award. LaTraicion.tsx is rewritten with proper phase machine, reveal panel, and voting UI matching the existing design system. play/[teamId]/page.tsx gets a Realtime subscription for level3_questions. host/page.tsx gets Level 3 controls mirroring the Level 2 pattern.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (postgres_changes Realtime, RPC transfer_tokens), framer-motion, Orbitron/Exo 2 fonts.

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/app/api/reveal-level3/route.ts` | Mark revealed, calculate is_correct, settle all bets |
| Create | `frontend/app/api/award-final-vote/route.ts` | Count votes, award +300T to most voted team |
| Rewrite | `frontend/components/level3/LaTraicion.tsx` | Full team UI with all phases + reveal results + voting |
| Modify | `frontend/app/play/[teamId]/page.tsx` | Add Realtime subscription for level3_questions |
| Modify | `frontend/app/host/page.tsx` | Add Level 3 controls: reveal button, vote tracking, award button |

---

## Task 1: Create `POST /api/reveal-level3`

**Files:**
- Create: `frontend/app/api/reveal-level3/route.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/app/api/reveal-level3/route.ts
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
```

- [ ] **Step 2: Verify the file exists**

Run: `cat frontend/app/api/reveal-level3/route.ts`

Expected: file contents printed with no errors.

---

## Task 2: Create `POST /api/award-final-vote`

**Files:**
- Create: `frontend/app/api/award-final-vote/route.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/app/api/award-final-vote/route.ts
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
```

- [ ] **Step 2: Verify the file exists**

Run: `cat frontend/app/api/award-final-vote/route.ts`

Expected: file contents printed with no errors.

---

## Task 3: Rewrite `LaTraicion.tsx`

**Files:**
- Rewrite: `frontend/components/level3/LaTraicion.tsx`

This is a full replacement of the existing file. The new version adds:
- Design system colors matching `Millonario.tsx`
- Reveal panel showing all teams' answers + bet result
- Voting phase for the final question
- Fetches reveal data client-side when `revealed` prop flips to `true`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Timer } from '@/components/ui/Timer'
import type { Level3Question, AnswerOption, Team } from '@/lib/types'

const G = {
  primary: '#facc15',
  dim:     '#a3a3a3',
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',
  panel:   '#111827',
  error:   '#f87171',
  green:   '#4ade80',
}

const OPTIONS: AnswerOption[] = ['a', 'b', 'c', 'd']
const BETTING_SECONDS = 15
const ANSWER_SECONDS = 30

type Phase = 'answering' | 'betting' | 'waiting' | 'revealed' | 'voting'

interface TeamAnswer {
  team_id: string
  selected_option: AnswerOption | null
  open_answer: string | null
  is_correct: boolean | null
}

interface BetResult {
  target_team_id: string
  amount: number
  won: boolean | null
}

interface LaTraicionProps {
  question: Level3Question
  team: Team
  allTeams: Team[]
  revealed: boolean
}

export function LaTraicion({ question, team, allTeams, revealed }: LaTraicionProps) {
  const [phase, setPhase] = useState<Phase>('answering')
  const [selectedOption, setSelectedOption] = useState<AnswerOption | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [answerLocked, setAnswerLocked] = useState(false)
  const [betTarget, setBetTarget] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(50)
  const [betLocked, setBetLocked] = useState(false)
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswer[]>([])
  const [myBet, setMyBet] = useState<BetResult | null>(null)
  const [voted, setVoted] = useState(false)

  const maxBet = Math.floor(
    (question.is_final ? team.token_balance : team.token_balance * 0.5) / 50
  ) * 50

  const rivals = allTeams.filter((t) => t.id !== team.id)

  // When revealed flips, fetch all answers + own bet result
  useEffect(() => {
    if (!revealed) return

    supabase
      .from('level3_answers')
      .select('team_id, selected_option, open_answer, is_correct')
      .eq('question_id', question.id)
      .then(({ data }) => setTeamAnswers((data ?? []) as TeamAnswer[]))

    supabase
      .from('level3_bets')
      .select('target_team_id, amount, won')
      .eq('question_id', question.id)
      .eq('bettor_team_id', team.id)
      .maybeSingle()
      .then(({ data }) => setMyBet(data as BetResult | null))

    setPhase(question.is_final ? 'voting' : 'revealed')
  }, [revealed, question.id, question.is_final, team.id])

  const lockAnswer = async () => {
    if (answerLocked) return
    setAnswerLocked(true)
    await supabase.from('level3_answers').upsert({
      question_id: question.id,
      team_id: team.id,
      selected_option: question.is_final ? null : selectedOption,
      open_answer: question.is_final ? openAnswer : null,
      is_locked: true,
      answered_at: new Date().toISOString(),
    }, { onConflict: 'question_id,team_id' })
    setPhase('betting')
  }

  const lockBet = async () => {
    if (betLocked || !betTarget || betAmount < 50) return
    setBetLocked(true)
    await supabase.from('level3_bets').insert({
      question_id: question.id,
      bettor_team_id: team.id,
      target_team_id: betTarget,
      amount: betAmount,
    })
    setPhase('waiting')
  }

  const submitVote = async (votedTeamId: string) => {
    if (voted) return
    setVoted(true)
    await supabase.from('final_votes').insert({
      question_id: question.id,
      voter_team_id: team.id,
      voted_team_id: votedTeamId,
    })
  }

  const optionText = (opt: AnswerOption) =>
    ({ a: question.option_a, b: question.option_b, c: question.option_c, d: question.option_d }[opt])

  const BetResultBanner = () => {
    if (!myBet) return null
    return (
      <div className="mt-2 p-4 rounded-xl text-center font-mono text-sm"
        style={{
          background: myBet.won ? 'rgba(74,222,128,0.1)' : myBet.won === false ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${myBet.won ? G.green : myBet.won === false ? G.error : G.border}`,
          color: myBet.won ? G.green : myBet.won === false ? G.error : G.dim,
        }}>
        {myBet.won === null
          ? '⏳ Liquidando apuesta...'
          : myBet.won
            ? `🎉 Ganaste ${myBet.amount}T apostando contra ${allTeams.find(t => t.id === myBet.target_team_id)?.name}`
            : `💸 Perdiste ${myBet.amount}T — ${allTeams.find(t => t.id === myBet.target_team_id)?.name} acertó`
        }
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-start overflow-y-auto p-4 md:p-8"
      style={{ background: G.bg, fontFamily: "'Exo 2', sans-serif" }}>

      <div className="w-full max-w-3xl flex flex-col gap-6">

        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>{team.name}</span>
              <span style={{ color: '#60a5fa', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tu Equipo</span>
            </div>
            <div style={{ width: 1, height: 40, background: G.border }} />
            <div className="flex flex-col">
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.1rem', fontWeight: 700 }}>{team.token_balance}</span>
              <span style={{ color: 'rgba(250,204,21,0.6)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Mis Tokens</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'answering' && <Timer seconds={ANSWER_SECONDS} onExpire={lockAnswer} />}
            {phase === 'betting' && <Timer seconds={BETTING_SECONDS} onExpire={lockBet} />}
            <div className="px-4 py-1 rounded-full flex flex-col items-center"
              style={{ background: G.panel, border: `1px solid ${G.border}` }}>
              <span style={{ fontSize: '0.625rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Pregunta</span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'white', fontSize: '0.875rem' }}>
                {question.is_final ? 'FINAL' : `${question.question_number} / 5`}
              </span>
            </div>
          </div>
        </header>

        {/* Question box */}
        <div className="w-full p-6 rounded-[40px] text-center"
          style={{
            background: 'linear-gradient(to bottom, #1e3a5f, #111827)',
            border: `3px solid ${G.primary}`,
            boxShadow: '0 0 30px rgba(250,204,21,0.1)',
          }}>
          {question.is_final && (
            <p style={{ color: G.error, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              ▶ PREGUNTA FINAL — RESPUESTA ABIERTA
            </p>
          )}
          <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.6 }}>{question.question_text}</p>
        </div>

        {/* ANSWERING: multiple choice */}
        {phase === 'answering' && !question.is_final && (
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.filter((o) => optionText(o)).map((opt) => (
              <button key={opt} onClick={() => !answerLocked && setSelectedOption(opt)}
                className="p-4 rounded-xl text-left text-sm font-medium transition-all"
                style={{
                  border: `2px solid ${selectedOption === opt ? G.primary : G.border}`,
                  background: selectedOption === opt ? 'rgba(250,204,21,0.1)' : G.panel,
                  color: selectedOption === opt ? G.primary : 'white',
                }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, marginRight: 8 }}>{opt.toUpperCase()}:</span>
                {optionText(opt)}
              </button>
            ))}
          </div>
        )}

        {/* ANSWERING: open text (final question) */}
        {phase === 'answering' && question.is_final && (
          <textarea value={openAnswer} onChange={(e) => setOpenAnswer(e.target.value)}
            rows={3} placeholder="ReAct o Tool Calling — justifica en una línea..."
            style={{
              fontFamily: 'monospace', fontSize: '0.875rem', background: G.panel,
              border: `1px solid ${G.border}`, borderRadius: 12, padding: 16,
              color: 'white', resize: 'none', outline: 'none', width: '100%',
            }}
          />
        )}

        {/* Confirm answer button */}
        {phase === 'answering' && (
          <button onClick={lockAnswer}
            disabled={question.is_final ? !openAnswer.trim() : !selectedOption}
            style={{
              background: G.green, color: '#000', fontWeight: 700,
              padding: '12px 0', borderRadius: 9999, letterSpacing: '0.1em',
              opacity: (question.is_final ? !openAnswer.trim() : !selectedOption) ? 0.4 : 1,
              cursor: (question.is_final ? !openAnswer.trim() : !selectedOption) ? 'not-allowed' : 'pointer',
              border: 'none', width: '100%', fontSize: '1rem',
            }}>
            🔒 Confirmar Respuesta
          </button>
        )}

        {/* BETTING PHASE */}
        <AnimatePresence>
          {phase === 'betting' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: G.error, fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>
                😈 ¿A quién hundes?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {rivals.map((t) => (
                  <button key={t.id} onClick={() => setBetTarget(t.id)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      border: `2px solid ${betTarget === t.id ? G.error : G.border}`,
                      background: betTarget === t.id ? 'rgba(248,113,113,0.1)' : G.panel,
                      color: betTarget === t.id ? G.error : 'white', textAlign: 'left',
                    }}>
                    {t.name}
                    <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6 }}>{t.token_balance}T</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <label style={{ color: G.dim, fontSize: '0.875rem' }}>
                  Monto:{' '}
                  <span style={{ color: 'white', fontWeight: 700 }}>{betAmount}T</span>
                  <span style={{ marginLeft: 8, color: G.dim }}>(máx {maxBet}T)</span>
                </label>
                <input type="range" min={50} max={Math.max(50, maxBet)} step={50}
                  value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="accent-red-400" style={{ width: '100%' }} />
              </div>
              <button onClick={lockBet} disabled={!betTarget || maxBet < 50}
                style={{
                  background: G.error, color: 'white', fontWeight: 700,
                  padding: '12px 0', borderRadius: 9999, border: 'none', width: '100%',
                  opacity: !betTarget ? 0.4 : 1, cursor: !betTarget ? 'not-allowed' : 'pointer', fontSize: '1rem',
                }}>
                Apostar {betAmount}T contra {rivals.find((r) => r.id === betTarget)?.name ?? '—'}
              </button>
              <button onClick={() => setPhase('waiting')}
                style={{ color: G.dim, fontSize: '0.875rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                Saltar apuesta
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WAITING PHASE */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Orbitron', sans-serif", color: G.primary, fontWeight: 700, fontSize: '1.1rem' }}
            className="animate-pulse">
            ⏳ Esperando reveal del host...
          </div>
        )}

        {/* REVEALED PHASE */}
        <AnimatePresence>
          {phase === 'revealed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '8px 24px', borderBottom: `1px solid ${G.border}`, background: '#0f172a', fontFamily: 'monospace', fontSize: '0.625rem', letterSpacing: '0.3em', color: G.dim }}>
                RESUMEN RONDA
              </div>
              <div style={{ padding: 16 }} className="flex flex-col gap-3">
                {question.correct_option && (
                  <div style={{ background: 'rgba(74,222,128,0.1)', border: `1px solid ${G.green}`, borderRadius: 8, padding: '8px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: G.green }}>
                    Respuesta correcta: {question.correct_option.toUpperCase()}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {allTeams.map((t) => {
                    const ans = teamAnswers.find((a) => a.team_id === t.id)
                    const isMe = t.id === team.id
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: 12,
                        border: `1px solid ${isMe ? 'rgba(96,165,250,0.4)' : G.border}`,
                        background: isMe ? 'rgba(30,64,175,0.15)' : 'rgba(255,255,255,0.03)',
                      }}>
                        <p style={{ fontSize: '0.625rem', marginBottom: 4, color: isMe ? '#93c5fd' : G.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isMe && '▸ '}{t.name}
                        </p>
                        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color: !ans?.selected_option ? G.dim : ans.is_correct ? G.green : G.error }}>
                          {!ans?.selected_option ? '--' : `${ans.selected_option.toUpperCase()} ${ans.is_correct ? '✓' : '✗'}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <BetResultBanner />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VOTING PHASE (final question only) */}
        <AnimatePresence>
          {phase === 'voting' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              {/* All open answers */}
              <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${G.border}`, background: '#0f172a', fontFamily: 'monospace', fontSize: '0.625rem', letterSpacing: '0.3em', color: G.dim }}>
                  RESPUESTAS DE LOS EQUIPOS
                </div>
                <div style={{ padding: 12 }} className="flex flex-col gap-2">
                  {allTeams.map((t) => {
                    const ans = teamAnswers.find((a) => a.team_id === t.id)
                    const isMe = t.id === team.id
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: 8,
                        background: isMe ? 'rgba(30,64,175,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isMe ? 'rgba(96,165,250,0.4)' : G.border}`,
                      }}>
                        <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: isMe ? '#93c5fd' : G.dim }}>
                          {isMe && '▸ '}{t.name}
                        </span>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginTop: 4, fontStyle: 'italic' }}>
                          {ans?.open_answer ?? '(sin respuesta)'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!voted ? (
                <>
                  <p style={{ textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: G.primary }}>
                    ¿Quién dio la mejor justificación?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {rivals.map((t) => (
                      <button key={t.id} onClick={() => submitVote(t.id)}
                        className="transition-all hover:scale-105"
                        style={{
                          padding: 12, borderRadius: 12,
                          border: `2px solid ${G.primary}`,
                          background: 'rgba(250,204,21,0.08)', color: G.primary,
                          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                        }}>
                        Votar por {t.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: G.green }}
                  className="animate-pulse">
                  ✓ Voto enviado — esperando resultados...
                </div>
              )}

              <BetResultBanner />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -40`

Expected: no errors related to `LaTraicion.tsx`. Fix any type errors before proceeding.

---

## Task 4: Add Realtime subscription for Level 3 in `play/[teamId]/page.tsx`

**Files:**
- Modify: `frontend/app/play/[teamId]/page.tsx` (lines 108–118)

- [ ] **Step 1: Replace the level3 block inside the `useEffect`**

Find this block (inside the `useEffect` that depends on `[session]`):

```ts
    if (session.status === 'level3') {
      supabase
        .from('level3_questions')
        .select('*')
        .eq('session_id', session.id)
        .is('revealed_at', null)
        .order('question_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveQuestion3(data))
    }
```

Replace with:

```ts
    if (session.status === 'level3') {
      const loadActiveQ3 = () =>
        supabase
          .from('level3_questions')
          .select('*')
          .eq('session_id', session.id)
          .is('revealed_at', null)
          .order('question_number')
          .limit(1)
          .single()
          .then(({ data }) => setActiveQuestion3(data ?? null))

      loadActiveQ3()

      const q3Channel = supabase
        .channel(`level3-questions-${session.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'level3_questions',
          filter: `session_id=eq.${session.id}`,
        }, (payload) => {
          const updated = payload.new as Level3Question
          if (updated.revealed_at) {
            setActiveQuestion3(prev => prev?.id === updated.id ? updated : prev)
            if (!updated.is_final) {
              setTimeout(() => loadActiveQ3(), 5000)
            }
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(q3Channel) }
    }
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors. `Level3Question` is already imported at line 13.

---

## Task 5: Add Level 3 controls to `host/page.tsx`

**Files:**
- Modify: `frontend/app/host/page.tsx`

This task has 5 steps: import, state, effect+functions, GameDashboard props, controls UI.

- [ ] **Step 1: Add `Level3Question` to the import**

Find:
```ts
import type { SessionStatus, Level2Question } from '@/lib/types'
```

Replace with:
```ts
import type { SessionStatus, Level2Question, Level3Question } from '@/lib/types'
```

- [ ] **Step 2: Add new state variables inside `HostSession`**

Find this block inside `HostSession`:
```ts
  const [activeQuestion2, setActiveQuestion2] = useState<Level2Question | null>(null)
  const [revealingQ2, setRevealingQ2] = useState(false)
```

Replace with:
```ts
  const [activeQuestion2, setActiveQuestion2] = useState<Level2Question | null>(null)
  const [revealingQ2, setRevealingQ2] = useState(false)
  const [activeQuestion3, setActiveQuestion3] = useState<Level3Question | null>(null)
  const [revealingQ3, setRevealingQ3] = useState(false)
  const [finalVoteCounts, setFinalVoteCounts] = useState<Record<string, number>>({})
  const [awardingVote, setAwardingVote] = useState(false)
```

- [ ] **Step 3: Add Level 3 tracking effect and functions**

Find:
```ts
  const revealCurrentQuestion2 = async () => {
```

Add the following **before** that function:

```ts
  // Track active question during level3
  useEffect(() => {
    if (!session || session.status !== 'level3') { setActiveQuestion3(null); return }

    const loadQ3 = () =>
      supabase
        .from('level3_questions')
        .select('*')
        .eq('session_id', sessionId)
        .is('revealed_at', null)
        .order('question_number')
        .limit(1)
        .single()
        .then(({ data }) => setActiveQuestion3(data ?? null))

    loadQ3()

    const channel = supabase.channel(`host-q3-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'level3_questions',
        filter: `session_id=eq.${sessionId}`,
      }, () => { loadQ3() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, sessionId])

  // Subscribe to final_votes when final question is revealed
  useEffect(() => {
    if (!activeQuestion3?.is_final || !activeQuestion3.revealed_at) return

    const votesChannel = supabase.channel(`host-final-votes-${activeQuestion3.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'final_votes',
        filter: `question_id=eq.${activeQuestion3.id}`,
      }, (payload) => {
        const votedId = (payload.new as { voted_team_id: string }).voted_team_id
        setFinalVoteCounts(prev => ({ ...prev, [votedId]: (prev[votedId] ?? 0) + 1 }))
      })
      .subscribe()

    // Also load existing votes
    supabase
      .from('final_votes')
      .select('voted_team_id')
      .eq('question_id', activeQuestion3.id)
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const v of data ?? []) {
          counts[v.voted_team_id] = (counts[v.voted_team_id] ?? 0) + 1
        }
        setFinalVoteCounts(counts)
      })

    return () => { supabase.removeChannel(votesChannel) }
  }, [activeQuestion3?.id, activeQuestion3?.is_final, activeQuestion3?.revealed_at])

  const revealCurrentQuestion3 = async () => {
    if (revealingQ3 || !activeQuestion3) return
    setRevealingQ3(true)
    await fetch('/api/reveal-level3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: activeQuestion3.id }),
    })
    setRevealingQ3(false)
  }

  const awardFinalVote = async () => {
    if (awardingVote || !activeQuestion3) return
    setAwardingVote(true)
    await fetch('/api/award-final-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: activeQuestion3.id }),
    })
    setAwardingVote(false)
  }

```

- [ ] **Step 4: Pass new props to `GameDashboard`**

Find:
```tsx
    <GameDashboard session={session} teams={teams} events={events}
      answeredTeamIds={answeredTeamIds} betsCount={betsCount}
      onAdvance={advanceLevel} advancing={advancing}
      activeRoundNumber={activeRoundNumber}
      onEndRound={endCurrentRound} endingRound={endingRound}
      activeQuestion2={activeQuestion2}
      onRevealQ2={revealCurrentQuestion2}
      revealingQ2={revealingQ2} />
```

Replace with:
```tsx
    <GameDashboard session={session} teams={teams} events={events}
      answeredTeamIds={answeredTeamIds} betsCount={betsCount}
      onAdvance={advanceLevel} advancing={advancing}
      activeRoundNumber={activeRoundNumber}
      onEndRound={endCurrentRound} endingRound={endingRound}
      activeQuestion2={activeQuestion2}
      onRevealQ2={revealCurrentQuestion2}
      revealingQ2={revealingQ2}
      activeQuestion3={activeQuestion3}
      onRevealQ3={revealCurrentQuestion3}
      revealingQ3={revealingQ3}
      finalVoteCounts={finalVoteCounts}
      onAwardFinalVote={awardFinalVote}
      awardingVote={awardingVote} />
```

- [ ] **Step 5: Add new props to `GameDashboard` interface and Level 3 controls UI**

Find the `GameDashboard` function signature:
```ts
function GameDashboard({ session, teams, events, answeredTeamIds, betsCount, onAdvance, advancing, activeRoundNumber, onEndRound, endingRound, activeQuestion2, onRevealQ2, revealingQ2 }: {
  session: ReturnType<typeof usePublicGameData>['session']
  teams: ReturnType<typeof usePublicGameData>['teams']
  events: ReturnType<typeof useHostGameData>['events']
  answeredTeamIds: ReturnType<typeof useHostGameData>['answeredTeamIds']
  betsCount: number
  onAdvance: () => void
  advancing: boolean
  activeRoundNumber: number | null
  onEndRound: () => void
  endingRound: boolean
  activeQuestion2: Level2Question | null
  onRevealQ2: () => void
  revealingQ2: boolean
}) {
```

Replace with:
```ts
function GameDashboard({ session, teams, events, answeredTeamIds, betsCount, onAdvance, advancing, activeRoundNumber, onEndRound, endingRound, activeQuestion2, onRevealQ2, revealingQ2, activeQuestion3, onRevealQ3, revealingQ3, finalVoteCounts, onAwardFinalVote, awardingVote }: {
  session: ReturnType<typeof usePublicGameData>['session']
  teams: ReturnType<typeof usePublicGameData>['teams']
  events: ReturnType<typeof useHostGameData>['events']
  answeredTeamIds: ReturnType<typeof useHostGameData>['answeredTeamIds']
  betsCount: number
  onAdvance: () => void
  advancing: boolean
  activeRoundNumber: number | null
  onEndRound: () => void
  endingRound: boolean
  activeQuestion2: Level2Question | null
  onRevealQ2: () => void
  revealingQ2: boolean
  activeQuestion3: Level3Question | null
  onRevealQ3: () => void
  revealingQ3: boolean
  finalVoteCounts: Record<string, number>
  onAwardFinalVote: () => void
  awardingVote: boolean
}) {
```

- [ ] **Step 6: Add Level 3 controls block in the controls panel**

Find:
```tsx
          {/* Controles — otros niveles */}
          {session.status !== 'level1' && session.status !== 'level2' && nextStatus && nextStatus !== 'finished' && (
```

Add the following **before** that block:

```tsx
          {/* Controles — Level 3 */}
          {session.status === 'level3' && (
            <div className="flex flex-col gap-3">
              <div className="cup-panel px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>PREGUNTA ACTIVA</p>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1.6rem', lineHeight: 1 }}>
                    {activeQuestion3
                      ? activeQuestion3.is_final ? 'FINAL' : `${activeQuestion3.question_number} / 5`
                      : 'Todas reveladas'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-right" style={{ color: 'var(--cup-gold-dark)', fontFamily: "'Orbitron', sans-serif" }}>
                    {answeredTeamIds.size}/{teams.length} RESPONDIERON
                  </p>
                  {activeQuestion3 && !activeQuestion3.revealed_at && (
                    <button onClick={onRevealQ3} disabled={revealingQ3}
                      className="cup-btn cup-btn-gold px-6 py-3">
                      {revealingQ3 ? 'Revelando...' : '🔍 Revelar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Final question voting panel */}
              {activeQuestion3?.is_final && activeQuestion3.revealed_at && (
                <div className="cup-panel flex flex-col gap-3 p-4">
                  <p className="text-xs" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold-dark)' }}>
                    VOTOS — PREGUNTA FINAL
                  </p>
                  <div className="flex flex-col gap-1">
                    {teams.map((t) => (
                      <div key={t.id} className="flex items-center justify-between">
                        <span style={{ color: 'var(--cup-cream)', fontSize: '0.875rem' }}>{t.name}</span>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--cup-gold)', fontSize: '1rem' }}>
                          {finalVoteCounts[t.id] ?? 0} votos
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={onAwardFinalVote} disabled={awardingVote || Object.keys(finalVoteCounts).length === 0}
                    className="cup-btn cup-btn-gold py-3">
                    {awardingVote ? 'Otorgando...' : '🏆 Cerrar votación y otorgar +300T'}
                  </button>
                </div>
              )}

              {!activeQuestion3 && (
                <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-xl py-4">
                  {advancing ? 'Avanzando...' : '▶ Terminar juego'}
                </button>
              )}
            </div>
          )}
```

- [ ] **Step 7: Remove the generic "otros niveles" advance button for level3 since it's now handled above**

Find:
```tsx
          {/* Controles — otros niveles */}
          {session.status !== 'level1' && session.status !== 'level2' && nextStatus && nextStatus !== 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-2xl py-5">
              {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS[nextStatus]}`}
            </button>
          )}
          {session.status !== 'level1' && session.status !== 'level2' && nextStatus === 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn text-2xl py-5" style={{ background: 'var(--cup-red)' }}>
              Terminar juego
            </button>
          )}
```

Replace with:
```tsx
          {/* Controles — otros niveles (excluye level3 que tiene su propio bloque) */}
          {session.status !== 'level1' && session.status !== 'level2' && session.status !== 'level3' && nextStatus && nextStatus !== 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn cup-btn-gold text-2xl py-5">
              {advancing ? 'Avanzando...' : `▶ ${LEVEL_LABELS[nextStatus]}`}
            </button>
          )}
          {session.status !== 'level1' && session.status !== 'level2' && session.status !== 'level3' && nextStatus === 'finished' && (
            <button onClick={onAdvance} disabled={advancing} className="cup-btn text-2xl py-5" style={{ background: 'var(--cup-red)' }}>
              Terminar juego
            </button>
          )}
```

- [ ] **Step 8: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -40`

Expected: no errors. If `Level3Question` import complains, check that it's exported from `@/lib/types` (it is, at line 106).

---

## Verification

- [ ] **Manual test — Reveal + bet settlement:**
  1. Start a Level 3 question with at least 2 teams that have placed bets
  2. Host clicks "Revelar" — check that `level3_questions.revealed_at` is set in Supabase
  3. Check that `level3_bets.won` and `settled_at` are set correctly
  4. Check that `token_balance` of betting teams updated correctly in Supabase
  5. `LaTraicion.tsx` on team side shows the reveal panel with bet result

- [ ] **Manual test — Final question voting:**
  1. Reveal the final question (question with `is_final=true`)
  2. Teams see the voting phase with all open answers displayed
  3. Teams vote — host sees vote counts update live
  4. Host clicks "Cerrar votación" — most voted team gets +300T

- [ ] **Manual test — Realtime:**
  1. Open team view in one tab, host in another
  2. Host reveals — team view updates without page refresh (revealed panel appears)
  3. After 5 seconds, team view loads the next question automatically
