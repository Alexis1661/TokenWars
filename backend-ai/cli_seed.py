"""
Token Wars — Backend AI (Python + LangChain)
=============================================
Script principal que:
1. Genera un trace ReAct o Tool Calling usando LangChain
2. Inserta el contenido generado en `level1_rounds` de Supabase
3. Puede ejecutarse manualmente o vía API (FastAPI incluido al final)

Uso rápido:
    python main.py --session-id <UUID> --round 1 --type react
"""

import argparse
from dotenv import load_dotenv

load_dotenv()
from generators.react_generator import generate_react_challenge
from generators.tool_calling_generator import generate_tool_calling_challenge
from services.supabase_service import insert_level1_round, insert_level2_questions, insert_level3_questions


def generate_and_store_round(session_id: str, round_number: int, output_type: str) -> dict:
    """
    Genera el par (technical_content, target_text) del Nivel 1 y lo guarda en Supabase.

    Args:
        session_id:   UUID de la sesión de juego activa.
        round_number: Número de ronda (1, 2 o 3).
        output_type:  'react' | 'tool_calling'

    Returns:
        El registro insertado en level1_rounds.
    """
    print(f"[+] Generando ronda {round_number} — tipo: {output_type}")

    if output_type == "react":
        challenge = generate_react_challenge()
    elif output_type == "tool_calling":
        challenge = generate_tool_calling_challenge()
    else:
        raise ValueError(f"output_type inválido: {output_type}")

    print(f"[+] Reto generado. Insertando en Supabase...")
    display_str = str(challenge.get('display', ''))
    print(f"    display  : {display_str[:60]}...")
    print(f"    challenge: {challenge.get('challenge', 'No challenge content')}")

    record = insert_level1_round(
        session_id=session_id,
        round_number=round_number,
        output_type=output_type,
        technical_content=challenge["display"],
        target_text=challenge["challenge"],
    )

    print(f"[✓] Ronda insertada con ID: {record['id']}")
    return record


def seed_full_game(session_id: str):
    """
    Genera y sube todo el contenido de una sesión completa:
      - 3 rondas de Nivel 1 (2 de un tipo, 1 del otro)
      - 3 preguntas de Nivel 2
      - 5 preguntas de Nivel 3
    """
    print(f"\n=== Seeding sesión: {session_id} ===\n")

    # Nivel 1: alternamos react / tool_calling / react
    rounds = [
        (1, "react"),
        (2, "tool_calling"),
        (3, "react"),
    ]
    for round_num, rtype in rounds:
        generate_and_store_round(session_id, round_num, rtype)

    # Nivel 2: preguntas predefinidas (con variantes AI-enhanced opcionales)
    insert_level2_questions(session_id)
    print("[✓] Preguntas Nivel 2 insertadas.")

    # Nivel 3: preguntas predefinidas + pregunta final abierta
    insert_level3_questions(session_id)
    print("[✓] Preguntas Nivel 3 insertadas.")

    print(f"\n=== Seed completo para sesión {session_id} ===\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Token Wars AI Backend")
    parser.add_argument("--session-id", type=str, help="UUID de la sesión de Supabase")
    parser.add_argument("--round", type=int, choices=[1, 2, 3], help="Número de ronda")
    parser.add_argument("--type", type=str, choices=["react", "tool_calling"], help="Tipo de output")
    parser.add_argument("--seed-all", action="store_true", help="Genera contenido completo para la sesión")
    args = parser.parse_args()

    if not args.session_id:
        print("ERROR: Se requiere --session-id")
        raise SystemExit(1)

    if args.seed_all:
        seed_full_game(args.session_id)
    elif args.round and args.type:
        generate_and_store_round(args.session_id, args.round, args.type)
    else:
        print("Usa --seed-all o especifica --round y --type")
