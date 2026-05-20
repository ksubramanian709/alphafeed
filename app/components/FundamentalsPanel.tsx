'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'


interface Fundamentals {
  symbol: string
  name: string
  description: string
  sector: string
  industry: string
  exchange: string

  // Valuation
  peRatio: number
  forwardPE: number
  pegRatio: number
  priceToBook: number
  priceToSales: number
  evToEbitda: number
  evToRevenue: number

  // Size & profitability
  marketCap: number
  revenueTtm: number
  grossProfitTtm: number
  ebitda: number
  eps: number
  dilutedEpsTtm: number
  profitMargin: number
  operatingMargin: number
  returnOnEquity: number
  returnOnAssets: number

  // Growth
  revenueGrowthYoy: number
  earningsGrowthYoy: number

  // Dividends
  dividendPerShare: number
  dividendYield: number

  // Analyst
  analystTargetPrice: number
  beta: number

  // Moving averages
  ma50: number
  ma200: number

  error?: string
}

function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n == null) return '—'
  return n.toFixed(dec)
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function fmtLarge(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtGrowth(n: number | null | undefined): { text: string; cls: string } {
  if (n == null) return { text: '—', cls: 'text-slate-400' }
  const pct = (n * 100).toFixed(1)
  if (n > 0) return { text: `+${pct}%`, cls: 'text-emerald-400' }
  if (n < 0) return { text: `${pct}%`, cls: 'text-red-400' }
  return { text: `${pct}%`, cls: 'text-slate-400' }
}

interface StatRowProps {
  label: string
  value: string
  valueClass?: string
  sub?: string
}

function StatRow({ label, value, valueClass = 'text-slate-200', sub }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-right">
        <span className={`text-xs font-mono ${valueClass}`}>{value}</span>
        {sub && <span className="block text-[10px] text-slate-600">{sub}</span>}
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

interface Props { symbol: string; currentPrice?: number }

export default function FundamentalsPanel({ symbol, currentPrice }: Props) {
  const [open, setOpen]         = useState(false)
  const [data, setData]         = useState<Fundamentals | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [fetched, setFetched]   = useState(false)

  function toggle() {
    if (!open && !fetched) {
      setFetched(true)
      load()
    }
    setOpen(o => !o)
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BACKEND}/v1/fundamentals/${symbol}`)
      const json: Fundamentals = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setData(json)
      }
    } catch {
      setError('Failed to load fundamentals.')
    } finally {
      setLoading(false)
    }
  }

  // Reset on symbol change
  useEffect(() => {
    setOpen(false)
    setData(null)
    setError('')
    setFetched(false)
  }, [symbol])

  // Analyst target upside
  const upside = data?.analystTargetPrice && currentPrice
    ? ((data.analystTargetPrice - currentPrice) / currentPrice) * 100
    : null

  const revenueGrowth  = fmtGrowth(data?.revenueGrowthYoy)
  const earningsGrowth = fmtGrowth(data?.earningsGrowthYoy)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* Header toggle */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Fundamentals
          </span>
          {data && (
            <span className="text-xs text-slate-600">
              {data.sector && <span className="text-slate-500">{data.sector}</span>}
              {data.peRatio && (
                <span className="ml-2 font-mono text-slate-400">P/E {fmtNum(data.peRatio)}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="w-3.5 h-3.5 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          )}
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 p-5 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="text-sm text-slate-500 text-center py-6">{error}</p>
          )}

          {/* Description */}
          {!loading && data && data.description && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
              {data.description}
            </p>
          )}

          {/* Company meta row */}
          {!loading && data && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {data.exchange && (
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{data.exchange}</span>
              )}
              {data.sector && (
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{data.sector}</span>
              )}
              {data.industry && (
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{data.industry}</span>
              )}
            </div>
          )}

          {/* Stats grid */}
          {!loading && data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Valuation */}
              <Section title="Valuation">
                <StatRow label="P/E Ratio (TTM)"    value={fmtNum(data.peRatio)} />
                <StatRow label="Forward P/E"         value={fmtNum(data.forwardPE)} />
                <StatRow label="PEG Ratio"           value={fmtNum(data.pegRatio)} />
                <StatRow label="Price / Book"        value={fmtNum(data.priceToBook)} />
                <StatRow label="Price / Sales (TTM)" value={fmtNum(data.priceToSales)} />
                <StatRow label="EV / EBITDA"         value={fmtNum(data.evToEbitda)} />
                <StatRow label="EV / Revenue"        value={fmtNum(data.evToRevenue)} />
              </Section>

              {/* Profitability */}
              <Section title="Profitability">
                <StatRow label="Revenue (TTM)"       value={fmtLarge(data.revenueTtm)} />
                <StatRow label="Gross Profit (TTM)"  value={fmtLarge(data.grossProfitTtm)} />
                <StatRow label="EBITDA"              value={fmtLarge(data.ebitda)} />
                <StatRow label="EPS (TTM)"           value={data.eps != null ? `$${fmtNum(data.eps)}` : '—'} />
                <StatRow label="Diluted EPS (TTM)"   value={data.dilutedEpsTtm != null ? `$${fmtNum(data.dilutedEpsTtm)}` : '—'} />
                <StatRow label="Profit Margin"       value={fmtPct(data.profitMargin)}
                  valueClass={data.profitMargin != null ? (data.profitMargin > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}
                />
                <StatRow label="Operating Margin"    value={fmtPct(data.operatingMargin)}
                  valueClass={data.operatingMargin != null ? (data.operatingMargin > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}
                />
              </Section>

              {/* Returns */}
              <Section title="Returns & Growth">
                <StatRow label="Return on Equity"    value={fmtPct(data.returnOnEquity)}
                  valueClass={data.returnOnEquity != null ? (data.returnOnEquity > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}
                />
                <StatRow label="Return on Assets"    value={fmtPct(data.returnOnAssets)}
                  valueClass={data.returnOnAssets != null ? (data.returnOnAssets > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}
                />
                <StatRow label="Revenue Growth YoY"  value={revenueGrowth.text}  valueClass={revenueGrowth.cls} />
                <StatRow label="Earnings Growth YoY" value={earningsGrowth.text} valueClass={earningsGrowth.cls} />
                <StatRow label="Dividend / Share"    value={data.dividendPerShare != null ? `$${fmtNum(data.dividendPerShare)}` : '—'} />
                <StatRow label="Dividend Yield"      value={data.dividendYield != null ? fmtPct(data.dividendYield) : '—'} />
              </Section>

              {/* Analyst & Risk */}
              <Section title="Analyst & Risk">
                <StatRow
                  label="Analyst Target"
                  value={data.analystTargetPrice != null ? `$${fmtNum(data.analystTargetPrice)}` : '—'}
                  sub={upside != null ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}% from current` : undefined}
                  valueClass={upside != null ? (upside > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}
                />
                <StatRow label="Beta" value={fmtNum(data.beta)}
                  valueClass={
                    data.beta != null
                      ? data.beta > 1.5 ? 'text-red-400'
                      : data.beta < 0.5 ? 'text-blue-400'
                      : 'text-slate-300'
                      : 'text-slate-400'
                  }
                  sub={
                    data.beta != null
                      ? data.beta > 1.5 ? 'high volatility'
                      : data.beta < 0.8 ? 'low volatility'
                      : 'moderate volatility'
                      : undefined
                  }
                />
              </Section>

              {/* Moving Averages */}
              <Section title="Moving Averages">
                <StatRow
                  label="50-Day MA"
                  value={data.ma50 != null ? `$${fmtNum(data.ma50)}` : '—'}
                  valueClass={
                    data.ma50 != null && currentPrice != null
                      ? currentPrice >= data.ma50 ? 'text-emerald-400' : 'text-red-400'
                      : 'text-slate-300'
                  }
                  sub={
                    data.ma50 != null && currentPrice != null
                      ? currentPrice >= data.ma50 ? 'price above MA' : 'price below MA'
                      : undefined
                  }
                />
                <StatRow
                  label="200-Day MA"
                  value={data.ma200 != null ? `$${fmtNum(data.ma200)}` : '—'}
                  valueClass={
                    data.ma200 != null && currentPrice != null
                      ? currentPrice >= data.ma200 ? 'text-emerald-400' : 'text-red-400'
                      : 'text-slate-300'
                  }
                  sub={
                    data.ma200 != null && currentPrice != null
                      ? currentPrice >= data.ma200 ? 'price above MA' : 'price below MA'
                      : undefined
                  }
                />
                {data.ma50 != null && data.ma200 != null && (
                  <StatRow
                    label="MA Signal"
                    value={data.ma50 > data.ma200 ? 'Golden Cross' : 'Death Cross'}
                    valueClass={data.ma50 > data.ma200 ? 'text-emerald-400' : 'text-red-400'}
                    sub={data.ma50 > data.ma200 ? '50MA above 200MA (bullish)' : '50MA below 200MA (bearish)'}
                  />
                )}
              </Section>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
