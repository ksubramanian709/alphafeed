'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

const API    = process.env.NEXT_PUBLIC_API_URL ?? ''
const WS_URL = API.replace(/^http/, 'ws') + '/v1/stream/quotes'

const DEFAULT_SYMBOLS = ['AAPL', '^GSPC', '^VIX', 'GC=F', 'CL=F']

interface LiveQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  currency: string
  assetType: string
  source: string
  timestamp: string
  stale?: boolean
}

function priceClass(change: number) {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

function fmt(n: number) { return n.toFixed(2) }

export default function Watchlist() {
  const [quotes, setQuotes]   = useState<Record<string, LiveQuote>>({})
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS)
  const [input, setInput]     = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const subscribe = useCallback((syms: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ action: 'subscribe', symbols: syms }))
  }, [])

  const unsubscribe = useCallback((syms: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: syms }))
  }, [])

  // Connect WebSocket
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        // Subscribe to all current symbols on (re)connect
        ws.send(JSON.stringify({ action: 'subscribe', symbols }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'quote') {
            setQuotes(prev => ({
              ...prev,
              [msg.symbol]: { ...msg, stale: false },
            }))
          }
        } catch { /* ignore malformed */ }
      }

      ws.onclose = () => {
        setConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
    // symbols intentionally excluded — handled by subscribe() separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When symbols list changes, update subscription
  const prevSymbols = useRef<string[]>(DEFAULT_SYMBOLS)
  useEffect(() => {
    const added   = symbols.filter(s => !prevSymbols.current.includes(s))
    const removed = prevSymbols.current.filter(s => !symbols.includes(s))
    if (added.length)   subscribe(added)
    if (removed.length) unsubscribe(removed)
    prevSymbols.current = symbols
  }, [symbols, subscribe, unsubscribe])

  function addSymbol(e: React.FormEvent) {
    e.preventDefault()
    const sym = input.trim().toUpperCase()
    if (!sym || symbols.includes(sym)) { setInput(''); return }
    setSymbols(prev => [...prev, sym])
    setInput('')
  }

  function removeSymbol(sym: string) {
    setSymbols(prev => prev.filter(s => s !== sym))
    setQuotes(prev => { const next = { ...prev }; delete next[sym]; return next })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Watchlist
        </h2>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-700">{connected ? 'live' : 'connecting…'}</span>
        </div>
      </div>

      {/* Add symbol form */}
      <form onSubmit={addSymbol} className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add symbol  (e.g. TSLA, BTC-USD, ^DJI)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm
                     placeholder-slate-600 focus:outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
        >
          Add
        </button>
      </form>

      {/* Quote rows */}
      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
        {symbols.map(sym => {
          const q = quotes[sym]
          const cls = q ? priceClass(q.change) : 'text-slate-600'
          const sign = q && q.change >= 0 ? '+' : ''

          return (
            <div key={sym} className="flex items-center gap-3 px-3 py-2.5 bg-slate-900 hover:bg-slate-800/50 group">
              {/* Symbol */}
              <span className="font-mono text-sm font-semibold text-slate-200 w-20 shrink-0 truncate">
                {sym}
              </span>

              {/* Name */}
              <span className="text-xs text-slate-500 flex-1 truncate hidden sm:block">
                {q?.name ?? '—'}
              </span>

              {/* Price */}
              <span className={`font-mono text-sm font-bold ${cls} w-20 text-right shrink-0`}>
                {q ? fmt(q.price) : <span className="text-slate-700 animate-pulse">…</span>}
              </span>

              {/* Change */}
              <div className={`font-mono text-xs w-20 text-right shrink-0 ${cls}`}>
                {q ? (
                  <>
                    <div>{sign}{fmt(q.change)}</div>
                    <div className="text-slate-600">{sign}{fmt(q.changePercent)}%</div>
                  </>
                ) : null}
              </div>

              {/* High / Low */}
              <div className="hidden md:block text-xs text-slate-600 font-mono w-24 text-right shrink-0">
                {q ? (
                  <>
                    <div>H {fmt(q.high)}</div>
                    <div>L {fmt(q.low)}</div>
                  </>
                ) : null}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeSymbol(sym)}
                className="text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-1 shrink-0"
                aria-label={`Remove ${sym}`}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {symbols.length === 0 && (
        <div className="text-center text-slate-700 text-sm py-8 border border-slate-800 rounded-lg">
          Add a symbol to start watching
        </div>
      )}
    </section>
  )
}
