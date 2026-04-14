'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

const SECTOR_LABELS: Record<string, string> = {
  energy: 'Energy',
  metals: 'Metals',
  grains: 'Grains',
}

const SYMBOL_NAMES: Record<string, string> = {
  'CL=F': 'WTI Crude', 'NG=F': 'Nat Gas', 'BZ=F': 'Brent',
  'GC=F': 'Gold',      'SI=F': 'Silver',   'HG=F': 'Copper',
  'ZC=F': 'Corn',      'ZW=F': 'Wheat',    'ZS=F': 'Soybeans',
}

interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  currency: string
}

interface Snapshot {
  energy: Quote[]
  metals: Quote[]
  grains: Quote[]
}

function Tile({ q }: { q: Quote }) {
  const up = q.change > 0
  const dn = q.change < 0
  const color = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const bg    = up ? 'border-green-900/40' : dn ? 'border-red-900/40' : 'border-slate-800'

  return (
    <div className={`bg-slate-900 border ${bg} rounded-lg p-3`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-slate-300">
          {SYMBOL_NAMES[q.symbol] ?? q.symbol}
        </span>
        <span className={`text-xs font-mono ${color}`}>
          {q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className={`font-mono font-bold text-xl ${color}`}>
        {q.price.toFixed(2)}
      </div>
      <div className="flex justify-between mt-1 text-xs text-slate-600 font-mono">
        <span>H {q.high.toFixed(2)}</span>
        <span>L {q.low.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default function CommodityDashboard() {
  const [data, setData]       = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function load() {
    try {
      const res = await fetch(`${API}/v1/commodities/futures`)
      const json = await res.json()
      setData(json.data)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {
      // silently retry on next tick
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000) // refresh every 30s
    return () => clearInterval(id)
  }, [])

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Commodity Futures
        </h2>
        {lastUpdate && (
          <span className="text-xs text-slate-700">updated {lastUpdate}</span>
        )}
      </div>

      {loading && (
        <div className="text-slate-600 text-sm">Loading…</div>
      )}

      {data && (
        <div className="space-y-4">
          {(['energy', 'metals', 'grains'] as const).map(sector => (
            <div key={sector}>
              <div className="text-xs text-slate-600 uppercase tracking-wider mb-2">
                {SECTOR_LABELS[sector]}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(data[sector] ?? []).map(q => <Tile key={q.symbol} q={q} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
