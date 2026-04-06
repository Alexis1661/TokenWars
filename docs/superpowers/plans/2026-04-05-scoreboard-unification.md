# Scoreboard Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scoreboard/results views in Level 1 and Level 2 with the same dark/gold ranked-list style that Level 3 already uses after each round.

**Architecture:** Update `Scoreboard.tsx` palette to match the project's dark/gold theme. In L1, extend the phase state machine to add a `'scoreboard'` phase that shows a fullscreen overlay after the 4s personal result screen. In L2, add a 4s delay after `revealed` before showing the scoreboard.

**Tech Stack:** Next.js 14, React, Framer Motion, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/components/scoreboard/Scoreboard.tsx` | Modify | Fix palette: purple → dark/gold, add staggered delay |
| `frontend/components/level1/TypeOrDie.tsx` | Modify | Add `allTeams` prop, `'scoreboard'` phase, transition logic |
| `frontend/app/play/[teamId]/page.tsx` | Modify | Pass `allTeams={teams}` to `<TypeOrDie>` |
| `frontend/components/level2/Millonario.tsx` | Modify | Add `showScoreboard` state + 4s delay effect |

---

## Task 1: Update `Scoreboard.tsx` palette

**Files:**
- Modify: `frontend/components/scoreboard/Scoreboard.tsx`

- [ ] **Step 1: Rewrite Scoreboard.tsx with dark/gold palette**

Replace the full file content with:

```tsx
'use client'
import { AnimatePresence, motion } from 'framer-motion'
import type { Team } from '@/lib/types'

export function Scoreboard({ teams, highlightTeamId }: { teams: Team[]; highlightTeamId?: string }) {
  const sorted = [...teams].sort((a, b) => b.token_balance - a.token_balance)

  return (
    <div className="w-full space-y-2">
      <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15', fontSize: '1.1rem', letterSpacing: '0.15em', textAlign: 'center' }}>
        CLASIFICACIÓN
      </h2>

      <AnimatePresence>
        {sorted.map((team, i) => {
          const isMe = team.id === highlightTeamId
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{
                background: isMe ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? '#facc15' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.2rem',
                color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#a3a3a3',
                width: 28,
                textAlign: 'center',
              }}>
                {`#${i + 1}`}
              </span>
              <span style={{ flex: 1, color: isMe ? '#facc15' : '#ffffff', fontWeight: isMe ? 700 : 400 }}>
                {team.name}
                {isMe && <span style={{ fontSize: '0.7rem', color: '#a3a3a3', marginLeft: 8 }}>◀ TU</span>}
              </span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: '#facc15', fontWeight: 700 }}>
                {team.token_balance} T
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {sorted.length === 0 && (
        <p className="text-center py-6 text-sm" style={{ color: '#a3a3a3' }}>Esperando equipos...</p>
      )}
    </div>
  )
}
```

Note: The component now sorts teams internally by `token_balance` descending — callers no longer need to pre-sort.

- [ ] **Step 2: Verify TypeScript**

Run from `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no new errors related to `Scoreboard`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/scoreboard/Scoreboard.tsx
git commit -m "style: update Scoreboard to dark/gold theme matching L3"
```

---

## Task 2: Extend `TypeOrDie` with scoreboard phase

**Files:**
- Modify: `frontend/components/level1/TypeOrDie.tsx`

- [ ] **Step 1: Add `allTeams` to props and import Scoreboard**

At the top of the file, add the import:
```tsx
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
```

Change the component signature from:
```tsx
export function TypeOrDie({ round, teamId }: { round: Level1Round; teamId: string }) {
```
to:
```tsx
export function TypeOrDie({ round, teamId, allTeams }: { round: Level1Round; teamId: string; allTeams: Team[] }) {
```

Add `Team` to the type import at the top (it's already imported from `@/lib/types` in the file — verify and add if missing):
```tsx
import type { Level1Round, Team } from '@/lib/types'  // add Team if not present
```

- [ ] **Step 2: Update `ResultsScreen` to accept `onDone` and count 4s**

Find `ResultsScreen` (around line 198). Change its signature from:
```tsx
function ResultsScreen({ tokens, breakdown, roundNumber }: {
  tokens: number
  breakdown: Breakdown | null
  roundNumber: number
}) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])
```
to:
```tsx
function ResultsScreen({ tokens, breakdown, roundNumber, onDone }: {
  tokens: number
  breakdown: Breakdown | null
  roundNumber: number
  onDone: () => void
}) {
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    if (countdown <= 0) { onDone(); return }
    const id = setTimeout(() => setCountdown(n => n - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, onDone])
```

Then find the countdown text at the bottom of `ResultsScreen` and change:
```tsx
SIGUIENTE RONDA EN {countdown}...
```
to:
```tsx
CLASIFICACIÓN EN {countdown}...
```

- [ ] **Step 3: Add `'scoreboard'` to the phase state and transition**

Find the phase state declaration (around line 312):
```tsx
const [phase, setPhase] = useState<'intro' | 'playing' | 'results'>('intro')
```
Change to:
```tsx
const [phase, setPhase] = useState<'intro' | 'playing' | 'results' | 'scoreboard'>('intro')
```

- [ ] **Step 4: Add scoreboard overlay render**

Find the `ResultsScreen` render in the JSX (around line 635):
```tsx
<AnimatePresence>
  {phase === 'results' && (
    <ResultsScreen
      key="results"
      tokens={tokensEarned}
      breakdown={breakdown}
      roundNumber={round.round_number}
    />
  )}
</AnimatePresence>
```
Replace with:
```tsx
<AnimatePresence>
  {phase === 'results' && (
    <ResultsScreen
      key="results"
      tokens={tokensEarned}
      breakdown={breakdown}
      roundNumber={round.round_number}
      onDone={() => setPhase('scoreboard')}
    />
  )}
</AnimatePresence>

<AnimatePresence>
  {phase === 'scoreboard' && (
    <motion.div
      key="scoreboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(3,7,18,0.97)', fontFamily: 'monospace' }}
    >
      <div className="w-full max-w-lg">
        <Scoreboard teams={allTeams} highlightTeamId={teamId} />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors in `TypeOrDie.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/level1/TypeOrDie.tsx
git commit -m "feat(L1): add scoreboard phase after personal results screen"
```

---

## Task 3: Pass `allTeams` to `TypeOrDie` in page

**Files:**
- Modify: `frontend/app/play/[teamId]/page.tsx`

- [ ] **Step 1: Add `allTeams` prop to the TypeOrDie render**

Find (around line 237):
```tsx
{session.status === 'level1' && activeRound && <TypeOrDie key={activeRound.id} round={activeRound} teamId={team.id} />}
```
Change to:
```tsx
{session.status === 'level1' && activeRound && <TypeOrDie key={activeRound.id} round={activeRound} teamId={team.id} allTeams={teams} />}
```

`teams` is already available from `usePublicGameData` (line 20 of the file).

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors in `page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/play/[teamId]/page.tsx
git commit -m "feat(L1): pass allTeams to TypeOrDie for scoreboard"
```

---

## Task 4: Add 4s scoreboard delay in `Millonario`

**Files:**
- Modify: `frontend/components/level2/Millonario.tsx`

- [ ] **Step 1: Add `showScoreboard` state**

Find the state declarations block (near the top of `Millonario`, after the component function signature). Add:
```tsx
const [showScoreboard, setShowScoreboard] = useState(false)
```

- [ ] **Step 2: Add the transition effect**

After the existing `useEffect` hooks, add:
```tsx
// Mostrar scoreboard 4s después de revelar la respuesta
useEffect(() => {
  if (!revealed) { setShowScoreboard(false); return }
  const id = setTimeout(() => setShowScoreboard(true), 4000)
  return () => clearTimeout(id)
}, [revealed])
```

This also handles the reset: when `revealed` becomes `false` (new question), `showScoreboard` resets to `false` immediately.

- [ ] **Step 3: Replace the scoreboard render condition**

Find (around line 478):
```tsx
<AnimatePresence>
  {revealed && (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      <p style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1rem', letterSpacing: '0.15em', textAlign: 'center' }}>
        CLASIFICACIÓN
      </p>
      <Scoreboard teams={allTeams} highlightTeamId={team.id} />
    </motion.div>
  )}
</AnimatePresence>
```
Replace with:
```tsx
<AnimatePresence>
  {showScoreboard && (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      <Scoreboard teams={allTeams} highlightTeamId={team.id} />
    </motion.div>
  )}
</AnimatePresence>
```

Note: The `<p>CLASIFICACIÓN</p>` header is removed because the updated `Scoreboard` component now renders its own "CLASIFICACIÓN" title internally.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors in `Millonario.tsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/level2/Millonario.tsx
git commit -m "feat(L2): delay scoreboard 4s after answer reveal"
```
