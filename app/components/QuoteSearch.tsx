'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import PriceChart from './PriceChart'

const API = process.env.NEXT_PUBLIC_API_URL

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  currency: string
  assetType: string
}

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

function priceClass(change: number) {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}

export default function QuoteSearch() {
  const [input, setInput]             = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showDrop, setShowDrop]       = useState(false)
  const [searching, setSearching]     = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)

  const [symbol, setSymbol]           = useState('')
  const [quote, setQuote]             = useState<Quote | null>(null)
  const [prevPrice, setPrevPrice]     = useState<number | null>(null)
  const [source, setSource]           = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [lastUpdate, setLastUpdate]   = useState('')
  const [flash, setFlash]             = useState<'up' | 'down' | null>(null)

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const dropRef      = useRef<HTMLDivElement>(null)

  // ---- fuzzy search ----
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setShowDrop(false); return }
    setSearching(true)
    try {
      const res = await fetch(`${API}/v1/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      const results: SearchResult[] = json.results ?? []
      setSuggestions(results)
      setShowDrop(results.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
      setShowDrop(false)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(input), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [input, runSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        dropRef.current && dropRef.current.contains(e.target as Node)
      ) return  // click is inside dropdown — don't close
      setShowDrop(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ---- quote fetching ----
  async function fetchQuote(sym: string, isRefresh = false) {
    if (!isRefresh) setLoading(true)
    try {
      const res = await fetch(`${API}/v1/quote/${sym}`)
      const json = await res.json()
      if (json.error || !json.data) {
        if (!isRefresh) setError(`No data found for "${sym}"`)
        return
      }
      setQuote(prev => {
        if (prev && isRefresh) {
          if (json.data.price > prev.price) setFlash('up')
          else if (json.data.price < prev.price) setFlash('down')
          setPrevPrice(prev.price)
        }
        return json.data
      })
      setSource(json.source)
      setLastUpdate(new Date().toLocaleTimeString())
      setError('')
    } catch {
      if (!isRefresh) setError('Failed to reach API')
    } finally {
      if (!isRefresh) setLoading(false)
    }
  }

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 800)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (!symbol) return
    intervalRef.current = setInterval(() => fetchQuote(symbol, true), 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [symbol])

  function pickSymbol(sym: string, name: string) {
    // Set input to the full name so user sees what was selected
    setInput(sym)
    setShowDrop(false)
    setSuggestions([])
    setActiveIdx(-1)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setError('')
    setQuote(null)
    setPrevPrice(null)
    setSymbol(sym)
    fetchQuote(sym)
    inputRef.current?.blur()
  }

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeIdx >= 0 ? activeIdx : 0
      if (suggestions[idx]) pickSymbol(suggestions[idx].symbol, suggestions[idx].name)
    } else if (e.key === 'Escape') {
      setShowDrop(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showDrop && suggestions.length > 0) {
      const idx = activeIdx >= 0 ? activeIdx : 0
      pickSymbol(suggestions[idx].symbol, suggestions[idx].name)
    } else if (input.trim()) {
      // Treat raw input as a ticker
      pickSymbol(input.trim().toUpperCase(), input.trim().toUpperCase())
    }
  }

  const cls     = quote ? priceClass(quote.change) : ''
  const sign    = quote && quote.change >= 0 ? '+' : ''
  const flashBg = flash === 'up' ? 'bg-green-500/10' : flash === 'down' ? 'bg-red-500/10' : ''

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Quote Lookup
      </h2>

      {/* Search box */}
      <div className="relative mb-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowDrop(true) }}
            onFocus={() => { if (suggestions.length > 0) setShowDrop(true) }}
            onKeyDown={onKeyDown}
            placeholder="Search by name or ticker — Apple, palantir, crude oil…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm
                       placeholder-slate-600 focus:outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium
                       disabled:opacity-40 transition-colors"
          >
            {loading ? '…' : 'Search'}
          </button>
        </form>

        {/* Dropdown */}
        {showDrop && (
          <div
            ref={dropRef}
            className="absolute z-30 w-full mt-1 bg-slate-900 border border-slate-700
                       rounded-lg shadow-2xl overflow-hidden"
          >
            {searching && (
              <div className="px-3 py-2 text-xs text-slate-600">Searching…</div>
            )}
            {!searching && suggestions.length === 0 && input.trim() && (
              <div className="px-3 py-2 text-xs text-slate-600">No results</div>
            )}
            {suggestions.map((r, i) => (
              <div
                key={r.symbol + i}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent input blur
                  pickSymbol(r.symbol, r.name)
                }}
                className={`px-3 py-2.5 cursor-pointer flex items-center gap-3
                            border-b border-slate-800 last:border-0 select-none
                            ${i === activeIdx ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
              >
                <span className="font-mono text-sm font-bold text-slate-100 w-24 shrink-0">
                  {r.symbol}
                </span>
                <span className="text-xs text-slate-400 flex-1 truncate">{r.name}</span>
                <span className="text-xs text-slate-600 shrink-0 hidden sm:block">{r.exchange}</span>
                <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                  {r.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {quote && (
        <div className={`border border-slate-800 rounded-lg p-4 transition-colors duration-300 ${flashBg || 'bg-slate-900'}`}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono font-bold text-lg">{quote.symbol}</span>
              <span className="ml-2 text-slate-400 text-sm">{quote.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 uppercase bg-slate-800 px-2 py-0.5 rounded">
                {quote.assetType}
              </span>
              {lastUpdate && (
                <span className="text-xs text-slate-700">{lastUpdate}</span>
              )}
            </div>
          </div>

          {/* Price + day change */}
          <div className="flex items-end gap-4 mt-3">
            <span className={`font-mono text-3xl font-bold ${cls}`}>
              {fmt(quote.price)}
            </span>
            <div className={`flex flex-col text-sm font-mono mb-0.5 ${cls}`}>
              <span className="text-base font-semibold">{sign}{fmt(quote.change)}</span>
              <span className="text-xs">{sign}{fmt(quote.changePercent)}% today</span>
            </div>
            {prevPrice !== null && prevPrice !== quote.price && (
              <span className="text-xs text-slate-600 font-mono mb-1">
                prev {fmt(prevPrice)}
              </span>
            )}
          </div>

          {/* OHLV */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
            {[
              ['Open', quote.price - quote.change],
              ['High', quote.high],
              ['Low',  quote.low],
              ['Vol',  null],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-slate-800 rounded px-2 py-1.5">
                <div className="text-slate-500 mb-0.5">{label}</div>
                <div className="font-mono text-slate-200">
                  {label === 'Vol'
                    ? `${(quote.volume / 1e6).toFixed(1)}M`
                    : fmt(val as number)
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <PriceChart symbol={quote.symbol} currentPrice={quote.price} />

          <div className="mt-2 text-xs text-slate-700">
            source: {source} · {quote.currency} · refreshes every 30s
          </div>
        </div>
      )}
    </section>
  )
}
