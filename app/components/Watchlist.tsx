'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchTickers, type Ticker } from '../lib/tickers'

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
}

function fmt(n: number) { return n.toFixed(2) }

export default function Watchlist() {
  const [quotes, setQuotes]       = useState<Record<string, LiveQuote>>({})
  const [symbols, setSymbols]     = useState<string[]>(DEFAULT_SYMBOLS)
  const [input, setInput]         = useState('')
  const [suggestions, setSuggestions] = useState<Ticker[]>([])
  const [showDrop, setShowDrop]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [connected, setConnected] = useState(false)

  const wsRef      = useRef<WebSocket | null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  // ── fuzzy search ──
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

  // ── WebSocket ──
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

  // ── add / remove ──
  function pickSymbol(sym: string) {
    if (!sym || symbols.includes(sym)) { setInput(''); setShowDrop(false); return }
    setSymbols(prev => [...prev, sym])
    setInput('')
    setShowDrop(false)
    setSuggestions([])
  }

  function removeSymbol(sym: string) {
    setSymbols(prev => prev.filter(s => s !== sym))
    setQuotes(prev => { const n = { ...prev }; delete n[sym]; return n })
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

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Watchlist
        </h2>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-600">{connected ? 'live' : 'connecting…'}</span>
        </div>
      </div>

      {/* Add symbol input with fuzzy dropdown */}
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
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto] items-center px-4 py-1.5 bg-slate-950 border-b border-slate-800">
            <span className="text-xs text-slate-600 uppercase tracking-wider">Symbol</span>
            <div className="flex items-center gap-6">
              <span className="text-xs text-slate-600 uppercase tracking-wider w-24 text-right hidden md:block">Range</span>
              <span className="text-xs text-slate-600 uppercase tracking-wider w-20 text-right">Change</span>
              <span className="text-xs text-slate-600 uppercase tracking-wider w-24 text-right">Price</span>
              <span className="w-5" />
            </div>
          </div>

          {symbols.map((sym, idx) => {
            const q    = quotes[sym]
            const up   = q && q.change > 0
            const dn   = q && q.change < 0
            const sign = q && q.change >= 0 ? '+' : ''

            const priceColor  = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
            const badgeBg     = up ? 'bg-green-500/10 border-green-900/40' : dn ? 'bg-red-500/10 border-red-900/40' : 'bg-slate-800 border-slate-700'
            const rowBg       = idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'

            return (
              <div
                key={sym}
                className={`grid grid-cols-[1fr_auto] items-center px-4 py-3 ${rowBg}
                            hover:bg-slate-800/60 transition-colors group border-b border-slate-800/50 last:border-0`}
              >
                {/* Left: symbol + name */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-100">{sym}</span>
                    {q?.assetType && (
                      <span className="text-xs text-slate-600 hidden sm:block">{q.assetType}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 truncate mt-0.5">
                    {q?.name ?? <span className="animate-pulse">Loading…</span>}
                  </div>
                </div>

                {/* Right: H/L bar + change badge + price */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* H/L */}
                  {q ? (
                    <div className="hidden md:flex flex-col items-end w-24">
                      <div className="flex items-center gap-1 w-full">
                        {/* Mini range bar */}
                        <span className="text-xs text-slate-700 font-mono">{fmt(q.low)}</span>
                        <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden mx-1">
                          <div
                            className={`h-full rounded-full ${up ? 'bg-green-500' : dn ? 'bg-red-500' : 'bg-slate-500'}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, ((q.price - q.low) / (q.high - q.low || 1)) * 100))}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-700 font-mono">{fmt(q.high)}</span>
                      </div>
                    </div>
                  ) : <div className="hidden md:block w-24" />}

                  {/* Change badge */}
                  <div className={`w-20 text-right`}>
                    {q ? (
                      <span className={`inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded border ${badgeBg} ${priceColor}`}>
                        {sign}{fmt(q.changePercent)}%
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs animate-pulse">—</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="w-24 text-right">
                    {q ? (
                      <>
                        <div className={`font-mono font-bold text-base ${priceColor}`}>
                          {fmt(q.price)}
                        </div>
                        <div className={`font-mono text-xs ${priceColor} opacity-70`}>
                          {sign}{fmt(q.change)}
                        </div>
                      </>
                    ) : (
                      <div className="font-mono text-slate-700 animate-pulse text-base">…</div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeSymbol(sym)}
                    title={`Remove ${sym}`}
                    className="w-5 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100
                               transition-all text-sm leading-none shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
