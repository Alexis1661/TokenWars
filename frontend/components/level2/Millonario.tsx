'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Level2Question, AnswerOption, JokerType, Team } from '@/lib/types'

const JOKERS: { type: JokerType; label: string; cost: number; icon: string }[] = [
  { type: 'fifty_fifty', label: '50/50', cost: 80, icon: '👥' },
  { type: 'call_teacher', label: 'Llamar al Profe', cost: 120, icon: '📞' },
  { type: 'spy', label: 'Espía', cost: 150, icon: '👁️' },
]

const OPTIONS: AnswerOption[] = ['a', 'b', 'c', 'd']

interface MillonarioProps {
  question: Level2Question
  team: Team
  allTeams: Team[]
  revealed: boolean
  correctAnswers: Record<string, AnswerOption | null> // teamId -> option (solo visible post-reveal)
}

export function Millonario({ question, team, allTeams, revealed, correctAnswers }: MillonarioProps) {
  const [selected, setSelected] = useState<AnswerOption | null>(null)
  const [locked, setLocked] = useState(false)
  const [jokerUsed, setJokerUsed] = useState<JokerType | null>(null)
  const [spyTarget, setSpyTarget] = useState<string | null>(null)
  const [eliminatedOptions, setEliminatedOptions] = useState<AnswerOption[]>([])
  const [spiedAnswer, setSpiedAnswer] = useState<AnswerOption | null>(null)
  const [tokensSpent, setTokensSpent] = useState(0)

  const optionText = (opt: AnswerOption) =>
    ({ a: question.option_a, b: question.option_b, c: question.option_c, d: question.option_d }[opt])

  const handleJoker = async (joker: JokerType) => {
    if (jokerUsed || locked) return
    const jokerDef = JOKERS.find((j) => j.type === joker)!
    if (team.token_balance < jokerDef.cost) {
      alert('Tokens insuficientes')
      return
    }
    if (joker === 'fifty_fifty') {
      const incorrect = OPTIONS.filter((o) => o !== question.correct_option)
      const toEliminate = incorrect.sort(() => Math.random() - 0.5).slice(0, 2)
      setEliminatedOptions(toEliminate)
    }
    setJokerUsed(joker)
    setTokensSpent(jokerDef.cost)
  }

  const handleLock = async () => {
    if (!selected || locked) return
    setLocked(true)

    await supabase.from('level2_answers').upsert({
      question_id: question.id,
      team_id: team.id,
      selected_option: selected,
      joker_used: jokerUsed,
      joker_target_id: spyTarget,
      tokens_spent: tokensSpent,
      is_locked: true,
      answered_at: new Date().toISOString(),
    })
  }

  const difficultyColor = { easy: 'text-green-400', medium: 'text-yellow-400', hard: 'text-red-400' }[question.difficulty]

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Pregunta {question.question_number}/3</h2>
        <span className={`font-bold uppercase text-sm ${difficultyColor}`}>{question.difficulty}</span>
      </div>

      {/* Pregunta */}
      <div className="bg-gray-800 border border-white/10 rounded-xl p-5 text-white text-lg font-medium">
        {question.question_text}
      </div>

      {/* Opciones */}
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const isEliminated = eliminatedOptions.includes(opt)
          const isSelected = selected === opt
          const isCorrect = revealed && opt === question.correct_option
          const isWrong = revealed && isSelected && opt !== question.correct_option

          return (
            <motion.button
              key={opt}
              whileTap={!locked && !isEliminated ? { scale: 0.97 } : {}}
              onClick={() => !locked && !isEliminated && !revealed && setSelected(opt)}
              disabled={locked || isEliminated || revealed}
              className={`
                p-4 rounded-xl border text-left font-medium transition-all text-sm
                ${isEliminated ? 'opacity-20 cursor-not-allowed border-white/5 bg-white/5 text-gray-500' : ''}
                ${!isEliminated && !revealed && !isSelected ? 'border-white/20 bg-white/5 text-white hover:bg-white/10' : ''}
                ${isSelected && !revealed ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : ''}
                ${isCorrect ? 'border-green-400 bg-green-400/20 text-green-400' : ''}
                ${isWrong ? 'border-red-400 bg-red-400/20 text-red-400' : ''}
              `}
            >
              <span className="font-bold uppercase mr-2">{opt})</span>
              {optionText(opt)}
            </motion.button>
          )
        })}
      </div>

      {/* Comodines */}
      {!locked && !revealed && (
        <div className="flex gap-3 flex-wrap">
          {JOKERS.map((j) => (
            <button
              key={j.type}
              onClick={() => handleJoker(j.type)}
              disabled={!!jokerUsed || team.token_balance < j.cost}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all
                ${jokerUsed === j.type ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : ''}
                ${!jokerUsed && team.token_balance >= j.cost ? 'border-white/20 bg-white/5 text-white hover:bg-white/10' : ''}
                ${!jokerUsed && team.token_balance < j.cost ? 'opacity-40 cursor-not-allowed border-white/10 bg-white/5 text-gray-500' : ''}
              `}
            >
              {j.icon} {j.label} ({j.cost}T)
            </button>
          ))}
        </div>
      )}

      {/* Botón de confirmar */}
      {!locked && !revealed && (
        <button
          onClick={handleLock}
          disabled={!selected}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-all"
        >
          🔒 Confirmar Respuesta
        </button>
      )}

      {locked && !revealed && (
        <div className="text-center text-green-400 font-bold text-lg py-2">
          Respuesta bloqueada. Esperando el reveal...
        </div>
      )}

      {/* Reveal: mostrar respuestas de todos los equipos */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-4 border border-white/10"
          >
            <h3 className="text-white font-bold mb-3">Respuestas del salón:</h3>
            <div className="space-y-2">
              {allTeams.map((t) => {
                const ans = correctAnswers[t.id]
                const correct = ans === question.correct_option
                return (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{t.name}</span>
                    <span className={correct ? 'text-green-400 font-bold' : 'text-red-400'}>
                      {ans ? `${ans.toUpperCase()} — ${correct ? '✅' : '❌'}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
