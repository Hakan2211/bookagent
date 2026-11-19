import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, MessageCircleQuestion, Send } from 'lucide-react'
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
      className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-surface)]"
      style={{ animation: 'slide-up 200ms ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <MessageCircleQuestion size={17} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
        <h3 className="font-serif text-[19px] text-[var(--text-primary)]">{t('chat:clarifyingQuestions')}</h3>
      </div>

      <p className="font-serif italic text-[13.5px] text-[var(--text-secondary)] mb-4 leading-relaxed">
        {t('chat:clarifyingQuestionsDesc')}
      </p>

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, index) => (
          <div key={q.id} className="space-y-2">
            <label className="flex items-start gap-2 font-serif text-[15px] text-[var(--text-primary)] leading-relaxed">
              <span className="text-[var(--text-tertiary)] shrink-0 mt-0.5 tabular-nums">
                {index + 1}.
              </span>
              <span>
                {q.question}
                {q.required && (
                  <span className="text-[var(--accent-primary)] ml-1">*</span>
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
                className="w-[calc(100%-1.25rem)] ml-5 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] px-3 py-2 font-serif text-[14px] resize-none outline-none focus:border-[var(--border-active)] placeholder:text-[var(--text-tertiary)] leading-relaxed"
              />
            )}

            {/* Single choice */}
            {q.type === 'choice' && q.options && (
              <div className="flex flex-wrap gap-2 ml-5">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer(q.id, option)}
                    className={`font-serif text-[14px] px-3 py-1.5 rounded-full border transition-colors ${
                      answers[q.id] === option
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)]'
                        : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
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
                      className={`font-serif text-[14px] px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)]'
                          : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
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
      <div className="flex justify-end mt-5">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] font-serif text-[15px] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] disabled:opacity-40"
        >
          <Send size={13} />
          {t('chat:continueWithAnswers')}
        </button>
      </div>
    </div>
  )
}

interface AnsweredQuestionsCardProps {
  questions: AgentQuestion[]
  answers: AgentQuestionResponse[]
}

function formatAnswer(answer: string | string[] | undefined): string {
  if (Array.isArray(answer)) return answer.join(', ')
  return answer?.trim() ?? ''
}

/** Collapsed summary of the questions already answered this turn. */
export function AnsweredQuestionsCard({ questions, answers }: AnsweredQuestionsCardProps) {
  const { t } = useTranslation('chat')
  const [open, setOpen] = useState(false)
  const answered = questions.filter((q) =>
    formatAnswer(answers.find((a) => a.questionId === q.id)?.answer)
  ).length

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-surface)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 h-11 text-left"
      >
        <MessageCircleQuestion size={17} strokeWidth={1.5} className="text-[var(--text-secondary)] shrink-0" />
        <span className="font-serif text-[16px] text-[var(--text-primary)]">{t('chat:questions')}</span>
        <span className="w-px h-4 bg-[var(--border-strong)]" />
        <span className="flex-1 min-w-0 truncate font-serif italic text-[14px] text-[var(--text-secondary)]">
          {t('chat:questionsAnswered', { count: answered })}
          <Check size={13} className="inline ml-1.5 -mt-0.5" />
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--text-secondary)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--border)]">
          {questions.map((q, index) => {
            const answer = formatAnswer(answers.find((a) => a.questionId === q.id)?.answer)
            return (
              <li key={q.id} className="flex gap-2 font-serif text-[14px] leading-relaxed pt-2">
                <span className="text-[var(--text-tertiary)] tabular-nums shrink-0">{index + 1}.</span>
                <div className="min-w-0">
                  <p className="text-[var(--text-secondary)]">{q.question}</p>
                  <p className={answer ? 'text-[var(--text-primary)]' : 'italic text-[var(--text-tertiary)]'}>
                    {answer || t('chat:skipped')}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
