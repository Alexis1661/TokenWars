# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Token Wars is an educational multiplayer game for university classes. Teams compete across 3 levels testing knowledge of AI agent paradigms (ReAct and Tool Calling). The project has two services that must run simultaneously.

## Running the Project

**Terminal 1 — Python backend (LangChain + FastAPI):**
```bash
cd backend-ai
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```
Health check: `http://localhost:8000/health`

**Terminal 2 — Next.js frontend:**
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

**Other frontend commands:**
```bash
npm run build   # production build
npm run lint    # ESLint
```

**Manual session seeding (bypasses UI):**
```bash
cd backend-ai
python create_session.py            # creates empty session, prints UUID
python main.py --session-id <UUID> --seed-all
```

## Environment Variables

**`frontend/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
HOST_PASSWORD=...
GROQ_API_KEY=...
AI_BACKEND_URL=http://localhost:8000
```

**`backend-ai/.env`:**
```
GROQ_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Architecture

```
Professor creates session (/host)
  → POST /api/create-session (Next.js API)
  → Supabase: inserts game_session row
  → Background fetch to Python backend POST /seed
      → LangChain + Groq (llama-3.3-70b-versatile)
      → Supabase: inserts L1 rounds only (L2/L3 questions are hardcoded in supabase_service.py)
  → Fallback: if Python backend unavailable, Next.js calls /api/seed-session internally

Teams join (/join) → directed to /play/[teamId]
All clients sync via Supabase Realtime subscriptions
```

### Game State Machine

`game_sessions.status` transitions (controlled by professor from `/host`):
`lobby` → `level1` → `level2` → `level3` → `finished`

### Key Frontend Hooks

- `usePublicGameData(sessionId)` — subscribes to `game_sessions` + `teams` Realtime changes; used by both host and team views
- `useHostGameData(sessionId)` — host-only private channel; subscribes to submission/answer/bet inserts to show activity feed without revealing content to other teams
- `useTeamData(teamId)` — team-specific data including token balance and transaction history

### Frontend Routes

- `/host` — professor dashboard; creates session, controls level transitions, ends rounds
- `/join` — team entry form (session code + team name)
- `/play/[teamId]` — team game view; renders level components based on `session.status`

### Level Components

| Level | Component | File | Props |
|-------|-----------|------|-------|
| Level 1 | `TypeOrDie` | `frontend/components/level1/TypeOrDie.tsx` | round, team, allTeams |
| Level 2 | `Millonario` | `frontend/components/level2/Millonario.tsx` | question, team, allTeams, revealed, correctAnswers |
| Level 3 | `LaTraicion` | `frontend/components/level3/LaTraicion.tsx` | team, allTeams |

**Level 3 is self-managing** — `LaTraicion` receives no question prop. It subscribes internally to Supabase Broadcast channels and manages its own state machine (see Level 3 Architecture below). Do not pass `question` or `revealed` to it.

### Next.js API Routes (`frontend/app/api/`)

- `create-session` — validates HOST_PASSWORD, creates `game_sessions` row, fires seed to Python backend (with fallback to internal seed)
- `join-session` — creates team + team_member rows
- `seed-session` — internal fallback seed using Groq directly (no LangChain)
- `finish-round` — marks `level1_rounds.finished_at`, triggers token awards via `award-level1`
- `award-level1` — calculates positions and calls Supabase `transfer_tokens` RPC
- `reveal-question` — sets `revealed_at` on a `level2_questions` row, calculates `is_correct` and awards tokens via `transfer_tokens` RPC
- `reconnect` — reconnects a device to an existing team
- `use-joker` — immediately charges joker cost via `transfer_tokens` (L2); token balance updates via Realtime
- `reveal-level3` — legacy route; Level 3 settlement now handled by host broadcast (`settle_results` event)
- `award-final-vote` — legacy route; Level 3 final decision handled by host broadcast (`honrar_o_traicionar` event)

### Backend Generators (`backend-ai/generators/`)

- `react_generator.py` — generates ReAct trace challenges (Thought → Action → Observation format)
- `tool_calling_generator.py` — generates Tool Calling JSON challenges

### Token Economy

Token transfers use the Supabase `transfer_tokens` PostgreSQL function (optimistic locking via `version` field). Never update `token_balance` directly — always go through this RPC to maintain the `token_transactions` audit log.

### Supabase Realtime

Tables with `postgres_changes` subscriptions: `game_sessions`, `teams`, `level1_rounds`, `level1_submissions`, `level2_questions`, `level2_answers`.

**Level 3 uses Supabase Broadcast** (not postgres_changes):
- `nivel3_global` — host → all teams: `nivel3_ronda`, `spin_wheel`, `revealed`, `settle_results`, `honrar_o_traicionar`, `voto_castigo`, `resultado_castigo`
- `private-team-{teamId}` — host → specific team: `cartas`, `pista_oscura`
- `nivel3_host` — teams → host: `bet_confirmed`, `team_voted`, `decision_final`, `voto_castigo`

### Level 3 Architecture (Casino de la Traición)

Level 3 is broadcast-driven and managed entirely by the host's croupier system. The host toggles between AUTOMÁTICO/MANUAL mode for 4 rounds.

**Team phase machine:** `idle` → `cards` → `answering` → `spinning` → `revealed` → `final_decision` → `voting_punishment` → `punishment_results`

**Special cards** (dealt per team at round start, modifiers applied during settle):

| Card | Effect |
|------|--------|
| DOBLAR O NADA | ×2 if correct, −100% if wrong |
| RED DE SEGURIDAD | −50% if wrong |
| TRANSFERENCIA | +100T extra if correct |
| SEGURO CRUZADO | +150T extra if both allies correct |
| CARTA OSCURA | Cryptic hint before question |
| FAROL | ×3 if correct |

**New UI components:** `SpinWheel` (ref-based, `spinTo(index)` called on `spin_wheel` broadcast) and `PlayingCard` (flip animation, staggered reveal) in `frontend/components/ui/`.

## Code Style

**Visual palette (todos los componentes de nivel la usan):**
```typescript
const G = {
  primary: '#facc15',  // yellow — aciertos, highlights
  dim:     '#a3a3a3',  // gray — labels secundarios
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',  // fondo terminal
  panel:   '#111827',  // paneles
  error:   '#f87171',  // errores / wrong answers
  green:   '#4ade80',  // correct answers
}
```

**CSS classes:** Usar las clases `cup-*` definidas en `globals.css` (`cup-panel`, `cup-btn`, `cup-btn-gold`, `cup-badge`) en lugar de estilos inline para elementos estructurales.

**Componentes de nivel:** L1 y L2 reciben sus datos como props desde `play/[teamId]/page.tsx`. Usar `key={activeItem.id}` al renderizar para forzar remount completo al cambiar de ronda/pregunta. L3 (`LaTraicion`) es autónomo — no recibe datos externos, gestiona su propio state via broadcasts.

**Fonts:** `'Orbitron'` para títulos/números, `'Exo 2'` para texto, `monospace` para contenido tipo terminal.

## Gotchas y Quirks

- **Caché `.next` corrupto:** Si aparece `Cannot find module './NNN.js'`, ejecutar `rm -rf .next` y reiniciar `npm run dev`.
- **`supabaseAdmin` en cliente:** `SUPABASE_SERVICE_ROLE_KEY` no está disponible en el browser. El cliente admin usa `anonKey` como fallback en `lib/supabase.ts` — es inofensivo porque el admin nunca se llama desde el cliente.
- **`components/reactbits/`:** Contiene componentes que importan desde `'motion/react'` (no instalado). El proyecto usa `framer-motion`. Cualquier nuevo componente de reactbits necesita cambiar esos imports.
- **Tipos de DB:** Si TypeScript se queja de un campo faltante en una interfaz de `lib/types.ts`, verificar el schema en `TokenWarsGuiaCompleta.md` — la DB puede tener columnas que no están tipadas aún (ej: `technical_content` en `Level1Round`).
- **`main.py --seed-all` KeyError:** El path CLI crashea con `KeyError: 'display'` — los generators retornan `trace_before/trace_highlight/trace_after`, no `display`. El path web via `api.py POST /seed` no tiene este problema.
- **TypeScript check:** Ejecutar `npx tsc --noEmit` desde `frontend/` para validar tipos sin compilar.
