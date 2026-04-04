'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Timer } from '@/components/ui/Timer'
import type { Level3Question, AnswerOption, Team } from '@/lib/types'

const G = {
  primary: '#facc15',
  dim:     '#a3a3a3',
  border:  'rgba(255,255,255,0.1)',
  bg:      '#030712',
  panel:   '#111827',
  error:   '#f87171',
  green:   '#4ade80',
}

const OPTIONS: AnswerOption[] = ['a', 'b', 'c', 'd']
const BETTING_SECONDS = 15
const ANSWER_SECONDS = 30

type Phase = 'answering' | 'betting' | 'waiting' | 'revealed' | 'voting'

interface TeamAnswer {
  team_id: string
  selected_option: AnswerOption | null
  open_answer: string | null
  is_correct: boolean | null
}

interface BetResult {
  target_team_id: string
  amount: number
  won: boolean | null
}

interface LaTraicionProps {
  question: Level3Question
  team: Team
  allTeams: Team[]
  revealed: boolean
}

export function LaTraicion({ question, team, allTeams, revealed }: LaTraicionProps) {
  const [phase, setPhase] = useState<Phase>('answering')
  const [selectedOption, setSelectedOption] = useState<AnswerOption | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [answerLocked, setAnswerLocked] = useState(false)
  const [betTarget, setBetTarget] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(50)
  const [betLocked, setBetLocked] = useState(false)
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswer[]>([])
  const [myBet, setMyBet] = useState<BetResult | null>(null)
  const [voted, setVoted] = useState(false)

  const maxBet = Math.floor(
    (question.is_final ? team.token_balance : team.token_balance * 0.5) / 50
  ) * 50

  const rivals = allTeams.filter((t) => t.id !== team.id)

  // When revealed flips, fetch all answers + own bet result
  useEffect(() => {
    if (!revealed) return

    supabase
      .from('level3_answers')
      .select('team_id, selected_option, open_answer, is_correct')
      .eq('question_id', question.id)
      .then(({ data }) => setTeamAnswers((data ?? []) as TeamAnswer[]))

    supabase
      .from('level3_bets')
      .select('target_team_id, amount, won')
      .eq('question_id', question.id)
      .eq('bettor_team_id', team.id)
      .maybeSingle()
      .then(({ data }) => setMyBet(data as BetResult | null))

    // Subscribe to bet settlement — backend settles async so won may arrive after the fetch above
    const betChannel = supabase
      .channel(`bet-result-${question.id}-${team.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'level3_bets',
        filter: `question_id=eq.${question.id}`,
      }, (payload) => {
        const row = payload.new as { bettor_team_id: string; target_team_id: string; amount: number; won: boolean }
        if (row.bettor_team_id === team.id) {
          setMyBet({ target_team_id: row.target_team_id, amount: row.amount, won: row.won })
        }
      })
      .subscribe()

    setPhase(question.is_final ? 'voting' : 'revealed')

    return () => { supabase.removeChannel(betChannel) }
  }, [revealed, question.id, question.is_final, team.id])

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
    }, { onConflict: 'question_id,team_id' })
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

  const submitVote = async (votedTeamId: string) => {
    if (voted) return
    setVoted(true)
    await supabase.from('final_votes').insert({
      question_id: question.id,
      voter_team_id: team.id,
      voted_team_id: votedTeamId,
    })
  }

  const optionText = (opt: AnswerOption) =>
    ({ a: question.option_a, b: question.option_b, c: question.option_c, d: question.option_d }[opt])

  const BetResultBanner = () => {
    if (!myBet) return null
    return (
      <div style={{
        marginTop: 8, padding: 16, borderRadius: 12, textAlign: 'center',
        fontFamily: 'monospace', fontSize: '0.875rem',
        background: myBet.won ? 'rgba(74,222,128,0.1)' : myBet.won === false ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${myBet.won ? G.green : myBet.won === false ? G.error : G.border}`,
        color: myBet.won ? G.green : myBet.won === false ? G.error : G.dim,
      }}>
        {myBet.won === null
          ? '⏳ Liquidando apuesta...'
          : myBet.won
            ? `🎉 Ganaste ${myBet.amount}T apostando contra ${allTeams.find(t => t.id === myBet.target_team_id)?.name}`
            : `💸 Perdiste ${myBet.amount}T — ${allTeams.find(t => t.id === myBet.target_team_id)?.name} acertó`
        }
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-start overflow-y-auto p-4 md:p-8"
      style={{ background: G.bg, fontFamily: "'Exo 2', sans-serif" }}>

      <div className="w-full max-w-3xl flex flex-col gap-6">

        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>{team.name}</span>
              <span style={{ color: '#60a5fa', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tu Equipo</span>
            </div>
            <div style={{ width: 1, height: 40, background: G.border }} />
            <div className="flex flex-col">
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: G.primary, fontSize: '1.1rem', fontWeight: 700 }}>{team.token_balance}</span>
              <span style={{ color: 'rgba(250,204,21,0.6)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Mis Tokens</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'answering' && <Timer seconds={ANSWER_SECONDS} onExpire={lockAnswer} />}
            {phase === 'betting' && <Timer seconds={BETTING_SECONDS} onExpire={lockBet} />}
            <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 9999, padding: '4px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.625rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Pregunta</span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", color: 'white', fontSize: '0.875rem' }}>
                {question.is_final ? 'FINAL' : `${question.question_number} / 5`}
              </span>
            </div>
          </div>
        </header>

        {/* Question box */}
        <div style={{
          width: '100%', padding: 24, borderRadius: 40, textAlign: 'center',
          background: 'linear-gradient(to bottom, #1e3a5f, #111827)',
          border: `3px solid ${G.primary}`,
          boxShadow: '0 0 30px rgba(250,204,21,0.1)',
        }}>
          {question.is_final && (
            <p style={{ color: G.error, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              ▶ PREGUNTA FINAL — RESPUESTA ABIERTA
            </p>
          )}
          <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.6 }}>{question.question_text}</p>
        </div>

        {/* ANSWERING: multiple choice */}
        {phase === 'answering' && !question.is_final && (
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.filter((o) => optionText(o)).map((opt) => (
              <button key={opt} onClick={() => !answerLocked && setSelectedOption(opt)}
                className="p-4 rounded-xl text-left text-sm font-medium transition-all"
                style={{
                  border: `2px solid ${selectedOption === opt ? G.primary : G.border}`,
                  background: selectedOption === opt ? 'rgba(250,204,21,0.1)' : G.panel,
                  color: selectedOption === opt ? G.primary : 'white',
                  cursor: answerLocked ? 'default' : 'pointer',
                }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, marginRight: 8 }}>{opt.toUpperCase()}:</span>
                {optionText(opt)}
              </button>
            ))}
          </div>
        )}

        {/* ANSWERING: open text (final question) */}
        {phase === 'answering' && question.is_final && (
          <textarea value={openAnswer} onChange={(e) => setOpenAnswer(e.target.value)}
            rows={3} placeholder="ReAct o Tool Calling — justifica en una línea..."
            style={{
              fontFamily: 'monospace', fontSize: '0.875rem', background: G.panel,
              border: `1px solid ${G.border}`, borderRadius: 12, padding: 16,
              color: 'white', resize: 'none', outline: 'none', width: '100%',
            }}
          />
        )}

        {/* Confirm answer button */}
        {phase === 'answering' && (
          <button onClick={lockAnswer}
            disabled={question.is_final ? !openAnswer.trim() : !selectedOption}
            style={{
              background: G.green, color: '#000', fontWeight: 700,
              padding: '12px 0', borderRadius: 9999, letterSpacing: '0.1em',
              opacity: (question.is_final ? !openAnswer.trim() : !selectedOption) ? 0.4 : 1,
              cursor: (question.is_final ? !openAnswer.trim() : !selectedOption) ? 'not-allowed' : 'pointer',
              border: 'none', width: '100%', fontSize: '1rem',
            }}>
            🔒 Confirmar Respuesta
          </button>
        )}

        {/* BETTING PHASE */}
        <AnimatePresence>
          {phase === 'betting' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: G.error, fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>
                😈 ¿A quién hundes?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {rivals.map((t) => (
                  <button key={t.id} onClick={() => setBetTarget(t.id)}
                    className="p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      border: `2px solid ${betTarget === t.id ? G.error : G.border}`,
                      background: betTarget === t.id ? 'rgba(248,113,113,0.1)' : G.panel,
                      color: betTarget === t.id ? G.error : 'white', textAlign: 'left', cursor: 'pointer',
                    }}>
                    {t.name}
                    <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6 }}>{t.token_balance}T</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <label style={{ color: G.dim, fontSize: '0.875rem' }}>
                  Monto:{' '}
                  <span style={{ color: 'white', fontWeight: 700 }}>{betAmount}T</span>
                  <span style={{ marginLeft: 8, color: G.dim }}>(máx {maxBet}T)</span>
                </label>
                <input type="range" min={50} max={Math.max(50, maxBet)} step={50}
                  value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="accent-red-400" style={{ width: '100%' }} />
              </div>
              <button onClick={lockBet} disabled={!betTarget || maxBet < 50}
                style={{
                  background: G.error, color: 'white', fontWeight: 700,
                  padding: '12px 0', borderRadius: 9999, border: 'none', width: '100%',
                  opacity: !betTarget ? 0.4 : 1,
                  cursor: !betTarget ? 'not-allowed' : 'pointer', fontSize: '1rem',
                }}>
                Apostar {betAmount}T contra {rivals.find((r) => r.id === betTarget)?.name ?? '—'}
              </button>
              <button onClick={() => setPhase('waiting')}
                style={{ color: G.dim, fontSize: '0.875rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                Saltar apuesta
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WAITING PHASE */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Orbitron', sans-serif", color: G.primary, fontWeight: 700, fontSize: '1.1rem' }}
            className="animate-pulse">
            ⏳ Esperando reveal del host...
          </div>
        )}

        {/* REVEALED PHASE */}
        <AnimatePresence>
          {phase === 'revealed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '8px 24px', borderBottom: `1px solid ${G.border}`, background: '#0f172a', fontFamily: 'monospace', fontSize: '0.625rem', letterSpacing: '0.3em', color: G.dim }}>
                RESUMEN RONDA
              </div>
              <div style={{ padding: 16 }} className="flex flex-col gap-3">
                {question.correct_option && (
                  <div style={{ background: 'rgba(74,222,128,0.1)', border: `1px solid ${G.green}`, borderRadius: 8, padding: '8px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: G.green }}>
                    Respuesta correcta: {question.correct_option.toUpperCase()}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {allTeams.map((t) => {
                    const ans = teamAnswers.find((a) => a.team_id === t.id)
                    const isMe = t.id === team.id
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: 12,
                        border: `1px solid ${isMe ? 'rgba(96,165,250,0.4)' : G.border}`,
                        background: isMe ? 'rgba(30,64,175,0.15)' : 'rgba(255,255,255,0.03)',
                      }}>
                        <p style={{ fontSize: '0.625rem', marginBottom: 4, color: isMe ? '#93c5fd' : G.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isMe && '▸ '}{t.name}
                        </p>
                        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color: !ans?.selected_option ? G.dim : ans.is_correct ? G.green : G.error }}>
                          {!ans?.selected_option ? '--' : `${ans.selected_option.toUpperCase()} ${ans.is_correct ? '✓' : '✗'}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <BetResultBanner />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VOTING PHASE (final question only) */}
        <AnimatePresence>
          {phase === 'voting' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              {/* All open answers */}
              <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${G.border}`, background: '#0f172a', fontFamily: 'monospace', fontSize: '0.625rem', letterSpacing: '0.3em', color: G.dim }}>
                  RESPUESTAS DE LOS EQUIPOS
                </div>
                <div style={{ padding: 12 }} className="flex flex-col gap-2">
                  {allTeams.map((t) => {
                    const ans = teamAnswers.find((a) => a.team_id === t.id)
                    const isMe = t.id === team.id
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: 8,
                        background: isMe ? 'rgba(30,64,175,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isMe ? 'rgba(96,165,250,0.4)' : G.border}`,
                      }}>
                        <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: isMe ? '#93c5fd' : G.dim }}>
                          {isMe && '▸ '}{t.name}
                        </span>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginTop: 4, fontStyle: 'italic' }}>
                          {ans?.open_answer ?? '(sin respuesta)'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!voted ? (
                <>
                  <p style={{ textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: G.primary }}>
                    ¿Quién dio la mejor justificación?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {rivals.map((t) => (
                      <button key={t.id} onClick={() => submitVote(t.id)}
                        className="transition-all hover:scale-105"
                        style={{
                          padding: 12, borderRadius: 12,
                          border: `2px solid ${G.primary}`,
                          background: 'rgba(250,204,21,0.08)', color: G.primary,
                          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                        }}>
                        Votar por {t.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: G.green }}
                  className="animate-pulse">
                  ✓ Voto enviado — esperando resultados...
                </div>
              )}

              <BetResultBanner />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
