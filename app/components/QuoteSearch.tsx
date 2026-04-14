'use client'
import { useEffect, useRef, useState } from 'react'
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

function priceClass(change: number) {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}

export default function QuoteSearch() {
  const [input, setInput]       = useState('')
  const [symbol, setSymbol]     = useState('')   // the currently loaded symbol
  const [quote, setQuote]       = useState<Quote | null>(null)
  const [prevPrice, setPrevPrice] = useState<number | null>(null)
  const [source, setSource]     = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const [flash, setFlash]       = useState<'up' | 'down' | null>(null)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

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
          // Flash animation on price change
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

  // Clear flash after animation
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 800)
    return () => clearTimeout(t)
  }, [flash])

  // Auto-refresh every 30s while a symbol is loaded
  useEffect(() => {
    if (!symbol) return
    intervalRef.current = setInterval(() => fetchQuote(symbol, true), 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [symbol])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const sym = input.trim().toUpperCase()
    if (intervalRef.current) clearInterval(intervalRef.current)
    setError('')
    setQuote(null)
    setPrevPrice(null)
    setSymbol(sym)
    await fetchQuote(sym)
  }

  const cls  = quote ? priceClass(quote.change) : ''
  const sign = quote && quote.change >= 0 ? '+' : ''

  const flashBg = flash === 'up'
    ? 'bg-green-500/10'
    : flash === 'down'
    ? 'bg-red-500/10'
    : ''

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Quote Lookup
      </h2>

      <form onSubmit={search} className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="AAPL  ·  CL=F  ·  GC=F  ·  ^VIX  ·  EUR=X…"
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

      {error && <p className="text-red-400 text-sm">{error}</p>}

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
            <span className={`font-mono text-3xl font-bold ${cls} transition-colors duration-300`}>
              {fmt(quote.price)}
            </span>
            <div className={`flex flex-col text-sm font-mono mb-0.5 ${cls}`}>
              <span className="text-base font-semibold">{sign}{fmt(quote.change)}</span>
              <span className="text-xs">{sign}{fmt(quote.changePercent)}% today</span>
            </div>
            {/* Previous price ghost if recently refreshed */}
            {prevPrice !== null && prevPrice !== quote.price && (
              <span className="text-xs text-slate-600 font-mono mb-1">
                prev {fmt(prevPrice)}
              </span>
            )}
          </div>

          {/* OHLV row */}
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

          {/* Chart with 1m / 5m / 1h / 1D / 1W / 1M / 1Y */}
          <PriceChart symbol={quote.symbol} currentPrice={quote.price} />

          <div className="mt-2 text-xs text-slate-700">
            source: {source} · {quote.currency} · refreshes every 30s
          </div>
        </div>
      )}
    </section>
  )
}
