import React, { useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
  children?: React.ReactNode
}

export function MessageList({ children }: MessageListProps) {
  const messages = useChatStore((s) => s.messages)
  const agentPhase = useChatStore((s) => s.agentPhase)
  const currentPlan = useChatStore((s) => s.currentPlan)
  const currentQuestions = useChatStore((s) => s.currentQuestions)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages, phase changes, or workflow cards appearing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, agentPhase, currentPlan, currentQuestions])

  if (messages.length === 0 && !children) return null

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-5 space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {children}
    </div>
  )
}
