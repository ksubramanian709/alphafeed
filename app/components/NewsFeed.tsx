'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface NewsItem {
  title: string
  url: string
  source: string
  summary: string
  publishedAt: string | null
  sentiment: string
  imageUrl: string | null
}

function sentimentColor(s: string) {
  if (s?.toLowerCase().includes('bullish')) return 'text-green-500 bg-green-950/30 border-green-900/30'
  if (s?.toLowerCase().includes('bearish')) return 'text-red-500 bg-red-950/30 border-red-900/30'
  return 'text-slate-500 bg-slate-800 border-slate-700'
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function isFavicon(url: string | null): boolean {
  return !!url?.includes('favicons')
}

interface Props {
  symbol?: string
  limit?: number
  title?: string
}

export default function NewsFeed({ symbol, limit = 8, title }: Props) {
  const [news, setNews]       = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const url = symbol
      ? `/api/news/${encodeURIComponent(symbol)}`
      : `${API}/v1/news`

    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        else setNews((json.data ?? []).slice(0, limit))
      })
      .catch(() => setError('Failed to load news'))
      .finally(() => setLoading(false))
  }, [symbol, limit])

  const heading = title ?? (symbol ? `${symbol} News` : 'Market News')

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        {heading}
      </h2>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-slate-600 text-sm bg-slate-900 border border-slate-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="text-slate-600 text-sm">No news available</div>
      )}

      {news.length > 0 && (
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {news.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 bg-slate-900 hover:bg-slate-800/60
                         transition-colors group"
            >
              {/* Thumbnail */}
              <div className={`shrink-0 rounded overflow-hidden bg-slate-800
                ${isFavicon(item.imageUrl) ? 'w-8 h-8' : 'w-16 h-12 sm:w-20 sm:h-14'}`}>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-600">{item.source}</span>
                  {item.publishedAt && (
                    <span className="text-xs text-slate-700">{timeAgo(item.publishedAt)}</span>
                  )}
                  {item.sentiment && item.sentiment !== 'Neutral' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${sentimentColor(item.sentiment)}`}>
                      {item.sentiment}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-slate-700 group-hover:text-slate-400 transition-colors text-xs shrink-0">↗</span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
