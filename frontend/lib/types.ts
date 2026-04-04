// ============================================================
// Token Wars — Tipos globales
// ============================================================

export type SessionStatus = 'lobby' | 'level1' | 'level2' | 'level3' | 'finished'

export interface GameSession {
  id: string
  status: SessionStatus
  current_level: number
  host_code: string
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface Team {
  id: string
  session_id: string
  name: string
  token_balance: number
  display_order: number
  version: number
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  display_name: string
  device_id: string
  joined_at: string
}

export interface TokenTransaction {
  id: string
  team_id: string
  amount: number
  reason: string
  level: '1' | '2' | '3' | null
  ref_id: string | null
  created_at: string
}

// Nivel 1
export interface Level1Round {
  id: string
  session_id: string
  round_number: 1 | 2 | 3
  output_type: 'react' | 'tool_calling'
  content: string           // columna original — mantener por compatibilidad
  technical_content: string // lo que se proyecta en pantalla (trace / JSON técnico)
  target_text: string       // la frase simplificada que el alumno debe escribir
  started_at: string | null
  finished_at: string | null
}

export interface Level1Submission {
  id: string
  round_id: string
  team_id: string
  typed_text: string
  error_count: number
  finish_time_ms: number | null
  finish_position: number | null
  identified_correctly: boolean | null
  tokens_earned: number
  submitted_at: string
}

// Nivel 2
export type JokerType = 'fifty_fifty' | 'call_teacher' | 'spy'
export type AnswerOption = 'a' | 'b' | 'c' | 'd'

export interface Level2Question {
  id: string
  session_id: string
  question_number: 1 | 2 | 3
  difficulty: 'easy' | 'medium' | 'hard'
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: AnswerOption
  tokens_reward: number
  revealed_at: string | null
}

export interface Level2Answer {
  id: string
  question_id: string
  team_id: string
  selected_option: AnswerOption | null
  joker_used: JokerType | null
  joker_target_id: string | null
  tokens_spent: number
  is_locked: boolean
  is_correct: boolean | null
  tokens_earned: number
  answered_at: string | null
}

// Nivel 3
export interface Level3Question {
  id: string
  session_id: string
  question_number: number
  question_text: string
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct_option: AnswerOption | null
  is_final: boolean
  betting_ends_at: string | null
  revealed_at: string | null
}

export interface Level3Answer {
  id: string
  question_id: string
  team_id: string
  selected_option: AnswerOption | null
  open_answer: string | null
  is_locked: boolean
  is_correct: boolean | null
  answered_at: string | null
}

export interface Level3Bet {
  id: string
  question_id: string
  bettor_team_id: string
  target_team_id: string
  amount: number
  won: boolean | null
  settled_at: string | null
  created_at: string
}

export interface FinalVote {
  id: string
  question_id: string
  voter_team_id: string
  voted_team_id: string
  created_at: string
}
