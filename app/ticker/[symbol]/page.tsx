'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PriceChart from '../../components/PriceChart'
import NewsFeed from '../../components/NewsFeed'

const API = process.env.NEXT_PUBLIC_API_URL

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  currency: string
  assetType: string
  marketCap: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
}

function fmt(n: number, decimals = 2) { return n.toFixed(decimals) }

function fmtLarge(n: number): string {
  if (!n || n === 0) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtVol(n: number): string {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toString()
}

function priceClass(change: number) {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

export default function TickerPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()

  const [quote, setQuote]     = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [lastUpdate, setLastUpdate] = useState('')

  async function fetchQuote(isRefresh = false) {
    if (!isRefresh) setLoading(true)
    try {
      // Fetch quote first so we have the price for market cap calculation
      const quoteRes = await fetch(`${API}/v1/quote/${symbol}`).catch(() => null)

      let quoteData: Quote | null = null
      if (quoteRes) {
        const json = await quoteRes.json()
        if (!json.error && json.data) quoteData = json.data
      }

      if (!quoteData) { setError(`No data found for "${symbol}"`); return }

      // Fetch market cap from SEC EDGAR (free, no API key) using current price
      if (!quoteData.marketCap && quoteData.price > 0) {
        try {
          const statsRes = await fetch(
            `/api/stats/${encodeURIComponent(symbol)}?price=${quoteData.price}`
          )
          const stats = await statsRes.json()
          if (stats.marketCap) quoteData.marketCap = stats.marketCap
        } catch {}
      }

      setQuote(quoteData)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to reach API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
    const id = setInterval(() => fetchQuote(true), 30_000)
    return () => clearInterval(id)
  }, [symbol])

  const cls  = quote ? priceClass(quote.change) : ''
  const sign = quote && quote.change >= 0 ? '+' : ''

  // 52-week range position
  const rangePos = quote && quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow
    ? Math.min(100, Math.max(0,
        ((quote.price - quote.fiftyTwoWeekLow) /
         (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100))
    : null

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Back nav */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back to dashboard
      </button>

      {loading && (
        <div className="space-y-4">
          <div className="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
          <div className="h-48 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        </div>
      )}

      {error && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchQuote()}
            className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      {quote && (
        <>
          {/* ── Quote header ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-mono font-bold text-2xl text-slate-100">{quote.symbol}</h1>
                  <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded uppercase">
                    {quote.assetType}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-0.5">{quote.name}</p>
              </div>
              <div className="text-right">
                <div className={`font-mono font-bold text-3xl ${cls}`}>
                  {fmt(quote.price)}
                  <span className="text-sm text-slate-600 ml-1">{quote.currency}</span>
                </div>
                <div className={`font-mono text-sm mt-0.5 ${cls}`}>
                  {sign}{fmt(quote.change)} ({sign}{fmt(quote.changePercent)}%) today
                </div>
                {lastUpdate && (
                  <div className="text-xs text-slate-700 mt-1">updated {lastUpdate}</div>
                )}
              </div>
            </div>

            {/* ── Key stats grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
              {[
                { label: 'Open',       value: fmt(quote.open) },
                { label: 'High',       value: fmt(quote.high) },
                { label: 'Low',        value: fmt(quote.low) },
                { label: 'Volume',     value: fmtVol(quote.volume) },
                { label: 'Mkt Cap',    value: fmtLarge(quote.marketCap) },
                { label: '52W High',   value: quote.fiftyTwoWeekHigh ? fmt(quote.fiftyTwoWeekHigh) : '—' },
                { label: '52W Low',    value: quote.fiftyTwoWeekLow  ? fmt(quote.fiftyTwoWeekLow)  : '—' },
                { label: 'Currency',   value: quote.currency ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className="font-mono text-sm text-slate-200 truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* ── 52-week range bar ── */}
            {rangePos !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-600 font-mono mb-1">
                  <span>52W Low {fmt(quote.fiftyTwoWeekLow)}</span>
                  <span>52W High {fmt(quote.fiftyTwoWeekHigh)}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full relative">
                  <div
                    className={`h-full rounded-full ${cls.replace('text-', 'bg-')}`}
                    style={{ width: `${rangePos}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-900"
                    style={{ left: `calc(${rangePos}% - 5px)` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Price chart ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Price Chart
            </h2>
            <PriceChart symbol={quote.symbol} currentPrice={quote.price} />
          </div>

          {/* ── Company news ── */}
          <NewsFeed symbol={quote.symbol} limit={10} title={`${quote.symbol} Headlines`} />
        </>
      )}
    </main>
  )
}
