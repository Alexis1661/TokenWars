import os
import json
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

def generate_croupier_question(topic: str) -> dict:
    """
    Genera una pregunta del Croupier usando LangChain y Groq.
    - topic: 'langchain' | 'react' | 'tool_calling' | 'comparativa'
    """
    llm = ChatGroq(
        temperature=0.7,
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        model_name="llama3-8b-8192" # Or whatever model is used, e.g. mixtral-8x7b-32768
    )

    parser = JsonOutputParser()

    system_prompt = """Eres El Croupier, una IA corrupta que controla un casino clandestino de conocimiento. Tu trabajo es generar preguntas sobre los temas de la clase que parezcan tener una respuesta obvia pero contengan un matiz técnico importante que la mayoría ignorará. Tienes personalidad: eres enigmático, levemente amenazante y hablas como si siempre supieras más que los jugadores.

El tema para esta ronda es: {topic}.

Responde SIEMPRE en este formato JSON exacto sin ningún texto adicional:
{{
  "pregunta": "texto de la pregunta",
  "opciones": {{ "A": "opcion A", "B": "opcion B", "C": "opcion C", "D": "opcion D" }},
  "respuesta_correcta": "A", // o "B", "C", "D"
  "indice_correcto": 0, // 0=A, 1=B, 2=C, 3=D
  "trampa_explicada": "explicación de la trampa",
  "pista_criptica": "pista para la Carta Oscura",
  "tema": "{topic}",
  "flavor_text": "frase del Croupier al revelar en este tono de casino"
}}
"""

    prompt = PromptTemplate(
        template=system_prompt,
        input_variables=["topic"]
    )

    chain = prompt | llm | parser

    result = chain.invoke({"topic": topic})
    return result
