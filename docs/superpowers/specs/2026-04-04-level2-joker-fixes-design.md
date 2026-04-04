# Level 2 Joker Fixes — Design Spec
**Date:** 2026-04-04

## Problems Being Solved

1. **Token balance doesn't update in real-time** when a joker is used. The deduction only happens when the professor reveals the question, so the team sees the wrong balance the whole time they're playing.

2. **Spy joker is a one-shot fetch with a 6-second expiry.** If the target team hasn't selected yet, team A sees "El rival aún no decide" for 6 seconds and then the message disappears permanently — even if the rival selects later.

---

## Solution 1: Immediate Token Deduction

### New API Route: `POST /api/use-joker`

Accepts `{ teamId, questionId, jokerType, cost }`. Calls `transfer_tokens` immediately with `-cost`. Returns `{ ok: true }` or an error.

```
POST /api/use-joker
Body: { teamId, questionId, jokerType, cost }
→ admin.rpc('transfer_tokens', { p_team_id, p_amount: -cost, p_reason: 'joker_purchase', p_level: '2', p_ref_id: questionId })
→ { ok: true }
```

Because `teams` has Realtime enabled, `team.token_balance` updates automatically on all clients the moment the RPC completes.

### Changes to `Millonario.tsx`

- `handleJoker` calls `fetch('/api/use-joker', ...)` after local state is set (for `fifty_fifty` and `call_teacher`)
- `handleSpySelect` calls `fetch('/api/use-joker', ...)` after setting state
- All upserts to `level2_answers` set `tokens_spent: 0` (already charged at use time)

### Changes to `reveal-question/route.ts`

None needed — when `tokens_spent = 0`, the existing `if (ans.joker_used && ans.tokens_spent > 0)` guard already skips the deduction.

---

## Solution 2: Real-Time Spy Subscription

### Replacing the one-shot fetch in `handleSpySelect`

Instead of:
```ts
const { data } = await supabase.from('level2_answers').select(...).maybeSingle()
// show for 6 seconds, then hide
```

Do:
```ts
// Subscribe to level2_answers for this question + target team
supabase.channel(`spy-${questionId}-${tid}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'level2_answers',
      filter: `question_id=eq.${questionId}&team_id=eq.${tid}` },
    (payload) => { setSpyAnswer(payload.new.selected_option); setSpyTargetLocked(payload.new.is_locked) })
  .subscribe()

// Also do initial fetch to populate current state
const { data } = await supabase.from('level2_answers').select('selected_option, is_locked')
  .eq('question_id', questionId).eq('team_id', tid).maybeSingle()
setSpyAnswer(data?.selected_option ?? null)
setSpyTargetLocked(data?.is_locked ?? false)
```

The spy result panel shows persistently while `jokerUsed === 'spy'` (no 6-second timer).

Cleanup: unsubscribe the channel when the component unmounts or `revealed` becomes true.

### State changes in `Millonario.tsx`

- Remove `spyFetched` state and the `setTimeout(() => setSpyFetched(false), 6000)` call
- Remove `spyLoading` state (initial fetch is fast; just show result when available)
- Add `spyChannelRef` to hold the Realtime channel for cleanup
- Spy panel renders whenever `jokerUsed === 'spy'` (not gated on `spyFetched`)

---

## Data Flow Summary

```
Team clicks joker
  → local state update (eliminatedOptions / showSpyPicker)
  → fetch /api/use-joker → transfer_tokens(-cost)
  → Supabase Realtime pushes updated token_balance to all clients
  → team.token_balance display updates immediately

Team clicks spy target
  → fetch /api/use-joker → transfer_tokens(-150)
  → subscribe to level2_answers[questionId, targetTeamId]
  → initial fetch populates spyAnswer
  → whenever target selects/changes → spyAnswer updates live
  → spy panel stays visible until revealed=true
```

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/app/api/use-joker/route.ts` | New file |
| `frontend/components/level2/Millonario.tsx` | Call use-joker on activation; real-time spy subscription |
| `frontend/app/api/reveal-question/route.ts` | No change needed |
