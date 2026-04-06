import Groq from 'groq-sdk'
import { getSupabaseAdmin } from '@/lib/supabase'

// Timeout de 6s por llamada a Groq para no colgar en producción
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 6000 })

// ─── Escenarios ────────────────────────────────────────────
const REACT_SCENARIOS = [
  'Un agente decide si llevar paraguas revisando el clima de Bogotá.',
  'Un agente busca el precio del dólar para convertir una cantidad en pesos.',
  'Un agente verifica disponibilidad de vuelos antes de recomendar un destino.',
  'Un agente revisa el historial médico antes de recomendar un medicamento.',
  'Un agente consulta el inventario antes de confirmar un pedido en línea.',
]

const TOOL_CALLING_SCENARIOS = [
  'Una app de viajes que consulta disponibilidad de hoteles.',
  'Un asistente de cocina que busca recetas según ingredientes disponibles.',
  'Un bot de soporte que busca el historial de tickets de un cliente.',
  'Un agente financiero que consulta el precio de una acción en bolsa.',
  'Un asistente educativo que busca definiciones en una base de conocimiento.',
]

// ─── Fallbacks hardcoded ────────────────────────────────────
function getFallback(type: 'react' | 'tool_calling') {
  if (type === 'react') {
    return {
      display: 'Thought: No encontré vuelos directos. Debo buscar opciones con escala intermedia.\nAction: search_flights\nAction Input: {"origin": "BOG", "destination": "MIA", "stops": 1}',
      challenge: 'Al no hallar conexiones directas disponibles, el agente ajusta su estrategia e intenta una consulta más amplia que incluya vuelos con escala intermedia. Esta capacidad de replantear el enfoque ante un resultado negativo es una de las ventajas centrales del paradigma ReAct.',
    }
  }
  return {
    display: '{\n  "tool": "get_weather",\n  "args": {\n    "city": "Bogota",\n    "units": "celsius"\n  }\n}',
    challenge: 'El sistema está ejecutando una consulta a la herramienta meteorológica enviando el nombre de la ciudad y la escala de temperatura deseada como argumentos. El resultado esperado es un valor numérico que permita al agente responder si hace frío o calor en este momento.',
  }
}

async function generateChallenge(type: 'react' | 'tool_calling'): Promise<{ display: string; challenge: string }> {
  const scenarios = type === 'react' ? REACT_SCENARIOS : TOOL_CALLING_SCENARIOS
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]

  const systemPrompt = type === 'react'
    ? `Eres un generador de material educativo sobre agentes de IA para un juego de mecanografía en clase.
Tu tarea: generar UN paso de un trace ReAct y un párrafo retador para que los alumnos lo tipeen.
Reglas para "display": UN SOLO paso del trace (Thought, Observation, o Action+ActionInput). Máximo 4 líneas. Técnico y real.
Reglas para "challenge": PÁRRAFO de 250-350 caracteres. Explica QUÉ hace la IA en ese paso Y POR QUÉ importa. Español con tildes y comas. Sin bullet points. Oraciones largas y fluidas.
Responde ÚNICAMENTE con JSON válido: {"display": "...", "challenge": "..."}`
    : `Eres un generador de material educativo sobre Tool Calling en IA para un juego de mecanografía en clase.
Tu tarea: generar UN ejemplo realista de tool call y un párrafo retador para que los alumnos lo tipeen.
Reglas para "display": JSON compacto indentado con "tool" y "args" (1-3 parámetros). Máximo 8 líneas.
Reglas para "challenge": PÁRRAFO de 250-350 caracteres. Explica qué acción lógica ejecuta esa llamada y qué datos envía, en lenguaje cotidiano. Sin nombres técnicos del JSON. Español con tildes y comas. Oraciones largas y fluidas.
Responde ÚNICAMENTE con JSON válido: {"display": "...", "challenge": "..."}`

  try {
    console.log(`[seedGame/groq] Llamando a Groq type=${type}...`)
    const t = Date.now()
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera el reto para este escenario: ${scenario}` },
      ],
    })
    console.log(`[seedGame/groq] OK type=${type} en ${Date.now() - t}ms`)

    const content = response.choices[0]?.message?.content?.trim() ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.display && parsed.challenge) return parsed
    }
    console.warn(`[seedGame/groq] JSON inválido type=${type}, usando fallback`)
  } catch (err) {
    console.warn(`[seedGame/groq] Error type=${type}, usando fallback:`, err instanceof Error ? err.message : err)
  }

  console.log(`[seedGame/groq] Usando contenido hardcoded para type=${type}`)
  return getFallback(type)
}

// ─── Preguntas estáticas ────────────────────────────────────
const LEVEL2_QUESTIONS = [
  {
    question_number: 1, difficulty: 'easy', tokens_reward: 150,
    question_text: '¿Qué representa la "O" en el ciclo ReAct (Reasoning + Acting)?',
    option_a: 'Output — la respuesta final del modelo',
    option_b: 'Observation — el resultado de ejecutar una acción',
    option_c: 'Operation — la instrucción al sistema',
    option_d: 'Orchestration — la coordinación de herramientas',
    correct_option: 'b',
  },
  {
    question_number: 2, difficulty: 'medium', tokens_reward: 250,
    question_text: '¿Por qué Tool Calling suele ser más rápido que ReAct en producción?',
    option_a: 'Porque usa modelos más pequeños',
    option_b: 'Porque omite el paso de razonamiento por completo',
    option_c: 'Porque emite llamadas estructuradas JSON sin ciclos de razonamiento libre',
    option_d: 'Porque cachea todas las respuestas automáticamente',
    correct_option: 'c',
  },
  {
    question_number: 3, difficulty: 'hard', tokens_reward: 400,
    question_text: 'Un agente ReAct repite la misma Action 4 veces sin llegar a Final Answer. ¿Cuál es la causa más probable?',
    option_a: 'La herramienta no está registrada en el agente',
    option_b: 'El modelo no puede parsear el Observation como información útil y no actualiza su Thought',
    option_c: 'El LLM tiene temperatura 0 y no genera variación',
    option_d: 'LangChain tiene un bug conocido en agentes ZERO_SHOT_REACT',
    correct_option: 'b',
  },
]

const LEVEL3_QUESTIONS = [
  {
    question_number: 1, is_final: false,
    question_text: '¿Qué ventaja tiene ReAct sobre Tool Calling en problemas de diagnóstico?',
    option_a: 'Es más rápido', option_b: 'Genera razonamiento explícito paso a paso',
    option_c: 'Usa menos tokens', option_d: 'Funciona sin internet', correct_option: 'b',
  },
  {
    question_number: 2, is_final: false,
    question_text: '¿Qué estructura de datos usa OpenAI para definir herramientas en Tool Calling?',
    option_a: 'XML Schema', option_b: 'YAML', option_c: 'JSON Schema', option_d: 'Protocol Buffers', correct_option: 'c',
  },
  {
    question_number: 3, is_final: false,
    question_text: '¿Qué ocurre si un agente ReAct llama a una herramienta con argumentos incorrectos?',
    option_a: 'El agente se detiene', option_b: 'El Observation contiene el error y el agente puede corregirse',
    option_c: 'LangChain lanza una excepción', option_d: 'El agente ignora el error', correct_option: 'b',
  },
  {
    question_number: 4, is_final: false,
    question_text: '¿Qué es el "max_iterations" en un agente ReAct de LangChain?',
    option_a: 'El número máximo de tokens', option_b: 'La cantidad máxima de ciclos Thought-Action-Observation antes de forzar parada',
    option_c: 'El número de herramientas disponibles', option_d: 'El timeout en segundos', correct_option: 'b',
  },
  {
    question_number: 5, is_final: true,
    question_text: 'PREGUNTA FINAL: Una plataforma financiera regulada necesita un agente que revise transacciones sospechosas y genere reportes auditables. El proceso debe ser explicable a entes regulatorios.\n\n¿Usarías ReAct o Tool Calling? Justifica en una línea.',
    option_a: null, option_b: null, option_c: null, option_d: null, correct_option: null,
  },
]

// ─── Función principal exportada ────────────────────────────
/**
 * Genera contenido con Groq e inserta rondas/preguntas en Supabase.
 * Llamar directamente desde las API routes — sin HTTP interno.
 */
export async function seedGame(sessionId: string): Promise<void> {
  console.log(`[seedGame] START sessionId=${sessionId}`)
  console.log(`[seedGame] ENV — GROQ_API_KEY=${process.env.GROQ_API_KEY ? 'SET' : 'MISSING'} SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`)

  const admin = getSupabaseAdmin()

  const roundConfigs: Array<{ round_number: number; output_type: 'react' | 'tool_calling' }> = [
    { round_number: 1, output_type: 'react' },
    { round_number: 2, output_type: 'tool_calling' },
    { round_number: 3, output_type: 'react' },
  ]

  console.log(`[seedGame] Generando ${roundConfigs.length} retos con Groq...`)
  const t0 = Date.now()
  const challenges = await Promise.all(
    roundConfigs.map(({ output_type }) => generateChallenge(output_type))
  )
  console.log(`[seedGame] Retos generados en ${Date.now() - t0}ms`)

  const level1Rows = roundConfigs.map(({ round_number, output_type }, i) => ({
    session_id: sessionId,
    round_number,
    output_type,
    content: challenges[i].display,
    technical_content: challenges[i].display,
    target_text: challenges[i].challenge,
  }))

  const level2Rows = LEVEL2_QUESTIONS.map((q) => ({ ...q, session_id: sessionId }))
  const level3Rows = LEVEL3_QUESTIONS.map((q) => ({ ...q, session_id: sessionId }))

  console.log(`[seedGame] Insertando en Supabase — L1:${level1Rows.length} L2:${level2Rows.length} L3:${level3Rows.length}`)
  const t1 = Date.now()
  const [r1, r2, r3] = await Promise.all([
    admin.from('level1_rounds').insert(level1Rows),
    admin.from('level2_questions').insert(level2Rows),
    admin.from('level3_questions').insert(level3Rows),
  ])
  console.log(`[seedGame] Inserts completados en ${Date.now() - t1}ms`)

  if (r1.error) { console.error('[seedGame] ERROR level1_rounds:', r1.error); throw new Error(`level1: ${r1.error.message}`) }
  if (r2.error) { console.error('[seedGame] ERROR level2_questions:', r2.error); throw new Error(`level2: ${r2.error.message}`) }
  if (r3.error) { console.error('[seedGame] ERROR level3_questions:', r3.error); throw new Error(`level3: ${r3.error.message}`) }

  console.log(`[seedGame] OK — sesión ${sessionId} lista`)
}
