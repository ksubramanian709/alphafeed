'use client'
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart,
  Area, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend,
} from 'recharts'

interface PricePoint {
  date: string
  close: number
  changePercent: number
}

interface TodaySentiment {
  date: string
  score: number
  mentionCount: number
  label: 'bullish' | 'neutral' | 'bearish'
}

interface SentimentResult {
  symbol: string
  today?: TodaySentiment
  priceHistory?: PricePoint[]
  error?: string
}

interface ChartRow {
  date: string
  price: number
  sentiment: number | null
}

function labelColor(label?: string) {
  if (label === 'bullish')  return 'text-emerald-400'
  if (label === 'bearish')  return 'text-red-400'
  return 'text-slate-400'
}

function scoreBadge(label?: string) {
  if (label === 'bullish')  return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
  if (label === 'bearish')  return 'bg-red-500/10 border-red-500/30 text-red-400'
  return 'bg-slate-700/50 border-slate-600 text-slate-400'
}

function barColor(score: number) {
  return score >= 0 ? '#22c55e' : '#ef4444'
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as ChartRow
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl space-y-1">
      <div className="text-slate-400">{row.date}</div>
      {row.price > 0 && (
        <div className="font-mono text-slate-200">${row.price.toFixed(2)}</div>
      )}
      {row.sentiment !== null && (
        <div className={`font-mono font-semibold ${row.sentiment >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          WSB {row.sentiment >= 0 ? '+' : ''}{row.sentiment.toFixed(2)}
        </div>
      )}
    </div>
  )
}

interface Props { symbol: string }

export default function SentimentChart({ symbol }: Props) {
  const [result, setResult] = useState<SentimentResult | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sentiment/${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(setResult)
      .catch(() => setResult({ symbol, error: 'Failed to load' }))
      .finally(() => setLoading(false))
  }, [symbol])

  const rows: ChartRow[] = (result?.priceHistory ?? []).map(p => ({
    date: p.date,
    price: p.close,
    sentiment: null,
  }))

  // pin today's sentiment on the last price bar
  if (rows.length > 0 && result?.today) {
    rows[rows.length - 1] = { ...rows[rows.length - 1], sentiment: result.today.score }
  }

  const prices    = rows.map(r => r.price).filter(Boolean)
  const minPrice  = prices.length ? Math.min(...prices) * 0.998 : 0
  const maxPrice  = prices.length ? Math.max(...prices) * 1.002 : 0
  const gradId    = `sent-grad-${symbol.replace(/[^a-z0-9]/gi, '')}`
  const priceColor = prices.length
    ? (prices[prices.length - 1] >= prices[0] ? '#22c55e' : '#ef4444')
    : '#22c55e'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            WSB Sentiment
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">r/wallstreetbets · scored by Claude · 30-day window</p>
        </div>

        {loading && (
          <div className="text-xs text-slate-600 animate-pulse">Fetching WSB posts…</div>
        )}

        {!loading && result?.today && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-mono font-semibold ${scoreBadge(result.today.label)}`}>
            <span>{result.today.score >= 0 ? '+' : ''}{result.today.score.toFixed(2)}</span>
            <span className="text-xs font-normal capitalize opacity-80">{result.today.label}</span>
            <span className="text-[10px] opacity-50">{result.today.mentionCount} mentions</span>
          </div>
        )}

        {!loading && result?.error && (
          <div className="text-xs text-slate-600">{result.error}</div>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={priceColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={priceColor} stopOpacity={0}    />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={d => {
                const dt = new Date(d + 'T00:00:00')
                return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }}
            />

            <YAxis
              yAxisId="price"
              orientation="right"
              domain={[minPrice, maxPrice]}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`}
              width={52}
            />

            <YAxis
              yAxisId="sentiment"
              orientation="left"
              domain={[-1, 1]}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.toFixed(1)}
              width={30}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />

            <ReferenceLine yAxisId="sentiment" y={0} stroke="#334155" strokeDasharray="3 3" />

            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke={priceColor}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
              name="Price"
            />

            <Bar
              yAxisId="sentiment"
              dataKey="sentiment"
              name="WSB Score"
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
              fill="#22c55e"
              // color each bar individually
              label={false}
              // @ts-ignore recharts cell-level coloring via Cell is also valid
              // but using a fill function is simpler for a single-bar scenario
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {!loading && rows.length === 0 && !result?.error && (
        <div className="h-40 flex items-center justify-center text-slate-700 text-xs">
          No price history available
        </div>
      )}
    </div>
  )
}
