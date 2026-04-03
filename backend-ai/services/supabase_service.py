"""
Servicio Supabase para el backend Python.
Usa supabase-py con la service_role key para bypass de RLS.
"""

import os
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


# ──────────────────────────────────────────────
# Nivel 1
# ──────────────────────────────────────────────

def insert_level1_round(
    session_id: str,
    round_number: int,
    output_type: str,
    technical_content: str,
    target_text: str,
) -> dict:
    """Inserta una ronda de Nivel 1 en Supabase y retorna el registro."""
    client = get_client()
    result = (
        client.table("level1_rounds")
        .insert({
            "session_id": session_id,
            "round_number": round_number,
            "output_type": output_type,
            "content": technical_content,       # columna original requerida (NOT NULL)
            "technical_content": technical_content,
            "target_text": target_text,
        })
        .execute()
    )
    return result.data[0]


def start_level1_round(round_id: str) -> None:
    """Marca una ronda como iniciada."""
    get_client().table("level1_rounds").update(
        {"started_at": "now()"}
    ).eq("id", round_id).execute()


def finish_level1_round(round_id: str) -> None:
    """Marca una ronda como finalizada y llama a transfer_tokens para cada equipo."""
    client = get_client()
    client.table("level1_rounds").update(
        {"finished_at": "now()"}
    ).eq("id", round_id).execute()

    # Obtener submissions de la ronda ordenadas por tiempo
    subs = (
        client.table("level1_submissions")
        .select("*")
        .eq("round_id", round_id)
        .not_.is_("finish_time_ms", "null")
        .order("finish_time_ms", desc=False)
        .execute()
        .data
    )

    rewards = {1: 300, 2: 200, 3: 100}
    for pos, sub in enumerate(subs[:3], start=1):
        amount = rewards[pos]
        if sub.get("identified_correctly"):
            amount += 50  # bonus identificación

        # Actualizar posición en la submission
        client.table("level1_submissions").update(
            {"finish_position": pos, "tokens_earned": amount}
        ).eq("id", sub["id"]).execute()

        # Transferir tokens de forma atómica vía la función PG
        client.rpc("transfer_tokens", {
            "p_team_id": sub["team_id"],
            "p_amount": amount,
            "p_reason": f"level1_position_{pos}",
            "p_level": "1",
            "p_ref_id": round_id,
        }).execute()


# ──────────────────────────────────────────────
# Nivel 2
# ──────────────────────────────────────────────

LEVEL2_QUESTIONS = [
    {
        "question_number": 1,
        "difficulty": "easy",
        "question_text": "¿Qué representa la 'O' en el ciclo ReAct (Reasoning + Acting)?",
        "option_a": "Output — la respuesta final del modelo",
        "option_b": "Observation — el resultado de ejecutar una acción",
        "option_c": "Operation — la instrucción al sistema",
        "option_d": "Orchestration — la coordinación de herramientas",
        "correct_option": "b",
        "tokens_reward": 150,
    },
    {
        "question_number": 2,
        "difficulty": "medium",
        "question_text": "¿Por qué Tool Calling suele ser más rápido que ReAct en producción?",
        "option_a": "Porque usa modelos más pequeños",
        "option_b": "Porque omite el paso de razonamiento por completo",
        "option_c": "Porque emite llamadas estructuradas JSON sin ciclos de razonamiento libre",
        "option_d": "Porque cachea todas las respuestas automáticamente",
        "correct_option": "c",
        "tokens_reward": 250,
    },
    {
        "question_number": 3,
        "difficulty": "hard",
        "question_text": (
            "Un agente ReAct entra en un bucle infinito: repite la misma Action con el mismo "
            "Action Input 4 veces sin llegar a Final Answer. ¿Cuál es la causa más probable?"
        ),
        "option_a": "La herramienta no está registrada en el agente",
        "option_b": "El modelo no puede parsear el Observation como información útil y no actualiza su Thought",
        "option_c": "El LLM tiene temperatura 0 y no genera variación",
        "option_d": "LangChain tiene un bug conocido en agentes ZERO_SHOT_REACT",
        "correct_option": "b",
        "tokens_reward": 400,
    },
]


def insert_level2_questions(session_id: str) -> list[dict]:
    client = get_client()
    rows = [{**q, "session_id": session_id} for q in LEVEL2_QUESTIONS]
    result = client.table("level2_questions").insert(rows).execute()
    return result.data


def reveal_level2_question(question_id: str) -> None:
    """Revela la pregunta y calcula resultados de todos los equipos."""
    client = get_client()
    client.table("level2_questions").update(
        {"revealed_at": "now()"}
    ).eq("id", question_id).execute()

    # Obtener pregunta para saber la correcta y el reward
    q = client.table("level2_questions").select("*").eq("id", question_id).single().execute().data
    correct = q["correct_option"]
    reward = q["tokens_reward"]

    # Calcular resultados
    answers = (
        client.table("level2_answers")
        .select("*")
        .eq("question_id", question_id)
        .execute()
        .data
    )

    for ans in answers:
        is_correct = ans["selected_option"] == correct
        tokens_earned = reward if is_correct else 0

        client.table("level2_answers").update({
            "is_correct": is_correct,
            "tokens_earned": tokens_earned,
        }).eq("id", ans["id"]).execute()

        if is_correct:
            client.rpc("transfer_tokens", {
                "p_team_id": ans["team_id"],
                "p_amount": tokens_earned,
                "p_reason": "level2_correct",
                "p_level": "2",
                "p_ref_id": question_id,
            }).execute()

        # Reembolso de comodín si respondió correctamente con comodín espía
        if ans["joker_used"] and ans["tokens_spent"] > 0:
            client.rpc("transfer_tokens", {
                "p_team_id": ans["team_id"],
                "p_amount": -ans["tokens_spent"],
                "p_reason": "joker_purchase",
                "p_level": "2",
                "p_ref_id": question_id,
            }).execute()


# ──────────────────────────────────────────────
# Nivel 3
# ──────────────────────────────────────────────

LEVEL3_QUESTIONS = [
    {
        "question_number": 1,
        "question_text": "¿Qué ventaja tiene ReAct sobre Tool Calling en problemas de diagnóstico?",
        "option_a": "Es más rápido",
        "option_b": "Genera razonamiento explícito paso a paso",
        "option_c": "Usa menos tokens",
        "option_d": "Funciona sin conexión a internet",
        "correct_option": "b",
        "is_final": False,
    },
    {
        "question_number": 2,
        "question_text": "¿Qué estructura de datos usa OpenAI para definir herramientas en Tool Calling?",
        "option_a": "XML Schema",
        "option_b": "YAML",
        "option_c": "JSON Schema",
        "option_d": "Protocol Buffers",
        "correct_option": "c",
        "is_final": False,
    },
    {
        "question_number": 3,
        "question_text": "¿Qué ocurre si un agente ReAct llama a una herramienta con argumentos incorrectos?",
        "option_a": "El agente se detiene automáticamente",
        "option_b": "El Observation contiene el error y el agente puede corregirse en el siguiente Thought",
        "option_c": "LangChain lanza una excepción que cierra la cadena",
        "option_d": "El agente ignora el error y genera Final Answer igual",
        "correct_option": "b",
        "is_final": False,
    },
    {
        "question_number": 4,
        "question_text": "¿Qué es el 'max_iterations' en un agente ReAct de LangChain?",
        "option_a": "El número máximo de tokens por respuesta",
        "option_b": "La cantidad máxima de ciclos Thought-Action-Observation antes de forzar parada",
        "option_c": "El número de herramientas disponibles",
        "option_d": "El timeout en segundos",
        "correct_option": "b",
        "is_final": False,
    },
    {
        "question_number": 5,
        "question_text": (
            "PREGUNTA FINAL — Caso de uso real:\n\n"
            "Una plataforma financiera regulada necesita un agente que revise transacciones sospechosas "
            "y genere reportes auditables. El proceso debe ser explicable a entes regulatorios.\n\n"
            "¿Usarías ReAct o Tool Calling? Justifica en una línea."
        ),
        "option_a": None,
        "option_b": None,
        "option_c": None,
        "option_d": None,
        "correct_option": None,
        "is_final": True,
    },
]


def insert_level3_questions(session_id: str) -> list[dict]:
    client = get_client()
    rows = [{**q, "session_id": session_id} for q in LEVEL3_QUESTIONS]
    result = client.table("level3_questions").insert(rows).execute()
    return result.data


def settle_level3_bets(question_id: str) -> None:
    """Liquida las apuestas de una pregunta de Nivel 3 usando transfer_tokens."""
    client = get_client()

    # Obtener todas las apuestas de la pregunta
    bets = (
        client.table("level3_bets")
        .select("*")
        .eq("question_id", question_id)
        .execute()
        .data
    )

    # Obtener respuestas para saber quién acertó
    answers = {
        a["team_id"]: a
        for a in client.table("level3_answers")
        .select("*")
        .eq("question_id", question_id)
        .execute()
        .data
    }

    for bet in bets:
        target_answer = answers.get(bet["target_team_id"])
        target_failed = target_answer and target_answer.get("is_correct") is False

        # Si el objetivo falló, el apostador gana; si acertó, pierde
        won = bool(target_failed)
        amount = bet["amount"] if won else -bet["amount"]

        client.rpc("transfer_tokens", {
            "p_team_id": bet["bettor_team_id"],
            "p_amount": amount,
            "p_reason": "level3_bet_won" if won else "level3_bet_lost",
            "p_level": "3",
            "p_ref_id": question_id,
        }).execute()

        client.table("level3_bets").update({
            "won": won,
            "settled_at": "now()",
        }).eq("id", bet["id"]).execute()
