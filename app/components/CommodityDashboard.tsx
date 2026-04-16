'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL

const SECTOR_META: Record<string, { label: string; icon: string; accent: string; glow: string }> = {
  energy: { label: 'Energy',  icon: '⚡', accent: 'text-orange-400', glow: 'hover:border-orange-500/40 hover:bg-orange-950/10' },
  metals: { label: 'Metals',  icon: '✦',  accent: 'text-yellow-400', glow: 'hover:border-yellow-500/40 hover:bg-yellow-950/10' },
  grains: { label: 'Grains',  icon: '🌾', accent: 'text-lime-400',   glow: 'hover:border-lime-500/40 hover:bg-lime-950/10'   },
}

const SYMBOL_META: Record<string, { name: string; unit: string }> = {
  'CL=F': { name: 'WTI Crude',  unit: '/bbl' },
  'NG=F': { name: 'Nat Gas',    unit: '/MMBtu' },
  'BZ=F': { name: 'Brent',      unit: '/bbl' },
  'GC=F': { name: 'Gold',       unit: '/oz' },
  'SI=F': { name: 'Silver',     unit: '/oz' },
  'HG=F': { name: 'Copper',     unit: '/lb' },
  'ZC=F': { name: 'Corn',       unit: '/bu' },
  'ZW=F': { name: 'Wheat',      unit: '/bu' },
  'ZS=F': { name: 'Soybeans',   unit: '/bu' },
}

interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
}

interface Snapshot {
  energy: Quote[]
  metals: Quote[]
  grains: Quote[]
}

function CommodityTile({ q, sector }: { q: Quote; sector: string }) {
  const meta   = SYMBOL_META[q.symbol] ?? { name: q.symbol, unit: '' }
  const sm     = SECTOR_META[sector]
  const up     = q.change > 0
  const dn     = q.change < 0
  const color  = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const border = up ? 'border-green-900/30' : dn ? 'border-red-900/30' : 'border-slate-800'
  const sign   = q.change >= 0 ? '+' : ''

  // 52w-style range bar using today's high/low
  const range  = q.high - q.low
  const pos    = range > 0 ? Math.min(100, Math.max(0, ((q.price - q.low) / range) * 100)) : 50

  return (
    <Link
      href={`/ticker/${encodeURIComponent(q.symbol)}`}
      className={`group relative bg-slate-900 border ${border} rounded-xl p-3.5 transition-all duration-200
                  ${sm.glow} hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30 cursor-pointer block`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
            {meta.name}
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-0.5">{q.symbol}</div>
        </div>
        <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
          up ? 'bg-green-500/10 text-green-400' : dn ? 'bg-red-500/10 text-red-400' : 'text-slate-500'
        }`}>
          {sign}{q.changePercent.toFixed(2)}%
        </span>
      </div>

      <div className={`font-mono font-bold text-xl ${color} mb-0.5`}>
        {q.price.toFixed(2)}
        <span className="text-xs text-slate-700 font-normal ml-1">{meta.unit}</span>
      </div>

      {/* Day range bar */}
      <div className="mt-2.5">
        <div className="flex justify-between text-[10px] text-slate-700 font-mono mb-1">
          <span>L {q.low.toFixed(2)}</span>
          <span>H {q.high.toFixed(2)}</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full relative">
          <div
            className={`h-full rounded-full transition-all ${up ? 'bg-green-600/60' : dn ? 'bg-red-600/60' : 'bg-slate-600/60'}`}
            style={{ width: `${pos}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-slate-900"
            style={{ left: `calc(${pos}% - 4px)` }}
          />
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

export default function CommodityDashboard() {
  const [data, setData]             = useState<Snapshot | null>(null)
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function load() {
    try {
      const res  = await fetch(`${API}/v1/commodities/futures`)
      const json = await res.json()
      setData(json.data)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch { /* retry on next tick */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛢️</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Commodity Futures
          </h2>
        </div>
        {lastUpdate && (
          <span className="text-[10px] text-slate-700">updated {lastUpdate}</span>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {(['energy', 'metals', 'grains'] as const).map(sector => {
              const sm = SECTOR_META[sector]
              return (
                <div key={sector}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{sm.icon}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${sm.accent}`}>
                      {sm.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(data[sector] ?? []).map(q => (
                      <CommodityTile key={q.symbol} q={q} sector={sector} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
