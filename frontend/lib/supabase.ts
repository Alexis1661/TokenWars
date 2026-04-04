import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para el navegador (anon key — aplica RLS). Seguro en el cliente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin con service_role — SOLO para API Routes (servidor).
// Se crea bajo demanda para que el bundle del cliente nunca lo instancie.
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada')
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
}

// Alias para las API Routes existentes
export const supabaseAdmin = {
  from: (...args: Parameters<ReturnType<typeof getSupabaseAdmin>['from']>) =>
    getSupabaseAdmin().from(...args),
  rpc: (...args: Parameters<ReturnType<typeof getSupabaseAdmin>['rpc']>) =>
    getSupabaseAdmin().rpc(...args),
}

// Helper: llamar a la función transfer_tokens de PostgreSQL de forma atómica
export async function transferTokens(params: {
  teamId: string
  amount: number
  reason: string
  level: '1' | '2' | '3'
  refId?: string
}) {
  const { error } = await getSupabaseAdmin().rpc('transfer_tokens', {
    p_team_id: params.teamId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_level: params.level,
    p_ref_id: params.refId ?? null,
  })
  if (error) throw error
}
