'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Quote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; marketCap: number; assetType: string
  fiftyTwoWeekHigh: number; fiftyTwoWeekLow: number; volume: number
}

interface ResearchAnalysis {
  symbol: string; filingDate: string; secUrl: string; summary: string
  keyInsights: string[]; riskFactors: string[]; opportunities: string[]
  managementTone: string; guidance: string; error?: string
}

interface YoyComparison {
  symbol: string; olderFilingDate: string; newerFilingDate: string
  newRisks: string[]; removedRisks: string[]; keyChanges: string[]
  toneChange: string; summary: string; error?: string
}

interface EarningsItem {
  date: string; period: string
  epsActual: number; epsEstimate: number; epsSurprisePercent: number
  revenueActual: number; revenueEstimate: number
}

interface FilingInfo {
  filingDate: string; form: string; secUrl: string; accessionNumber: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL

function fmt(n: number, d = 2) { return n?.toFixed(d) ?? '—' }
function fmtLarge(n: number) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
function fmtRev(n: number) {
  if (!n) return '—'
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}
function pct(n: number) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${fmt(n)}%`
}
function toneColor(tone: string) {
  switch (tone?.toLowerCase()) {
    case 'bullish':  return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    case 'bearish':  return 'text-rose-400 bg-rose-400/10 border-rose-400/30'
    case 'cautious': return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    default:         return 'text-slate-400 bg-slate-400/10 border-slate-400/30'
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnalysisTab({ symbol, analysis, loading }: {
  symbol: string
  analysis: ResearchAnalysis | null
  loading: boolean
}) {
  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" />
      </div>
    </div>
  )
  if (!analysis) return null
  if (analysis.error) return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400">
      {analysis.error}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-1">
              AI Executive Summary · {analysis.filingDate} 10-K
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{analysis.summary}</p>
          </div>
          {analysis.secUrl && (
            <a href={analysis.secUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-[10px] text-indigo-400 border border-indigo-500/30 px-3 py-1.5
                rounded-lg hover:bg-indigo-500/10 transition-colors whitespace-nowrap">
              SEC Filing →
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-indigo-500/10">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Management Tone</span>
          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1
            rounded-full border ${toneColor(analysis.managementTone)}`}>
            {analysis.managementTone ?? 'neutral'}
          </span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Key Insights */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Key Insights</span>
          </div>
          <ul className="space-y-2.5">
            {(analysis.keyInsights ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-indigo-400 mt-0.5 shrink-0">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Factors */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-amber-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Risk Factors</span>
          </div>
          <ul className="space-y-2.5">
            {(analysis.riskFactors ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Opportunities</span>
          </div>
          <ul className="space-y-2.5">
            {(analysis.opportunities ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Guidance */}
      {analysis.guidance && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
            Forward Guidance
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.guidance}</p>
        </div>
      )}
    </div>
  )
}

function CompareTab({ compare, loading }: { compare: YoyComparison | null; loading: boolean }) {
  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" /><Skeleton className="h-48" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
  if (!compare) return null
  if (compare.error) return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400">
      {compare.error}
    </div>
  )

  const toneColors: Record<string, string> = {
    'more bullish': 'text-emerald-400',
    'more bearish': 'text-rose-400',
    'similar':      'text-slate-400',
  }
  const toneArrow: Record<string, string> = {
    'more bullish': '↑',
    'more bearish': '↓',
    'similar':      '→',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Annual Filing Comparison
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${toneColors[compare.toneChange] ?? 'text-slate-400'}`}>
            <span>{toneArrow[compare.toneChange] ?? '→'}</span>
            <span className="capitalize">{compare.toneChange}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{compare.olderFilingDate}</span>
          <span className="text-slate-600">vs</span>
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{compare.newerFilingDate}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed mt-3">{compare.summary}</p>
      </div>

      {/* Risks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-rose-400 text-sm font-bold">+</span>
            <span className="text-[10px] uppercase tracking-widest text-rose-400/80 font-semibold">
              New Risks ({compare.newerFilingDate})
            </span>
          </div>
          <ul className="space-y-2">
            {(compare.newRisks ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 text-sm font-bold">−</span>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">
              Risks Removed ({compare.olderFilingDate})
            </span>
          </div>
          <ul className="space-y-2">
            {(compare.removedRisks ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key changes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
          Key Narrative Shifts
        </div>
        <ul className="space-y-2.5">
          {(compare.keyChanges ?? []).map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed
              border-b border-slate-800 pb-2.5 last:border-0 last:pb-0">
              <span className="text-indigo-400 font-mono text-[10px] mt-0.5 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EarningsTab({ symbol }: { symbol: string }) {
  const [earnings, setEarnings] = useState<EarningsItem[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch(`${API}/v1/earnings/${symbol}/history`)
      .then(r => r.json())
      .then(d => {
        const items: EarningsItem[] = (d.data?.quarterlyEarnings ?? []).slice(0, 8).map((q: any) => ({
          date:                q.reportedDate ?? q.fiscalDateEnding ?? '',
          period:              q.fiscalDateEnding ?? '',
          epsActual:           parseFloat(q.reportedEPS ?? '0'),
          epsEstimate:         parseFloat(q.estimatedEPS ?? '0'),
          epsSurprisePercent:  parseFloat(q.surprisePercentage ?? '0'),
          revenueActual:       q.revenueActual ?? 0,
          revenueEstimate:     q.revenueEstimate ?? 0,
        }))
        setEarnings(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  const beats     = earnings.filter(e => e.epsSurprisePercent > 0).length
  const beatRate  = earnings.length > 0 ? Math.round((beats / earnings.length) * 100) : 0
  const avgSurp   = earnings.length > 0
    ? earnings.reduce((s, e) => s + e.epsSurprisePercent, 0) / earnings.length
    : 0

  if (loading) return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  )

  if (earnings.length === 0) return (
    <div className="text-slate-500 text-sm p-6 text-center">No earnings history available.</div>
  )

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Beat Rate', value: `${beatRate}%`, sub: `${beats}/${earnings.length} quarters` },
          { label: 'Avg EPS Surprise', value: pct(avgSurp), sub: 'Last 8 quarters' },
          { label: 'Quarters Tracked', value: String(earnings.length), sub: 'Available history' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className={`text-xl font-bold font-mono mb-0.5
              ${s.label === 'Beat Rate' && beatRate >= 70 ? 'text-emerald-400' :
                s.label === 'Avg EPS Surprise' && avgSurp > 0 ? 'text-emerald-400' :
                s.label === 'Avg EPS Surprise' && avgSurp < 0 ? 'text-rose-400' :
                'text-slate-200'}`}>
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Earnings table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-5 bg-slate-900/80 px-4 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          <span>Period</span>
          <span className="text-right">EPS Actual</span>
          <span className="text-right">EPS Est.</span>
          <span className="text-right">Surprise</span>
          <span className="text-right">Revenue</span>
        </div>
        {earnings.map((e, i) => {
          const beat = e.epsSurprisePercent > 0
          const miss = e.epsSurprisePercent < 0
          return (
            <div key={i} className="grid grid-cols-5 px-4 py-3 border-t border-slate-800/60
              hover:bg-slate-800/30 transition-colors">
              <span className="text-xs text-slate-300 font-mono">{e.period || e.date}</span>
              <span className="text-xs text-right font-mono text-slate-200">
                ${fmt(e.epsActual)}
              </span>
              <span className="text-xs text-right font-mono text-slate-500">
                ${fmt(e.epsEstimate)}
              </span>
              <span className={`text-xs text-right font-mono font-semibold
                ${beat ? 'text-emerald-400' : miss ? 'text-rose-400' : 'text-slate-400'}`}>
                {beat ? '▲' : miss ? '▼' : '·'} {pct(e.epsSurprisePercent)}
              </span>
              <span className="text-xs text-right font-mono text-slate-400">
                {fmtRev(e.revenueActual)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilingsTab({ symbol }: { symbol: string }) {
  const [filings, setFilings] = useState<FilingInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState<'10-K' | '10-Q'>('10-K')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/research/${symbol}/filings?form=${form}`)
      .then(r => r.json())
      .then(d => setFilings(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol, form])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['10-K', '10-Q'] as const).map(f => (
          <button key={f} onClick={() => setForm(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono
              ${form === f
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filings.length === 0 ? (
        <div className="text-slate-500 text-sm p-6 text-center">No {form} filings found.</div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          {filings.map((f, i) => (
            <a key={i} href={f.secUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60
                last:border-0 hover:bg-slate-800/30 transition-colors group">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 font-semibold">{f.form}</span>
                  <span className="text-xs text-slate-300">{f.filingDate}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">{f.accessionNumber}</div>
              </div>
              <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 transition-colors">
                SEC.gov →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ['10-K Analysis', 'Earnings', 'Year-over-Year', 'All Filings'] as const
type Tab = typeof TABS[number]

export default function ResearchPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()

  const [quote, setQuote]       = useState<Quote | null>(null)
  const [quoteLoading, setQL]   = useState(true)
  const [tab, setTab]           = useState<Tab>('10-K Analysis')
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null)
  const [analysisLoading, setAL] = useState(false)
  const [compare, setCompare]   = useState<YoyComparison | null>(null)
  const [compareLoading, setCL] = useState(false)

  // Quote (fast)
  useEffect(() => {
    fetch(`${API}/v1/quote/${symbol}`)
      .then(r => r.json())
      .then(d => setQuote(d.data))
      .catch(() => {})
      .finally(() => setQL(false))
  }, [symbol])

  // Analysis (slow, fetched on demand)
  useEffect(() => {
    if (tab !== '10-K Analysis' || analysis) return
    setAL(true)
    fetch(`/api/research/${symbol}/analysis`)
      .then(r => r.json())
      .then(d => setAnalysis(d.data))
      .catch(() => {})
      .finally(() => setAL(false))
  }, [tab, symbol])

  // Comparison (slow, fetched on demand)
  useEffect(() => {
    if (tab !== 'Year-over-Year' || compare) return
    setCL(true)
    fetch(`/api/research/${symbol}/compare`)
      .then(r => r.json())
      .then(d => setCompare(d.data))
      .catch(() => {})
      .finally(() => setCL(false))
  }, [tab, symbol])

  const up   = (quote?.changePercent ?? 0) >= 0
  const priceColor = quote
    ? quote.changePercent > 0 ? 'text-emerald-400' : quote.changePercent < 0 ? 'text-rose-400' : 'text-slate-400'
    : 'text-slate-400'

  return (
    <div className="min-h-screen">
      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-12 z-40 border-b border-slate-800 bg-[#080c10]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => router.back()}
              className="text-slate-600 hover:text-slate-400 transition-colors text-sm">
              ←
            </button>

            {/* Company avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700
              flex items-center justify-center text-sm font-bold text-white shrink-0">
              {symbol.slice(0, 2)}
            </div>

            {quoteLoading ? (
              <div className="flex gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-slate-100 font-semibold text-sm">{quote?.name ?? symbol}</span>
                  <span className="ml-2 text-slate-500 text-sm font-mono">{symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono text-sm font-semibold">
                    ${fmt(quote?.price ?? 0)}
                  </span>
                  <span className={`text-xs font-mono ${priceColor}`}>
                    {up ? '+' : ''}{fmt(quote?.change ?? 0)} ({up ? '+' : ''}{fmt(quote?.changePercent ?? 0)}%)
                  </span>
                </div>
                {quote?.marketCap ? (
                  <span className="text-[10px] text-slate-600">
                    {fmtLarge(quote.marketCap)} market cap
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 -mb-px">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs rounded-t-lg border-b-2 transition-colors
                  ${tab === t
                    ? 'text-indigo-400 border-indigo-500'
                    : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {tab === '10-K Analysis' && (
          <>
            {analysisLoading && (
              <div className="flex items-center gap-3 mb-5 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Fetching SEC filing and running AI analysis — this takes 20–40s the first time…
              </div>
            )}
            <AnalysisTab symbol={symbol} analysis={analysis} loading={analysisLoading} />
          </>
        )}

        {tab === 'Earnings' && <EarningsTab symbol={symbol} />}

        {tab === 'Year-over-Year' && (
          <>
            {compareLoading && (
              <div className="flex items-center gap-3 mb-5 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Comparing annual filings with AI — this takes 30–60s the first time…
              </div>
            )}
            <CompareTab compare={compare} loading={compareLoading} />
          </>
        )}

        {tab === 'All Filings' && <FilingsTab symbol={symbol} />}
      </div>
    </div>
  )
}
