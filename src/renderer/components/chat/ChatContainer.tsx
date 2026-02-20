import React, { useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { QuickActions } from './QuickActions'
import { AgentPhaseIndicator } from './AgentPhaseIndicator'
import { AgentQuestionsCard } from './AgentQuestionsCard'
import { AgentPlanCard } from './AgentPlanCard'
import { useChatStore } from '../../stores/chatStore'

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
      {messages.length === 0 && <QuickActions />}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList>
          {/* Multi-phase workflow UI elements — inside scroll area */}
          {isAgentWorking && agentPhase !== 'done' && agentPhase !== 'executing' && (
            <AgentPhaseIndicator phase={agentPhase} />
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
      <ChatInput />
    </div>
  )
}
