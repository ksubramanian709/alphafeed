'use client'
import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

const SUGGESTIONS = [
  'What is the yield curve telling us right now?',
  'Is the S&P 500 in a bull or bear trend?',
  'Explain how rising rates affect tech stocks',
  'What is the VIX and what does it mean today?',
  'How does gold perform during recessions?',
  'Compare Bitcoin vs gold as inflation hedges',
  'What sectors do well when oil prices rise?',
  'Explain P/E ratio and when it matters',
]

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

interface Message {
  role: 'user' | 'assistant'
  text: string
  symbols?: string[]
}

// Very lightweight markdown: bold, inline code, bullet lists, line breaks
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bullet point
    if (/^[-•*]\s/.test(line)) {
      return (
        <div key={i} className="flex gap-2 mt-0.5">
          <span className="text-slate-500 shrink-0">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      )
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1]
      return (
        <div key={i} className="flex gap-2 mt-0.5">
          <span className="text-slate-500 shrink-0 w-4 text-right">{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      )
    }
    // Heading (##)
    if (/^#{1,3}\s/.test(line)) {
      return <div key={i} className="font-semibold text-slate-100 mt-2 mb-0.5">{inlineFormat(line.replace(/^#+\s/, ''))}</div>
    }
    // Empty line → spacer
    if (!line.trim()) return <div key={i} className="h-1.5" />
    // Normal line
    return <div key={i}>{inlineFormat(line)}</div>
  })
}

function inlineFormat(text: string) {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="text-xs bg-slate-800 text-slate-300 px-1 py-0.5 rounded font-mono">{part.slice(1, -1)}</code>
    return part
  })
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function buildHistory(): Turn[] {
    return messages.map(m => ({ role: m.role, content: m.text }))
  }

  async function send(question: string) {
    const q = question.trim()
    if (!q || loading) return

    const userMsg: Message = { role: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Resize textarea back to single line
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const res = await fetch(`${API}/v1/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: buildHistory(),
        }),
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
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-grow textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const showSuggestions = messages.length === 0

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Market Assistant
          <span className="text-slate-700 normal-case tracking-normal font-normal ml-2">— powered by Claude</span>
        </h2>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-slate-900 border border-slate-800 hover:border-slate-600
                         text-slate-400 hover:text-slate-200 rounded-full px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-[520px] overflow-y-auto pr-1 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              {m.role === 'user' ? (
                <div className="bg-slate-700 text-slate-200 rounded-2xl rounded-tr-sm px-4 py-2.5
                                text-sm max-w-sm leading-relaxed">
                  {m.text}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm
                                px-4 py-3 text-sm text-slate-300 leading-relaxed max-w-2xl">
                  <div className="space-y-0.5">{renderMarkdown(m.text)}</div>
                  {m.symbols && m.symbols.filter(s => !['^GSPC','^IXIC','^DJI','^VIX','^TNX','GC=F','CL=F','DX-Y.NYB'].includes(s)).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800 flex gap-1 flex-wrap">
                      {m.symbols
                        .filter(s => !['^GSPC','^IXIC','^DJI','^VIX','^TNX','GC=F','CL=F','DX-Y.NYB'].includes(s))
                        .map(s => (
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
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about markets — stocks, rates, commodities, macro, strategy…"
          disabled={loading}
          rows={1}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
                     placeholder-slate-600 focus:outline-none focus:border-slate-500
                     disabled:opacity-40 resize-none leading-relaxed"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium
                     disabled:opacity-40 transition-colors shrink-0"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>
      <p className="text-xs text-slate-700 mt-1.5">Shift+Enter for new line · Enter to send</p>
    </section>
  )
}
