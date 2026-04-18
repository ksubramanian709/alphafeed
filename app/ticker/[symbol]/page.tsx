'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PriceChart from '../../components/PriceChart'
import NewsFeed from '../../components/NewsFeed'
import OptionsChain from '../../components/OptionsChain'
import EarningsDropdown from '../../components/EarningsDropdown'
import FundamentalsPanel from '../../components/FundamentalsPanel'
import AIInsights from '../../components/AIInsights'

const API = process.env.NEXT_PUBLIC_API_URL

const LIVE_CRYPTO = new Set([
  'BTC-USD','ETH-USD','SOL-USD','XRP-USD','BNB-USD',
  'DOGE-USD','ADA-USD','AVAX-USD','LINK-USD','MATIC-USD'
])

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
  marketState: string | null
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
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
  const [liveQuote, setLiveQuote] = useState<{ price: number; change: number; changePercent: number } | null>(null)
  const [priceFlash, setPriceFlash] = useState<'up' | 'dn' | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const prevPriceRef = useRef<number | null>(null)

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
    const id = setInterval(() => fetchQuote(true), 15_000)
    return () => clearInterval(id)
  }, [symbol])

  // Real-time WebSocket feed for crypto symbols streamed by Binance
  useEffect(() => {
    if (!LIVE_CRYPTO.has(symbol)) return
    const wsBase = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') ?? 'ws://localhost:8080'
    let ws: WebSocket
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      ws = new WebSocket(`${wsBase}/v1/stream/quotes`)
      ws.onopen = () => {
        setWsConnected(true)
        ws.send(JSON.stringify({ action: 'subscribe', symbols: [symbol] }))
      }
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === 'quote' && msg.symbol === symbol && msg.price != null) {
            const newPrice = msg.price as number
            if (prevPriceRef.current !== null && newPrice !== prevPriceRef.current) {
              setPriceFlash(newPrice > prevPriceRef.current ? 'up' : 'dn')
              setTimeout(() => setPriceFlash(null), 700)
            }
            prevPriceRef.current = newPrice
            setLiveQuote({ price: newPrice, change: msg.change ?? 0, changePercent: msg.changePercent ?? 0 })
          }
        } catch { /* ignore */ }
      }
      ws.onclose = () => { setWsConnected(false); reconnectTimer = setTimeout(connect, 5000) }
      ws.onerror = () => { ws.close() }
    }

    connect()
    return () => { clearTimeout(reconnectTimer); ws?.close() }
  }, [symbol])

  const displayPrice         = liveQuote?.price         ?? quote?.price         ?? 0
  const displayChange        = liveQuote?.change        ?? quote?.change        ?? 0
  const displayChangePercent = liveQuote?.changePercent ?? quote?.changePercent ?? 0

  const cls  = quote ? priceClass(liveQuote?.change ?? quote.change) : ''
  const sign = displayChange >= 0 ? '+' : ''

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
                {wsConnected && (
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-green-400 font-semibold tracking-wider">LIVE</span>
                  </div>
                )}
                <div className={`font-mono font-bold text-3xl transition-colors duration-300 ${cls} ${
                  priceFlash === 'up' ? 'text-green-300' : priceFlash === 'dn' ? 'text-red-300' : ''
                }`}>
                  <span className={`inline-block transition-all duration-300 px-2 py-0.5 rounded-lg ${
                    priceFlash === 'up' ? 'bg-green-500/20' : priceFlash === 'dn' ? 'bg-red-500/20' : ''
                  }`}>
                    {fmt(displayPrice)}
                  </span>
                  <span className="text-sm text-slate-600 ml-1">{quote.currency}</span>
                </div>
                <div className={`font-mono text-sm mt-0.5 ${cls}`}>
                  {sign}{fmt(displayChange)} ({sign}{fmt(displayChangePercent)}%) today
                </div>

                {/* Extended hours */}
                {quote.extendedPrice != null && quote.extendedChange != null && quote.extendedChangePercent != null && (
                  <div className="mt-2 flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                        quote.marketState === 'PRE'
                          ? 'text-sky-400 border-sky-500/30 bg-sky-500/10'
                          : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                      }`}>
                        {quote.marketState === 'PRE' ? 'Pre-Market' : 'After Hours'}
                      </span>
                    </div>
                    <div className={`font-mono font-bold text-xl ${quote.extendedChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(quote.extendedPrice)}
                    </div>
                    <div className={`font-mono text-xs ${quote.extendedChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {quote.extendedChange >= 0 ? '+' : ''}{fmt(quote.extendedChange)} ({quote.extendedChange >= 0 ? '+' : ''}{fmt(quote.extendedChangePercent)}%)
                    </div>
                  </div>
                )}

                {lastUpdate && (
                  <div className="text-xs text-slate-700 mt-1">updated {lastUpdate}</div>
                )}
              </div>
            </div>

            {/* ── Key stats grid ── */}
            {(() => {
              const isFx = quote.assetType === 'CURRENCY'
              const dp = isFx ? 4 : 2
              const fmtP = (n: number) => n > 0 ? n.toFixed(dp) : '—'
              const stats = [
                { label: 'Open',     value: quote.open  > 0 ? fmtP(quote.open)  : '—' },
                { label: 'High',     value: quote.high  > 0 ? fmtP(quote.high)  : '—' },
                { label: 'Low',      value: quote.low   > 0 ? fmtP(quote.low)   : '—' },
                { label: 'Volume',   value: fmtVol(quote.volume) },
                ...(!isFx ? [{ label: 'Mkt Cap', value: fmtLarge(quote.marketCap) }] : []),
                { label: '52W High', value: quote.fiftyTwoWeekHigh ? fmtP(quote.fiftyTwoWeekHigh) : '—' },
                { label: '52W Low',  value: quote.fiftyTwoWeekLow  ? fmtP(quote.fiftyTwoWeekLow)  : '—' },
                { label: 'Currency', value: quote.currency ?? '—' },
              ]
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                    {stats.map(({ label, value }) => (
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
                        <span>52W Low {isFx ? quote.fiftyTwoWeekLow.toFixed(4) : fmt(quote.fiftyTwoWeekLow)}</span>
                        <span>52W High {isFx ? quote.fiftyTwoWeekHigh.toFixed(4) : fmt(quote.fiftyTwoWeekHigh)}</span>
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
                </>
              )
            })()}
          </div>

          {/* ── Price chart ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Price Chart
            </h2>
            <PriceChart symbol={quote.symbol} />
          </div>

          {/* ── AI Insights — all asset types ── */}
          <AIInsights symbol={quote.symbol} assetType={quote.assetType} />

          {/* ── Fundamentals / Earnings / Options — equities & ETFs only ── */}
          {(quote.assetType === 'EQUITY' || quote.assetType === 'ETF') && (
            <>
              <FundamentalsPanel symbol={quote.symbol} currentPrice={quote.price} />
              <EarningsDropdown symbol={quote.symbol} />
              <OptionsChain symbol={quote.symbol} underlyingPrice={quote.price} />
            </>
          )}

          {/* ── Forex / Futures context block ── */}
          {(quote.assetType === 'CURRENCY' || quote.assetType === 'FUTURE' || quote.assetType === 'INDEX') && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                {quote.assetType === 'CURRENCY' ? 'Currency Pair Info'
                  : quote.assetType === 'FUTURE' ? 'Futures Contract Info'
                  : 'Index Info'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Asset Type',  value: quote.assetType },
                  { label: 'Currency',    value: quote.currency ?? '—' },
                  { label: 'Market State',value: quote.marketState ?? 'Regular' },
                  { label: '52W High',    value: quote.fiftyTwoWeekHigh ? quote.fiftyTwoWeekHigh.toFixed(4) : '—' },
                  { label: '52W Low',     value: quote.fiftyTwoWeekLow  ? quote.fiftyTwoWeekLow.toFixed(4)  : '—' },
                  { label: 'Volume',      value: quote.volume ? fmtVol(quote.volume) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                    <div className="font-mono text-sm text-slate-200 truncate">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── News — all asset types ── */}
          <NewsFeed symbol={quote.symbol} limit={10} title={`${quote.symbol} Headlines`} />
        </>
      )}
    </main>
  )
}
