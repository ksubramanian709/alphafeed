'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'
import Link from 'next/link'


interface MarketItem {
  symbol: string
  label: string
  category: string
  price: number
  change: number
  changePercent: number
  currency: string
  marketState: string | null
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
}

const CATEGORIES = [
  { key: 'indices',    label: 'Global Indices', icon: '📈' },
  { key: 'sectors',    label: 'US Sectors',     icon: '🏛️' },
  { key: 'equities',   label: 'Mega Caps',      icon: '🏢' },
  { key: 'crypto',     label: 'Crypto',         icon: '₿'  },
  { key: 'commodities',label: 'Commodities',    icon: '🛢️' },
]

function fmt(price: number, symbol: string): string {
  if (symbol === '^TNX') return price.toFixed(2) + '%'
  if (symbol === '^VIX') return price.toFixed(2)
  if (price >= 10000)    return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1000)     return price.toLocaleString('en-US', { maximumFractionDigits: 1 })
  if (price >= 100)      return price.toFixed(2)
  return price.toFixed(2)
}

function PulseTile({ item }: { item: MarketItem }) {
  const hasExtended = item.extendedPrice != null && item.extendedChange != null
  const isPost = item.marketState === 'POST' || item.marketState === 'POSTPOST' || item.marketState === 'CLOSED'
  const isPre  = item.marketState === 'PRE'

  // Use extended price for color when in extended session
  const displayChange = hasExtended && item.extendedChange != null ? item.extendedChange : item.change
  const up    = displayChange > 0
  const dn    = displayChange < 0
  const color = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const bg    = up ? 'bg-green-500/8 border-green-900/40 hover:border-green-500/40 hover:bg-green-500/12'
                   : dn ? 'bg-red-500/8 border-red-900/40 hover:border-red-500/40 hover:bg-red-500/12'
                   : 'bg-slate-900 border-slate-800 hover:border-slate-600'

  const sign = item.change >= 0 ? '+' : ''
  const extSign = (item.extendedChange ?? 0) >= 0 ? '+' : ''

  return (
    <Link
      href={`/ticker/${encodeURIComponent(item.symbol)}`}
      className={`group shrink-0 border rounded-xl px-3.5 py-2.5 min-w-[118px] transition-all duration-150
                  hover:scale-[1.03] hover:shadow-md ${bg}`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">
          {item.label}
        </div>
        {hasExtended && (isPre || isPost) && (
          <span className={`text-[8px] font-semibold px-1 py-px rounded leading-none shrink-0 ${
            isPre ? 'text-sky-500 bg-sky-500/10' : 'text-orange-400 bg-orange-500/10'
          }`}>
            {isPre ? 'PRE' : 'AH'}
          </span>
        )}
      </div>

      {hasExtended && item.extendedPrice != null && item.extendedChangePercent != null ? (
        <>
          <div className={`font-mono font-bold text-sm ${color}`}>
            {fmt(item.extendedPrice, item.symbol)}
          </div>
          <div className={`font-mono text-[10px] mt-0.5 ${color}`}>
            {extSign}{item.extendedChangePercent.toFixed(2)}%
          </div>
          <div className="font-mono text-[9px] text-slate-700 mt-px">
            reg {fmt(item.price, item.symbol)}
          </div>
        </>
      ) : (
        <>
          <div className={`font-mono font-bold text-sm ${color}`}>
            {fmt(item.price, item.symbol)}
          </div>
          <div className={`font-mono text-[10px] mt-0.5 ${color}`}>
            {sign}{item.changePercent.toFixed(2)}%
          </div>
        </>
      )}
    </Link>
  )
}

export default function MarketPulse() {
  const [items, setItems]           = useState<MarketItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function load() {
    try {
      const res  = await fetch(`${BACKEND}/v1/markets/overview`)
      const json = await res.json()
      if (json.data) {
        setItems(json.data)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch { /* silently retry */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const byCategory = (key: string) => items.filter(i => i.category === key)

  const skeletonRow = (n: number) => (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="shrink-0 w-28 h-[62px] bg-slate-800 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Market Pulse</h2>
        </div>
        {lastUpdate && (
          <span className="text-[10px] text-slate-700">updated {lastUpdate}</span>
        )}
      </div>

      {/* Category rows */}
      <div className="divide-y divide-slate-800/60">
        {loading
          ? CATEGORIES.map(c => (
              <div key={c.key} className="px-5 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">{c.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{c.label}</span>
                </div>
                {skeletonRow(c.key === 'equities' ? 8 : c.key === 'indices' ? 6 : 4)}
              </div>
            ))
          : CATEGORIES.map(c => {
              const row = byCategory(c.key)
              if (row.length === 0) return null
              return (
                <div key={c.key} className="px-5 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs">{c.icon}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{c.label}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {row.map(item => <PulseTile key={item.symbol} item={item} />)}
                  </div>
                </div>
              )
            })
        }
      </div>
    </section>
  )
}
