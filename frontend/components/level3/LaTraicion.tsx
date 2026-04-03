'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Timer } from '@/components/ui/Timer'
import type { Level3Question, AnswerOption, Team } from '@/lib/types'

interface LaTraicionProps {
  question: Level3Question
  team: Team
  allTeams: Team[]
  revealed: boolean
}

const OPTIONS: AnswerOption[] = ['a', 'b', 'c', 'd']
const BETTING_SECONDS = 15
const ANSWER_SECONDS = 30

type Phase = 'answering' | 'betting' | 'waiting' | 'revealed'

export function LaTraicion({ question, team, allTeams, revealed }: LaTraicionProps) {
  const [phase, setPhase] = useState<Phase>('answering')
  const [selectedOption, setSelectedOption] = useState<AnswerOption | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [answerLocked, setAnswerLocked] = useState(false)
  const [betTarget, setBetTarget] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(50)
  const [betLocked, setBetLocked] = useState(false)

  const maxBet = Math.floor(
    (question.is_final ? team.token_balance : team.token_balance * 0.5) / 50
  ) * 50

  const rivals = allTeams.filter((t) => t.id !== team.id)

  const lockAnswer = async () => {
    if (answerLocked) return
    setAnswerLocked(true)

    await supabase.from('level3_answers').upsert({
      question_id: question.id,
      team_id: team.id,
      selected_option: question.is_final ? null : selectedOption,
      open_answer: question.is_final ? openAnswer : null,
      is_locked: true,
      answered_at: new Date().toISOString(),
    })

    setPhase('betting')
  }

  const lockBet = async () => {
    if (betLocked || !betTarget || betAmount < 50) return
    setBetLocked(true)

    await supabase.from('level3_bets').insert({
      question_id: question.id,
      bettor_team_id: team.id,
      target_team_id: betTarget,
      amount: betAmount,
    })

    setPhase('waiting')
  }

  const optionText = (opt: AnswerOption) =>
    ({ a: question.option_a, b: question.option_b, c: question.option_c, d: question.option_d }[opt])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">
          🗡️ {question.is_final ? 'Pregunta Final' : `Ronda ${question.question_number}`}
        </h2>
        {phase === 'answering' && (
          <Timer seconds={ANSWER_SECONDS} onExpire={lockAnswer} />
        )}
        {phase === 'betting' && (
          <Timer seconds={BETTING_SECONDS} onExpire={lockBet} />
        )}
      </div>

      {/* Pregunta */}
      <div className="bg-gray-800 border border-white/10 rounded-xl p-5 text-white text-lg font-medium">
        {question.question_text}
      </div>

      {/* FASE: RESPONDIENDO */}
      {phase === 'answering' && !question.is_final && (
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.filter((o) => optionText(o)).map((opt) => (
            <button
              key={opt}
              onClick={() => !answerLocked && setSelectedOption(opt)}
              className={`p-4 rounded-xl border text-left font-medium text-sm transition-all
                ${selectedOption === opt
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                  : 'border-white/20 bg-white/5 text-white hover:bg-white/10'}
              `}
            >
              <span className="font-bold uppercase mr-2">{opt})</span>
              {optionText(opt)}
            </button>
          ))}
        </div>
      )}

      {phase === 'answering' && question.is_final && (
        <textarea
          value={openAnswer}
          onChange={(e) => setOpenAnswer(e.target.value)}
          rows={3}
          placeholder="Escribe tu justificación en una línea..."
          className="font-mono text-sm bg-gray-800 border border-white/20 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-yellow-400"
        />
      )}

      {phase === 'answering' && (
        <button
          onClick={lockAnswer}
          disabled={!question.is_final ? !selectedOption : !openAnswer.trim()}
          className="bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-all"
        >
          🔒 Confirmar Respuesta
        </button>
      )}

      {/* FASE: APUESTA */}
      <AnimatePresence>
        {phase === 'betting' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-red-400 font-bold text-lg text-center">
              😈 ¿A quién hundes? — {BETTING_SECONDS}s
            </h3>

            {/* Selector de rival */}
            <div className="grid grid-cols-2 gap-3">
              {rivals.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBetTarget(t.id)}
                  className={`p-3 rounded-xl border text-sm font-semibold transition-all
                    ${betTarget === t.id
                      ? 'border-red-400 bg-red-400/10 text-red-400'
                      : 'border-white/20 bg-white/5 text-white hover:bg-white/10'}
                  `}
                >
                  {t.name}
                  <span className="block text-xs opacity-60">{t.token_balance}T</span>
                </button>
              ))}
            </div>

            {/* Monto de apuesta */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-400 text-sm">
                Monto: <span className="text-white font-bold">{betAmount}T</span>
                <span className="ml-2 text-gray-500">(máx {maxBet}T)</span>
              </label>
              <input
                type="range"
                min={50}
                max={maxBet}
                step={50}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="accent-red-400"
              />
            </div>

            <button
              onClick={lockBet}
              disabled={!betTarget}
              className="bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
            >
              🗡️ Apostar {betAmount}T contra {rivals.find((r) => r.id === betTarget)?.name ?? '—'}
            </button>

            <button
              onClick={() => setPhase('waiting')}
              className="text-gray-400 text-sm underline text-center"
            >
              Saltar apuesta
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'waiting' && !revealed && (
        <div className="text-center text-yellow-400 font-bold text-lg py-4 animate-pulse">
          ⏳ Esperando el reveal del host...
        </div>
      )}

      {/* REVEAL */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-4 border border-white/10 text-center"
          >
            <p className="text-white font-bold text-xl mb-1">¡Reveal!</p>
            {!question.is_final && question.correct_option && (
              <p className="text-green-400 font-mono font-bold text-2xl">
                ✅ Respuesta correcta: {question.correct_option.toUpperCase()}
              </p>
            )}
            {question.is_final && (
              <p className="text-yellow-400">El salón vota la mejor justificación...</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
