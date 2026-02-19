import type { AIProvider, AIRequest, AIResponse, AIStreamChunk, ModelInfo, ToolDefinition } from '../types'
import { AIError } from '../types'

const BASE_URL = 'https://openrouter.ai/api/v1'

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter' as const

  constructor(
    private apiKey: string,
    private model: string = 'anthropic/claude-sonnet-4.6'
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
        ...request.messages.map((m) => {
          if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
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

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://chapterforge.app',
        'X-Title': 'ChapterForge'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const error = (await response.json()) as { error?: { message?: string } }
        errorMessage = error.error?.message || errorMessage
      } catch {
        /* ignore */
      }
      throw new AIError(`OpenRouter API error: ${errorMessage}`, response.status)
    }

    const data = (await response.json()) as {
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
      toolCalls: choice.message.tool_calls?.map((tc) => {
        let input: Record<string, unknown> = {}
        try {
          input = JSON.parse(tc.function.arguments) as Record<string, unknown>
        } catch {
          console.error(
            `Failed to parse tool arguments for ${tc.function.name}:`,
            tc.function.arguments
          )
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
        ...request.messages.map((m) => {
          if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
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

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://chapterforge.app',
        'X-Title': 'ChapterForge'
      },
      body: JSON.stringify(body),
      signal: request.signal
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const error = (await response.json()) as { error?: { message?: string } }
        errorMessage = error.error?.message || errorMessage
      } catch {
        /* ignore */
      }
      throw new AIError(`OpenRouter API error: ${errorMessage}`, response.status)
    }

    if (!response.body) {
      throw new AIError('OpenRouter API returned empty response body', 0)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map()

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

            const delta = data.choices[0]?.delta
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
      } catch {
        // Malformed tool arguments
      }
    }

    yield { type: 'done' }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/models`, {
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
        id: 'anthropic/claude-sonnet-4.6',
        name: 'Claude Sonnet 4.6',
        contextWindow: 1000000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'anthropic/claude-opus-4.6',
        name: 'Claude Opus 4.6',
        contextWindow: 1000000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'openai/gpt-5.2',
        name: 'GPT-5.2',
        contextWindow: 400000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'openai/gpt-5.2-pro',
        name: 'GPT-5.2 Pro',
        contextWindow: 400000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'openai/gpt-5.2-chat',
        name: 'GPT-5.2 Chat',
        contextWindow: 128000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro Preview',
        contextWindow: 1048576,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        contextWindow: 1048576,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'deepseek/deepseek-v3.2',
        name: 'DeepSeek V3.2',
        contextWindow: 163840,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'deepseek/deepseek-v3.2-speciale',
        name: 'DeepSeek V3.2 Speciale',
        contextWindow: 163840,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'x-ai/grok-4.1-fast',
        name: 'Grok 4.1 Fast',
        contextWindow: 2000000,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'moonshotai/kimi-k2.5',
        name: 'Kimi K2.5',
        contextWindow: 262144,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'minimax/minimax-m2.5',
        name: 'MiniMax M2.5',
        contextWindow: 196608,
        supportsTools: true,
        supportsStreaming: true
      },
      {
        id: 'z-ai/glm-5',
        name: 'GLM 5',
        contextWindow: 204800,
        supportsTools: true,
        supportsStreaming: true
      }
    ]
  }
}
