import React, { useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { QuickActions } from './QuickActions'
import { useChatStore } from '../../stores/chatStore'

export function ChatContainer() {
  const messages = useChatStore((s) => s.messages)
  const initListeners = useChatStore((s) => s.initListeners)

  useEffect(() => {
    const cleanup = initListeners()
    return cleanup
  }, [initListeners])

  return (
    <div className="h-full flex flex-col">
      {messages.length === 0 && <QuickActions />}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList />
      </div>
      <ChatInput />
    </div>
  )
}
