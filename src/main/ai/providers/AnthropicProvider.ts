import type { AIProvider, AIRequest, AIResponse, AIStreamChunk, ModelInfo, ToolDefinition } from '../types'
import { AIError } from '../types'

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const

  constructor(
    private apiKey: string,
    private model: string = 'claude-sonnet-4-5-20250929'
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
      system: request.systemPrompt,
      messages: request.messages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content
      }))
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t: ToolDefinition) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      }))
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const error = await response.json() as { error?: { message?: string } }
        errorMessage = error.error?.message || errorMessage
      } catch { /* ignore parse errors */ }
      throw new AIError(`Anthropic API error: ${errorMessage}`, response.status)
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
      usage: { input_tokens: number; output_tokens: number }
      model: string
      stop_reason: string
    }

    return {
      content: data.content
        .filter(block => block.type === 'text')
        .map(block => block.text || '')
        .join('\n'),
      toolCalls: data.content
        .filter(block => block.type === 'tool_use')
        .map(block => ({
          id: block.id || '',
          name: block.name || '',
          input: (block.input || {}) as Record<string, unknown>
        })),
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      },
      model: data.model,
      finishReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn'
    }
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      system: request.systemPrompt,
      stream: true,
      messages: request.messages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content
      }))
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t: ToolDefinition) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      }))
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
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
      throw new AIError(`Anthropic API error: ${errorMessage}`, response.status)
    }

    if (!response.body) {
      throw new AIError('Anthropic API returned empty response body', 0)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentToolCall: { id: string; name: string; inputJson: string } | null = null

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
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr) as {
              type: string
              delta?: { type?: string; text?: string; partial_json?: string }
              content_block?: { type?: string; id?: string; name?: string }
            }

            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
              currentToolCall = {
                id: data.content_block.id || '',
                name: data.content_block.name || '',
                inputJson: ''
              }
            } else if (data.type === 'content_block_delta') {
              if (data.delta?.type === 'text_delta' && data.delta.text) {
                yield { type: 'text_delta', text: data.delta.text }
              } else if (data.delta?.type === 'input_json_delta' && currentToolCall) {
                currentToolCall.inputJson += data.delta.partial_json || ''
              }
            } else if (data.type === 'content_block_stop' && currentToolCall) {
              try {
                const input = JSON.parse(currentToolCall.inputJson) as Record<string, unknown>
                yield {
                  type: 'tool_use',
                  toolCall: {
                    id: currentToolCall.id,
                    name: currentToolCall.name,
                    input
                  }
                }
              } catch {
                // Malformed tool call JSON
              }
              currentToolCall = null
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done' }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      })
      return response.ok
    } catch {
      return false
    }
  }

  getModels(): ModelInfo[] {
    return [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        contextWindow: 200000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        supportsTools: true,
        supportsStreaming: true
      }
    ]
  }
}
