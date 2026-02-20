import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircleQuestion, Send } from 'lucide-react'
import type { AgentQuestion, AgentQuestionResponse } from '@shared/types'
import { useChatStore } from '../../stores/chatStore'

interface AgentQuestionsCardProps {
  questions: AgentQuestion[]
}

export function AgentQuestionsCard({ questions }: AgentQuestionsCardProps) {
  const { t } = useTranslation(['chat', 'common'])
  const submitQuestionAnswers = useChatStore((s) => s.submitQuestionAnswers)

  // Track answers for each question
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    const initial: Record<string, string | string[]> = {}
    for (const q of questions) {
      initial[q.id] = q.type === 'multi-choice' ? [] : ''
    }
    return initial
  })

  const updateAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    []
  )

  const toggleMultiChoice = useCallback(
    (questionId: string, option: string) => {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) || []
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option]
        return { ...prev, [questionId]: next }
      })
    },
    []
  )

  const handleSubmit = useCallback(() => {
    const responses: AgentQuestionResponse[] = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || ''
    }))
    submitQuestionAnswers(responses)
  }, [questions, answers, submitQuestionAnswers])

  // Check if all required questions are answered
  const canSubmit = questions.every((q) => {
    if (!q.required) return true
    const answer = answers[q.id]
    if (Array.isArray(answer)) return answer.length > 0
    return typeof answer === 'string' && answer.trim().length > 0
  })

  return (
    <div
      className="mx-5 my-4 p-5 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-xl"
      style={{
        boxShadow: 'var(--shadow-sm), var(--shadow-glow-sm)',
        animation: 'slide-up 200ms ease-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <MessageCircleQuestion size={15} className="text-[var(--text-accent)]" />
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-accent)]">
          {t('chat:clarifyingQuestions')}
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-secondary)] mb-4 leading-relaxed">
        {t('chat:clarifyingQuestionsDesc')}
      </p>

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, index) => (
          <div key={q.id} className="space-y-2">
            <label className="flex items-start gap-2 text-[14px] text-[var(--text-primary)] font-medium leading-relaxed">
              <span className="text-[var(--text-tertiary)] shrink-0 mt-0.5 tabular-nums">
                {index + 1}.
              </span>
              <span>
                {q.question}
                {q.required && (
                  <span className="text-[var(--color-error)] ml-1">*</span>
                )}
              </span>
            </label>

            {/* Text input */}
            {q.type === 'text' && (
              <textarea
                value={(answers[q.id] as string) || ''}
                onChange={(e) => updateAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || t('chat:typeYourAnswer')}
                rows={2}
                className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-[13px] resize-none outline-none focus:border-[var(--border-active)] focus:shadow-[0_0_0_2px_var(--focus-ring-soft)] placeholder:text-[var(--text-tertiary)]/60 transition-all duration-200 leading-relaxed ml-5"
              />
            )}

            {/* Single choice */}
            {q.type === 'choice' && q.options && (
              <div className="flex flex-wrap gap-2 ml-5">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer(q.id, option)}
                    className={`text-[13px] px-3.5 py-2 rounded-lg border transition-all duration-150 font-medium ${
                      answers[q.id] === option
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/50 text-[var(--text-accent)]'
                        : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Multi choice */}
            {q.type === 'multi-choice' && q.options && (
              <div className="flex flex-wrap gap-2 ml-5">
                {q.options.map((option) => {
                  const selected = ((answers[q.id] as string[]) || []).includes(option)
                  return (
                    <button
                      key={option}
                      onClick={() => toggleMultiChoice(q.id, option)}
                      className={`text-[13px] px-3.5 py-2 rounded-lg border transition-all duration-150 font-medium ${
                        selected
                          ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/50 text-[var(--text-accent)]'
                          : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {selected && <span className="mr-1.5">&#10003;</span>}
                      {option}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      <div className="flex justify-end mt-5 pt-4 border-t border-[var(--border)]/30">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 text-[13px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-110 transition-all font-medium shadow-[var(--shadow-xs)] disabled:opacity-40 disabled:hover:brightness-100"
        >
          <Send size={13} />
          {t('chat:continueWithAnswers')}
        </button>
      </div>
    </div>
  )
}
