'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

const SUGGESTIONS = [
  'What is driving gold prices today?',
  'Are energy markets showing stress right now?',
  'How are grains trading compared to last week?',
  'Is crude oil up or down today and why?',
]

interface Message {
  role: 'user' | 'assistant'
  text: string
  symbols?: string[]
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function send(question: string) {
    if (!question.trim() || loading) return
    const userMsg: Message = { role: 'user', text: question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/v1/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const json = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: json.answer ?? json.error ?? 'No response',
        symbols: json.symbolsAnalyzed,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Failed to reach the API.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Market Analyst  <span className="text-slate-700 normal-case tracking-normal font-normal">— powered by Claude</span>
      </h2>

      {/* Suggestions (shown when empty) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-slate-900 border border-slate-800 hover:border-slate-600
                         text-slate-400 hover:text-slate-200 rounded px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.role === 'user' ? (
                <span className="inline-block bg-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm max-w-xs">
                  {m.text}
                </span>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-sm
                                text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {m.text}
                  {m.symbols && m.symbols.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {m.symbols.map(s => (
                        <span key={s} className="text-xs bg-slate-800 text-slate-500 rounded px-2 py-0.5 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-slate-600 text-sm animate-pulse">Analyzing live data…</div>
          )}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about any market, ticker, or commodity…"
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm
                     placeholder-slate-600 focus:outline-none focus:border-slate-500
                     disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium
                     disabled:opacity-40 transition-colors"
        >
          Ask
        </button>
      </form>
    </section>
  )
}
