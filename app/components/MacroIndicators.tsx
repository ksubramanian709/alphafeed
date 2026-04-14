'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Indicator {
  seriesId: string
  name: string
  value: number
  unit: string
  date: string
}

interface MacroData {
  [key: string]: Indicator
}

// Curated display config — subset of FRED series we care about
const DISPLAY: Array<{ id: string; label: string; format: (v: number) => string; description: string }> = [
  { id: 'FEDFUNDS', label: 'Fed Funds',   format: v => `${v.toFixed(2)}%`,  description: 'Effective federal funds rate' },
  { id: 'DGS10',    label: '10Y Yield',   format: v => `${v.toFixed(2)}%`,  description: '10-year Treasury yield' },
  { id: 'DGS2',     label: '2Y Yield',    format: v => `${v.toFixed(2)}%`,  description: '2-year Treasury yield' },
  { id: 'CPIAUCSL', label: 'CPI',         format: v => v.toFixed(1),        description: 'Consumer Price Index (all urban)' },
  { id: 'UNRATE',   label: 'Unemployment',format: v => `${v.toFixed(1)}%`,  description: 'US unemployment rate' },
  { id: 'DTWEXBGS', label: 'USD Index',   format: v => v.toFixed(2),        description: 'US dollar broad index' },
]

export default function MacroIndicators() {
  const [data, setData]         = useState<MacroData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastUpdate, setLastUpdate] = useState('')

  async function load() {
    try {
      const res = await fetch(`${API}/v1/economic`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else if (json.data) {
        setData(json.data)
        setLastUpdate(new Date().toLocaleTimeString())
        setError('')
      }
    } catch {
      setError('Failed to reach API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // FRED data updates at most daily — refresh every hour
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Yield curve spread (10Y - 2Y): positive = normal, negative = inverted
  const spread = data?.DGS10 && data?.DGS2
    ? data.DGS10.value - data.DGS2.value
    : null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Macro Indicators
          <span className="text-slate-700 normal-case tracking-normal font-normal ml-1">— FRED</span>
        </h2>
        {lastUpdate && (
          <span className="text-xs text-slate-700">updated {lastUpdate}</span>
        )}
      </div>

      {loading && <div className="text-slate-600 text-sm">Loading…</div>}

      {error && !data && (
        <div className="text-slate-600 text-sm bg-slate-900 border border-slate-800 rounded p-3">
          {error.includes('FRED_API_KEY') ? (
            <span>FRED data unavailable — add a free <span className="font-mono text-slate-500">FRED_API_KEY</span> to enable macro indicators.</span>
          ) : error}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Yield curve callout */}
          {spread !== null && (
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs border ${
              spread < 0
                ? 'bg-red-950/20 border-red-900/30 text-red-400'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <span className="font-semibold">
                {spread < 0 ? 'Yield Curve Inverted' : 'Yield Curve Normal'}
              </span>
              <span className="font-mono">
                10Y–2Y spread: {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
              </span>
              {spread < 0 && (
                <span className="text-red-600">historically precedes recession</span>
              )}
            </div>
          )}

          {/* Indicator grid */}
          <div className="grid grid-cols-3 gap-2">
            {DISPLAY.map(({ id, label, format }) => {
              const ind = data[id]
              if (!ind) return null
              return (
                <div
                  key={id}
                  title={ind.name}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5"
                >
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="font-mono font-semibold text-slate-200 text-base">
                    {format(ind.value)}
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    {ind.date}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
