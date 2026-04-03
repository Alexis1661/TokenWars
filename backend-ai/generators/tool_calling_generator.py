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
    "Una app de viajes que consulta disponibilidad de hoteles.",
    "Un asistente de cocina que busca recetas según ingredientes disponibles.",
    "Un bot de soporte que busca el historial de tickets de un cliente.",
    "Un agente financiero que consulta el precio de una acción en bolsa.",
    "Un asistente de salud que busca interacciones entre medicamentos.",
]

SYSTEM_PROMPT = """Eres un generador de material educativo sobre Tool Calling en IA para un juego de mecanografía en clase.

Tu tarea: generar UN ejemplo realista de tool call (llamada a herramienta) y un párrafo retador para que los alumnos lo tipeen.

Reglas estrictas para "display":
- Un bloque JSON compacto de UNA sola tool call con las claves "tool" y "args" (1-3 parámetros).
- Máximo 6 líneas. Formato JSON indentado, que se vea técnico y real.

Reglas estrictas para "challenge":
- Debe ser un PÁRRAFO de entre 250 y 350 caracteres (no palabras, caracteres).
- Explica QUÉ acción lógica ejecuta esa llamada Y qué datos le está enviando al sistema, en lenguaje cotidiano.
- No copies los nombres técnicos del JSON (ej: en vez de "get_recipe_suggestions", escribe "herramienta de sugerencias gastronómicas").
- Usa español natural con tildes, comas y punto final. Oraciones largas y fluidas, retadoras para tipear.
- El párrafo debe ser coherente: primero qué hace, luego por qué importa o qué resultado se espera.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Formato de respuesta:
{"display": "...", "challenge": "..."}"""


def generate_tool_calling_challenge() -> dict:
    """
    Genera un par (technical_content, target_text) para un reto Tool Calling.

    Returns:
        {"display": str, "challenge": str}
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
        if "display" in result and "challenge" in result:
            return result
    except (json.JSONDecodeError, KeyError):
        pass

    return _fallback_tool_calling_challenge()


def _fallback_tool_calling_challenge() -> dict:
    """Par de respaldo si el LLM no devuelve JSON válido."""
    fallbacks = [
        {
            "display": (
                '{\n'
                '  "tool": "get_weather",\n'
                '  "args": {\n'
                '    "city": "Bogota",\n'
                '    "units": "celsius"\n'
                '  }\n'
                '}'
            ),
            "challenge": (
                "El sistema está ejecutando una consulta a la herramienta meteorológica, enviando el nombre "
                "de la ciudad y la escala de temperatura deseada como argumentos. El resultado esperado es "
                "un valor numérico que permita al agente responder si hace frío o calor en este momento."
            ),
        },
        {
            "display": (
                '{\n'
                '  "tool": "search_flights",\n'
                '  "args": {\n'
                '    "origin": "BOG",\n'
                '    "destination": "MDE",\n'
                '    "date": "2025-08-15"\n'
                '  }\n'
                '}'
            ),
            "challenge": (
                "El agente invoca la herramienta de búsqueda de vuelos enviando el aeropuerto de origen, "
                "el destino y la fecha específica del viaje como parámetros estructurados. Esta llamada "
                "permite transformar una intención del usuario en una consulta precisa sobre disponibilidad "
                "de tiquetes aéreos."
            ),
        },
        {
            "display": (
                '{\n'
                '  "tool": "get_recipe_suggestions",\n'
                '  "args": {\n'
                '    "ingredients": ["pollo", "cebolla", "pimiento"],\n'
                '    "cuisine": "mexicana"\n'
                '  }\n'
                '}'
            ),
            "challenge": (
                "El sistema está ejecutando una llamada a la herramienta de sugerencias gastronómicas, "
                "enviando como argumentos una lista de ingredientes disponibles y el estilo de cocina deseado. "
                "El objetivo es transformar datos estructurados en una lista de platos que se puedan preparar "
                "de forma inmediata."
            ),
        },
    ]
    return random.choice(fallbacks)
