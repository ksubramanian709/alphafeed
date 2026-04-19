'use client'
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'

const API = process.env.NEXT_PUBLIC_API_URL

interface Bar {
  timestampEpoch: number
  close: number
  open: number
  high: number
  low: number
  volume: number
}

interface ChartPoint {
  epoch: number   // raw epoch for formatting
  price: number
}

const RANGES = [
  { label: '1D',  interval: '5m',  range: '1d'  },
  { label: '5D',  interval: '60m', range: '5d'  },
  { label: '1M',  interval: '1d',  range: '1mo' },
  { label: '3M',  interval: '1d',  range: '3mo' },
  { label: '6M',  interval: '1d',  range: '6mo' },
  { label: 'YTD', interval: '1d',  range: 'ytd' },
  { label: '1Y',  interval: '1d',  range: '1y'  },
  { label: '5Y',  interval: '1wk', range: '5y'  },
  { label: 'ALL', interval: '1mo', range: 'max' },
]

// ── Tick label on the X-axis (short, no clutter) ──────────────────────────────
function xAxisTick(epoch: number, interval: string, range: string): string {
  const d = new Date(epoch * 1000)

  if (interval === '5m') {
    // 1D: just time  "9:30 AM"
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  if (interval === '60m') {
    // 5D: weekday + time  "Mon 10 AM"
    const day  = d.toLocaleDateString('en-US', { weekday: 'short' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
    return `${day} ${time}`
  }

  if (range === 'max') {
    // ALL: just the year "2015"
    return d.getFullYear().toString()
  }

  if (interval === '1wk' || range === '5y') {
    // 5Y: "Apr '21"
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  if (range === '1mo') {
    // 1M: "Apr 16"
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // 3M / 6M / YTD / 1Y: include year — "Apr '25"
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// ── Tooltip date line (full, precise) ────────────────────────────────────────
function tooltipDate(epoch: number, interval: string): string {
  const d = new Date(epoch * 1000)
  if (interval === '5m' || interval === '60m') {
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── How many X ticks to show based on data size ───────────────────────────────
function tickInterval(dataLen: number, range: string): number | 'preserveStartEnd' {
  if (dataLen === 0) return 'preserveStartEnd'
  const targets: Record<string, number> = {
    '1d': 6, '5d': 5, '1mo': 6, '3mo': 6,
    '6mo': 6, 'ytd': 6, '1y': 6, '5y': 8, 'max': 10,
  }
  const target = targets[range] ?? 6
  return Math.max(1, Math.floor(dataLen / target))
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, interval, color }: any) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload as ChartPoint
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl">
      <div className="font-mono font-semibold" style={{ color }}>
        ${pt.price.toFixed(pt.price < 10 ? 4 : 2)}
      </div>
      <div className="text-slate-500 mt-0.5">{tooltipDate(pt.epoch, interval)}</div>
    </div>
  )
}

interface Props { symbol: string }

export default function PriceChart({ symbol }: Props) {
  const [data, setData]           = useState<ChartPoint[]>([])
  const [selected, setSelected]   = useState(0)
  const [loading, setLoading]     = useState(false)
  const [openPrice, setOpenPrice] = useState(0)

  const currentRange = RANGES[selected]

  async function loadChart(rangeIdx: number) {
    setLoading(true)
    setSelected(rangeIdx)
    const { interval, range } = RANGES[rangeIdx]
    try {
      const res  = await fetch(`${API}/v1/chart/${symbol}?interval=${interval}&range=${range}`)
      const json = await res.json()
      if (!json.data) return
      const bars: Bar[] = json.data
      const points: ChartPoint[] = bars
        .filter(b => b.close > 0)
        .map(b => ({ epoch: b.timestampEpoch, price: b.close }))
      setData(points)
      if (points.length > 0) setOpenPrice(points[0].price)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChart(0) }, [symbol])

  const lastPrice  = data.length ? data[data.length - 1].price : 0
  const isUp       = lastPrice >= openPrice
  const color      = isUp ? '#22c55e' : '#ef4444'
  const gradId     = `grad-${symbol.replace(/[^a-z0-9]/gi, '')}`
  const returnPct  = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : null
  const returnSign = returnPct !== null && returnPct >= 0 ? '+' : ''
  const minPrice   = data.length ? Math.min(...data.map(d => d.price)) * 0.999 : 0
  const maxPrice   = data.length ? Math.max(...data.map(d => d.price)) * 1.001 : 0

  const tickIntervalVal = tickInterval(data.length, currentRange.range)

  return (
    <div className="mt-1">
      {/* Range selector + return badge */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-0.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => loadChart(i)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                selected === i
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {returnPct !== null && data.length > 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-semibold
            ${isUp
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            <span>{isUp ? '▲' : '▼'}</span>
            <span>{returnSign}{returnPct.toFixed(2)}%</span>
            <span className="text-xs opacity-60 font-normal">{currentRange.label}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="h-48 flex items-center justify-center text-slate-600 text-xs animate-pulse">
          Loading…
        </div>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="epoch"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={tickIntervalVal}
              tickFormatter={(epoch) => xAxisTick(epoch, currentRange.interval, currentRange.range)}
            />

            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(v < 10 ? 2 : 0)}`}
              width={54}
              orientation="right"
            />

            <Tooltip
              content={<CustomTooltip interval={currentRange.interval} color={color} />}
              cursor={{ stroke: '#334155', strokeWidth: 1 }}
            />

            <ReferenceLine y={openPrice} stroke="#334155" strokeDasharray="3 3" />

            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {!loading && data.length === 0 && (
        <div className="h-48 flex items-center justify-center text-slate-700 text-xs">
          No chart data available
        </div>
      )}
    </div>
  )
}
