import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ListChecks,
  Play,
  X,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  FileText
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

  return (
    <div
      className="mx-5 my-4 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-xl overflow-hidden"
      style={{
        boxShadow: 'var(--shadow-sm), var(--shadow-glow-sm)',
        animation: 'slide-up 200ms ease-out'
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <ListChecks size={15} className="text-[var(--text-accent)]" />
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-accent)]">
            {isComplete
              ? t('chat:planComplete')
              : isExecuting
              ? t('chat:planExecuting')
              : t('chat:planProposal')}
          </div>
          {isExecuting && <Loader2 size={13} className="animate-spin text-[var(--text-accent)]" />}
          {isComplete && <Check size={13} className="text-emerald-400" />}
        </div>

        {/* Summary */}
        <p className="text-[15px] text-[var(--text-primary)] leading-relaxed font-medium">
          {plan.summary}
        </p>

        {/* Estimated scope badge */}
        {plan.estimatedScope && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-primary)]/10 text-[12px] text-[var(--text-accent)] font-medium">
            <FileText size={11} />
            {plan.estimatedScope}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="px-5">
        <button
          onClick={() => setStepsExpanded(!stepsExpanded)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors w-full py-2"
        >
          {stepsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {t('chat:planSteps', { count: plan.steps.length })}
        </button>

        {stepsExpanded && (
          <div className="space-y-1.5 pb-3">
            {plan.steps.map((step, index) => (
              <StepRow key={step.id} step={step} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Affected chapters */}
      {plan.affectedChapters.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            {plan.affectedChapters.map((ch) => (
              <span
                key={ch.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] border border-[var(--border)]/50"
              >
                <span className="font-medium">{ch.title}</span>
                <span className="text-[var(--text-tertiary)]">({ch.action})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {plan.risks && plan.risks.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <AlertTriangle size={13} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              {plan.risks.map((risk, i) => (
                <p key={i} className="text-[12px] text-[var(--color-warning)] leading-relaxed">
                  {risk}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjustment input */}
      {isAdjusting && showApproval && (
        <div className="px-5 pb-3">
          <textarea
            value={adjustmentText}
            onChange={(e) => setAdjustmentText(e.target.value)}
            placeholder={t('chat:adjustPlanPlaceholder')}
            rows={3}
            autoFocus
            className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-[13px] resize-none outline-none focus:border-[var(--border-active)] focus:shadow-[0_0_0_2px_var(--focus-ring-soft)] placeholder:text-[var(--text-tertiary)]/60 transition-all duration-200 leading-relaxed"
          />
        </div>
      )}

      {/* Approval buttons */}
      {showApproval && (
        <div className="px-5 py-4 bg-[var(--bg-elevated)]/50 border-t border-[var(--border)]/30 flex items-center gap-2.5">
          <button
            onClick={handleExecute}
            className="flex items-center gap-2 text-[13px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-110 transition-all font-medium shadow-[var(--shadow-xs)]"
          >
            <Play size={13} />
            {t('chat:executePlan')}
          </button>
          <button
            onClick={handleAdjust}
            className="flex items-center gap-2 text-[13px] px-4 py-2.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium"
          >
            <MessageSquare size={13} />
            {isAdjusting ? t('chat:submitAdjustment') : t('chat:adjustPlan')}
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-[13px] px-4 py-2.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-all font-medium ml-auto"
          >
            <X size={13} />
            {t('common:cancel')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Step Row Component ──────────────────────

function StepRow({ step, index }: { step: PlanStep; index: number }) {
  return (
    <div
      className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-colors ${
        step.status === 'in_progress'
          ? 'bg-[var(--accent-primary)]/8'
          : step.status === 'complete'
          ? 'bg-emerald-500/5'
          : ''
      }`}
    >
      {/* Step indicator */}
      <div className="shrink-0 mt-0.5">
        {step.status === 'complete' ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check size={11} className="text-emerald-400" />
          </div>
        ) : step.status === 'in_progress' ? (
          <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
            <Loader2 size={11} className="text-[var(--text-accent)] animate-spin" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tabular-nums">
              {index + 1}
            </span>
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] leading-relaxed ${
            step.status === 'complete'
              ? 'text-[var(--text-tertiary)]'
              : step.status === 'in_progress'
              ? 'text-[var(--text-primary)] font-medium'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {step.description}
        </p>
        {step.target && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{step.target}</p>
        )}
      </div>
    </div>
  )
}
