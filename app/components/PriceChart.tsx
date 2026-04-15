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
  label: string
  price: number
  epoch: number
}

const RANGES = [
  { label: '1m',  interval: '1m',  range: '1d'  },
  { label: '5m',  interval: '5m',  range: '1d'  },
  { label: '1h',  interval: '60m', range: '5d'  },
  { label: '1D',  interval: '5m',  range: '1d'  },
  { label: '1W',  interval: '60m', range: '5d'  },
  { label: '1M',  interval: '1d',  range: '1mo' },
  { label: '1Y',  interval: '1d',  range: '1y'  },
]

function formatLabel(epoch: number, interval: string): string {
  const d = new Date(epoch * 1000)
  if (interval === '1m' || interval === '5m' || interval === '60m') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (interval === '1wk') {
    return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Defined outside component so Recharts never remounts it on re-render
function CustomTooltip({ active, payload, color }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs pointer-events-none">
      <span className="font-mono" style={{ color }}>
        {payload[0].value.toFixed(2)}
      </span>
      <span className="text-slate-500 ml-2">{payload[0].payload.label}</span>
    </div>
  )
}

interface Props {
  symbol: string
}

export default function PriceChart({ symbol }: Props) {
  const [data, setData]         = useState<ChartPoint[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading]   = useState(false)
  const [openPrice, setOpenPrice] = useState(0)

  async function loadChart(rangeIdx: number) {
    setLoading(true)
    setSelected(rangeIdx)
    const { interval, range } = RANGES[rangeIdx]
    try {
      const res = await fetch(`${API}/v1/chart/${symbol}?interval=${interval}&range=${range}`)
      const json = await res.json()
      if (!json.data) return
      const bars: Bar[] = json.data
      const points: ChartPoint[] = bars
        .filter(b => b.close > 0)
        .map(b => ({
          label: formatLabel(b.timestampEpoch, interval),
          price: b.close,
          epoch: b.timestampEpoch,
        }))
      setData(points)
      if (points.length > 0) setOpenPrice(points[0].price)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChart(0) }, [symbol])

  const lastPrice = data.length ? data[data.length - 1].price : 0
  const isUp = lastPrice >= openPrice
  const color = isUp ? '#22c55e' : '#ef4444'
  const gradId = `grad-${symbol.replace(/[^a-z0-9]/gi, '')}`

  const minPrice = data.length ? Math.min(...data.map(d => d.price)) * 0.999 : 0
  const maxPrice = data.length ? Math.max(...data.map(d => d.price)) * 1.001 : 0

  return (
    <div className="mt-3">
      {/* Timeframe buttons */}
      <div className="flex gap-1 mb-3">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => loadChart(i)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              selected === i
                ? 'bg-slate-600 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <div className="h-40 flex items-center justify-center text-slate-600 text-xs">Loading…</div>}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.toFixed(0)}
              width={45}
            />
            <Tooltip content={<CustomTooltip color={color} />} />
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
    </div>
  )
}
