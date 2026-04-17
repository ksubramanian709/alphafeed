'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL

interface FxRate {
  symbol: string   // EURUSD=X
  pair: string     // EUR/USD
  base: string     // EUR
  quote: string    // USD
  rate: number
  change: number
  changePercent: number
}

interface FxGroup {
  label: string
  pairs: { symbol: string; pair: string; base: string; quote: string }[]
}

const GROUPS: FxGroup[] = [
  {
    label: 'Major Pairs',
    pairs: [
      { symbol: 'EURUSD=X',  pair: 'EUR/USD', base: 'EUR', quote: 'USD' },
      { symbol: 'GBPUSD=X',  pair: 'GBP/USD', base: 'GBP', quote: 'USD' },
      { symbol: 'USDJPY=X',  pair: 'USD/JPY', base: 'USD', quote: 'JPY' },
      { symbol: 'USDCHF=X',  pair: 'USD/CHF', base: 'USD', quote: 'CHF' },
      { symbol: 'AUDUSD=X',  pair: 'AUD/USD', base: 'AUD', quote: 'USD' },
      { symbol: 'USDCAD=X',  pair: 'USD/CAD', base: 'USD', quote: 'CAD' },
      { symbol: 'NZDUSD=X',  pair: 'NZD/USD', base: 'NZD', quote: 'USD' },
      { symbol: 'USDCNY=X',  pair: 'USD/CNY', base: 'USD', quote: 'CNY' },
    ],
  },
  {
    label: 'Cross Pairs',
    pairs: [
      { symbol: 'EURGBP=X',  pair: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
      { symbol: 'EURJPY=X',  pair: 'EUR/JPY', base: 'EUR', quote: 'JPY' },
      { symbol: 'GBPJPY=X',  pair: 'GBP/JPY', base: 'GBP', quote: 'JPY' },
      { symbol: 'EURCHF=X',  pair: 'EUR/CHF', base: 'EUR', quote: 'CHF' },
      { symbol: 'AUDJPY=X',  pair: 'AUD/JPY', base: 'AUD', quote: 'JPY' },
      { symbol: 'CADJPY=X',  pair: 'CAD/JPY', base: 'CAD', quote: 'JPY' },
      { symbol: 'GBPAUD=X',  pair: 'GBP/AUD', base: 'GBP', quote: 'AUD' },
      { symbol: 'EURAUD=X',  pair: 'EUR/AUD', base: 'EUR', quote: 'AUD' },
    ],
  },
  {
    label: 'Emerging Markets',
    pairs: [
      { symbol: 'USDMXN=X',  pair: 'USD/MXN', base: 'USD', quote: 'MXN' },
      { symbol: 'USDBRL=X',  pair: 'USD/BRL', base: 'USD', quote: 'BRL' },
      { symbol: 'USDINR=X',  pair: 'USD/INR', base: 'USD', quote: 'INR' },
      { symbol: 'USDKRW=X',  pair: 'USD/KRW', base: 'USD', quote: 'KRW' },
      { symbol: 'USDTRY=X',  pair: 'USD/TRY', base: 'USD', quote: 'TRY' },
      { symbol: 'USDZAR=X',  pair: 'USD/ZAR', base: 'USD', quote: 'ZAR' },
      { symbol: 'USDSGD=X',  pair: 'USD/SGD', base: 'USD', quote: 'SGD' },
      { symbol: 'USDHKD=X',  pair: 'USD/HKD', base: 'USD', quote: 'HKD' },
    ],
  },
  {
    label: 'Dollar Index & Rates',
    pairs: [
      { symbol: 'DX-Y.NYB',  pair: 'DXY',     base: 'USD', quote: 'INDEX' },
      { symbol: '^TNX',      pair: '10Y Yield',base: 'US',  quote: '%' },
      { symbol: '^IRX',      pair: '13W T-Bill',base: 'US', quote: '%' },
      { symbol: '^FVX',      pair: '5Y Yield', base: 'US',  quote: '%' },
      { symbol: '^TYX',      pair: '30Y Yield',base: 'US',  quote: '%' },
    ],
  },
]

const ALL_SYMBOLS = GROUPS.flatMap(g => g.pairs.map(p => p.symbol))

function fmtRate(rate: number, symbol: string): string {
  if (symbol === '^TNX' || symbol === '^IRX' || symbol === '^FVX' || symbol === '^TYX') {
    return rate.toFixed(3) + '%'
  }
  if (rate >= 100) return rate.toFixed(2)
  if (rate >= 10)  return rate.toFixed(3)
  return rate.toFixed(4)
}

function FxRow({ rate }: { rate: FxRate }) {
  const up   = rate.changePercent > 0
  const dn   = rate.changePercent < 0
  const cls  = up ? 'text-emerald-400' : dn ? 'text-red-400' : 'text-slate-400'
  const sign = rate.changePercent >= 0 ? '+' : ''
  const bgUp = up ? 'bg-emerald-500/5' : dn ? 'bg-red-500/5' : ''

  return (
    <Link
      href={`/ticker/${encodeURIComponent(rate.symbol)}`}
      className={`group flex items-center gap-3 px-5 py-3 hover:bg-slate-800/60
        transition-colors border-b border-slate-800/50 last:border-0 ${bgUp}`}
    >
      {/* Pair badge */}
      <div className="shrink-0 w-24">
        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors font-mono">
          {rate.pair}
        </span>
      </div>

      {/* Bar visual — shows magnitude of move */}
      <div className="flex-1 hidden sm:block">
        <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 h-full rounded-full transition-all ${up ? 'bg-emerald-500/50 right-1/2' : dn ? 'bg-red-500/50 left-1/2' : 'bg-slate-600 left-1/2'}`}
            style={{ width: `${Math.min(Math.abs(rate.changePercent) * 8, 50)}%` }}
          />
          <div className="absolute left-1/2 top-0 w-px h-full bg-slate-700" />
        </div>
      </div>

      {/* Rate */}
      <div className={`font-mono font-bold text-sm w-24 text-right shrink-0 ${cls}`}>
        {fmtRate(rate.rate, rate.symbol)}
      </div>

      {/* Change */}
      <div className={`font-mono text-xs w-20 text-right shrink-0 ${cls}`}>
        {sign}{rate.changePercent.toFixed(3)}%
      </div>

      {/* Change value */}
      <div className={`font-mono text-xs w-20 text-right shrink-0 hidden md:block ${cls}`}>
        {rate.change >= 0 ? '+' : ''}{fmtRate(rate.change, rate.symbol)}
      </div>

      <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function FxSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/40">
          <div className="w-20 h-4 bg-slate-800 rounded animate-pulse" />
          <div className="flex-1 h-1 bg-slate-800 rounded animate-pulse hidden sm:block" />
          <div className="w-20 h-4 bg-slate-800 rounded animate-pulse ml-auto" />
          <div className="w-16 h-4 bg-slate-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function ForexPanel() {
  const [rates, setRates]       = useState<Map<string, FxRate>>(new Map())
  const [loading, setLoading]   = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const load = useCallback(async () => {
    const results = await Promise.allSettled(
      ALL_SYMBOLS.map(sym =>
        fetch(`${API}/v1/quote/${encodeURIComponent(sym)}`).then(r => r.json())
      )
    )

    const map = new Map<string, FxRate>()
    results.forEach((res, i) => {
      const sym = ALL_SYMBOLS[i]
      if (res.status === 'fulfilled' && res.value?.data) {
        const d = res.value.data
        const meta = GROUPS.flatMap(g => g.pairs).find(p => p.symbol === sym)
        map.set(sym, {
          symbol: sym,
          pair: meta?.pair ?? sym,
          base: meta?.base ?? '',
          quote: meta?.quote ?? '',
          rate: d.price ?? 0,
          change: d.change ?? 0,
          changePercent: d.changePercent ?? 0,
        })
      }
    })
    setRates(map)
    setLastUpdate(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="space-y-5">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-5 py-2 text-[10px] uppercase tracking-widest text-slate-600">
        <div className="w-24">Pair</div>
        <div className="flex-1 hidden sm:block">Move</div>
        <div className="w-24 text-right ml-auto">Rate</div>
        <div className="w-20 text-right">Change %</div>
        <div className="w-20 text-right hidden md:block">Change</div>
        <div className="w-3.5" />
      </div>

      {GROUPS.map(group => {
        const groupRates = group.pairs.map(p => rates.get(p.symbol)).filter((r): r is FxRate => !!r)

        return (
          <div key={group.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Group header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </h2>
              {lastUpdate && (
                <span className="text-[10px] text-slate-700">updated {lastUpdate}</span>
              )}
            </div>

            {loading ? (
              <FxSkeleton />
            ) : groupRates.length === 0 ? (
              <div className="px-5 py-6 text-center text-slate-700 text-sm">No data</div>
            ) : (
              <div>
                {groupRates.map(r => <FxRow key={r.symbol} rate={r} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
