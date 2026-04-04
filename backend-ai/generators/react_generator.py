"""
Generador de retos ReAct para el Nivel 1 — "La bitácora de pensamiento".

El Host proyecta un paso técnico del trace (Thought / Observation).
El alumno escribe la interpretación humana de ese paso en sus propias palabras.

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

REACT_SCENARIOS = [
    "Un agente que intenta acceder al servidor de asistencia de la universidad para borrar faltas.",
    "Un agente que busca credenciales expuestas en la red universitaria para escalar privilegios.",
    "Un agente intentando modificar un parcial en la base de datos de Moodle.",
    "Un agente que intercepta correos del rectorado para buscar las respuestas de un examen final.",
    "Un agente buscando la contraseña del wifi de invitados decodificando paquetes en el campus.",
]

SYSTEM_PROMPT = """Eres un generador de material educativo sobre agentes de IA para un juego de mecanografía en clase.

Tu tarea: generar un TRACE COMPLETO (varios pasos) de ReAct, pero seleccionar solo UN paso específico para que los alumnos lo "traduzcan", rodeado de contexto antes y después.

Reglas estrictas para el Trace:
- Inventa un escenario completo de 3 a 5 pasos (ej. Thought -> Action -> Observation -> Thought -> Action).
- En "trace_before", pon los primeros pasos del trace que ya sucedieron. Si el highlight es el primer paso, deja "trace_before" vacío.
- En "trace_highlight", pon EXACTAMENTE UN paso clave (ej. un Thought + Action + Action Input, o un Thought + Observation final). Debe ser de 2-4 líneas.
- En "trace_after", pon el resto del trace (o pasos ficticios futuros) para completar la ilusión de un log completo. Si es el final, déjalo vacío.

Reglas estrictas para "challenge":
- Debe ser un PÁRRAFO CORTO de entre 140 y 180 caracteres.
- Explica QUÉ está haciendo la IA *exclusivamente en la parte del highlight* Y POR QUÉ es importante ese paso.
- Usa lenguaje natural en español con tildes, comas y punto final.
- El párrafo debe ser fluido e ir directo al grano, sin explicaciones extensas.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Formato de respuesta:
{
  "trace_before": "...",
  "trace_highlight": "...",
  "trace_after": "...",
  "challenge": "..."
}"""


def generate_react_challenge() -> dict:
    """
    Genera un dict con el trace parcelado y el reto.

    Returns:
        {"trace_before": str, "trace_highlight": str, "trace_after": str, "challenge": str}
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,  # algo de variedad entre rondas
        api_key=os.environ["GROQ_API_KEY"],
    )

    scenario = random.choice(REACT_SCENARIOS)

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

    return _fallback_react_challenge()


def _fallback_react_challenge() -> dict:
    """Par de respaldo si el LLM no devuelve JSON válido."""
    fallbacks = [
        {
            "trace_before": "Thought: Necesito acceder a la tabla de notas del curso de Inteligencia Artificial.\nAction: sql_query\nAction Input: {\"query\": \"SELECT * FROM grades WHERE course='IA'\"}\nObservation: Error. Acceso denegado. Se requiere rol de profesor.\n",
            "trace_highlight": "Thought: Ya sé que no tengo permisos. Debo buscar una vulnerabilidad en el sistema de autenticación.\nAction: bypass_auth\nAction Input: {\"target\": \"login_session_token\"}",
            "trace_after": "",
            "challenge": "Al bloquearse mi acceso a los registros, ajusto mi enfoque e intento evadir la seguridad del sistema escalando privilegios para modificar los datos."
        },
        {
            "trace_before": "",
            "trace_highlight": "Thought: La puerta de enlace principal está encriptada. Intentaré acceder a través del servidor antiguo de biblioteca.\nAction: ssh_connect\nAction Input: {\"host\": \"lib-old.universidad.edu.co\", \"port\": 22}",
            "trace_after": "\nObservation: Conexión establecida. Se requiere contraseña.\nThought: Genial, ahora puedo hacer fuerza bruta.",
            "challenge": "La entrada principal es segura. Razonando una vía alterna, descubro un servidor desactualizado y me conecto por un puerto sin vigilancia."
        },
    ]
    return random.choice(fallbacks)
