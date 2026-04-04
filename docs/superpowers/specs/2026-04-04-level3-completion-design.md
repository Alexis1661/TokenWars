# Level 3 — La Traición: Completion Design Spec
**Date:** 2026-04-04

## Summary

Complete Level 3 ("La Traición") which is currently partially implemented. The betting mechanic and answer recording exist, but the reveal flow, token settlement, voting, host controls, Realtime updates, and visual design are all missing.

**Token model for Level 3:** Tokens move ONLY through bets. Answering correctly does not award tokens directly — it only determines whether bets against that team win or lose.

---

## Files Changed

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/app/api/reveal-level3/route.ts` | Reveal question, settle all bets, mark is_correct |
| Create | `frontend/app/api/award-final-vote/route.ts` | Count final_votes, award +300T to most voted team |
| Rewrite | `frontend/components/level3/LaTraicion.tsx` | Full team UI: all phases, reveal results, voting |
| Modify | `frontend/app/play/[teamId]/page.tsx` | Add Realtime subscription for level3_questions |
| Modify | `frontend/app/host/page.tsx` | Add Level 3 controls: reveal, vote tracking, award |

---

## Section 1 — Backend: `POST /api/reveal-level3`

**Input:** `{ questionId: string }`

**Steps:**
1. Fetch `level3_questions` row for `questionId` — if `revealed_at` already set, return `{ ok: true, alreadyRevealed: true }`
2. Set `revealed_at = now()` on the question
3. Fetch all `level3_answers` for `question_id`
4. For each answer: compute `is_correct = (selected_option === correct_option)`. For `is_final=true` questions: `is_correct = null`. Update the answer row.
5. Fetch all `level3_bets` for `question_id`
6. For each bet:
   - Find the target team's answer `is_correct`
   - If target was **incorrect** (or no answer): bettor WINS → `transfer_tokens(+amount, reason='bet_won', level='3', ref_id=questionId)`, set `won=true`
   - If target was **correct**: bettor LOSES → `transfer_tokens(-amount, reason='bet_lost', level='3', ref_id=questionId)`, set `won=false`
   - Set `settled_at = now()`
7. Return `{ ok: true }`

**Edge cases:**
- Team with no answer is treated as incorrect (bet against them wins)
- `transfer_tokens` can throw if bettor has insufficient balance — use `allSettled` so one failure doesn't block others

---

## Section 2 — Backend: `POST /api/award-final-vote`

**Input:** `{ questionId: string }`

**Steps:**
1. Fetch all `final_votes` for `question_id`
2. Count votes per `voted_team_id`
3. Find team with most votes. If tie, pick the one with lowest `token_balance` (benefit to underdog)
4. Call `transfer_tokens(+300, reason='final_vote_bonus', level='3', ref_id=questionId)` for winner
5. Return `{ ok: true, winnerTeamId, voteCount }`

---

## Section 3 — `LaTraicion.tsx` (full rewrite)

### Phase machine

```
answering → betting → waiting → revealed → [voting if is_final]
```

- `answering`: 30s timer (synced to `question.betting_ends_at` if set, otherwise client-side). Shows MCQ options or open textarea. "Confirmar respuesta" button locks to `level3_answers`.
- `betting`: 15s timer. Shows rival selector + amount slider (min 50, max 50% of balance for regular / 100% for final). "Apostar" button locks to `level3_bets`. "Saltar" moves to `waiting`.
- `waiting`: pulsing indicator "Esperando reveal del host..."
- `revealed`: full results panel (see below). If `is_final`, shows "Ahora vota la mejor justificación" and moves to `voting` phase.
- `voting` (final only): list of rival teams, each as a vote button. Single vote per team (stored in `final_votes`). After voting shows "Voto enviado ✓" and waits.

### Reveal panel contents
- Correct answer highlighted in green (MCQ only)
- Table of all teams: name | their answer | ✓ or ✗
- For each team (including self): bet result row showing "Apostaste X tokens contra [Team] — GANASTE/PERDISTE +/-X" if they placed a bet

### Visual style
Matches existing design system:
```typescript
const G = {
  primary: '#facc15',
  dim:     '#a3a3a3',
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',
  panel:   '#111827',
  error:   '#f87171',
  green:   '#4ade80',
}
```
Fonts: `'Orbitron'` for titles/numbers, `'Exo 2'` for body text.

### Props interface
```typescript
interface LaTraicionProps {
  question: Level3Question
  team: Team
  allTeams: Team[]
  revealed: boolean
}
```
No new props needed — same interface as current.

### Data fetched client-side at reveal
When `revealed` prop flips to `true`, the component fetches:
- `level3_answers` for this question (all teams) → to show the answers table
- `level3_bets` for this question where `bettor_team_id = team.id` → to show the team's bet result

---

## Section 4 — `play/[teamId]/page.tsx`

In the `session.status === 'level3'` block, replace the one-shot fetch with:

```typescript
const loadActiveQ3 = () =>
  supabase.from('level3_questions')
    .select('*')
    .eq('session_id', session.id)
    .is('revealed_at', null)
    .order('question_number')
    .limit(1)
    .single()
    .then(({ data }) => setActiveQuestion3(data ?? null))

loadActiveQ3()

const q3Channel = supabase.channel(`level3-questions-${session.id}`)
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
      // For final question: don't load next — component handles voting phase
    }
  })
  .subscribe()

return () => { supabase.removeChannel(q3Channel) }
```

---

## Section 5 — `host/page.tsx`

### New state
```typescript
const [activeQuestion3, setActiveQuestion3] = useState<Level3Question | null>(null)
const [revealingQ3, setRevealingQ3] = useState(false)
const [finalVoteCounts, setFinalVoteCounts] = useState<Record<string, number>>({})
const [awardingVote, setAwardingVote] = useState(false)
```

### Level 3 tracking effect
Mirror the existing Level 2 effect:
- Fetch first unrevealed `level3_questions` for session
- Subscribe to `level3_questions` updates via Realtime
- If `activeQuestion3.is_final && revealed_at`: subscribe to `final_votes` inserts to update `finalVoteCounts` live

### `revealCurrentQuestion3`
```typescript
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
```

### `awardFinalVote`
```typescript
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

### GameDashboard Level 3 controls
New `session.status === 'level3'` block in the controls panel (mirrors Level 2 block):
- Shows "Pregunta X / 5" (or "Pregunta Final")
- Shows answered count and bets count
- "Revelar" button (calls `revealCurrentQuestion3`)
- When `activeQuestion3.is_final && activeQuestion3.revealed_at`: voting panel showing vote counts per team + "Cerrar votación y otorgar +300T" button
- When all 5 questions revealed: advance to `finished` button

`GameDashboard` receives new props: `activeQuestion3`, `onRevealQ3`, `revealingQ3`, `finalVoteCounts`, `onAwardFinalVote`, `awardingVote`.

---

## Data Flow Summary

```
Host clicks "Revelar"
  → POST /api/reveal-level3
  → level3_questions.revealed_at set
  → Realtime pushes to all play/[teamId] clients
  → revealed prop flips to true in LaTraicion
  → Component fetches answers + own bets, shows reveal panel
  → (if is_final) shows voting phase

Team votes in final question
  → INSERT into final_votes
  → Host sees vote count update live (Realtime subscription)

Host clicks "Cerrar votación"
  → POST /api/award-final-vote
  → +300T transferred to most voted team
  → token_balance updates via Realtime on all clients
```
