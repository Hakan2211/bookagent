import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  AlertTriangle,
  Loader2,
  Check,
  FileText,
  Split,
  Type,
  PenTool,
  Pencil,
  Trash2,
  Search
} from 'lucide-react'
import type { AgentPlan, PlanStep } from '@shared/types'
import { useChatStore } from '../../stores/chatStore'

interface AgentPlanCardProps {
  plan: AgentPlan
  /** If true, the plan is in execution mode (no approval buttons, show progress) */
  isExecuting?: boolean
  /** If true, the plan has been completed */
  isComplete?: boolean
}

export function AgentPlanCard({ plan, isExecuting, isComplete }: AgentPlanCardProps) {
  const { t } = useTranslation(['chat', 'common'])
  const submitPlanDecision = useChatStore((s) => s.submitPlanDecision)
  const agentPhase = useChatStore((s) => s.agentPhase)

  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustmentText, setAdjustmentText] = useState('')
  const [stepsExpanded, setStepsExpanded] = useState(true)

  const showApproval = agentPhase === 'awaiting_plan' && !isExecuting && !isComplete

  const handleExecute = useCallback(() => {
    submitPlanDecision('execute')
  }, [submitPlanDecision])

  const handleCancel = useCallback(() => {
    submitPlanDecision('cancel')
  }, [submitPlanDecision])

  const handleAdjust = useCallback(() => {
    if (isAdjusting && adjustmentText.trim()) {
      submitPlanDecision('adjust', adjustmentText.trim())
      setIsAdjusting(false)
      setAdjustmentText('')
    } else {
      setIsAdjusting(!isAdjusting)
    }
  }, [isAdjusting, adjustmentText, submitPlanDecision])

  const touches = plan.affectedChapters.map((c) => c.title).join(', ')

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-surface)] overflow-hidden"
      style={{ animation: 'slide-up 200ms ease-out' }}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-serif text-[24px] leading-none text-[var(--text-primary)]">
            {isComplete ? t('chat:planComplete') : isExecuting ? t('chat:planExecuting') : t('chat:planTitle')}
          </h3>
          <span className="font-serif italic text-[14px] text-[var(--text-secondary)]">
            · {t('chat:planSteps', { count: plan.steps.length })}
          </span>
          {isExecuting && <Loader2 size={13} className="ml-auto animate-spin text-[var(--accent-primary)]" />}
          {isComplete && <Check size={14} className="ml-auto text-[var(--color-success)]" />}
        </div>
        {plan.summary && (
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-[var(--text-secondary)]">{plan.summary}</p>
        )}
      </div>

      {/* Steps */}
      <div className="px-3 pb-2 space-y-1.5">
        {plan.steps.map((step, index) => (
          <StepRow key={step.id} step={step} index={index} />
        ))}
      </div>

      {/* Risks */}
      {plan.risks && plan.risks.length > 0 && (
        <div className="mx-4 mb-2 flex items-start gap-2 text-[12.5px] text-[var(--color-warning)]">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {plan.risks.map((risk, i) => (
              <p key={i}>{risk}</p>
            ))}
          </div>
        </div>
      )}

      {(touches || plan.estimatedScope) && (
        <p className="px-4 pb-3 font-serif text-[13px] text-[var(--text-tertiary)]">
          {touches ? t('chat:touches', { list: touches }) : plan.estimatedScope}
        </p>
      )}

      {/* Adjustment input */}
      {isAdjusting && showApproval && (
        <div className="px-4 pb-3">
          <textarea
            value={adjustmentText}
            onChange={(e) => setAdjustmentText(e.target.value)}
            placeholder={t('chat:adjustPlanPlaceholder')}
            rows={3}
            autoFocus
            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded-[var(--radius-md)] px-3 py-2 font-serif text-[14px] resize-none outline-none focus:border-[var(--border-active)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      )}

      {/* Approval */}
      {showApproval && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
          <button
            onClick={handleAdjust}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] font-serif text-[15px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {isAdjusting ? t('chat:submitAdjustment') : t('chat:adjustPlan')}
          </button>
          <button
            onClick={handleExecute}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] font-serif text-[15px] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
          >
            {t('chat:runPlan')}
          </button>
          <button
            onClick={handleCancel}
            className="col-span-2 -mt-0.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--color-error)]"
          >
            {t('common:cancel')}
          </button>
        </div>
      )}
    </div>
  )
}

function iconForTool(tool: string) {
  const t = tool.toLowerCase()
  if (t.includes('split')) return Split
  if (t.includes('rename')) return Type
  if (t.includes('outline') || t.includes('note') || t.includes('summary')) return FileText
  if (t.includes('create') || t.includes('write') || t.includes('draft') || t.includes('add')) return PenTool
  if (t.includes('delete') || t.includes('remove')) return Trash2
  if (t.includes('read') || t.includes('search') || t.includes('analy')) return Search
  return Pencil
}

// ─── Step Row Component ──────────────────────

function StepRow({ step, index }: { step: PlanStep; index: number }) {
  const Icon = iconForTool(step.tool || '')
  const status = step.status
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 ${
        status === 'in_progress' ? 'bg-[var(--accent-tint)]' : 'bg-[var(--bg-hover)]'
      } ${status === 'complete' || status === 'skipped' ? 'opacity-60' : ''}`}
    >
      <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-active)] font-serif text-[13px] text-[var(--text-primary)]">
        {status === 'complete' ? (
          <Check size={13} className="text-[var(--color-success)]" />
        ) : status === 'in_progress' ? (
          <Loader2 size={13} className="animate-spin text-[var(--accent-primary)]" />
        ) : (
          index + 1
        )}
      </div>
      <Icon size={17} strokeWidth={1.4} className="shrink-0 text-[var(--text-secondary)]" />
      <div className="w-px self-stretch bg-[var(--border-strong)]" />
      <div className="min-w-0 flex-1">
        <p className={`font-serif text-[14.5px] leading-snug ${status === 'skipped' ? 'line-through' : ''} text-[var(--text-primary)]`}>
          {step.description}
        </p>
        {step.target && <p className="text-[11.5px] text-[var(--text-tertiary)] truncate">{step.target}</p>}
      </div>
    </div>
  )
}
