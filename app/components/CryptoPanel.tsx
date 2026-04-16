'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL

const CRYPTOS = [
  { symbol: 'BTC-USD', name: 'Bitcoin',   abbr: 'BTC', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'hover:border-orange-400/50 hover:shadow-orange-900/40' },
  { symbol: 'ETH-USD', name: 'Ethereum',  abbr: 'ETH', color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  glow: 'hover:border-violet-400/50 hover:shadow-violet-900/40' },
  { symbol: 'SOL-USD', name: 'Solana',    abbr: 'SOL', color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  glow: 'hover:border-purple-400/50 hover:shadow-purple-900/40' },
  { symbol: 'BNB-USD', name: 'BNB',       abbr: 'BNB', color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  glow: 'hover:border-yellow-400/50 hover:shadow-yellow-900/40' },
  { symbol: 'XRP-USD', name: 'XRP',       abbr: 'XRP', color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     glow: 'hover:border-sky-400/50 hover:shadow-sky-900/40'       },
  { symbol: 'DOGE-USD',name: 'Dogecoin',  abbr: 'DOGE',color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   glow: 'hover:border-amber-400/50 hover:shadow-amber-900/40'   },
  { symbol: 'ADA-USD', name: 'Cardano',   abbr: 'ADA', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'hover:border-blue-400/50 hover:shadow-blue-900/40'     },
  { symbol: 'AVAX-USD',name: 'Avalanche', abbr: 'AVAX',color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'hover:border-red-400/50 hover:shadow-red-900/40'       },
]

interface Quote {
  price: number
  change: number
  changePercent: number
  marketCap: number
  volume: number
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1)    return p.toFixed(2)
  if (p >= 0.01) return p.toFixed(4)
  return p.toFixed(6)
}

function fmtCap(n: number): string {
  if (!n) return ''
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return ''
}

export default function CryptoPanel() {
  const [quotes, setQuotes]         = useState<Record<string, Quote>>({})
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function load() {
    try {
      const results = await Promise.allSettled(
        CRYPTOS.map(c =>
          fetch(`${API}/v1/quote/${encodeURIComponent(c.symbol)}`)
            .then(r => r.json())
            .then(j => ({ symbol: c.symbol, data: j.data as Quote }))
        )
      )
      const map: Record<string, Quote> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.data) {
          map[r.value.symbol] = r.value.data
        }
      }
      setQuotes(map)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch { /* silently retry */ }
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
          {/* Bitcoin-style icon */}
          <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
            <path fill="#1a1a2e" d="M17.44 10.71c.24-1.62-.99-2.49-2.68-3.07l.55-2.19-1.33-.33-.53 2.13c-.35-.09-.71-.17-1.07-.25l.54-2.16-1.33-.33-.55 2.19c-.29-.07-.57-.13-.85-.2l.001-.005-1.84-.46-.35 1.42s.99.23.97.24c.54.13.64.49.62.77l-1.49 5.97c-.07.17-.23.43-.62.33.01.02-.97-.24-.97-.24l-.67 1.52 1.73.43c.32.08.64.17.95.25l-.56 2.23 1.33.33.55-2.19c.37.1.72.19 1.07.28l-.54 2.17 1.33.33.56-2.22c2.31.44 4.04.26 4.77-1.83.59-1.68-.03-2.65-1.24-3.28.88-.2 1.54-.78 1.72-1.97zm-3.08 4.32c-.42 1.68-3.26.77-4.18.54l.75-2.99c.92.23 3.87.69 3.43 2.45zm.42-4.35c-.38 1.53-2.74.75-3.51.56l.68-2.71c.77.19 3.24.55 2.83 2.15z"/>
          </svg>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Crypto
          </h2>
          <span className="text-[10px] text-slate-700 border border-slate-800 px-1.5 py-0.5 rounded-full">24h</span>
        </div>
        {lastUpdate && (
          <span className="text-[10px] text-slate-700">updated {lastUpdate}</span>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-2">
            {CRYPTOS.map(c => {
              const q    = quotes[c.symbol]
              const up   = q && q.change > 0
              const dn   = q && q.change < 0
              const sign = q && q.change >= 0 ? '+' : ''

              return (
                <Link
                  key={c.symbol}
                  href={`/ticker/${encodeURIComponent(c.symbol)}`}
                  className={`group relative border rounded-xl p-3 transition-all duration-200 cursor-pointer
                              ${c.bg} ${c.border} ${c.glow}
                              hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className={`text-xs font-bold ${c.color}`}>{c.abbr}</div>
                      <div className="text-[10px] text-slate-600">{c.name}</div>
                    </div>
                    {q ? (
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        up ? 'bg-green-500/10 text-green-400' :
                        dn ? 'bg-red-500/10 text-red-400'    : 'text-slate-500'
                      }`}>
                        {sign}{q.changePercent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-700">—</span>
                    )}
                  </div>

                  {q ? (
                    <>
                      <div className={`font-mono font-bold text-base ${
                        up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        ${fmtPrice(q.price)}
                      </div>
                      {fmtCap(q.marketCap) && (
                        <div className="text-[10px] text-slate-700 font-mono mt-0.5">
                          Mkt {fmtCap(q.marketCap)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-5 bg-slate-800/60 rounded animate-pulse w-20 mt-1" />
                  )}

                  {/* Arrow on hover */}
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition-opacity">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
