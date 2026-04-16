'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchTickers, type Ticker } from '../lib/tickers'

const API    = process.env.NEXT_PUBLIC_API_URL ?? ''
const WS_URL = API.replace(/^http/, 'ws') + '/v1/stream/quotes'

const DEFAULT_SYMBOLS  = ['AAPL', '^GSPC', '^VIX', 'GC=F', 'CL=F']
const STORAGE_KEY      = 'alphafeed-watchlist'

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
}

interface TickerBriefing {
  symbol: string
  name: string | null
  price: number
  changePercent: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  summary: string
  keyPoints: string[]
}

interface BriefingResponse {
  briefings: TickerBriefing[]
  generatedAt: string
  error?: string
}

function fmt(n: number) { return n.toFixed(2) }

function loadSavedSymbols(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SYMBOLS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_SYMBOLS
}

export default function Watchlist() {
  const [quotes, setQuotes]       = useState<Record<string, LiveQuote>>({})
  const [symbols, setSymbols]     = useState<string[]>(DEFAULT_SYMBOLS)
  const [input, setInput]         = useState('')
  const [suggestions, setSuggestions] = useState<Ticker[]>([])
  const [showDrop, setShowDrop]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [connected, setConnected] = useState(false)
  const [briefing, setBriefing]   = useState<BriefingResponse | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const wsRef      = useRef<WebSocket | null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const hydrated   = useRef(false)
  const dragIdx    = useRef<number | null>(null)

  // Hydrate from localStorage on first mount (client-only)
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      const syms = loadSavedSymbols()
      setSymbols(syms)
      // REST seed — populate quotes immediately without waiting for WebSocket
      syms.forEach(sym => {
        fetch(`${API}/v1/quote/${encodeURIComponent(sym)}`)
          .then(r => r.json())
          .then(j => { if (j?.data && !j.data.error) setQuotes(prev => ({ ...prev, [sym]: j.data })) })
          .catch(() => {})
      })
    }
  }, [])

  // Persist to localStorage whenever symbols change (after hydration)
  useEffect(() => {
    if (hydrated.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
    }
  }, [symbols])

  // Fuzzy search
  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); setShowDrop(false); return }
    const results = searchTickers(input)
    setSuggestions(results)
    setShowDrop(results.length > 0)
    setActiveIdx(-1)
  }, [input])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropRef.current?.contains(e.target as Node)) return
      setShowDrop(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // WebSocket
  const subscribe = useCallback((syms: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ action: 'subscribe', symbols: syms }))
  }, [])

  const unsubscribe = useCallback((syms: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: syms }))
  }, [])

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify({ action: 'subscribe', symbols }))
      }
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'quote') {
            setQuotes(prev => ({ ...prev, [msg.symbol]: msg }))
          }
        } catch { /* ignore */ }
      }
      ws.onclose = () => {
        setConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevSymbols = useRef<string[]>(DEFAULT_SYMBOLS)
  useEffect(() => {
    const added   = symbols.filter(s => !prevSymbols.current.includes(s))
    const removed = prevSymbols.current.filter(s => !symbols.includes(s))
    if (added.length)   subscribe(added)
    if (removed.length) unsubscribe(removed)
    prevSymbols.current = symbols
  }, [symbols, subscribe, unsubscribe])

  // Add / remove
  function pickSymbol(sym: string) {
    if (!sym || symbols.includes(sym)) { setInput(''); setShowDrop(false); return }
    setSymbols(prev => [...prev, sym])
    setInput('')
    setShowDrop(false)
    setSuggestions([])
    // REST seed for the new symbol
    fetch(`${API}/v1/quote/${encodeURIComponent(sym)}`)
      .then(r => r.json())
      .then(j => { if (j?.data && !j.data.error) setQuotes(prev => ({ ...prev, [sym]: j.data })) })
      .catch(() => {})
  }

  function removeSymbol(sym: string) {
    setSymbols(prev => prev.filter(s => s !== sym))
    setQuotes(prev => { const n = { ...prev }; delete n[sym]; return n })
    setBriefing(prev => prev
      ? { ...prev, briefings: prev.briefings.filter(b => b.symbol !== sym) }
      : null
    )
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pickSymbol(suggestions[activeIdx >= 0 ? activeIdx : 0].symbol) }
    else if (e.key === 'Escape') setShowDrop(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showDrop && suggestions.length > 0) {
      pickSymbol(suggestions[activeIdx >= 0 ? activeIdx : 0].symbol)
    } else if (input.trim()) {
      pickSymbol(input.trim().toUpperCase())
    }
  }

  function onDragStart(idx: number) {
    dragIdx.current = idx
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      setDragOverIdx(idx)
    }
  }

  function onDrop(idx: number) {
    const from = dragIdx.current
    if (from === null || from === idx) { reset(); return }
    setSymbols(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(idx, 0, item)
      return next
    })
    reset()
  }

  function reset() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  async function fetchBriefing() {
    if (symbols.length === 0 || briefingLoading) return
    setBriefingLoading(true)
    try {
      const res  = await fetch(`${API}/v1/agent/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      })
      const data: BriefingResponse = await res.json()
      setBriefing(data)
    } catch {
      setBriefing({ briefings: [], generatedAt: '', error: 'Failed to reach the API.' })
    } finally {
      setBriefingLoading(false)
    }
  }

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Watchlist
        </h2>
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-600">{connected ? 'live' : 'connecting…'}</span>
        </div>
      </div>

      {/* Add symbol input */}
      <div className="relative mb-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowDrop(true) }}
            onFocus={() => { if (suggestions.length > 0) setShowDrop(true) }}
            onKeyDown={onKeyDown}
            placeholder="Add stock, ETF, crypto, futures…"
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

        {showDrop && suggestions.length > 0 && (
          <div
            ref={dropRef}
            className="absolute z-30 w-full mt-1 bg-slate-900 border border-slate-700
                       rounded-lg shadow-2xl overflow-hidden"
          >
            {suggestions.map((r, i) => (
              <div
                key={r.symbol + i}
                onMouseDown={e => { e.preventDefault(); pickSymbol(r.symbol) }}
                className={`px-3 py-2 cursor-pointer flex items-center gap-3
                            border-b border-slate-800 last:border-0 select-none
                            ${i === activeIdx ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
              >
                <span className="font-mono text-sm font-bold text-slate-100 w-24 shrink-0">{r.symbol}</span>
                <span className="text-xs text-slate-400 flex-1 truncate">{r.name}</span>
                <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{r.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist rows */}
      {symbols.length === 0 ? (
        <div className="text-center text-slate-700 text-sm py-10 border border-slate-800 rounded-lg">
          Add a symbol to start watching
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          {symbols.map((sym, idx) => {
            const q    = quotes[sym]
            const up   = q && q.change > 0
            const dn   = q && q.change < 0
            const sign = q && q.change >= 0 ? '+' : ''

            const priceColor = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
            const badgeBg    = up ? 'bg-green-500/10 border-green-900/40 text-green-400' : dn ? 'bg-red-500/10 border-red-900/40 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            const isOver     = dragOverIdx === idx
            const isDragging = dragIdx.current === idx

            return (
              <div
                key={sym}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={reset}
                className={`flex items-center gap-2 px-3 py-2.5
                            transition-colors group border-b border-slate-800/50 last:border-0
                            ${isDragging ? 'opacity-40' : 'opacity-100'}
                            ${isOver
                              ? 'border-t-2 border-t-emerald-500/60 bg-slate-800/60'
                              : 'bg-slate-900 hover:bg-slate-800/60'
                            }`}
              >
                {/* Drag handle */}
                <div
                  className="flex flex-col gap-[3px] items-center justify-center cursor-grab active:cursor-grabbing
                             text-slate-600 hover:text-slate-400 transition-colors shrink-0 select-none px-0.5"
                  title="Drag to reorder"
                >
                  <span className="w-2.5 h-0.5 bg-current rounded-full" />
                  <span className="w-2.5 h-0.5 bg-current rounded-full" />
                  <span className="w-2.5 h-0.5 bg-current rounded-full" />
                </div>

                {/* Symbol + name */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold text-slate-100 leading-tight">{sym}</div>
                  <div className="text-xs text-slate-600 truncate leading-tight">
                    {q?.name ?? <span className="animate-pulse">Loading…</span>}
                  </div>
                </div>

                {/* Change badge */}
                <div className="shrink-0">
                  {q ? (
                    <span className={`inline-block text-xs font-mono font-semibold px-1.5 py-0.5 rounded border ${badgeBg}`}>
                      {sign}{fmt(q.changePercent)}%
                    </span>
                  ) : (
                    <span className="text-slate-700 text-xs animate-pulse w-12 inline-block text-center">—</span>
                  )}
                </div>

                {/* Price */}
                <div className="shrink-0 text-right w-16">
                  {q ? (
                    <>
                      <div className={`font-mono font-bold text-sm leading-tight ${priceColor}`}>{fmt(q.price)}</div>
                      <div className={`font-mono text-xs leading-tight ${priceColor} opacity-60`}>{sign}{fmt(q.change)}</div>
                    </>
                  ) : (
                    <div className="font-mono text-slate-700 animate-pulse text-sm">…</div>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeSymbol(sym)}
                  title={`Remove ${sym}`}
                  className="shrink-0 w-4 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100
                             transition-all text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Daily Briefing */}
      {symbols.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Daily Briefing
              </span>
              {briefing?.generatedAt && !briefing.error && (
                <span className="text-xs text-slate-700 ml-2">
                  — {new Date(briefing.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>
            <button
              onClick={fetchBriefing}
              disabled={briefingLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700
                         hover:border-emerald-500/50 hover:text-emerald-400 text-slate-400
                         disabled:opacity-40 transition-colors"
            >
              {briefingLoading ? (
                <>
                  <span className="w-3 h-3 border border-slate-500 border-t-slate-300 rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <span>✦</span>
                  {briefing ? 'Refresh' : 'Get Briefing'}
                </>
              )}
            </button>
          </div>

          {/* Loading skeleton */}
          {briefingLoading && !briefing && (
            <div className="space-y-2">
              {symbols.slice(0, 3).map(s => (
                <div key={s} className="h-24 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {briefing?.error && (
            <p className="text-sm text-slate-500 text-center py-4">{briefing.error}</p>
          )}

          {/* Briefing cards */}
          {briefing && !briefing.error && briefing.briefings.length > 0 && (
            <div className="space-y-2">
              {briefing.briefings.map(b => {
                const sentimentColor = b.sentiment === 'bullish'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : b.sentiment === 'bearish'
                  ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : 'text-slate-400 bg-slate-700/30 border-slate-600/30'
                const changeColor = b.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                const changeSign  = b.changePercent >= 0 ? '+' : ''

                return (
                  <div
                    key={b.symbol}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 space-y-2"
                  >
                    {/* Top row: symbol + price + sentiment */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">{b.symbol}</span>
                        {b.price > 0 && (
                          <span className={`font-mono text-xs ${changeColor}`}>
                            {changeSign}{b.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${sentimentColor}`}>
                        {b.sentiment}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-slate-300 leading-snug">{b.summary}</p>

                    {/* Key points */}
                    {b.keyPoints.length > 0 && (
                      <ul className="space-y-0.5">
                        {b.keyPoints.map((pt, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-500">
                            <span className="text-slate-700 shrink-0">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state — before first briefing */}
          {!briefing && !briefingLoading && (
            <p className="text-xs text-slate-700 text-center py-3">
              AI analysis of your watchlist — news, price action, and what matters today.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
