# Level 2 Joker Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs in Level 2: (1) token balance updates in real-time when a joker is used, and (2) the spy joker shows a persistent, live-updating result instead of a one-shot 6-second display.

**Architecture:** Add a `/api/use-joker` route that charges tokens immediately via `transfer_tokens` RPC. In `Millonario.tsx`, call this route on joker activation and replace the spy's one-shot fetch + 6s timer with a Supabase Realtime subscription that stays open until the question is revealed.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (postgres_changes Realtime), `transfer_tokens` PostgreSQL RPC.

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/app/api/use-joker/route.ts` | Charges joker cost immediately via `transfer_tokens` |
| Modify | `frontend/components/level2/Millonario.tsx` | Calls use-joker on activation; real-time spy subscription |

`frontend/app/api/reveal-question/route.ts` — **no changes needed**: the existing guard `if (ans.joker_used && ans.tokens_spent > 0)` already skips deduction when `tokens_spent` is 0.

---

## Task 1: Create `/api/use-joker` route

**Files:**
- Create: `frontend/app/api/use-joker/route.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/app/api/use-joker/route.ts
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cat frontend/app/api/use-joker/route.ts`

Expected: file contents printed with no errors.

---

## Task 2: Update `handleJoker` and `handleSpySelect` to call `/api/use-joker` immediately

**Files:**
- Modify: `frontend/components/level2/Millonario.tsx`

**Context:** `handleJoker` currently sets local state but never charges tokens until `reveal-question` is called. `handleSpySelect` does a one-shot fetch and shows the result for 6 seconds then hides it.

- [ ] **Step 1: Remove `spyLoading`, `spyFetched` states and add `spyChannelRef`**

Find this block (lines ~128–136):
```ts
const [spyLoading, setSpyLoading] = useState(false)
const [spyAnswer, setSpyAnswer] = useState<AnswerOption | null>(null)
const [spyFetched, setSpyFetched] = useState(false)
const [spyTargetLocked, setSpyTargetLocked] = useState(false)
```

Replace with:
```ts
const [spyAnswer, setSpyAnswer] = useState<AnswerOption | null>(null)
const [spyTargetLocked, setSpyTargetLocked] = useState(false)
const spyChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
```

- [ ] **Step 2: Update `handleJoker` to call `/api/use-joker` and set `tokens_spent: 0`**

Find the current `handleJoker` function and replace it entirely:

```ts
const handleJoker = async (joker: JokerType) => {
  if (jokerUsed || phase !== 'playing' || revealed) return
  const def = JOKERS.find(j => j.type === joker)!
  if (team.token_balance < def.cost) return

  if (joker === 'fifty_fifty') {
    const wrong = OPTIONS.filter(o => o !== question.correct_option)
    const toElim = wrong.sort(() => Math.random() - 0.5).slice(0, 2)
    setEliminatedOptions(toElim)
    if (selected && toElim.includes(selected)) setSelected(null)
    setJokerUsed(joker)
    setTokensSpent(0)
    fetch('/api/use-joker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: joker, cost: def.cost }),
    })
    return
  }

  if (joker === 'spy') { setShowSpyPicker(true); return }

  setJokerUsed(joker)
  setTokensSpent(0)
  fetch('/api/use-joker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: joker, cost: def.cost }),
  })
}
```

Key changes:
- `setTokensSpent(0)` instead of `setTokensSpent(def.cost)` — tokens already charged via API
- Fire-and-forget `fetch('/api/use-joker', ...)` — no await needed here; the Realtime subscription on `teams` will update `team.token_balance` automatically

- [ ] **Step 3: Replace `handleSpySelect` with real-time subscription version**

Find the current `handleSpySelect` function and replace it entirely:

```ts
const handleSpySelect = async (tid: string) => {
  setShowSpyPicker(false)
  setSpyTarget(tid)
  setJokerUsed('spy')
  setTokensSpent(0)

  // Charge immediately
  fetch('/api/use-joker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId: team.id, questionId: question.id, jokerType: 'spy', cost: 150 }),
  })

  // Initial fetch to populate current state
  const { data } = await supabase
    .from('level2_answers')
    .select('selected_option, is_locked')
    .eq('question_id', question.id)
    .eq('team_id', tid)
    .maybeSingle()
  setSpyAnswer((data?.selected_option as AnswerOption) ?? null)
  setSpyTargetLocked(data?.is_locked ?? false)

  // Subscribe for real-time updates
  const channel = supabase
    .channel(`spy-${question.id}-${tid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'level2_answers',
        filter: `question_id=eq.${question.id}`,
      },
      (payload: any) => {
        if (payload.new?.team_id === tid) {
          setSpyAnswer((payload.new.selected_option as AnswerOption) ?? null)
          setSpyTargetLocked(payload.new.is_locked ?? false)
        }
      }
    )
    .subscribe()

  spyChannelRef.current = channel
}
```

- [ ] **Step 4: Add cleanup effects for the spy channel**

After the existing `useEffect(() => { handleLockRef.current = handleLock }, [handleLock])` line, add:

```ts
// Clean up spy channel on unmount
useEffect(() => {
  return () => {
    if (spyChannelRef.current) {
      supabase.removeChannel(spyChannelRef.current)
    }
  }
}, [])

// Clean up spy channel when question is revealed
useEffect(() => {
  if (revealed && spyChannelRef.current) {
    supabase.removeChannel(spyChannelRef.current)
    spyChannelRef.current = null
  }
}, [revealed])
```

---

## Task 3: Update spy result panel rendering

**Files:**
- Modify: `frontend/components/level2/Millonario.tsx`

**Context:** The spy panel is currently gated on `spyLoading || spyFetched`. Since we removed those states, we need a simpler condition.

- [ ] **Step 1: Update the spy result panel condition**

Find:
```tsx
{jokerUsed === 'spy' && (spyLoading || spyFetched) && (
  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-center font-mono text-sm text-blue-300">
    {spyLoading ? '📡 Espiando satélite...' : spyAnswer ? `🎯 El rival ha marcado: ${spyAnswer.toUpperCase()}${spyTargetLocked ? ' (BLOQUEADO)' : ''}` : '❓ El rival aún no decide.'}
  </motion.div>
)}
```

Replace with:
```tsx
{jokerUsed === 'spy' && spyTarget && !revealed && (
  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-center font-mono text-sm text-blue-300">
    {spyAnswer
      ? `🎯 El rival ha marcado: ${spyAnswer.toUpperCase()}${spyTargetLocked ? ' (BLOQUEADO)' : ''}`
      : '❓ El rival aún no decide.'}
  </motion.div>
)}
```

The panel now stays visible as long as the spy joker is active and the question hasn't been revealed. It updates live whenever the target team changes their selection.

- [ ] **Step 2: Verify no remaining references to `spyLoading` or `spyFetched`**

Run: `grep -n "spyLoading\|spyFetched" frontend/components/level2/Millonario.tsx`

Expected: no output (zero matches).

---

## Verification

- [ ] **Manual test — Token deduction:**
  1. Start a game session, reach Level 2
  2. Open the team view with a browser dev tools Network tab open
  3. Click any joker button
  4. Observe: `/api/use-joker` fires immediately, and the token balance in the header drops without waiting for reveal

- [ ] **Manual test — Spy real-time:**
  1. Open two browser windows, one per team
  2. Team A activates spy on Team B
  3. In Team B's window, select an option — verify Team A's spy panel updates immediately without a page refresh
  4. Team B changes their selection — verify Team A's panel updates again
  5. Professor reveals the question — verify the spy panel disappears on Team A's screen
