'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  marketCap: number
  volume24h: number
  rank: number
}

function fmtPrice(p: number): string {
  if (p >= 1000)  return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1)     return p.toFixed(2)
  if (p >= 0.001) return p.toFixed(4)
  return p.toFixed(6)
}

function fmtCap(n: number): string {
  if (!n) return ''
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

function CoinRow({ coin }: { coin: Coin }) {
  const up    = coin.change24h > 0
  const dn    = coin.change24h < 0
  const color = up ? 'text-green-400' : dn ? 'text-red-400' : 'text-slate-400'
  const sign  = coin.change24h >= 0 ? '+' : ''

  return (
    <Link
      href={`/ticker/${encodeURIComponent(coin.symbol + '-USD')}`}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors border-b border-slate-800/60 last:border-0"
    >
      {/* Rank */}
      <span className="text-[10px] text-slate-700 w-6 text-right shrink-0 font-mono">{coin.rank}</span>

      {/* Logo */}
      <img
        src={coin.image}
        alt={coin.symbol}
        className="w-6 h-6 rounded-full shrink-0"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
          {coin.symbol}
        </div>
        <div className="text-[10px] text-slate-600 truncate">{coin.name}</div>
      </div>

      {/* Price */}
      <div className={`font-mono text-sm font-bold ${color} shrink-0`}>
        ${fmtPrice(coin.price)}
      </div>

      {/* Change */}
      <div className={`font-mono text-xs w-16 text-right shrink-0 ${color}`}>
        {sign}{coin.change24h.toFixed(2)}%
      </div>

      {/* Market cap */}
      <div className="text-[10px] text-slate-600 font-mono w-16 text-right shrink-0 hidden sm:block">
        {fmtCap(coin.marketCap)}
      </div>

      {/* Arrow */}
      <svg className="w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

export default function CryptoPanel() {
  const [pages, setPages]           = useState<Coin[][]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState('')
  const [filter, setFilter]         = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const cache = useRef<Record<number, Coin[]>>({})

  async function fetchPage(page: number, isRefresh = false) {
    if (cache.current[page] && !isRefresh) {
      return cache.current[page]
    }
    const res = await fetch(`/api/crypto?page=${page}`)
    if (res.status === 429) throw new Error('rate_limited')
    if (!res.ok) throw new Error('upstream')
    const data: Coin[] = await res.json()
    cache.current[page] = data
    return data
  }

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setLoading(true)
      const data = await fetchPage(1, refresh)
      setPages([data])
      setCurrentPage(1)
      setLastUpdate(new Date().toLocaleTimeString())
      setError('')
    } catch (e: unknown) {
      if ((e as Error).message === 'rate_limited') {
        setError('CoinGecko rate limit — refreshing shortly…')
      } else {
        setError('Failed to load prices')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadMore() {
    const next = currentPage + 1
    if (next > 3) return // cap at 300 coins
    setLoadingMore(true)
    try {
      const data = await fetchPage(next)
      setPages(prev => [...prev, data])
      setCurrentPage(next)
    } catch { /* ignore */ }
    finally { setLoadingMore(false) }
  }

  useEffect(() => {
    load(true)
    const id = setInterval(() => {
      cache.current = {} // invalidate cache on refresh
      load(true)
    }, 60_000)
    return () => clearInterval(id)
  }, [load])

  const allCoins = pages.flat()
  const filtered = filter.trim()
    ? allCoins.filter(c =>
        c.symbol.toLowerCase().includes(filter.toLowerCase()) ||
        c.name.toLowerCase().includes(filter.toLowerCase())
      )
    : allCoins

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
            <path fill="#0f172a" d="M17.44 10.71c.24-1.62-.99-2.49-2.68-3.07l.55-2.19-1.33-.33-.53 2.13c-.35-.09-.71-.17-1.07-.25l.54-2.16-1.33-.33-.55 2.19c-.29-.07-.57-.13-.85-.2l.001-.005-1.84-.46-.35 1.42s.99.23.97.24c.54.13.64.49.62.77l-1.49 5.97c-.07.17-.23.43-.62.33.01.02-.97-.24-.97-.24l-.67 1.52 1.73.43c.32.08.64.17.95.25l-.56 2.23 1.33.33.55-2.19c.37.1.72.19 1.07.28l-.54 2.17 1.33.33.56-2.22c2.31.44 4.04.26 4.77-1.83.59-1.68-.03-2.65-1.24-3.28.88-.2 1.54-.78 1.72-1.97zm-3.08 4.32c-.42 1.68-3.26.77-4.18.54l.75-2.99c.92.23 3.87.69 3.43 2.45zm.42-4.35c-.38 1.53-2.74.75-3.51.56l.68-2.71c.77.19 3.24.55 2.83 2.15z"/>
          </svg>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Crypto</h2>
          {!loading && allCoins.length > 0 && (
            <span className="text-[10px] text-slate-700 border border-slate-800 px-1.5 py-0.5 rounded-full">
              Top {allCoins.length}
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
            placeholder="Search any coin…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-xs
                       placeholder-slate-600 text-slate-300 focus:outline-none focus:border-slate-500 transition-colors"
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
      {!loading && allCoins.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-800/40 bg-slate-900/30">
          <span className="text-[10px] text-slate-700 w-6 text-right shrink-0">#</span>
          <span className="w-6 shrink-0" />
          <span className="text-[10px] text-slate-600 flex-1">Name</span>
          <span className="text-[10px] text-slate-600 shrink-0">Price</span>
          <span className="text-[10px] text-slate-600 w-16 text-right shrink-0">24h</span>
          <span className="text-[10px] text-slate-600 w-16 text-right shrink-0 hidden sm:block">Mkt Cap</span>
          <span className="w-3 shrink-0" />
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto max-h-[520px]">
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/40">
                <div className="w-6 h-3 bg-slate-800 rounded animate-pulse" />
                <div className="w-6 h-6 bg-slate-800 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 bg-slate-800 rounded animate-pulse w-12" />
                  <div className="h-2 bg-slate-800 rounded animate-pulse w-20" />
                </div>
                <div className="h-3 bg-slate-800 rounded animate-pulse w-16" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        )}

        {error && !allCoins.length && (
          <div className="text-center py-8 text-slate-500 text-xs">{error}</div>
        )}

        {!loading && filtered.length === 0 && filter && (
          <div className="text-center py-8 text-slate-600 text-sm">No results for &ldquo;{filter}&rdquo;</div>
        )}

        {!loading && filtered.map(coin => <CoinRow key={coin.id} coin={coin} />)}

        {/* Load more */}
        {!loading && !filter && currentPage < 3 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 text-xs text-slate-500 hover:text-slate-300 transition-colors border-t border-slate-800 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : `Load more (${currentPage * 100} shown)`}
          </button>
        )}
        {!loading && !filter && currentPage >= 3 && (
          <div className="py-3 text-center text-[10px] text-slate-700 border-t border-slate-800">
            Showing top 300 coins by market cap · Use search for others
          </div>
        )}
      </div>
    </div>
  )
}
