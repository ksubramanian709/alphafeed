'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'
import Link from 'next/link'


interface MarketItem {
  symbol: string
  label: string
  price: number
  change: number
  changePercent: number
  currency: string
}

function fmt(n: number, symbol: string): string {
  if (symbol === '^TNX') return n.toFixed(2) + '%'
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1000)  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return n.toFixed(2)
}

export default function MarketsOverview() {
  const [items, setItems]       = useState<MarketItem[]>([])
  const [loading, setLoading]   = useState(true)
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

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="shrink-0 w-28 h-14 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {items.map(item => {
          const up   = item.change > 0
          const dn   = item.change < 0
          const sign = item.change >= 0 ? '+' : ''
          const color     = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
          const borderColor = up ? 'border-green-900/40' : dn ? 'border-red-900/40' : 'border-slate-800'
          const bgColor   = up ? 'bg-green-950/20' : dn ? 'bg-red-950/20' : 'bg-slate-900'

          return (
            <Link
              key={item.symbol}
              href={`/ticker/${encodeURIComponent(item.symbol)}`}
              className={`shrink-0 rounded-lg border px-3 py-2.5 min-w-[120px] ${bgColor} ${borderColor}
                          hover:brightness-125 hover:border-slate-600 transition-all cursor-pointer`}
            >
              <div className="text-xs text-slate-500 font-medium mb-1 whitespace-nowrap">{item.label}</div>
              <div className={`font-mono font-bold text-sm ${color}`}>
                {fmt(item.price, item.symbol)}
              </div>
              <div className={`font-mono text-xs mt-0.5 ${color}`}>
                {sign}{item.changePercent.toFixed(2)}%
              </div>
            </Link>
          )
        })}
      </div>
      {lastUpdate && (
        <p className="text-xs text-slate-700 mt-1.5">updated {lastUpdate} · refreshes every 60s</p>
      )}
    </div>
  )
}
