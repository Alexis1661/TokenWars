"""
Token Wars — API Server (FastAPI)
==================================
Expone el motor de LangChain como una API HTTP para que el frontend
de Next.js pueda delegar la generación de contenido al backend Python.

Endpoints:
  POST /seed   — Genera las 3 rondas de Nivel 1 + preguntas L2/L3 para una sesión

Uso:
  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import json
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from generators.react_generator import generate_react_challenge
from generators.tool_calling_generator import generate_tool_calling_challenge
from services.supabase_service import (
    insert_level1_round,
    insert_level2_questions,
    insert_level3_questions,
)


# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────

app = FastAPI(
    title="Token Wars AI Backend",
    description="Motor LangChain para generación de retos educativos",
    version="1.0.0",
)

# Permitir llamadas desde el frontend de Next.js (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────

class SeedRequest(BaseModel):
    sessionId: str


class SeedResponse(BaseModel):
    ok: bool
    message: str


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

ROUND_CONFIGS = [
    {"round_number": 1, "output_type": "react"},
    {"round_number": 2, "output_type": "tool_calling"},
    {"round_number": 3, "output_type": "react"},
]


async def _generate_challenge_async(output_type: str) -> dict:
    """Ejecuta el generador de LangChain en un thread para no bloquear el event loop."""
    loop = asyncio.get_event_loop()
    if output_type == "react":
        return await loop.run_in_executor(None, generate_react_challenge)
    elif output_type == "tool_calling":
        return await loop.run_in_executor(None, generate_tool_calling_challenge)
    raise ValueError(f"output_type inválido: {output_type}")


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.get("/health")
def health():
    """Verifica que el servidor está corriendo."""
    return {"status": "ok", "service": "Token Wars AI Backend"}


@app.post("/seed", response_model=SeedResponse)
async def seed_session(body: SeedRequest):
    """
    Genera el contenido completo de una sesión usando LangChain + Groq:
    - 3 rondas de Nivel 1 (react / tool_calling / react)
    - 3 preguntas de Nivel 2
    - 5 preguntas de Nivel 3 (incluye pregunta final abierta)

    El frontend llama a este endpoint justo después de crear la sesión en Supabase.
    """
    session_id = body.sessionId

    if not session_id:
        raise HTTPException(status_code=400, detail="Falta sessionId")

    print(f"\n[API] Seeding sesión: {session_id}\n")

    try:
        # Generar las 3 rondas con LangChain en paralelo
        challenges = await asyncio.gather(*[
            _generate_challenge_async(cfg["output_type"])
            for cfg in ROUND_CONFIGS
        ])

        # Insertar rondas en Supabase
        for cfg, challenge in zip(ROUND_CONFIGS, challenges):
            print(f"[+] Insertando Ronda {cfg['round_number']} — tipo: {cfg['output_type']}")
            insert_level1_round(
                session_id=session_id,
                round_number=cfg["round_number"],
                output_type=cfg["output_type"],
                technical_content=json.dumps({
                    "trace_before": challenge.get("trace_before", ""),
                    "trace_highlight": challenge.get("trace_highlight", ""),
                    "trace_after": challenge.get("trace_after", "")
                }),
                target_text=challenge["challenge"],
            )

        # Insertar preguntas de Nivel 2 y 3
        insert_level2_questions(session_id)
        print("[✓] Preguntas Nivel 2 insertadas.")

        # Ya no sembramos Nivel 3 estático al inicio, se hará dinámico con el endpoint /nivel3/pregunta
        # insert_level3_questions(session_id)

        print(f"[✓] Seed completo para sesión {session_id}\n")
        return SeedResponse(ok=True, message="Sesión sembrada correctamente con LangChain")

    except Exception as e:
        print(f"[✗] Error al hacer seed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/nivel3/pregunta")
async def generate_l3_question(body: dict):
    """Genera una pregunta dinámica del Croupier usando LangChain."""
    from generators.croupier_generator import generate_croupier_question
    topic = body.get("topic", "langchain")
    try:
        loop = asyncio.get_event_loop()
        question = await loop.run_in_executor(None, generate_croupier_question, topic)
        return {"ok": True, "question": question}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/nivel3/cartas")
async def assign_l3_cards(body: dict):
    """
    Asigna cartas aleatoriamente a los equipos de una sesión y las envía por Supabase Realtime (si usamos cliente)
    o las retorna para que el frontend las maneje. 
    """
    import random
    from services.supabase_service import get_client
    
    session_id = body.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="Falta sessionId")
        
    client = get_client()
    
    # Obtener equipos de la sesión
    teams = client.table("teams").select("id").eq("session_id", session_id).execute().data
    
    CARDS = [
        "DOBLAR O NADA",
        "RED DE SEGURIDAD",
        "TRANSFERENCIA",
        "SEGURO CRUZADO",
        "CARTA OSCURA",
        "FAROL"
    ]
    
    team_cards = {}
    for t in teams:
        assigned = random.sample(CARDS, k=2)
        team_cards[t["id"]] = assigned
        
        # Opcional: enviar por Realtime directamente desde el backend si se desea, 
        # pero es más fácil enviarlas para que el host las mande o que los clientes las guarden.
        # Guardaremos esto retornándolo al Frontend (Host) para que el Host distribuya vía Realtime.
        
    return {"ok": True, "teamCards": team_cards}


class SettleRequest(BaseModel):
    correct_option: str
    team_bets: list[dict] # { team_id, option, bet, card }

@app.post("/nivel3/settle")
def settle_l3_tokens(body: SettleRequest):
    """Liquida la ronda del casino calculando ganancias y perdidas según la carta y apuesta."""
    from services.supabase_service import get_client
    client = get_client()
    
    correct = body.correct_option
    bets = body.team_bets
    
    # Pre-calcular apuestas para TRANSFERENCIA
    max_bet = max([b.get("bet", 0) for b in bets]) if bets else 0
    highest_bet_teams = [b["team_id"] for b in bets if b["bet"] == max_bet]
    
    # Procesar cada apuesta
    results = []
    
    for b in bets:
        tid = b.get("team_id")
        opt = b.get("option")
        bet_amount = b.get("bet", 0)
        card = b.get("card")
        
        is_correct = (opt == correct)
        tokens_earned = 0
        
        if card == "DOBLAR O NADA":
            if is_correct:
                tokens_earned = bet_amount * 2
            else:
                tokens_earned = -bet_amount
        elif card == "RED DE SEGURIDAD":
            if is_correct:
                tokens_earned = bet_amount
            else:
                tokens_earned = -int(bet_amount / 2)
        elif card == "FAROL":
            # Gana el triple si acierta
            if is_correct:
                tokens_earned = bet_amount * 3
            else:
                tokens_earned = -bet_amount
        elif card == "TRANSFERENCIA":
            # si acierta roba 100 del que más apostó
            if is_correct:
                tokens_earned = bet_amount + 100
                # Descontaremos al highest_bet_team más tarde (o simplificamos aplicándolo direct)
            else:
                tokens_earned = -bet_amount
        elif card == "SEGURO CRUZADO":
            # Requiere otro equipo, lo simplificamos a dar +150 extras si acertó
            if is_correct:
                tokens_earned = bet_amount + 150
            else:
                tokens_earned = -bet_amount
        else:
            # Apuesta normal (o CARTA OSCURA que solo daba pista antes)
            if is_correct:
                tokens_earned = bet_amount
            else:
                tokens_earned = -bet_amount

        # Ejecutar transferencia en BDD
        try:
            client.rpc("transfer_tokens", {
                "p_team_id": tid,
                "p_amount": tokens_earned,
                "p_reason": f"l3_bet_settled_{card or 'none'}",
                "p_level": "3",
                "p_ref_id": tid, # Un identificador (podemos usar el question id si se enviara)
            }).execute()
            results.append({"team_id": tid, "earned": tokens_earned})
        except Exception as e:
            print(f"Error transferring to {tid}: {e}")

    return {"ok": True, "results": results}

