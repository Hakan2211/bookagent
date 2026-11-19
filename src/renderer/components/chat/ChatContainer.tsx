import React, { useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { QuickActions } from './QuickActions'
import { AgentStepper } from './AgentStepper'
import { AgentQuestionsCard } from './AgentQuestionsCard'
import { AgentPlanCard } from './AgentPlanCard'
import { useChatStore } from '../../stores/chatStore'
import { useTranslation } from 'react-i18next'
import { Monogram } from './Monogram'

function ChatEmptyState() {
  const { t } = useTranslation('chat')
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <Monogram size={40} />
      <p className="mt-4 font-serif text-[17px] text-[var(--text-primary)]">{t('chat:emptyTitle')}</p>
      <p className="mt-1.5 font-serif italic text-[14.5px] text-[var(--text-secondary)] max-w-[260px]">
        {t('chat:emptyBody')}
      </p>
    </div>
  )
}

export function ChatContainer() {
  const messages = useChatStore((s) => s.messages)
  const initListeners = useChatStore((s) => s.initListeners)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const agentPhase = useChatStore((s) => s.agentPhase)
  const currentQuestions = useChatStore((s) => s.currentQuestions)
  const currentPlan = useChatStore((s) => s.currentPlan)

  useEffect(() => {
    const cleanup = initListeners()
    return cleanup
  }, [initListeners])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {messages.length === 0 && !isAgentWorking && <ChatEmptyState />}
        <MessageList>
          {/* Multi-phase workflow UI elements — inside scroll area */}
          {(isAgentWorking || currentPlan) && agentPhase !== 'error' && (
            <AgentStepper phase={agentPhase} />
          )}

          {/* Clarifying questions card */}
          {currentQuestions && currentQuestions.length > 0 && agentPhase === 'questioning' && (
            <AgentQuestionsCard questions={currentQuestions} />
          )}

          {/* Plan proposal / execution card */}
          {currentPlan && (agentPhase === 'awaiting_plan' || agentPhase === 'executing' || agentPhase === 'done') && (
            <AgentPlanCard
              plan={currentPlan}
              isExecuting={agentPhase === 'executing'}
              isComplete={agentPhase === 'done' && !isAgentWorking}
            />
          )}
        </MessageList>
      </div>
      {!isAgentWorking && !currentQuestions?.length && agentPhase !== 'awaiting_plan' && <QuickActions />}
      <ChatInput />
    </div>
  )
}
