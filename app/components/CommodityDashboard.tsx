'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'
import Link from 'next/link'


const SECTOR_META: Record<string, { label: string; icon: string; accent: string }> = {
  energy:        { label: 'Energy',          icon: '⚡', accent: 'text-orange-400' },
  metals:        { label: 'Metals',          icon: '✦',  accent: 'text-yellow-400' },
  grains:        { label: 'Grains',          icon: '🌾', accent: 'text-lime-400'   },
  softs:         { label: 'Softs',           icon: '☕', accent: 'text-amber-400'  },
  livestock:     { label: 'Livestock',       icon: '🐄', accent: 'text-rose-400'   },
  index_futures: { label: 'Index Futures',   icon: '📈', accent: 'text-blue-400'   },
  rates:         { label: 'Interest Rates',  icon: '🏦', accent: 'text-violet-400' },
  currencies:    { label: 'Currencies / FX', icon: '💱', accent: 'text-teal-400'   },
}

const SYMBOL_META: Record<string, { name: string; unit: string }> = {
  // Energy
  'CL=F':  { name: 'WTI Crude',        unit: '/bbl'   },
  'BZ=F':  { name: 'Brent Crude',      unit: '/bbl'   },
  'NG=F':  { name: 'Natural Gas',      unit: '/MMBtu' },
  'RB=F':  { name: 'RBOB Gasoline',    unit: '/gal'   },
  'HO=F':  { name: 'Heating Oil',      unit: '/gal'   },
  // Metals
  'GC=F':  { name: 'Gold',             unit: '/oz'    },
  'SI=F':  { name: 'Silver',           unit: '/oz'    },
  'HG=F':  { name: 'Copper',           unit: '/lb'    },
  'PL=F':  { name: 'Platinum',         unit: '/oz'    },
  'PA=F':  { name: 'Palladium',        unit: '/oz'    },
  // Grains
  'ZC=F':  { name: 'Corn',             unit: '/bu'    },
  'ZW=F':  { name: 'Chicago Wheat',    unit: '/bu'    },
  'KE=F':  { name: 'KC HRW Wheat',     unit: '/bu'    },
  'ZS=F':  { name: 'Soybeans',         unit: '/bu'    },
  'ZM=F':  { name: 'Soybean Meal',     unit: '/t'     },
  'ZL=F':  { name: 'Soybean Oil',      unit: '/lb'    },
  'ZO=F':  { name: 'Oats',             unit: '/bu'    },
  'ZR=F':  { name: 'Rough Rice',       unit: '/cwt'   },
  // Softs
  'KC=F':  { name: 'Arabica Coffee',   unit: '/lb'    },
  'SB=F':  { name: 'Sugar #11',        unit: '/lb'    },
  'CC=F':  { name: 'Cocoa',            unit: '/t'     },
  'CT=F':  { name: 'Cotton #2',        unit: '/lb'    },
  'OJ=F':  { name: 'Orange Juice',     unit: '/lb'    },
  'LBS=F': { name: 'Lumber',           unit: '/mbf'   },
  // Livestock
  'LE=F':  { name: 'Live Cattle',      unit: '/lb'    },
  'GF=F':  { name: 'Feeder Cattle',    unit: '/lb'    },
  'HE=F':  { name: 'Lean Hogs',        unit: '/lb'    },
  // Index futures
  'ES=F':  { name: 'E-mini S&P 500',   unit: 'pts'    },
  'NQ=F':  { name: 'E-mini Nasdaq',    unit: 'pts'    },
  'YM=F':  { name: 'E-mini Dow',       unit: 'pts'    },
  'RTY=F': { name: 'E-mini Russell',   unit: 'pts'    },
  'MES=F': { name: 'Micro S&P 500',    unit: 'pts'    },
  'MNQ=F': { name: 'Micro Nasdaq',     unit: 'pts'    },
  'MYM=F': { name: 'Micro Dow',        unit: 'pts'    },
  'M2K=F': { name: 'Micro Russell',    unit: 'pts'    },
  // Rates
  'ZB=F':  { name: '30Y T-Bond',       unit: ''       },
  'ZN=F':  { name: '10Y T-Note',       unit: ''       },
  'ZF=F':  { name: '5Y T-Note',        unit: ''       },
  'ZT=F':  { name: '2Y T-Note',        unit: ''       },
  'ZQ=F':  { name: 'Fed Funds',        unit: ''       },
  // FX
  'DX=F':  { name: 'USD Index',        unit: ''       },
  '6E=F':  { name: 'Euro',             unit: 'USD'    },
  '6J=F':  { name: 'Japanese Yen',     unit: 'USD'    },
  '6B=F':  { name: 'British Pound',    unit: 'USD'    },
  '6C=F':  { name: 'Canadian Dollar',  unit: 'USD'    },
  '6A=F':  { name: 'Australian Dollar',unit: 'USD'    },
  '6S=F':  { name: 'Swiss Franc',      unit: 'USD'    },
  '6N=F':  { name: 'NZ Dollar',        unit: 'USD'    },
  '6M=F':  { name: 'Mexican Peso',     unit: 'USD'    },
  '6L=F':  { name: 'Brazilian Real',   unit: 'USD'    },
  '6Z=F':  { name: 'South African Rand',unit: 'USD'   },
  '6I=F':  { name: 'Indian Rupee',     unit: 'USD'    },
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
  [sector: string]: Quote[]
}

function FuturesRow({ q }: { q: Quote }) {
  const meta   = SYMBOL_META[q.symbol] ?? { name: q.symbol, unit: '' }
  const up     = q.change > 0
  const dn     = q.change < 0
  const color  = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const sign   = q.change >= 0 ? '+' : ''
  const range  = q.high - q.low
  const pos    = range > 0 ? Math.min(100, Math.max(0, ((q.price - q.low) / range) * 100)) : 50

  return (
    <Link
      href={`/ticker/${encodeURIComponent(q.symbol)}`}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 last:border-0"
    >
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
          {meta.name}
        </div>
        <div className="text-[10px] text-slate-600 font-mono">{q.symbol}</div>
      </div>

      {/* Day range bar — compact */}
      <div className="hidden sm:block w-20 shrink-0">
        <div className="h-1 bg-slate-800 rounded-full relative">
          <div
            className={`h-full rounded-full ${up ? 'bg-green-600/70' : dn ? 'bg-red-600/70' : 'bg-slate-600/70'}`}
            style={{ width: `${pos}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white border border-slate-900"
            style={{ left: `calc(${pos}% - 3px)` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-0.5">
          <span>{q.low.toFixed(q.low < 10 ? 4 : 1)}</span>
          <span>{q.high.toFixed(q.high < 10 ? 4 : 1)}</span>
        </div>
      </div>

      {/* Price */}
      <div className={`font-mono text-sm font-bold ${color} shrink-0 w-24 text-right`}>
        {q.price.toFixed(q.price < 10 ? 4 : q.price < 100 ? 3 : 2)}
        <span className="text-[9px] text-slate-700 font-normal ml-0.5">{meta.unit}</span>
      </div>

      {/* Change % */}
      <div className={`font-mono text-xs w-16 text-right shrink-0 ${color}`}>
        {sign}{q.changePercent.toFixed(2)}%
      </div>

      <svg className="w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

export default function CommodityDashboard() {
  const [data, setData]             = useState<Snapshot | null>(null)
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [filter, setFilter]         = useState('')
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})

  async function load() {
    try {
      const res  = await fetch(`${BACKEND}/v1/commodities/futures`)
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

  function toggle(sector: string) {
    setCollapsed(prev => ({ ...prev, [sector]: !prev[sector] }))
  }

  const sectors = Object.entries(data ?? {})
    .map(([key, quotes]) => ({
      key,
      meta: SECTOR_META[key] ?? { label: key, icon: '📦', accent: 'text-slate-400' },
      quotes: quotes.filter(q => {
        if (!filter) return true
        const f = filter.toLowerCase()
        const m = SYMBOL_META[q.symbol]
        return q.symbol.toLowerCase().includes(f) || (m?.name ?? '').toLowerCase().includes(f)
      }),
    }))
    .filter(s => s.quotes.length > 0)

  const totalVisible = sectors.reduce((n, s) => n + s.quotes.length, 0)

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base">🛢️</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Futures
          </h2>
          {!loading && data && (
            <span className="text-[10px] text-slate-700 border border-slate-800 px-1.5 py-0.5 rounded-full">
              {totalVisible} contracts
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Gold, crude, euro…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-xs
                       placeholder-slate-600 text-slate-300 focus:outline-none focus:border-slate-500"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-sm leading-none">×</button>
          )}
        </div>

        {lastUpdate && (
          <span className="text-[10px] text-slate-700 shrink-0 hidden sm:block">updated {lastUpdate}</span>
        )}
      </div>

      {/* Column headers */}
      {!loading && data && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-800/40 bg-slate-900/30">
          <span className="text-[10px] text-slate-600 flex-1">Contract</span>
          <span className="text-[10px] text-slate-600 w-20 hidden sm:block">Day Range</span>
          <span className="text-[10px] text-slate-600 w-24 text-right">Price</span>
          <span className="text-[10px] text-slate-600 w-16 text-right">24h</span>
          <span className="w-3 shrink-0" />
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto max-h-[600px]">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40">
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-slate-800 rounded animate-pulse w-28" />
                  <div className="h-2 bg-slate-800 rounded animate-pulse w-16" />
                </div>
                <div className="h-3 bg-slate-800 rounded animate-pulse w-16" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        )}

        {!loading && sectors.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            {filter ? `No results for "${filter}"` : 'No futures data available'}
          </div>
        )}

        {!loading && sectors.map(({ key, meta, quotes }) => (
          <div key={key} className="border-b border-slate-800/60 last:border-0">
            {/* Sector header */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{meta.icon}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${meta.accent}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-slate-700 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {quotes.length}
                </span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-600 transition-transform ${collapsed[key] ? '-rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Rows */}
            {!collapsed[key] && (
              <div className="divide-y divide-slate-800/40">
                {quotes.map(q => <FuturesRow key={q.symbol} q={q} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
