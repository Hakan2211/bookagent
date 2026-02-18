import React, { useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { ChatMessage } from './ChatMessage'

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-5 space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
}
