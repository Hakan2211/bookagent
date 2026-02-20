import type { AIProvider, AIRequest, AIResponse, AIStreamChunk, ModelInfo, ToolDefinition } from '../types'
import { AIError } from '../types'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const

  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o'
  ) {}

  setApiKey(key: string): void {
    this.apiKey = key
  }

  setModel(model: string): void {
    this.model = model
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map(m => {
          if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
          }
          if (m.role === 'assistant' && m.toolCalls?.length) {
            return {
              role: 'assistant',
              content: m.content || null,
              tool_calls: m.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.input) }
              }))
            }
          }
          return { role: m.role, content: m.content }
        })
      ]
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' }
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t: ToolDefinition) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }))
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const error = await response.json() as { error?: { message?: string } }
        errorMessage = error.error?.message || errorMessage
      } catch { /* ignore */ }
      throw new AIError(`OpenAI API error: ${errorMessage}`, response.status)
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string | null
          tool_calls?: Array<{
            id: string
            function: { name: string; arguments: string }
          }>
        }
        finish_reason: string
      }>
      usage: { prompt_tokens: number; completion_tokens: number }
      model: string
    }

    const choice = data.choices[0]

    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls?.map(tc => {
        let input: Record<string, unknown> = {}
        try {
          input = JSON.parse(tc.function.arguments) as Record<string, unknown>
        } catch {
          console.error(`Failed to parse tool arguments for ${tc.function.name}:`, tc.function.arguments)
        }
        return { id: tc.id, name: tc.function.name, input }
      }),
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens
      },
      model: data.model,
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn'
    }
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      stream: true,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map(m => {
          if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
          }
          if (m.role === 'assistant' && m.toolCalls?.length) {
            return {
              role: 'assistant',
              content: m.content || null,
              tool_calls: m.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.input) }
              }))
            }
          }
          return { role: m.role, content: m.content }
        })
      ]
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t: ToolDefinition) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }))
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: request.signal
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const error = await response.json() as { error?: { message?: string } }
        errorMessage = error.error?.message || errorMessage
      } catch { /* ignore */ }
      throw new AIError(`OpenAI API error: ${errorMessage}`, response.status)
    }

    if (!response.body) {
      throw new AIError('OpenAI API returned empty response body', 0)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map()
    let finishReason: string | undefined

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (jsonStr === '[DONE]') continue
          if (!jsonStr) continue

          try {
            const data = JSON.parse(jsonStr) as {
              choices: Array<{
                finish_reason?: string
                delta: {
                  content?: string
                  tool_calls?: Array<{
                    index: number
                    id?: string
                    function?: { name?: string; arguments?: string }
                  }>
                }
              }>
            }

            const choice = data.choices[0]
            if (choice?.finish_reason) finishReason = choice.finish_reason
            const delta = choice?.delta
            if (delta?.content) {
              yield { type: 'text_delta', text: delta.content }
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls.has(tc.index)) {
                  toolCalls.set(tc.index, { id: tc.id || '', name: '', args: '' })
                }
                const existing = toolCalls.get(tc.index)!
                if (tc.id) existing.id = tc.id
                if (tc.function?.name) existing.name = tc.function.name
                if (tc.function?.arguments) existing.args += tc.function.arguments
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Emit completed tool calls
    for (const [, tc] of toolCalls) {
      try {
        yield {
          type: 'tool_use',
          toolCall: {
            id: tc.id,
            name: tc.name,
            input: JSON.parse(tc.args) as Record<string, unknown>
          }
        }
      } catch (e) {
        console.warn("[OpenAIProvider] Malformed tool call JSON (likely truncated by max_tokens):", (e as Error).message)
      }
    }

    const mapped = finishReason === 'length' ? 'max_tokens' as const : finishReason === 'tool_calls' ? 'tool_use' as const : finishReason === 'stop' ? 'stop' as const : 'end_turn' as const
    yield { type: 'done', finishReason: mapped }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      return response.ok
    } catch {
      return false
    }
  }

  getModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'o1',
        name: 'o1',
        contextWindow: 200000,
        supportsTools: false,
        supportsStreaming: false
      }
    ]
  }
}
