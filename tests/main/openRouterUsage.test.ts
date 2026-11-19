import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterProvider } from '../../src/main/ai/providers/OpenRouterProvider'
import { onAIUsage } from '../../src/main/ai/usage'
import type { AIUsageEvent } from '../../src/shared/types'

function sse(lines: object[]): Response {
  const body = lines.map((l) => `data: ${JSON.stringify(l)}\n\n`).join('') + 'data: [DONE]\n\n'
  return new Response(new TextEncoder().encode(body), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe('OpenRouter usage reporting', () => {
  it('reports the real cost from the final stream chunk and requests usage', async () => {
    const fetchMock = vi.fn(async () =>
      sse([
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }] },
        { choices: [], usage: { prompt_tokens: 1200, completion_tokens: 300, cost: 0.0123 } }
      ])
    )
    vi.stubGlobal('fetch', fetchMock)
    const events: AIUsageEvent[] = []
    const off = onAIUsage((e) => events.push(e))

    const provider = new OpenRouterProvider('key', 'x-ai/grok-4.7')
    let text = ''
    for await (const chunk of provider.stream({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] })) {
      if (chunk.type === 'text_delta') text += chunk.text
    }
    off()

    expect(text).toBe('Hello')
    expect(events).toEqual([
      { model: 'x-ai/grok-4.7', inputTokens: 1200, outputTokens: 300, cost: 0.0123, estimated: false }
    ])
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.stream_options).toEqual({ include_usage: true })
    expect(sent.model).toBe('x-ai/grok-4.7')
  })

  it('estimates cost when OpenRouter omits it, and honours per-request model override', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: 'anthropic/claude-sonnet-5.5',
          choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 15_000, completion_tokens: 4_000 }
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)
    const events: AIUsageEvent[] = []
    const off = onAIUsage((e) => events.push(e))

    await new OpenRouterProvider('key', 'x-ai/grok-4.7').complete({
      model: 'anthropic/claude-sonnet-5.5',
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'hi' }]
    })
    off()

    expect(events[0].estimated).toBe(true)
    expect(events[0].cost).toBeCloseTo(0.07, 6)
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.model).toBe('anthropic/claude-sonnet-5.5')
  })
})
