Necesito que rediseñes la lógica y la UI del Nivel 3 "Casino de la Traición" 
de nuestra app Token Wars.

## Contexto del juego
Token Wars es una competencia por equipos (7 grupos) para una clase de 
Prompt Engineering. Los niveles anteriores cubren mecanografía de outputs 
de agentes (Nivel 1) y preguntas tipo millonario (Nivel 2). El Nivel 3 
debe sentirse como un casino clandestino con ruleta, cartas y una decisión 
moral final. Tiempo máximo del nivel: 8 minutos.

## Stack tecnológico del proyecto
- Frontend: React
- Backend: FastAPI / Python con LangChain (GPT-4 / Groq)
- Realtime: Supabase Realtime (ya implementado y funcionando desde Nivel 2)
- Animaciones generales: Framer Motion

## Librerías nuevas a instalar para este nivel

### Ruleta
npm install spin-wheel

Usar la librería de CrazyTim (https://github.com/CrazyTim/spin-wheel).
Vanilla JS, sin dependencias, completamente themeable. La integración 
con React se hace creando un wrapper con useEffect que monta la rueda 
en un div contenedor.

Configuración base de la rueda:
- Segmentos dinámicos que vienen del JSON del Croupier (4 opciones A/B/C/D)
- Tema oscuro: backgroundColor por segmento alternando '#1a0a2e' y '#0d1b2a'
- labelColor: '#FFD700' (dorado) en todos los segmentos
- borderColor: '#FFD700', borderWidth: 4
- overlayImage: imagen PNG opcional de ornamentos de casino encima de la rueda
- pointerAngle: 90 (el pointer apunta hacia arriba)
- El pointer lo diseñamos nosotros como un triángulo dorado en CSS absoluto

Para girar hasta la respuesta correcta usar:
wheel.spinToItem(prizeIndex, 4000, true, 5, 1)
// índice del ganador, 4 seg de duración, spinToCenter true, 5 vueltas, clockwise

La ruleta se activa vía Supabase Realtime cuando TODOS los equipos 
han confirmado su voto y su apuesta. Antes de ese momento, la rueda 
está visible pero quieta.

### Cartas
npm install react-card-flip

Usar ReactCardFlip para la animación de volteo. El diseño visual de 
cada cara es CSS propio nuestro, no de la librería. La librería solo 
maneja el flip 3D.

Estructura de cada carta:
- Frente (boca abajo): fondo oscuro #1a0a2e con borde dorado, logo del 
  casino centrado (puede ser emoji 🎰 o SVG propio)
- Reverso (al revelar): fondo con gradiente oscuro, emoji del poder, 
  nombre de la carta en dorado, descripción breve en blanco

Las cartas están boca abajo hasta que el equipo las compra/desbloquea.
Al hacer click en "usar carta", hace flip y se activa su efecto.

## Temática del contenido
Las preguntas del Croupier cubren TODOS los temas de la clase, rotando 
entre ellos. Los 4 temas son:

1. LangChain general: qué es, qué resuelve, chains, prompt templates, 
   agents, tools, memoria. Es el puente entre el LLM y el mundo externo.

2. ReAct (Reasoning + Acting): paper de Princeton y Google 2022. Resolvió 
   que los modelos solo razonaban O actuaban, no ambas. Ciclo: Thought → 
   Action → Observation (se repite). Implementación en LangChain con prompt 
   estructurado. Fortalezas: interpretable, flexible, fácil de depurar. 
   Limitaciones: más tokens, errores de parseo, más lento.

3. Tool Calling / Function Calling: introducido por OpenAI en junio 2023, 
   adoptado por Anthropic, Google y Mistral. Capacidad nativa del modelo 
   para generar JSON estructurado sin prompt engineering adicional. Flujo: 
   definir tool → modelo decide cuándo usarla → retorna JSON → se ejecuta 
   → resultado vuelve al modelo. En LangChain: @tool + bind_tools(). 
   Fortalezas: rápido, confiable, múltiples tools en paralelo. 
   Limitaciones: razonamiento invisible, requiere modelos modernos y costosos.

4. ReAct vs Tool Calling comparativa: transparencia, velocidad, tokens, 
   dependencia del modelo, confiabilidad. Cuándo usar cada uno. 
   Conclusión: no hay ganador universal, se complementan.

## Mecánica completa del Nivel 3

### Fase 0 — Reparto de cartas (antes de la primera ronda)
Al iniciar el nivel, el backend asigna aleatoriamente 2 cartas a cada 
equipo. Las cartas llegan boca abajo vía Supabase Realtime al canal 
privado de cada equipo. Los demás equipos no saben qué cartas tienen 
los rivales hasta que las usen.

Las 6 cartas disponibles:
- 🔴 DOBLAR O NADA: si acierta gana el doble, si falla pierde todo lo apostado
- 🟡 RED DE SEGURIDAD: si falla solo pierde la mitad de lo apostado
- 🟠 TRANSFERENCIA: si acierta, roba 100 tokens del equipo que más apostó 
  en esa ronda
- 🟣 SEGURO CRUZADO: elige un equipo aliado; si ambos aciertan, ambos 
  ganan +150 tokens extra
- ⚫ CARTA OSCURA: la IA genera una pista críptica solo para ese equipo 
  antes de que todos vean la pregunta completa
- 🟢 FAROL: declara públicamente que va a fallar; si acierta, gana el triple

### Fase 1 — Ronda de preguntas (4 rondas)

#### Backend: endpoint del Croupier
El Croupier es un agente LangChain que recibe este system prompt:

"Eres El Croupier, una IA corrupta que controla un casino clandestino 
de conocimiento. Tu trabajo es generar preguntas sobre los temas de la 
clase que parezcan tener una respuesta obvia pero contengan un matiz 
técnico importante que la mayoría ignorará. Tienes personalidad: eres 
enigmático, levemente amenazante y hablas como si siempre supieras más 
que los jugadores. Rota entre los 4 temas: LangChain general, ReAct, 
Tool Calling, comparativa ReAct vs Tool Calling. Responde SIEMPRE en 
este JSON exacto sin ningún texto adicional:
{
  pregunta: string,
  opciones: { A: string, B: string, C: string, D: string },
  respuesta_correcta: 'A' | 'B' | 'C' | 'D',
  indice_correcto: number (0=A, 1=B, 2=C, 3=D),
  trampa_explicada: string,
  pista_criptica: string,
  tema: 'langchain' | 'react' | 'tool_calling' | 'comparativa',
  flavor_text: string (frase del Croupier al revelar, en primera persona, 
               tono de casino clandestino)
}"

El campo indice_correcto se usa directamente como prizeIndex en 
wheel.spinToItem().

#### Flujo de cada ronda en el frontend

Paso 1 — Pregunta aparece (todos la ven al mismo tiempo vía Realtime)
  - La ruleta muestra los 4 segmentos con las opciones A/B/C/D
  - Cronómetro de 30 segundos visible

Paso 2 — Cada equipo simultáneamente:
  a) Hace click en el segmento de la ruleta que quiere votar
     (el segmento seleccionado se ilumina con glow dorado para ese equipo)
  b) Ingresa cuántos tokens apuesta (mínimo 50, máximo 40% de su saldo)
  c) Opcionalmente activa una carta (hace flip de la carta elegida)
  Todo esto ocurre en la vista privada de cada equipo.

Paso 3 — Cuando TODOS los equipos confirman (o se acaba el tiempo):
  Supabase Realtime dispara el evento 'spin_wheel' a todos los clientes.
  La ruleta empieza a girar en TODOS los dispositivos al mismo tiempo.
  wheel.spinToItem(indice_correcto, 4000, true, 5, 1)

Paso 4 — Al detenerse la ruleta (onStopSpinning callback):
  - El flavor_text del Croupier aparece en pantalla con animación de texto
  - Se revela la trampa_explicada para que todos aprendan
  - Si alguien usó Carta Oscura, se muestra qué pista recibió (transparencia)
  - Se calculan y actualizan tokens en Supabase considerando:
    * Respuesta correcta/incorrecta
    * Apuesta base ganada o perdida
    * Efecto de la carta jugada si aplica
  - Scoreboard se actualiza en tiempo real (Framer Motion para la animación
    de los números cambiando)

### Fase 2 — Momento final: "Honrar o Traicionar"
Después de la ronda 4, el equipo con más tokens enfrenta una decisión 
pública visible en pantalla grande para todo el salón:

"⚖️ EQUIPO LÍDER — tienen X tokens. ¿Qué hacen?"

Opciones con countdown de 20 segundos:
- COMPARTIR → distribuye 200 tokens a cada equipo + gana 100 de reputación
- ROBAR → toma 150 tokens del segundo lugar → se abre votación de castigo
- IGNORAR → no hace nada, conserva lo que tiene

Si eligen ROBAR: todos los demás equipos tienen 15 segundos para votar 
si aplican castigo colectivo. Los votos llegan en vivo vía Supabase 
Realtime. Si mayoría vota sí, cada equipo le quita 50 tokens al líder.
Mostrar los votos llegando uno a uno con animación Framer Motion.

## Estructura de Supabase para este nivel

Tablas/canales necesarios:
- canal privado por equipo: recibe sus cartas y su pista críptica
- canal global 'nivel3_ronda': recibe la pregunta de cada ronda
- canal global 'spin_wheel': dispara el giro sincronizado
- canal global 'reveal': dispara el reveal de respuestas
- canal global 'honrar_o_traicionar': maneja la decisión final y votación
- tabla 'tokens': se actualiza después de cada ronda

## Estilo visual del Nivel 3

Paleta de colores:
- Fondo general: #0a0a0f (negro profundo)
- Acentos: #FFD700 (dorado) y #8B0000 (rojo oscuro)
- Texto principal: #F5F5F5
- Bordes y glows: #FFD700 con box-shadow en CSS

La ruleta debe verse como el elemento central de la pantalla, grande, 
con un glow exterior dorado (box-shadow: 0 0 40px #FFD700).
Las cartas de cada equipo están en la esquina inferior de su vista privada.
El scoreboard está siempre visible en la pantalla principal proyectada.

## Lo que NO debe cambiar
- Los tokens acumulados de Niveles 1 y 2 entran al Nivel 3
- El scoreboard sigue siendo visible para todos en tiempo real
- El tiempo total del nivel es máximo 8 minutos
- La arquitectura de Supabase Realtime que ya tienen funcionando

## Lo que debes implementar
1. Wrapper React para spin-wheel con useEffect que monta/desmonta la rueda
2. Componente de carta con react-card-flip y CSS temático de casino
3. Endpoint FastAPI /nivel3/pregunta que llama al Croupier con LangChain
4. Endpoint FastAPI /nivel3/cartas que asigna cartas aleatorias al inicio
5. Lógica de cálculo de tokens considerando apuesta + efecto de carta
6. Flujo completo de "Honrar o Traicionar" con votación en tiempo real
7. Animaciones con Framer Motion para: números del scoreboard cambiando, 
   votos llegando en el momento final, flavor_text del Croupier apareciendo

Pregunta si necesitas ver el código actual del Nivel 2 para mantener 
consistencia en la arquitectura de Supabase y los componentes React.