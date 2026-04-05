import { NextRequest, NextResponse } from 'next/server'

const AI_BACKEND = process.env.AI_BACKEND_URL ?? 'http://localhost:8000'

// Preguntas de fallback por si el backend Python no está disponible
const FALLBACK_QUESTIONS: Record<string, object> = {
  langchain: {
    pregunta: '¿Cuál es la función principal de LangChain en el desarrollo de agentes de IA?',
    opciones: {
      A: 'Entrenar modelos de lenguaje desde cero',
      B: 'Actuar como puente entre el LLM y herramientas/fuentes de datos externas',
      C: 'Reemplazar a OpenAI GPT con un modelo propio',
      D: 'Generar imágenes a partir de texto',
    },
    respuesta_correcta: 'B',
    indice_correcto: 1,
    trampa_explicada: 'LangChain no entrena modelos; su valor está en orquestar LLMs existentes con herramientas, memoria y cadenas de procesamiento.',
    pista_criptica: 'El puente conecta dos orillas que no se tocan solas.',
    tema: 'langchain',
    flavor_text: 'Pensaban que LangChain era el modelo... El Croupier siempre gana con los detalles.',
  },
  react: {
    pregunta: '¿Qué problema específico vino a resolver el paradigma ReAct (Reasoning + Acting)?',
    opciones: {
      A: 'Los modelos eran demasiado lentos para responder',
      B: 'Los modelos solo razonaban O solo actuaban, no ambas cosas a la vez',
      C: 'Los modelos no podían generar código ejecutable',
      D: 'Los modelos consumían demasiada memoria GPU',
    },
    respuesta_correcta: 'B',
    indice_correcto: 1,
    trampa_explicada: 'ReAct (Princeton + Google, 2022) surgió para unir razonamiento y acción en un ciclo: Thought → Action → Observation.',
    pista_criptica: 'Antes de ReAct, el modelo pensaba o hacía. Nunca ambos.',
    tema: 'react',
    flavor_text: 'El ciclo no miente: Thought, Action, Observation. Repítanlo hasta aprenderlo.',
  },
  tool_calling: {
    pregunta: '¿Cuál es la ventaja principal de Tool Calling frente a ReAct para invocar herramientas?',
    opciones: {
      A: 'Tool Calling es más barato en tokens de entrada',
      B: 'Tool Calling genera JSON estructurado de forma nativa sin prompt engineering adicional',
      C: 'Tool Calling permite razonamiento más transparente',
      D: 'Tool Calling funciona con cualquier modelo de lenguaje antiguo',
    },
    respuesta_correcta: 'B',
    indice_correcto: 1,
    trampa_explicada: 'La clave de Tool Calling es que el modelo genera JSON válido de forma nativa (capacidad del modelo, no del prompt). ReAct sí expone su razonamiento; Tool Calling no necesariamente.',
    pista_criptica: 'La estructura es la ventaja. El modelo la produce solo.',
    tema: 'tool_calling',
    flavor_text: 'El JSON no miente. La trampa estaba en confundir transparencia con eficiencia.',
  },
  comparativa: {
    pregunta: 'Al comparar ReAct vs Tool Calling, ¿cuál de las siguientes afirmaciones es correcta?',
    opciones: {
      A: 'ReAct siempre es más rápido porque no genera JSON',
      B: 'Tool Calling es más interpretable porque expone su razonamiento interno',
      C: 'ReAct es más interpretable; Tool Calling es más rápido y confiable en estructura',
      D: 'Ambos frameworks son equivalentes y pueden reemplazarse sin consecuencias',
    },
    respuesta_correcta: 'C',
    indice_correcto: 2,
    trampa_explicada: 'ReAct expone el Thought/Action/Observation (interpretable). Tool Calling genera JSON estructurado confiable y rápido, pero el razonamiento es opaco.',
    pista_criptica: 'Uno muestra su trabajo. El otro entrega directamente el resultado.',
    tema: 'comparativa',
    flavor_text: 'No hay ganador universal. El Croupier conoce sus herramientas. ¿Ustedes las conocen?',
  },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const topic: string = body.topic ?? 'langchain'

  try {
    const res = await fetch(`${AI_BACKEND}/nivel3/pregunta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000), // 8s timeout
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
    throw new Error(`Backend ${res.status}`)
  } catch {
    // Fallback con pregunta hardcoded cuando el backend falla
    const question = FALLBACK_QUESTIONS[topic] ?? FALLBACK_QUESTIONS['langchain']
    return NextResponse.json({ ok: true, question, fallback: true })
  }
}
