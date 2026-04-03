import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Cargar variables de entorno
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Verifica que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén en tu .env")
    exit(1)

supabase: Client = create_client(url, key)

def create_new_game_session():
    """
    Crea una nueva sesión en Supabase y devuelve los datos.
    """
    print("🚀 Creando nueva sesión de Token Wars...")
    
    try:
        # Insertamos una sesión en estado 'lobby'
        # El host_code y el id se generan automáticamente por tu SQL
        response = supabase.table("game_sessions").insert({
            "status": "lobby",
            "current_level": 0
        }).execute()

        if len(response.data) > 0:
            session = response.data[0]
            print("\n✅ SESIÓN CREADA CON ÉXITO")
            print(f"-------------------------------")
            print(f"🆔 SESSION_ID (UUID): {session['id']}")
            print(f"🔑 HOST_CODE:        {session['host_code']}")
            print(f"-------------------------------")
            print(f"\n👉 Ahora puedes ejecutar tu main.py así:")
            print(f"python main.py --session-id {session['id']} --seed-all")
        else:
            print("❌ Error: No se recibieron datos de la sesión creada.")

    except Exception as e:
        print(f"❌ Error al conectar con Supabase: {e}")

if __name__ == "__main__":
    create_new_game_session()