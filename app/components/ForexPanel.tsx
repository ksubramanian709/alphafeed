'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'


// ── Meta ──────────────────────────────────────────────────────────────────────

const GROUP_META: Record<string, { label: string; icon: string; accent: string }> = {
  majors:    { label: 'Major Pairs',        icon: '💱', accent: 'text-sky-400'    },
  crosses:   { label: 'Cross Pairs',        icon: '🔀', accent: 'text-teal-400'   },
  emerging:  { label: 'Emerging Markets',   icon: '🌍', accent: 'text-amber-400'  },
  dxy:       { label: 'Dollar Index & Rates', icon: '🏦', accent: 'text-violet-400' },
}

const PAIR_META: Record<string, { name: string; base: string; quote: string }> = {
  // Majors
  'EURUSD=X': { name: 'Euro / US Dollar',        base: 'EUR', quote: 'USD' },
  'GBPUSD=X': { name: 'British Pound / US Dollar',base: 'GBP', quote: 'USD' },
  'USDJPY=X': { name: 'US Dollar / Japanese Yen', base: 'USD', quote: 'JPY' },
  'USDCHF=X': { name: 'US Dollar / Swiss Franc',  base: 'USD', quote: 'CHF' },
  'AUDUSD=X': { name: 'Aus Dollar / US Dollar',   base: 'AUD', quote: 'USD' },
  'USDCAD=X': { name: 'US Dollar / Canadian $',   base: 'USD', quote: 'CAD' },
  'NZDUSD=X': { name: 'NZ Dollar / US Dollar',    base: 'NZD', quote: 'USD' },
  'USDCNY=X': { name: 'US Dollar / Chinese Yuan', base: 'USD', quote: 'CNY' },
  // Crosses
  'EURGBP=X': { name: 'Euro / British Pound',     base: 'EUR', quote: 'GBP' },
  'EURJPY=X': { name: 'Euro / Japanese Yen',      base: 'EUR', quote: 'JPY' },
  'GBPJPY=X': { name: 'British Pound / Yen',      base: 'GBP', quote: 'JPY' },
  'EURCHF=X': { name: 'Euro / Swiss Franc',        base: 'EUR', quote: 'CHF' },
  'AUDJPY=X': { name: 'Aus Dollar / Yen',          base: 'AUD', quote: 'JPY' },
  'CADJPY=X': { name: 'Canadian Dollar / Yen',     base: 'CAD', quote: 'JPY' },
  'GBPAUD=X': { name: 'British Pound / Aus Dollar',base: 'GBP', quote: 'AUD' },
  'EURAUD=X': { name: 'Euro / Aus Dollar',          base: 'EUR', quote: 'AUD' },
  // Emerging
  'USDMXN=X': { name: 'US Dollar / Mexican Peso',  base: 'USD', quote: 'MXN' },
  'USDBRL=X': { name: 'US Dollar / Brazilian Real', base: 'USD', quote: 'BRL' },
  'USDINR=X': { name: 'US Dollar / Indian Rupee',   base: 'USD', quote: 'INR' },
  'USDKRW=X': { name: 'US Dollar / Korean Won',     base: 'USD', quote: 'KRW' },
  'USDTRY=X': { name: 'US Dollar / Turkish Lira',   base: 'USD', quote: 'TRY' },
  'USDZAR=X': { name: 'US Dollar / South African Rand', base: 'USD', quote: 'ZAR' },
  'USDSGD=X': { name: 'US Dollar / Singapore Dollar',   base: 'USD', quote: 'SGD' },
  'USDHKD=X': { name: 'US Dollar / Hong Kong Dollar',   base: 'USD', quote: 'HKD' },
  // DXY & rates
  'DX-Y.NYB': { name: 'US Dollar Index (DXY)',       base: 'DXY', quote: '' },
  '^TNX':     { name: '10-Year Treasury Yield',      base: 'US',  quote: '%' },
  '^FVX':     { name: '5-Year Treasury Yield',       base: 'US',  quote: '%' },
  '^TYX':     { name: '30-Year Treasury Yield',      base: 'US',  quote: '%' },
  '^IRX':     { name: '13-Week T-Bill Yield',        base: 'US',  quote: '%' },
}

const GROUPS: { key: string; symbols: string[] }[] = [
  { key: 'majors',   symbols: ['EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X','NZDUSD=X','USDCNY=X'] },
  { key: 'crosses',  symbols: ['EURGBP=X','EURJPY=X','GBPJPY=X','EURCHF=X','AUDJPY=X','CADJPY=X','GBPAUD=X','EURAUD=X'] },
  { key: 'emerging', symbols: ['USDMXN=X','USDBRL=X','USDINR=X','USDKRW=X','USDTRY=X','USDZAR=X','USDSGD=X','USDHKD=X'] },
  { key: 'dxy',      symbols: ['DX-Y.NYB','^TNX','^FVX','^TYX','^IRX'] },
]

const ALL_SYMBOLS = GROUPS.flatMap(g => g.symbols)

// ── Types ─────────────────────────────────────────────────────────────────────

interface FxQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRate(rate: number, sym: string): string {
  if (sym === '^TNX' || sym === '^IRX' || sym === '^FVX' || sym === '^TYX') return rate.toFixed(3) + '%'
  if (rate >= 100) return rate.toFixed(2)
  if (rate >= 10)  return rate.toFixed(3)
  return rate.toFixed(4)
}

function pairLabel(sym: string): string {
  const m = PAIR_META[sym]
  if (!m) return sym
  if (!m.quote) return m.base
  return `${m.base}/${m.quote}`
}

// ── Row ───────────────────────────────────────────────────────────────────────

function FxRow({ q }: { q: FxQuote }) {
  const meta  = PAIR_META[q.symbol]
  const up    = q.change > 0
  const dn    = q.change < 0
  const color = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const sign  = q.change >= 0 ? '+' : ''

  const range = q.high - q.low
  const pos   = range > 0
    ? Math.min(100, Math.max(0, ((q.price - q.low) / range) * 100))
    : 50

  return (
    <Link
      href={`/ticker/${encodeURIComponent(q.symbol)}`}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 last:border-0"
    >
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
          {meta?.name ?? q.symbol}
        </div>
        <div className="text-[10px] text-slate-600 font-mono">{pairLabel(q.symbol)}</div>
      </div>

      {/* Day range bar */}
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
          <span>{fmtRate(q.low, q.symbol)}</span>
          <span>{fmtRate(q.high, q.symbol)}</span>
        </div>
      </div>

      {/* Rate */}
      <div className={`font-mono text-sm font-bold ${color} shrink-0 w-24 text-right`}>
        {fmtRate(q.price, q.symbol)}
      </div>

      {/* Change % */}
      <div className={`font-mono text-xs w-16 text-right shrink-0 ${color}`}>
        {sign}{q.changePercent.toFixed(3)}%
      </div>

      <svg className="w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function ForexPanel() {
  const [quotes, setQuotes]         = useState<Map<string, FxQuote>>(new Map())
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [filter, setFilter]         = useState('')
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const results = await Promise.allSettled(
      ALL_SYMBOLS.map(sym =>
        fetch(`${BACKEND}/v1/quote/${encodeURIComponent(sym)}`).then(r => r.json())
      )
    )
    const map = new Map<string, FxQuote>()
    results.forEach((res, i) => {
      const sym = ALL_SYMBOLS[i]
      if (res.status === 'fulfilled' && res.value?.data) {
        const d = res.value.data
        map.set(sym, {
          symbol: sym,
          price: d.price ?? 0,
          change: d.change ?? 0,
          changePercent: d.changePercent ?? 0,
          high: d.high ?? d.price ?? 0,
          low: d.low ?? d.price ?? 0,
        })
      }
    })
    setQuotes(map)
    setLastUpdate(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  function toggle(key: string) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const groups = GROUPS.map(g => ({
    ...g,
    meta: GROUP_META[g.key],
    rows: g.symbols
      .map(s => quotes.get(s))
      .filter((q): q is FxQuote => !!q && q.price > 0)
      .filter(q => {
        if (!filter) return true
        const f = filter.toLowerCase()
        const m = PAIR_META[q.symbol]
        return (
          q.symbol.toLowerCase().includes(f) ||
          (m?.name ?? '').toLowerCase().includes(f) ||
          pairLabel(q.symbol).toLowerCase().includes(f)
        )
      }),
  })).filter(g => g.rows.length > 0)

  const totalVisible = groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base">💱</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Forex</h2>
          {!loading && (
            <span className="text-[10px] text-slate-700 border border-slate-800 px-1.5 py-0.5 rounded-full">
              {totalVisible} pairs
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
            placeholder="EUR, JPY, peso…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-xs
                       placeholder-slate-600 text-slate-300 focus:outline-none focus:border-slate-500"
          />
          {filter && (
            <button onClick={() => setFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-sm leading-none">
              ×
            </button>
          )}
        </div>

        {lastUpdate && (
          <span className="text-[10px] text-slate-700 shrink-0 hidden sm:block">updated {lastUpdate}</span>
        )}
      </div>

      {/* Column headers */}
      {!loading && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-800/40 bg-slate-900/30">
          <span className="text-[10px] text-slate-600 flex-1">Pair</span>
          <span className="text-[10px] text-slate-600 w-20 hidden sm:block">Day Range</span>
          <span className="text-[10px] text-slate-600 w-24 text-right">Rate</span>
          <span className="text-[10px] text-slate-600 w-16 text-right">24h</span>
          <span className="w-3 shrink-0" />
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto max-h-[640px]">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40">
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-slate-800 rounded animate-pulse w-36" />
                  <div className="h-2 bg-slate-800 rounded animate-pulse w-16" />
                </div>
                <div className="h-3 bg-slate-800 rounded animate-pulse w-16 hidden sm:block" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-20" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            {filter ? `No results for "${filter}"` : 'No forex data available'}
          </div>
        )}

        {!loading && groups.map(({ key, meta, rows }) => (
          <div key={key} className="border-b border-slate-800/60 last:border-0">
            {/* Group header */}
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
                  {rows.length}
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
                {rows.map(q => <FxRow key={q.symbol} q={q} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
