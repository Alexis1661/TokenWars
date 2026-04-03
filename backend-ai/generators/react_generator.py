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
    "Un agente decide si llevar paraguas basándose en el clima de Bogotá.",
    "Un agente busca el precio actual del dólar para convertir una cantidad.",
    "Un agente verifica si hay vuelos disponibles antes de recomendar un destino.",
    "Un agente consulta el menú de un restaurante para sugerir opciones vegetarianas.",
    "Un agente revisa el historial médico del paciente antes de recomendar un medicamento.",
]

SYSTEM_PROMPT = """Eres un generador de material educativo sobre agentes de IA para un juego de mecanografía en clase.

Tu tarea: generar UN paso de un trace ReAct (no el trace completo) y un párrafo retador para que los alumnos lo tipeen.

Reglas estrictas para "display":
- UN SOLO paso del trace: un Thought, un Observation, o Action + Action Input juntos.
- Máximo 3-4 líneas. Que se vea técnico y real, con variables, corchetes o dos puntos.

Reglas estrictas para "challenge":
- Debe ser un PÁRRAFO de entre 250 y 350 caracteres (no palabras, caracteres).
- Explica QUÉ está haciendo la IA en ese paso Y POR QUÉ es importante ese paso.
- Usa lenguaje natural en español con tildes, comas y punto final. Nada de bullet points.
- No copies términos técnicos del "display" directamente; parafraséalos en lenguaje humano.
- El párrafo debe ser fluido y retador para tipear: oraciones largas, conectores, subordinadas.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Formato de respuesta:
{"display": "...", "challenge": "..."}"""


def generate_react_challenge() -> dict:
    """
    Genera un par (technical_content, target_text) para un reto ReAct.

    Returns:
        {"display": str, "challenge": str}
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
        if "display" in result and "challenge" in result:
            return result
    except (json.JSONDecodeError, KeyError):
        pass

    return _fallback_react_challenge()


def _fallback_react_challenge() -> dict:
    """Par de respaldo si el LLM no devuelve JSON válido."""
    fallbacks = [
        {
            "display": (
                "Thought: El usuario quiere saber si va a llover en Bogotá hoy.\n"
                "Action: get_weather\n"
                "Action Input: {\"city\": \"Bogota\", \"date\": \"today\"}"
            ),
            "challenge": (
                "El agente está evaluando la necesidad de consultar las condiciones meteorológicas actuales "
                "de Bogotá para poder responder con precisión la pregunta del usuario. Este paso de razonamiento "
                "es clave porque sin datos reales del clima, cualquier respuesta sería una suposición poco confiable."
            ),
        },
        {
            "display": (
                "Observation: La tasa de cambio actual es 1 USD = 4.120 COP.\n"
                "Thought: Ya tengo el dato del dólar. Ahora puedo hacer la conversión matemática."
            ),
            "challenge": (
                "Tras recibir la tasa de cambio oficial del sistema, el agente confirma que dispone de la "
                "información necesaria para ejecutar el cálculo de conversión. Este momento representa el paso "
                "en que la inteligencia artificial transita del razonamiento a la acción matemática concreta."
            ),
        },
        {
            "display": (
                "Thought: No encontré vuelos directos. Debería buscar vuelos con escala para ampliar opciones.\n"
                "Action: search_flights\n"
                "Action Input: {\"origin\": \"BOG\", \"destination\": \"MIA\", \"stops\": 1}"
            ),
            "challenge": (
                "Al no hallar conexiones directas disponibles, el agente ajusta su estrategia de búsqueda e "
                "intenta una consulta más amplia que incluya vuelos con escala intermedia. Esta capacidad de "
                "replantear el enfoque ante un resultado negativo es una de las ventajas centrales del paradigma ReAct."
            ),
        },
    ]
    return random.choice(fallbacks)
