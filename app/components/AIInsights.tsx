'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Insight {
  symbol: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  summary: string
  bullPoints: string[]
  bearPoints: string[]
  keyRisk: string
  catalyst: string
  error?: string
  generatedAt: string
}

const SENTIMENT_STYLES = {
  bullish: {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    dot:   'bg-emerald-400',
    label: 'Bullish',
  },
  bearish: {
    badge: 'bg-red-500/15 text-red-400 border border-red-500/20',
    dot:   'bg-red-400',
    label: 'Bearish',
  },
  neutral: {
    badge: 'bg-slate-700 text-slate-400 border border-slate-600',
    dot:   'bg-slate-400',
    label: 'Neutral',
  },
}

export default function AIInsights({ symbol }: { symbol: string }) {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API}/v1/agent/insights/${encodeURIComponent(symbol)}`)
      if (r.status === 429) { setError('Rate limit reached — try again in an hour.'); return }
      if (!r.ok)            { setError('Analysis temporarily unavailable.'); return }
      const d: Insight = await r.json()
      if (d.error)          { setError('Analysis temporarily unavailable.'); return }
      setInsight(d)
    } catch {
      setError('Analysis temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [symbol])

  const styles = insight ? (SENTIMENT_STYLES[insight.sentiment] ?? SENTIMENT_STYLES.neutral) : null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Sparkle icon */}
          <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            AI Insights
          </h2>
          {insight && styles && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              {styles.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {insight?.generatedAt && (
            <span className="text-[10px] text-slate-700 hidden sm:block">
              Updated {new Date(insight.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-5 py-8 space-y-3">
          <div className="h-3 bg-slate-800 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-800 rounded animate-pulse w-2/3" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-2.5 bg-slate-800 rounded animate-pulse" />)}
            </div>
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-2.5 bg-slate-800 rounded animate-pulse" />)}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-slate-500">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-slate-600 hover:text-slate-400 underline">Try again</button>
        </div>
      )}

      {/* Content */}
      {!loading && insight && !error && (
        <div className="px-5 py-4 space-y-5">
          {/* Summary */}
          <p className="text-sm text-slate-300 leading-relaxed">{insight.summary}</p>

          {/* Bull / Bear columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bull */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Bull Case</span>
              </div>
              <ul className="space-y-1.5">
                {insight.bullPoints.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-300 leading-snug">
                    <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bear */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2.5">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Bear Case</span>
              </div>
              <ul className="space-y-1.5">
                {insight.bearPoints.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-300 leading-snug">
                    <span className="text-red-500 shrink-0 mt-0.5">−</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Risk + Catalyst row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Key Risk</p>
              <p className="text-xs text-slate-300 leading-snug">{insight.keyRisk}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Next Catalyst</p>
              <p className="text-xs text-slate-300 leading-snug">{insight.catalyst}</p>
            </div>
          </div>

          {/* Attribution */}
          <p className="text-[10px] text-slate-700 text-right">
            Generated by Claude · not financial advice
          </p>
        </div>
      )}
    </div>
  )
}
