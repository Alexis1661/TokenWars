
🎮

**TOKEN WARS**

*El juego de los agentes*

Guía completa del juego

Prompt Engineering · LangChain · ReAct · Tool Calling

|**⏱️  25 min**|**👥  7 grupos**|**🏆  3 niveles**|
| :-: | :-: | :-: |


# **📋 Resumen General**
TOKEN WARS es una competencia por equipos diseñada para reforzar los conceptos de Prompt Engineering, ReAct y Tool Calling de forma práctica y divertida. Los tokens son la moneda del juego: se ganan respondiendo bien, se pierden apostando mal y se usan para comprar ventajas.

|<p>**⚙️  Configuración del juego**</p><p>Duración total: 25–30 minutos</p><p>Número de grupos: 7</p><p>Niveles: 3 (dificultad creciente)</p><p>Economía: tokens acumulables entre niveles</p><p>Scoreboard: visible para todos en tiempo real</p>|
| :- |


# **⌨️  NIVEL 1 — Type or Die**
**Tema:** Reconocer outputs de ReAct vs Tool Calling     **⏱️ 7 minutos**
## **¿De qué trata?**
La pantalla proyecta en tiempo real un output de agente: unas rondas será un trace de ReAct con su ciclo Thought → Action → Observation, y otras será un JSON estructurado de Tool Calling. Los grupos deben transcribirlo exactamente, como en un juego de mecanografía, compitiendo contra el cronómetro y contra los demás grupos.

## **Mecánica por ronda**
- Aparece el texto en pantalla — empieza el contador.
- Cada grupo transcribe el output en su dispositivo/papel lo más rápido posible.
- Al terminar, deben identificar: ¿es un output de ReAct o de Tool Calling?
- El primero en terminar SIN errores gana la ronda.

## **Sistema de puntos**

|**Posición**|**Tokens ganados**|
| :-: | :-: |
|🥇 Primer lugar|**300 tokens**|
|🥈 Segundo lugar|**200 tokens**|
|🥉 Tercer lugar|**100 tokens**|
|❌ Errores de tipeo|**Penalización de tiempo**|
|🎁 Bonus identificación correcta|**+50 tokens extra**|

|<p>**💡  Por qué funciona este nivel**</p><p>Al transcribir los outputs manualmente, los grupos interiorizan visualmente la diferencia</p><p>entre un trace de ReAct y un JSON de Tool Calling sin que nadie se los explique directamente.</p><p>Son 3 rondas alternas: 2 de un tipo, 1 del otro (o viceversa), para que ambos formatos queden claros.</p>|
| :- |


# **🎙️  NIVEL 2 — ¿Quién Quiere Ser Millonario?**
**Tema:** Conceptos de LangChain, ReAct y Tool Calling     **⏱️ 10 minutos**
## **¿De qué trata?**
Tres preguntas de opción múltiple con dificultad creciente, estilo ¿Quién Quiere Ser Millonario? Los grupos responden en secreto y revelan al mismo tiempo. Los tokens acumulados en el Nivel 1 se pueden usar para comprar comodines antes de responder.

## **Las 3 preguntas**

|**Acción**|**Resultado**|
| :-: | :-: |
|Ronda 1 — Fácil|¿Qué representa la "O" en el ciclo ReAct?|
|Ronda 2 — Media|¿Por qué Tool Calling es más rápido que ReAct?|
|Ronda 3 — Difícil|Dado este output roto de un agente, ¿qué falló y dónde?|

## **Comodines comprables**
Cada grupo puede comprar máximo un comodín por ronda, usando sus tokens del Nivel 1:

|**Comodín**|**Costo**|**Efecto**|
| :-: | :-: | :-: |
|👥  50/50|**80 tokens**|Elimina 2 opciones incorrectas|
|📞  Llamada al profe|**120 tokens**|El profesor da una pista en voz alta|
|👁️  Espía|**150 tokens**|Ven la respuesta de UN grupo rival antes de confirmar|

## **Recompensas por ronda**

|**Posición**|**Tokens ganados**|
| :-: | :-: |
|Ronda 1 (fácil)|**150 tokens**|
|Ronda 2 (media)|**250 tokens**|
|Ronda 3 (difícil)|**400 tokens**|

|<p>**⚠️  Regla clave del reveal simultáneo**</p><p>Todos los grupos confirman su respuesta antes de que se revele cualquiera.</p><p>No se puede cambiar de respuesta después del reveal. El Espía solo funciona ANTES de confirmar.</p><p>Si un grupo usa el comodín Espía y el grupo espiado cambia de respuesta... mala suerte. 😈</p>|
| :- |


# **🗡️  NIVEL 3 — La Traición**
**Tema:** Estrategia + conocimiento bajo presión     **⏱️ 8 minutos**
## **¿De qué trata?**
Ya no es solo quién sabe más, sino quién juega mejor. Son 4 preguntas rápidas sobre ReAct y Tool Calling. En cada pregunta, los grupos hacen DOS cosas al mismo tiempo: responden la pregunta Y apuestan tokens EN CONTRA de otro grupo.

## **Mecánica de apuesta por pregunta**

|<p>**🎯  Estructura de cada ronda (45 segundos totales)**</p><p>⏱️ 30 seg  →  Cada grupo escribe su respuesta en secreto</p><p>🎯 15 seg  →  Cada grupo elige a quién apostar y cuánto</p><p>📊 REVEAL  →  Se muestran todas las respuestas simultáneamente</p><p>💰 CÁLCULO →  Se suman ganancias, se restan pérdidas, se aplican traiciones</p>|
| :- |

## **Reglas de la apuesta**
- Apuestas EN CONTRA: "Apuesto X tokens a que el Grupo Y falla esta pregunta"
- Si el grupo rival falla → GANAS los tokens apostados
- Si el grupo rival acierta → PIERDES los tokens apostados
- Límite mínimo: 50 tokens por apuesta
- Límite máximo: 50% de tus tokens actuales por ronda
- Solo puedes apostar contra UN grupo por pregunta

|<p>**😈  Por qué esto genera tensión real**</p><p>El grupo líder se vuelve el blanco favorito de todos.</p><p>Tienes que decidir: ¿me concentro en responder bien o en hundir al líder?</p><p>Un grupo rezagado puede remontar apostando bien, sin importar que no sepa la respuesta.</p><p>El scoreboard en vivo hace que cada reveal sea un momento de drama puro.</p>|
| :- |

## **🏆 Pregunta Final — El Veredicto**
La última pregunta es diferente: no es de opción múltiple. Se muestra un caso de uso real y cada grupo tiene 45 segundos para escribir si usaría ReAct o Tool Calling y una razón en una sola línea.

- Las apuestas en la pregunta final suben al 100% de los tokens disponibles
- El salón vota en vivo qué grupo dio la mejor justificación
- El grupo más votado recibe un bonus de 300 tokens independientemente de si su respuesta fue 'correcta'
- Esto premia no solo saber, sino saber explicar

|<p>**💡  Ejemplo de pregunta final**</p><p>Caso: Una plataforma financiera regulada necesita un agente que revise transacciones</p><p>sospechosas y genere reportes auditables. El proceso debe ser explicable a entes regulatorios.</p><p></p><p>Pregunta: ¿Usarías ReAct o Tool Calling? Justifica en una línea.</p>|
| :- |


# **🗺️  Flujo Completo del Juego**

|**Fase**|**Nombre**|**Qué pasa**|**Duración**|
| :-: | :-: | :-: | :-: |
|**Nivel 1**|Type or Die|Mecanografía de outputs ReAct vs Tool Calling|7 min|
|**Nivel 2**|¿Quién Quiere Ser Millonario?|Preguntas conceptuales con comodines comprables|10 min|
|**Nivel 3**|La Traición|Apuestas en contra de otros grupos + pregunta final|8 min|
|**TOTAL**|—|—|**~25 min**|


# **💻  La App — Qué necesitas construir**
Para correr Token Wars en clase necesitas una app con 3 módulos y un scoreboard central:

## **Módulo 1 — Mecanografía (Nivel 1)**
- Proyecta el texto a transcribir en pantalla
- Detecta errores en tiempo real y penaliza con tiempo
- Cronómetro visible para todos
- Al terminar: pregunta "¿ReAct o Tool Calling?" para el bonus
- Suma automática de tokens al scoreboard

## **Módulo 2 — Millonario (Nivel 2)**
- Muestra pregunta + 4 opciones de forma clara
- Panel de comodines por grupo con saldo visible
- Botón de "confirmar respuesta" (no se puede cambiar después)
- Reveal simultáneo de todas las respuestas con animación
- Suma automática de tokens + descuento de comodines usados

## **Módulo 3 — La Traición (Nivel 3)**
- Scoreboard prominente visible para todos en tiempo real
- Panel de apuesta: selector de grupo rival + monto
- Temporizador de 30 seg para responder + 15 seg para apostar
- Reveal simultáneo con cálculo automático de traiciones
- Votación del salón para la pregunta final

|<p>**🚀  Stack sugerido para la app**</p><p>Frontend: React con Tailwind (una sola pantalla proyectada al salón)</p><p>Backend: Node.js o Python con LangChain para ejecutar los agentes reales</p><p>Scoreboard: estado compartido en tiempo real (Socket.io o estado local si es offline)</p><p>Opcional: integrar la API de Anthropic o OpenAI para que los outputs sean reales</p>|
| :- |


Schema Establecido en Supabase

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. SESIONES DE JUEGO
-- ============================================================
create table game_sessions (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'lobby'
                  check (status in ('lobby','level1','level2','level3','finished')),
  current_level int  not null default 0,
  host_code     text not null unique default upper(substring(gen_random_uuid()::text, 1, 6)),
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 2. EQUIPOS
-- ============================================================
create table teams (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references game_sessions(id) on delete cascade,
  name            text not null,
  token_balance   int  not null default 0 check (token_balance >= 0),
  display_order   int  not null default 0,
  version         int  not null default 0,   -- para bloqueo optimista
  created_at      timestamptz not null default now(),
  unique (session_id, name)
);

-- ============================================================
-- 3. MIEMBROS DEL EQUIPO
-- ============================================================
create table team_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  display_name  text not null,
  device_id     text not null,
  joined_at     timestamptz not null default now(),
  unique (team_id, device_id)
);

-- ============================================================
-- 4. HISTORIAL DE TOKENS (auditoría inmutable)
-- ============================================================
create table token_transactions (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  amount      int  not null,               -- positivo = ganancia, negativo = gasto
  reason      text not null,               -- 'level1_win', 'joker_purchase', 'bet_won', etc.
  level       text check (level in ('1','2','3')),
  ref_id      uuid,                        -- id de la ronda/pregunta relacionada
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 5. NIVEL 1 — RONDAS Y SUBMISSIONS
-- ============================================================
create table level1_rounds (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references game_sessions(id) on delete cascade,
  round_number  int  not null check (round_number between 1 and 3),
  output_type   text not null check (output_type in ('react','tool_calling')),
  content       text not null,             -- el texto que aparece en pantalla
  started_at    timestamptz,
  finished_at   timestamptz,
  unique (session_id, round_number)
);

create table level1_submissions (
  id                   uuid primary key default gen_random_uuid(),
  round_id             uuid not null references level1_rounds(id) on delete cascade,
  team_id              uuid not null references teams(id) on delete cascade,
  typed_text           text not null default '',
  error_count          int  not null default 0,
  finish_time_ms       int,                -- null si no terminó
  finish_position      int,                -- 1°, 2°, 3° — null si no terminó
  identified_correctly boolean,
  tokens_earned        int  not null default 0,
  submitted_at         timestamptz not null default now(),
  unique (round_id, team_id)
);

-- ============================================================
-- 6. NIVEL 2 — PREGUNTAS, COMODINES Y RESPUESTAS
-- ============================================================
create table level2_questions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references game_sessions(id) on delete cascade,
  question_number int  not null check (question_number between 1 and 3),
  difficulty      text not null check (difficulty in ('easy','medium','hard')),
  question_text   text not null,
  option_a        text not null,
  option_b        text not null,
  option_c        text not null,
  option_d        text not null,
  correct_option  text not null check (correct_option in ('a','b','c','d')),
  tokens_reward   int  not null,
  revealed_at     timestamptz,
  unique (session_id, question_number)
);

create table level2_answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references level2_questions(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  selected_option text check (selected_option in ('a','b','c','d')),
  joker_used      text check (joker_used in ('fifty_fifty','call_teacher','spy') or joker_used is null),
  joker_target_id uuid references teams(id),   -- para el comodín espía
  tokens_spent    int  not null default 0,
  is_locked       boolean not null default false,
  is_correct      boolean,                     -- se calcula en el reveal
  tokens_earned   int  not null default 0,
  answered_at     timestamptz,
  unique (question_id, team_id)
);

-- ============================================================
-- 7. NIVEL 3 — PREGUNTAS Y APUESTAS
-- ============================================================
create table level3_questions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references game_sessions(id) on delete cascade,
  question_number int  not null check (question_number between 1 and 5),
  question_text   text not null,
  option_a        text,
  option_b        text,
  option_c        text,
  option_d        text,
  correct_option  text,                        -- null en la pregunta final abierta
  is_final        boolean not null default false,
  betting_ends_at timestamptz,
  revealed_at     timestamptz,
  unique (session_id, question_number)
);

create table level3_answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references level3_questions(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  selected_option text,
  open_answer     text,                        -- solo para pregunta final
  is_locked       boolean not null default false,
  is_correct      boolean,
  answered_at     timestamptz,
  unique (question_id, team_id)
);

create table level3_bets (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references level3_questions(id) on delete cascade,
  bettor_team_id  uuid not null references teams(id) on delete cascade,
  target_team_id  uuid not null references teams(id) on delete cascade,
  amount          int  not null check (amount >= 50),
  won             boolean,                     -- null hasta el reveal
  settled_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (question_id, bettor_team_id),
  check (bettor_team_id <> target_team_id)
);

-- Votos de la pregunta final
create table final_votes (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references level3_questions(id) on delete cascade,
  voter_team_id   uuid not null references teams(id) on delete cascade,
  voted_team_id   uuid not null references teams(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (question_id, voter_team_id),
  check (voter_team_id <> voted_team_id)
);

-- ============================================================
-- 8. ÍNDICES para queries frecuentes
-- ============================================================
create index on teams (session_id);
create index on teams (session_id, token_balance desc);
create index on token_transactions (team_id, created_at desc);
create index on level1_submissions (round_id, finish_time_ms asc nulls last);
create index on level2_answers (question_id);
create index on level3_bets (question_id, bettor_team_id);
create index on level3_bets (question_id, target_team_id);

-- ============================================================
-- 9. FUNCIÓN: transferir tokens de forma atómica
-- Usa bloqueo optimista con el campo `version`
-- ============================================================
create or replace function transfer_tokens(
  p_team_id  uuid,
  p_amount   int,
  p_reason   text,
  p_level    text,
  p_ref_id   uuid default null
)
returns void
language plpgsql
as $$
declare
  v_current_balance int;
  v_version         int;
  v_rows_updated    int;
begin
  -- Leer saldo y versión actuales con bloqueo a nivel de fila
  select token_balance, version
    into v_current_balance, v_version
    from teams
   where id = p_team_id
   for update;

  -- Validar saldo suficiente si es un débito
  if p_amount < 0 and v_current_balance + p_amount < 0 then
    raise exception 'Saldo insuficiente para equipo %', p_team_id;
  end if;

  -- Actualizar con versión (bloqueo optimista como segunda capa)
  update teams
     set token_balance = token_balance + p_amount,
         version       = version + 1
   where id      = p_team_id
     and version = v_version;

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 0 then
    raise exception 'Conflicto de concurrencia para equipo %', p_team_id;
  end if;

  -- Registrar en historial (nunca se borra)
  insert into token_transactions (team_id, amount, reason, level, ref_id)
  values (p_team_id, p_amount, p_reason, p_level, p_ref_id);
end;
$$;

-- ============================================================
-- 10. REALTIME — habilitar publicación en tablas clave
-- ============================================================
alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table level1_submissions;
alter publication supabase_realtime add table level1_rounds;
alter publication supabase_realtime add table level2_answers;
alter publication supabase_realtime add table level2_questions;
alter publication supabase_realtime add table level3_bets;
alter publication supabase_realtime add table level3_answers;
alter publication supabase_realtime add table level3_questions;
alter publication supabase_realtime add table final_votes;

-- ============================================================
-- 11. ROW LEVEL SECURITY (base — ajustar según auth)
-- Por ahora permite todo desde el backend con service_role key
-- ============================================================
alter table game_sessions      enable row level security;
alter table teams              enable row level security;
alter table team_members       enable row level security;
alter table token_transactions enable row level security;
alter table level1_rounds      enable row level security;
alter table level1_submissions enable row level security;
alter table level2_questions   enable row level security;
alter table level2_answers     enable row level security;
alter table level3_questions   enable row level security;
alter table level3_answers     enable row level security;
alter table level3_bets        enable row level security;
alter table final_votes        enable row level security;

-- Política temporal: solo service_role puede escribir
-- (tu backend Next.js usará la service_role key, no la anon key)
create policy "service_role_all" on game_sessions      for all using (true);
create policy "service_role_all" on teams              for all using (true);
create policy "service_role_all" on team_members       for all using (true);
create policy "service_role_all" on token_transactions for all using (true);
create policy "service_role_all" on level1_rounds      for all using (true);
create policy "service_role_all" on level1_submissions for all using (true);
create policy "service_role_all" on level2_questions   for all using (true);
create policy "service_role_all" on level2_answers     for all using (true);
create policy "service_role_all" on level3_questions   for all using (true);
create policy "service_role_all" on level3_answers     for all using (true);
create policy "service_role_all" on level3_bets        for all using (true);
create policy "service_role_all" on final_votes        for all using (true);