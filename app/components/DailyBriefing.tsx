'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState, useCallback } from 'react'


interface NewsItem {
  title: string
  url: string
  source: string
  summary: string | null
  publishedAt: string | null
  sentiment: string
  imageUrl: string | null
}

interface Bucket {
  label: string
  icon: string
  color: string
  items: NewsItem[]
}

function ageMs(iso: string | null): number {
  if (!iso) return 6 * 60 * 60 * 1000  // treat unknown age as 6h (shows in "Earlier Today")
  return Date.now() - new Date(iso).getTime()
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const s = Math.floor(ageMs(iso) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isFavicon(url: string | null) { return !!url?.includes('favicons') }

function sentimentDot(s: string) {
  if (s?.toLowerCase().includes('bullish')) return 'bg-green-400'
  if (s?.toLowerCase().includes('bearish')) return 'bg-red-400'
  return null
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000  // 24-hour hard cutoff

function bucketize(items: NewsItem[]): Bucket[] {
  const breaking:  NewsItem[] = []
  const recent:    NewsItem[] = []
  const earlier:   NewsItem[] = []

  for (const item of items) {
    const ms = ageMs(item.publishedAt)
    if (ms > MAX_AGE_MS) continue            // drop anything older than 24h
    if (ms < 60 * 60 * 1000)      breaking.push(item)   // < 1h
    else if (ms < 4 * 60 * 60 * 1000) recent.push(item) // 1h – 4h
    else                           earlier.push(item)   // 4h – 24h
  }

  const buckets: Bucket[] = []
  if (breaking.length) buckets.push({ label: 'Breaking',       icon: '🔴', color: 'text-red-400',   items: breaking })
  if (recent.length)   buckets.push({ label: 'Last Few Hours', icon: '🌅', color: 'text-amber-400', items: recent   })
  if (earlier.length)  buckets.push({ label: 'Earlier Today',  icon: '📰', color: 'text-slate-400', items: earlier  })
  return buckets
}

function NewsRow({ item }: { item: NewsItem }) {
  const dot = sentimentDot(item.sentiment)

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className={`shrink-0 rounded-lg overflow-hidden bg-slate-800 ${
        isFavicon(item.imageUrl) ? 'w-8 h-8 mt-0.5' : 'w-16 h-12'
      }`}>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 group-hover:text-white leading-snug line-clamp-2 transition-colors">
          {dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot} mr-1.5 mb-0.5`} />}
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-slate-500">{item.source}</span>
          {item.publishedAt && (
            <>
              <span className="text-[10px] text-slate-700">{fmtTime(item.publishedAt)}</span>
              <span className="text-[10px] text-slate-700">·</span>
              <span className="text-[10px] text-slate-700">{timeAgo(item.publishedAt)}</span>
            </>
          )}
        </div>
      </div>

      <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

export default function DailyBriefing() {
  const [buckets, setBuckets]       = useState<Bucket[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/v1/news`)
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      const items: NewsItem[] = json.data ?? []
      const b = bucketize(items)
      setBuckets(b)
      // Auto-expand breaking and morning
      const init: Record<string, boolean> = {}
      b.forEach(bk => { init[bk.label] = bk.label !== 'Earlier Today' })
      setExpanded(prev => ({ ...init, ...prev }))
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60 * 1000) // refresh every 10 min to cycle in fresh articles
    return () => clearInterval(id)
  }, [load])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-300">
              Today&apos;s Briefing
            </h2>
            <p className="text-[10px] text-slate-600 mt-0.5">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-slate-700 hidden sm:block">updated {lastUpdate}</span>
          )}
          <button
            onClick={() => { setLoading(true); load() }}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-slate-800/40">
              <div className="w-16 h-12 bg-slate-800 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-slate-800 rounded animate-pulse" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-slate-800 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="px-5 py-6 text-center text-slate-600 text-sm">{error}</div>
      )}

      {/* No recent news */}
      {!loading && !error && buckets.length === 0 && (
        <div className="px-5 py-8 text-center">
          <p className="text-slate-500 text-sm">No news in the last 24 hours.</p>
          <p className="text-slate-700 text-xs mt-1">Feeds refresh every 10 minutes — check back when markets open.</p>
        </div>
      )}

      {/* Bucketed news */}
      {!loading && buckets.map(bk => (
        <div key={bk.label} className="border-b border-slate-800/60 last:border-0">
          {/* Bucket header */}
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [bk.label]: !prev[bk.label] }))}
            className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{bk.icon}</span>
              <span className={`text-xs font-semibold ${bk.color}`}>{bk.label}</span>
              <span className="text-[10px] text-slate-700 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {bk.items.length}
              </span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expanded[bk.label] ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Articles */}
          {expanded[bk.label] && (
            <div className="divide-y divide-slate-800/50">
              {bk.items.map((item, i) => <NewsRow key={i} item={item} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
