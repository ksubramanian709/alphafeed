'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
interface EarningsInsight {
  symbol: string
  analyzedPeriods: string[]; recurringThemes: string[]; focusShifts: string[]
  growthDrivers: string[]; headwinds: string[]
  sentimentTrend: string; guidancePattern: string; summary: string; error?: string
}
interface AnnualSnapshot {
  fiscalYear: string; filingDate: string
  revenue: number | null; grossProfit: number | null
  operatingIncome: number | null; netIncome: number | null
  researchAndDevelopment: number | null; capex: number | null
  cashAndEquivalents: number | null; longTermDebt: number | null
  totalAssets: number | null; epsBasic: number | null
  grossMarginPct: number | null; operatingMarginPct: number | null; netMarginPct: number | null
}
interface FinancialTimeseries {
  symbol: string; companyName: string; annual: AnnualSnapshot[]
  grossMarginPct: number | null; operatingMarginPct: number | null; netMarginPct: number | null
  revenueGrowthYoy: number | null; epsGrowthYoy: number | null; error?: string
}
interface FilingInfo {
  filingDate: string; form: string; secUrl: string; accessionNumber: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────



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
function fmtB(n: number | null) {
  if (n == null) return '—'
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(0)}M`
  return `${sign}$${abs.toLocaleString()}`
}
function fmtPct(n: number | null) { return n == null ? '—' : `${n.toFixed(1)}%` }
function fmtEps(n: number | null) { return n == null ? '—' : `$${n.toFixed(2)}` }
function pct(n: number) { return `${n >= 0 ? '+' : ''}${fmt(n)}%` }
function gc(n: number | null) { return n == null ? 'text-slate-500' : n >= 0 ? 'text-emerald-400' : 'text-rose-400' }
function yoyPct(a: number | null, b: number | null) {
  if (a == null || b == null || b === 0) return null
  return 100 * (a - b) / Math.abs(b)
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
  return <div className={`animate-pulse bg-slate-800/80 rounded-lg ${className}`} />
}

function PanelSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

// ── Tab: Financials ───────────────────────────────────────────────────────────

function FinancialsTab({ fin, loading }: { fin: FinancialTimeseries | null; loading: boolean }) {
  if (loading) return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!fin) return null
  if (fin.error) return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400 text-sm">{fin.error}</div>
  )

  const annual = fin.annual ?? []
  const latest = annual[0]

  const topMetrics = [
    { label: 'Revenue Growth (YoY)', value: fin.revenueGrowthYoy != null ? `${fin.revenueGrowthYoy >= 0 ? '+' : ''}${fin.revenueGrowthYoy.toFixed(1)}%` : '—', color: gc(fin.revenueGrowthYoy) },
    { label: 'Gross Margin',         value: fmtPct(fin.grossMarginPct),         color: 'text-emerald-400' },
    { label: 'Operating Margin',     value: fmtPct(fin.operatingMarginPct),     color: fin.operatingMarginPct != null && fin.operatingMarginPct < 0 ? 'text-rose-400' : 'text-sky-400' },
    { label: 'Net Margin',           value: fmtPct(fin.netMarginPct),           color: fin.netMarginPct != null && fin.netMarginPct < 0 ? 'text-rose-400' : 'text-violet-400' },
    { label: 'EPS Growth (YoY)',     value: fin.epsGrowthYoy != null ? `${fin.epsGrowthYoy >= 0 ? '+' : ''}${fin.epsGrowthYoy.toFixed(1)}%` : '—', color: gc(fin.epsGrowthYoy) },
    { label: 'Cash & Equivalents',   value: fmtB(latest?.cashAndEquivalents ?? null),    color: 'text-slate-200' },
    { label: 'Long-Term Debt',       value: fmtB(latest?.longTermDebt ?? null),           color: 'text-slate-200' },
    { label: 'R&D Spend',            value: fmtB(latest?.researchAndDevelopment ?? null), color: 'text-slate-200' },
  ]

  const cols = ['Revenue', 'Gross Profit', 'Op. Income', 'Net Income', 'EPS', 'Cash', 'Debt', 'R&D', 'CapEx']

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {topMetrics.map(m => (
          <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{m.label}</div>
            <div className="text-[10px] text-slate-700 mt-0.5">
              {m.label.includes('Margin') || m.label.includes('Growth') ? 'Latest fiscal year' : `FY${latest?.fiscalYear ?? ''}`}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 overflow-x-auto">
        <div className="min-w-[1050px]">
          <div className="grid bg-slate-900/80 px-4 py-2.5 border-b border-slate-800"
            style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">FY</span>
            {cols.map(c => (
              <span key={c} className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold text-right">{c}</span>
            ))}
          </div>
          {annual.map((row, i) => {
            const prev = annual[i + 1]
            const revG = yoyPct(row.revenue, prev?.revenue ?? null)
            return (
              <div key={row.fiscalYear}
                className="grid px-4 py-3 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 transition-colors"
                style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
                <div>
                  <span className="text-xs font-mono text-slate-200 font-semibold">FY{row.fiscalYear}</span>
                  {revG != null && (
                    <div className={`text-[9px] font-mono ${revG >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {revG >= 0 ? '▲' : '▼'}{Math.abs(revG).toFixed(1)}%
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-300 text-right">{fmtB(row.revenue)}</span>
                <span className="text-xs font-mono text-slate-400 text-right">
                  {fmtB(row.grossProfit)}
                  {row.grossMarginPct != null && <span className="text-[9px] text-emerald-600 ml-1">({row.grossMarginPct.toFixed(0)}%)</span>}
                </span>
                <span className={`text-xs font-mono text-right ${row.operatingIncome != null && row.operatingIncome < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {fmtB(row.operatingIncome)}
                  {row.operatingMarginPct != null && <span className="text-[9px] text-sky-600 ml-1">({row.operatingMarginPct.toFixed(0)}%)</span>}
                </span>
                <span className={`text-xs font-mono text-right ${row.netIncome != null && row.netIncome < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {fmtB(row.netIncome)}
                </span>
                <span className="text-xs font-mono text-slate-400 text-right">{fmtEps(row.epsBasic)}</span>
                <span className="text-xs font-mono text-slate-500 text-right">{fmtB(row.cashAndEquivalents)}</span>
                <span className="text-xs font-mono text-slate-500 text-right">{fmtB(row.longTermDebt)}</span>
                <span className="text-xs font-mono text-slate-500 text-right">{fmtB(row.researchAndDevelopment)}</span>
                <span className="text-xs font-mono text-slate-500 text-right">{fmtB(row.capex)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="text-[10px] text-slate-700 text-center">Source: SEC EDGAR XBRL · Annual 10-K filings · Figures in USD</div>
    </div>
  )
}

// ── Tab: Earnings ─────────────────────────────────────────────────────────────

function EarningsTab({ symbol }: { symbol: string }) {
  const [earnings, setEarnings] = useState<EarningsItem[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch(`${BACKEND}/v1/earnings/${symbol}/history`)
      .then(r => r.json())
      .then(d => {
        const items: EarningsItem[] = (d.data?.quarterlyEarnings ?? []).slice(0, 8).map((q: any) => ({
          date:               q.reportedDate ?? q.fiscalDateEnding ?? '',
          period:             q.fiscalDateEnding ?? '',
          epsActual:          parseFloat(q.reportedEPS ?? '0'),
          epsEstimate:        parseFloat(q.estimatedEPS ?? '0'),
          epsSurprisePercent: parseFloat(q.surprisePercentage ?? '0'),
          revenueActual:      q.revenueActual ?? 0,
          revenueEstimate:    q.revenueEstimate ?? 0,
        }))
        setEarnings(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  const beats    = earnings.filter(e => e.epsSurprisePercent > 0).length
  const beatRate = earnings.length > 0 ? Math.round((beats / earnings.length) * 100) : 0
  const avgSurp  = earnings.length > 0 ? earnings.reduce((s, e) => s + e.epsSurprisePercent, 0) / earnings.length : 0

  if (loading) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
  if (earnings.length === 0) return <div className="text-slate-500 text-sm p-6 text-center">No earnings history available.</div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Beat Rate',       value: `${beatRate}%`, sub: `${beats}/${earnings.length} quarters`, color: beatRate >= 70 ? 'text-emerald-400' : 'text-slate-200' },
          { label: 'Avg EPS Surprise', value: pct(avgSurp), sub: 'Last 8 quarters', color: avgSurp > 0 ? 'text-emerald-400' : avgSurp < 0 ? 'text-rose-400' : 'text-slate-200' },
          { label: 'Quarters Tracked', value: String(earnings.length), sub: 'Available history', color: 'text-slate-200' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className={`text-xl font-bold font-mono mb-0.5 ${s.color}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-5 bg-slate-900/80 px-4 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          <span>Period</span><span className="text-right">EPS Actual</span>
          <span className="text-right">EPS Est.</span><span className="text-right">Surprise</span>
          <span className="text-right">Revenue</span>
        </div>
        {earnings.map((e, i) => {
          const beat = e.epsSurprisePercent > 0, miss = e.epsSurprisePercent < 0
          return (
            <div key={i} className="grid grid-cols-5 px-4 py-3 border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors">
              <span className="text-xs text-slate-300 font-mono">{e.period || e.date}</span>
              <span className="text-xs text-right font-mono text-slate-200">${fmt(e.epsActual)}</span>
              <span className="text-xs text-right font-mono text-slate-500">${fmt(e.epsEstimate)}</span>
              <span className={`text-xs text-right font-mono font-semibold ${beat ? 'text-emerald-400' : miss ? 'text-rose-400' : 'text-slate-400'}`}>
                {beat ? '▲' : miss ? '▼' : '·'} {pct(e.epsSurprisePercent)}
              </span>
              <span className="text-xs text-right font-mono text-slate-400">{fmtRev(e.revenueActual)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: All Filings ──────────────────────────────────────────────────────────

function FilingsTab({ symbol }: { symbol: string }) {
  const [filings, setFilings] = useState<FilingInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState<'10-K' | '10-Q' | '8-K'>('10-K')

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
        {(['10-K', '10-Q', '8-K'] as const).map(f => (
          <button key={f} onClick={() => setForm(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono
              ${form === f ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
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
              <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 transition-colors">SEC.gov →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Panel: 10-K Analysis ──────────────────────────────────────────────────────

function AnalysisPanelContent({ analysis, loading }: { analysis: ResearchAnalysis | null; loading: boolean }) {
  if (loading) return <PanelSkeleton />
  if (!analysis) return null
  if (analysis.error) return (
    <div className="m-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-rose-400 text-sm">{analysis.error}</div>
  )

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1">
      {/* Summary + tone */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-1">
              AI Summary · {analysis.filingDate} 10-K
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

      {/* 3-col grid */}
      <div className="grid grid-cols-1 gap-4">
        {[
          { title: 'Key Insights', icon: '▸', color: 'text-indigo-400', accent: 'bg-indigo-500', items: analysis.keyInsights ?? [] },
          { title: 'Risk Factors', icon: '⚠', color: 'text-amber-400', accent: 'bg-amber-500', items: analysis.riskFactors ?? [] },
          { title: 'Opportunities', icon: '→', color: 'text-emerald-400', accent: 'bg-emerald-500', items: analysis.opportunities ?? [] },
        ].map(s => (
          <div key={s.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-4 rounded-full ${s.accent}`} />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{s.title}</span>
            </div>
            <ul className="space-y-2.5">
              {s.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                  <span className={`${s.color} mt-0.5 shrink-0`}>{s.icon}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {analysis.guidance && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">Forward Guidance</div>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.guidance}</p>
        </div>
      )}
    </div>
  )
}

// ── Panel: Year-over-Year ─────────────────────────────────────────────────────

function ComparePanelContent({ compare, loading }: { compare: YoyComparison | null; loading: boolean }) {
  if (loading) return <PanelSkeleton />
  if (!compare) return null
  if (compare.error) return (
    <div className="m-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-rose-400 text-sm">{compare.error}</div>
  )

  const toneColors: Record<string, string> = {
    'more bullish': 'text-emerald-400', 'more bearish': 'text-rose-400', 'similar': 'text-slate-400',
  }
  const toneArrow: Record<string, string> = {
    'more bullish': '↑', 'more bearish': '↓', 'similar': '→',
  }

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Annual Filing Comparison</div>
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${toneColors[compare.toneChange] ?? 'text-slate-400'}`}>
            <span>{toneArrow[compare.toneChange] ?? '→'}</span>
            <span className="capitalize">{compare.toneChange}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{compare.olderFilingDate}</span>
          <span className="text-slate-600">vs</span>
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{compare.newerFilingDate}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{compare.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-rose-400 text-sm font-bold">+</span>
            <span className="text-[10px] uppercase tracking-widest text-rose-400/80 font-semibold">New Risks</span>
          </div>
          <ul className="space-y-2">
            {(compare.newRisks ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 text-sm font-bold">−</span>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">Risks Removed</span>
          </div>
          <ul className="space-y-2">
            {(compare.removedRisks ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Key Narrative Shifts</div>
        <ul className="space-y-2.5">
          {(compare.keyChanges ?? []).map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed
              border-b border-slate-800 pb-2.5 last:border-0 last:pb-0">
              <span className="text-indigo-400 font-mono text-[10px] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Panel: Earnings Insights ──────────────────────────────────────────────────

function EarningsInsightsPanelContent({ insights, loading }: { insights: EarningsInsight | null; loading: boolean }) {
  if (loading) return <PanelSkeleton />
  if (!insights) return null
  if (insights.error) return (
    <div className="m-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-rose-400 text-sm">{insights.error}</div>
  )

  const sentimentConfig = {
    improving: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', arrow: '↑', label: 'Improving' },
    declining:  { color: 'text-rose-400',    bg: 'bg-rose-400/10 border-rose-400/30',       arrow: '↓', label: 'Declining' },
    stable:     { color: 'text-slate-300',   bg: 'bg-slate-400/10 border-slate-400/30',     arrow: '→', label: 'Stable' },
  }
  const sc = sentimentConfig[insights.sentimentTrend as keyof typeof sentimentConfig] ?? sentimentConfig.stable

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          Based on {insights.analyzedPeriods?.length ?? 0} quarterly 8-K filings
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${sc.bg} ${sc.color}`}>
          {sc.arrow} {sc.label}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
        <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-2">AI Narrative</div>
        <p className="text-sm text-slate-200 leading-relaxed">{insights.summary}</p>
        {insights.analyzedPeriods?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-emerald-500/10">
            {insights.analyzedPeriods.map((p, i) => (
              <span key={i} className="text-[9px] font-mono text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* Growth drivers + Headwinds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-500/15 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Growth Drivers</span>
          </div>
          <ul className="space-y-2.5">
            {(insights.growthDrivers ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-amber-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Headwinds</span>
          </div>
          <ul className="space-y-2.5">
            {(insights.headwinds ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recurring themes + Focus shifts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-sky-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Recurring Themes</span>
          </div>
          <ul className="space-y-2.5">
            {(insights.recurringThemes ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-sky-400 mt-0.5 shrink-0">▸</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-violet-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Recent Shifts</span>
          </div>
          <ul className="space-y-2.5">
            {(insights.focusShifts ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-violet-400 mt-0.5 shrink-0">⟳</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Guidance pattern */}
      {insights.guidancePattern && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">Guidance Pattern</div>
          <p className="text-sm text-slate-300 leading-relaxed">{insights.guidancePattern}</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ['Financials', 'Earnings', 'All Filings'] as const
type Tab = typeof TABS[number]
type PanelType = '10k' | 'yoy' | 'earnings-insights' | null

const INTEL_CARDS = [
  {
    id: '10k' as const,
    title: '10-K Deep Dive',
    desc: 'AI reads the latest annual filing and extracts insights, risks, opportunities, and forward guidance',
    accent: 'from-indigo-600/20 to-violet-700/10',
    border: 'border-indigo-500/20 hover:border-indigo-500/50',
    dot: 'bg-indigo-500',
    tag: 'Annual Report',
    time: '20–40s first load',
  },
  {
    id: 'yoy' as const,
    title: 'Filing Evolution',
    desc: "Year-over-year diff of risk factors, MD&A language, and management tone — what's new, what's gone",
    accent: 'from-amber-600/20 to-orange-700/10',
    border: 'border-amber-500/20 hover:border-amber-500/50',
    dot: 'bg-amber-500',
    tag: 'Year-over-Year',
    time: '30–60s first load',
  },
  {
    id: 'earnings-insights' as const,
    title: 'Earnings Intelligence',
    desc: 'Reads the last 4 quarterly 8-K releases and finds patterns, focus shifts, and sentiment trends over time',
    accent: 'from-emerald-600/20 to-teal-700/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    dot: 'bg-emerald-500',
    tag: 'Quarterly 8-Ks',
    time: '20–40s first load',
  },
]

const PANEL_HEADERS: Record<string, { title: string; subtitle: string; accent: string }> = {
  '10k':               { title: '10-K Deep Dive',       subtitle: 'AI analysis of latest annual SEC filing',               accent: 'border-indigo-500/30 bg-indigo-500/5' },
  'yoy':               { title: 'Filing Evolution',      subtitle: 'Year-over-year changes in risks, strategy & language',  accent: 'border-amber-500/30 bg-amber-500/5' },
  'earnings-insights': { title: 'Earnings Intelligence', subtitle: 'Patterns across quarterly 8-K earnings releases',       accent: 'border-emerald-500/30 bg-emerald-500/5' },
}

export default function ResearchPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()

  const [tab, setTab]           = useState<Tab>('Financials')
  const [activePanel, setPanel] = useState<PanelType>(null)

  const [quote, setQuote]       = useState<Quote | null>(null)
  const [quoteLoading, setQL]   = useState(true)
  const [financials, setFin]    = useState<FinancialTimeseries | null>(null)
  const [finLoading, setFL]     = useState(false)
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null)
  const [analysisLoading, setAL]= useState(false)
  const [compare, setCompare]   = useState<YoyComparison | null>(null)
  const [compareLoading, setCL] = useState(false)
  const [insights, setInsights] = useState<EarningsInsight | null>(null)
  const [insightsLoading, setIL]= useState(false)

  // Quote
  useEffect(() => {
    fetch(`${BACKEND}/v1/quote/${symbol}`)
      .then(r => r.json()).then(d => setQuote(d.data))
      .catch(() => {}).finally(() => setQL(false))
  }, [symbol])

  // Financials
  useEffect(() => {
    if (tab !== 'Financials' || financials) return
    setFL(true)
    fetch(`/api/research/${symbol}/financials`)
      .then(r => r.json()).then(d => setFin(d.data))
      .catch(() => {}).finally(() => setFL(false))
  }, [tab, symbol])

  // Panel data — fetched on first open
  useEffect(() => {
    if (activePanel !== '10k' || analysis) return
    setAL(true)
    fetch(`/api/research/${symbol}/analysis`)
      .then(r => r.json()).then(d => setAnalysis(d.data))
      .catch(() => {}).finally(() => setAL(false))
  }, [activePanel, symbol])

  useEffect(() => {
    if (activePanel !== 'yoy' || compare) return
    setCL(true)
    fetch(`/api/research/${symbol}/compare`)
      .then(r => r.json()).then(d => setCompare(d.data))
      .catch(() => {}).finally(() => setCL(false))
  }, [activePanel, symbol])

  useEffect(() => {
    if (activePanel !== 'earnings-insights' || insights) return
    setIL(true)
    fetch(`/api/research/${symbol}/earnings-insights`)
      .then(r => r.json()).then(d => setInsights(d.data))
      .catch(() => {}).finally(() => setIL(false))
  }, [activePanel, symbol])

  // Escape to close panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const up = (quote?.changePercent ?? 0) >= 0
  const priceColor = quote
    ? quote.changePercent > 0 ? 'text-emerald-400' : quote.changePercent < 0 ? 'text-rose-400' : 'text-slate-400'
    : 'text-slate-400'

  const panelHeader = activePanel ? PANEL_HEADERS[activePanel] : null

  return (
    <div className="min-h-screen">
      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-12 z-40 border-b border-slate-800 bg-[#080c10]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => router.back()} className="text-slate-600 hover:text-slate-400 transition-colors text-sm">←</button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700
              flex items-center justify-center text-sm font-bold text-white shrink-0">
              {symbol.slice(0, 2)}
            </div>
            {quoteLoading ? (
              <div className="flex gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-20" /></div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-slate-100 font-semibold text-sm">{quote?.name ?? symbol}</span>
                  <span className="ml-2 text-slate-500 text-sm font-mono">{symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono text-sm font-semibold">${fmt(quote?.price ?? 0)}</span>
                  <span className={`text-xs font-mono ${priceColor}`}>
                    {up ? '+' : ''}{fmt(quote?.change ?? 0)} ({up ? '+' : ''}{fmt(quote?.changePercent ?? 0)}%)
                  </span>
                </div>
                {quote?.marketCap ? (
                  <span className="text-[10px] text-slate-600">{fmtLarge(quote.marketCap)} market cap</span>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-3 -mb-px">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs rounded-t-lg border-b-2 transition-colors
                  ${tab === t ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'Financials' && (
          <>
            {finLoading && (
              <div className="flex items-center gap-3 mb-5 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Loading XBRL financial data from SEC EDGAR…
              </div>
            )}
            <FinancialsTab fin={financials} loading={finLoading} />
          </>
        )}
        {tab === 'Earnings'    && <EarningsTab symbol={symbol} />}
        {tab === 'All Filings' && <FilingsTab symbol={symbol} />}

        {/* ── Research Intelligence cards ──────────────────────────────────── */}
        <div className="mt-10 pt-8 border-t border-slate-800/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-px h-10 bg-gradient-to-b from-indigo-500 via-emerald-500 to-amber-500 rounded-full" />
            <div>
              <div className="text-sm font-semibold text-slate-200">Research Intelligence</div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                AI reads SEC filings · extracts hidden insights · tracks narrative shifts over time
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INTEL_CARDS.map(card => (
              <button key={card.id} onClick={() => setPanel(card.id)}
                className={`text-left rounded-2xl border bg-gradient-to-br ${card.accent} ${card.border}
                  p-5 transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99]`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full ${card.dot} mt-1 shrink-0`} />
                  <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold
                    bg-slate-800/60 px-2 py-0.5 rounded-full">{card.tag}</span>
                </div>
                <div className="text-sm font-semibold text-slate-200 mb-1.5 group-hover:text-white transition-colors">
                  {card.title}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{card.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-700">{card.time}</span>
                  <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Open →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Slide-in Intelligence Panel ──────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Backdrop */}
        <div onClick={() => setPanel(null)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300
            ${activePanel ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
        />

        {/* Panel */}
        <div className={`absolute right-0 top-0 h-full w-full max-w-2xl flex flex-col
          bg-[#08090e] border-l border-slate-800/80 shadow-2xl
          transition-transform duration-300 ease-out
          ${activePanel ? 'translate-x-0 pointer-events-auto' : 'translate-x-full'}`}>

          {/* Panel header */}
          {panelHeader && (
            <div className={`border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0`}>
              <div>
                <div className="text-sm font-semibold text-slate-100">{panelHeader.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{panelHeader.subtitle} · {symbol}</div>
              </div>
              <button onClick={() => setPanel(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800
                  text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors text-sm">
                ✕
              </button>
            </div>
          )}

          {/* Loading banner for slow AI calls */}
          {(activePanel === '10k' && analysisLoading) ||
           (activePanel === 'yoy' && compareLoading) ||
           (activePanel === 'earnings-insights' && insightsLoading) ? (
            <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">
                {activePanel === 'earnings-insights'
                  ? 'Reading quarterly 8-K filings and analyzing patterns…'
                  : 'Fetching SEC filing and running AI analysis…'}
                {' '}This takes 20–60s the first time.
              </span>
            </div>
          ) : null}

          {/* Panel body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activePanel === '10k' && (
              <AnalysisPanelContent analysis={analysis} loading={analysisLoading} />
            )}
            {activePanel === 'yoy' && (
              <ComparePanelContent compare={compare} loading={compareLoading} />
            )}
            {activePanel === 'earnings-insights' && (
              <EarningsInsightsPanelContent insights={insights} loading={insightsLoading} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
