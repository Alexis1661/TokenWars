# Spec: Unificación del Scoreboard en Niveles 1 y 2

**Fecha:** 2026-04-05  
**Estado:** Aprobado

## Objetivo

Reemplazar las vistas de scoreboard actuales en Level 1 y Level 2 por el mismo estilo de clasificación que ya usa Level 3: lista rankeada con tema oscuro/dorado, animaciones escalonadas y resaltado del equipo actual. En Level 1, la pantalla de resultado personal se conserva y transiciona automáticamente al ranking después de 4 segundos.

---

## Cambios por archivo

### 1. `frontend/components/scoreboard/Scoreboard.tsx`

Actualizar la paleta visual para que coincida con el estilo de Level 3:

| Elemento | Antes (morado) | Después (dorado/oscuro) |
|---|---|---|
| Fondo equipo resaltado | `rgba(168,85,247,0.12)` | `rgba(250,204,21,0.15)` |
| Border equipo resaltado | `var(--cup-gold)` | `#facc15` |
| Fondo equipo líder | `rgba(168,85,247,0.07)` | `rgba(255,255,255,0.03)` |
| Fondo genérico | `var(--cup-bg2)` | `rgba(255,255,255,0.03)` |
| Color tokens | `var(--cup-red)` | `#facc15` |
| Color nombre equipo | `var(--cup-cream)` | `#ffffff` |
| Border genérico | `rgba(168,85,247,0.15)` | `rgba(255,255,255,0.08)` |
| Animación entrada | spring sin delay | `delay: i * 0.08` escalonado |

Colores de medallas para posiciones 1/2/3: `#FFD700` / `#C0C0C0` / `#CD7F32` (igual que L3).  
Props sin cambios: `teams: Team[]`, `highlightTeamId?: string`.

---

### 2. `frontend/components/level1/TypeOrDie.tsx`

**Props añadidas:** `allTeams: Team[]`

**State machine extendida:** `'intro' | 'playing' | 'results' | 'scoreboard'`

**`ResultsScreen`:**
- Añadir prop `onDone: () => void`
- Cambiar countdown interno de 3s a 4s
- Al llegar a 0 llamar `onDone()`
- Cambiar texto "SIGUIENTE RONDA EN X..." por "CLASIFICACIÓN EN X..."

**Flujo de transición:**
```
handleSubmit() → setPhase('results')
ResultsScreen onDone → setPhase('scoreboard')
phase === 'scoreboard' → <Scoreboard teams={allTeams} highlightTeamId={teamId} />
```

El scoreboard se muestra como overlay fijo (`position: fixed`, mismo z-index que `ResultsScreen`) para que sea prominente y cubra el layout de dos columnas. Permanece hasta que el host avanza la sesión.

---

### 3. `frontend/components/level2/Millonario.tsx`

**Estado local añadido:** `const [showScoreboard, setShowScoreboard] = useState(false)`

**Efecto de transición:**
```typescript
useEffect(() => {
  if (!revealed) return
  const id = setTimeout(() => setShowScoreboard(true), 4000)
  return () => clearTimeout(id)
}, [revealed])
```

**Reset al cambiar de pregunta:** `setShowScoreboard(false)` cuando cambia `question.id`.

**Render:** reemplazar `{revealed && <Scoreboard>}` por `{showScoreboard && <Scoreboard>}`.

---

### 4. `frontend/app/play/[teamId]/page.tsx`

Pasar `allTeams` al componente `<TypeOrDie>`:
```tsx
<TypeOrDie round={currentRound} teamId={team.id} allTeams={allTeams} />
```

`allTeams` ya está disponible en ese componente vía `usePublicGameData`.

---

## Comportamiento resultante

| Nivel | Antes | Después |
|---|---|---|
| L1 | Resultado personal (3s) → nada | Resultado personal (4s) → ranking global |
| L2 | Ranking inmediato al revelar (paleta morada) | Resultado de pregunta visible (4s) → ranking dorado |
| L3 | Sin cambios | Sin cambios |

## Archivos no modificados

- `frontend/components/level3/LaTraicion.tsx` — ya usa su propio scoreboard inline, no se toca
- Cualquier otra vista que importe `Scoreboard` — no existe ninguna otra actualmente
