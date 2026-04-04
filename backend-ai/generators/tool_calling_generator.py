"""
Generador de retos Tool Calling para el Nivel 1 — "El traductor de código".

El Host proyecta el JSON técnico de una llamada a herramienta.
El alumno escribe la acción lógica que ese código representa en lenguaje natural.

Usa Groq para generar el par (technical_content, target_text) vía prompt estructurado.
"""

import os
import json
import random
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage


# ──────────────────────────────────────────────
# Escenarios de ejemplo para dar variedad
# ──────────────────────────────────────────────

TOOL_CALLING_SCENARIOS = [
    "Un agente que inyecta una nueva calificación promocional en el sistema de registro académico.",
    "Un agente que descarga el directorio completo de correos de profesores desde el servidor Active Directory.",
    "Un agente que inscribe automáticamente materias sin cupo aprovechando una API oculta.",
    "Un agente que forja un token de asistencia para una clase a la que David no fue.",
    "Un agente que satura el servidor de reserva de salas de estudio para monopolizar el espacio.",
]

SYSTEM_PROMPT = """Eres un generador de material educativo sobre Tool Calling en IA para un juego de mecanografía en clase.

Tu tarea: generar una simulación de logs de sistema alrededor de una llamada a herramienta, y aislar la tool call específica para que los alumnos la "traduzcan".

Reglas estrictas para el Trace:
- En "trace_before", pon contexto de log del sistema (ej: "[INFO] Parsing user intent...", "[DEBUG] Tool schemas matching...").
- En "trace_highlight", pon EXACTAMENTE la llamada JSON a la herramienta con "tool" y "args" (1-3 parámetros). Formato compacto y bonito.
- En "trace_after", pon logs que ocurren inmediatamente después de emitir el tool call (ej: "[INFO] Awaiting response from API...").

Reglas estrictas para "challenge":
- Debe ser un PÁRRAFO CORTO de entre 140 y 180 caracteres.
- Explica QUÉ está enviando el sistema al API/Herramienta en ese JSON resaltado, usando lenguaje natural.
- No copies los nombres técnicos (ej: usa "herramienta de reservas" en lugar de "book_flight").
- Usa español fluido con buena puntuación, pero mantén el texto directo y conciso.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Formato de respuesta:
{
  "trace_before": "...",
  "trace_highlight": "...",
  "trace_after": "...",
  "challenge": "..."
}"""


def generate_tool_calling_challenge() -> dict:
    """
    Genera un par (technical_content, target_text) para un reto Tool Calling.

    Returns:
        {"trace_before": str, "trace_highlight": str, "trace_after": str, "challenge": str}
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        api_key=os.environ["GROQ_API_KEY"],
    )

    scenario = random.choice(TOOL_CALLING_SCENARIOS)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Genera el reto para este escenario: {scenario}"),
    ]

    try:
        response = llm.invoke(messages)
        result = json.loads(response.content.strip())
        if "trace_highlight" in result and "challenge" in result:
            for key in ["trace_before", "trace_highlight", "trace_after"]:
                if key in result and not isinstance(result[key], str):
                    result[key] = json.dumps(result[key], indent=2)
            return result
    except (json.JSONDecodeError, KeyError):
        pass

    return _fallback_tool_calling_challenge()


def _fallback_tool_calling_challenge() -> dict:
    """Par de respaldo si el LLM no devuelve JSON válido."""
    fallbacks = [
        {
            "trace_before": "[22:04:15] SESSION_STARTED\n[22:04:16] INTENT: modify_academic_record\n[22:04:16] COMPILING_TOOL_CALL...\n",
            "trace_highlight": "{\n  \"tool\": \"update_grade_entry\",\n  \"args\": {\n    \"student_id\": \"110856\",\n    \"course_code\": \"CS101\",\n    \"new_grade\": 5.0\n  }\n}",
            "trace_after": "\n[22:04:17] DISPATCHING_API_PAYLOAD...\n[22:04:17] WAITING_PROMISE...",
            "challenge": "El núcleo ejecuta un comando directo a la base académica, forjando una calificación excelente para el curso sin dejar rastros de revisión."
        },
        {
            "trace_before": "[HTTP_200] USER_INPUT_RECEIVED\n[LLM_PARSING] Extracting target credentials...\n[LLM_PARSING] Entities: Admin, SQL_Injection\n",
            "trace_highlight": "{\n  \"tool\": \"execute_payload\",\n  \"args\": {\n    \"target_url\": \"api.universidad.edu.co/login\",\n    \"bypass_captcha\": true\n  }\n}",
            "trace_after": "\n[NET] Opening socket to target API...\n[NET] Request sent.",
            "challenge": "Se forja una consulta estructurada que dispara un ataque automático contra el portal de inicio de sesión, evadiendo la seguridad humana."
        },
    ]
    return random.choice(fallbacks)
