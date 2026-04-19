'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface NewsItem {
  title: string
  url: string
  source: string
  summary: string | null
  publishedAt: string | null
  sentiment: string
  imageUrl: string | null
}

const SOURCE_COLORS: Record<string, string> = {
  'reuters':         'text-orange-400',
  'bloomberg':       'text-blue-400',
  'cnbc':            'text-blue-400',
  'marketwatch':     'text-green-400',
  'wall street':     'text-sky-400',
  'wsj':             'text-sky-400',
  'financial times': 'text-pink-400',
  'ap':              'text-red-400',
  'associated press':'text-red-400',
  "barron":          'text-purple-400',
  'seeking alpha':   'text-emerald-400',
  'yahoo':           'text-violet-400',
  'benzinga':        'text-yellow-400',
  'motley fool':     'text-green-400',
  'investopedia':    'text-cyan-400',
  'ibd':             'text-amber-400',
}

function sourceColor(source: string): string {
  const key = source.toLowerCase()
  for (const [k, v] of Object.entries(SOURCE_COLORS)) {
    if (key.includes(k)) return v
  }
  return 'text-slate-400'
}

function sentimentBadge(s: string) {
  const l = s?.toLowerCase() ?? ''
  if (l.includes('bullish') || l.includes('positive'))
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">↑ Bullish</span>
  if (l.includes('bearish') || l.includes('negative'))
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">↓ Bearish</span>
  return null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function groupLabel(iso: string | null): string {
  if (!iso) return 'Earlier'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3_600_000)  return 'Last hour'
  if (diff < 21_600_000) return 'Last 6 hours'
  if (diff < 86_400_000) return 'Today'
  return 'Earlier'
}

function isFavicon(url: string | null): boolean {
  return !!url?.includes('favicons')
}

function cleanSummary(s: string | null): string | null {
  if (!s) return null
  const clean = s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > 20 ? clean.slice(0, 200) + (clean.length > 200 ? '…' : '') : null
}

interface Props {
  symbol?: string
  limit?: number
  title?: string
}

export default function NewsFeed({ symbol, limit = 12, title }: Props) {
  const [news, setNews]       = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    setNews([])

    const url = symbol
      ? `/api/news/${encodeURIComponent(symbol)}`
      : `${API}/v1/news`

    fetch(url, { signal: AbortSignal.timeout(15_000) })
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); return }
        setNews((json.data ?? []).slice(0, limit))
      })
      .catch(() => setError('Failed to load news'))
      .finally(() => setLoading(false))
  }, [symbol, limit])

  const heading = title ?? (symbol ? `${symbol} Headlines` : 'Market Headlines')

  // Group by recency
  const groups: Record<string, NewsItem[]> = {}
  for (const item of news) {
    const label = groupLabel(item.publishedAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  }
  const groupOrder = ['Last hour', 'Last 6 hours', 'Today', 'Earlier']

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {heading}
        </h2>
        {!loading && news.length > 0 && (
          <span className="text-[10px] text-slate-700">{news.length} stories</span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl animate-pulse">
              <div className="w-20 h-14 bg-slate-800 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-2.5 bg-slate-800 rounded w-1/4" />
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-slate-600 text-sm bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="text-slate-600 text-sm text-center py-8">No recent news</div>
      )}

      {!loading && news.length > 0 && (
        <div className="space-y-5">
          {groupOrder.filter(g => groups[g]?.length).map(group => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{group}</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-800 divide-y divide-slate-800/60">
                {groups[group].map((item, i) => {
                  const summary = cleanSummary(item.summary)
                  const hasRealImage = item.imageUrl && !isFavicon(item.imageUrl)

                  return (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 px-4 py-3.5 bg-slate-900 hover:bg-slate-800/60 transition-colors group"
                    >
                      {hasRealImage && (
                        <div className="shrink-0 w-20 h-[52px] rounded-lg overflow-hidden bg-slate-800">
                          <img
                            src={item.imageUrl!}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => {
                              const parent = (e.target as HTMLImageElement).parentElement
                              if (parent) parent.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${sourceColor(item.source)}`}>
                            {item.source}
                          </span>
                          {item.publishedAt && (
                            <span className="text-[10px] text-slate-700">{timeAgo(item.publishedAt)}</span>
                          )}
                          {item.sentiment && item.sentiment !== 'Neutral' && sentimentBadge(item.sentiment)}
                        </div>

                        <p className="text-sm font-medium text-slate-200 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                          {item.title}
                        </p>

                        {summary && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {summary}
                          </p>
                        )}
                      </div>

                      <span className="text-slate-700 group-hover:text-slate-400 transition-colors text-xs shrink-0 mt-1">↗</span>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
