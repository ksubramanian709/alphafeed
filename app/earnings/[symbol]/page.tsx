'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PriceChart from '../../components/PriceChart'


// ── Types ──────────────────────────────────────────────────────────────────────

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  assetType: string
  marketCap: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  marketState: string | null
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
}

interface QuarterlyEarning {
  fiscalDateEnding: string
  reportedDate: string
  reportedEps: number | null
  estimatedEps: number | null
  surprise: number | null
  surprisePercentage: number | null
}

interface EarningsSetup {
  symbol: string
  name: string
  reportDate: string
  reportTime: string | null
  epsEstimate: number | null
  lastYearEps: number | null
  analystCount: number | null
  expectedMovePercent: number | null
  atmIv: number | null
  currentPrice: number
  changePercent: number
  marketCap: number
  alreadyReported: boolean
  reportedEps: number | null
  epsSurprise: number | null
  epsSurprisePct: number | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, d = 2) { return n.toFixed(d) }

function fmtLarge(n: number): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtShortDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function priceClass(change: number) {
  if (change > 0) return 'text-emerald-400'
  if (change < 0) return 'text-red-400'
  return 'text-slate-400'
}

// ── AI Panel ───────────────────────────────────────────────────────────────────

function AiPanel({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [text, setText] = useState<string | null>(null)

  async function load() {
    setStatus('loading')
    try {
      const res = await fetch(`${BACKEND}/v1/agent/insights/${encodeURIComponent(symbol)}?assetType=EQUITY`)
      const json = await res.json()
      if (json.error) { setStatus('error'); return }
      const t = json.earningsSummary || json.summary || json.keyThesis || json.analysis || null
      setText(t)
      setStatus(t ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <button
        onClick={load}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10
                   hover:border-emerald-500/40 transition-all group"
      >
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-sm text-emerald-500 group-hover:text-emerald-300 font-medium transition-colors">
          Get AI earnings analysis
        </span>
      </button>
    )
  }
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
        <svg className="w-4 h-4 text-slate-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        <span className="text-sm text-slate-500">Analyzing {symbol} earnings outlook…</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="py-3 px-4 rounded-xl bg-slate-800/30 border border-slate-700/40 text-sm text-slate-600 text-center">
        AI analysis unavailable
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
      <div className="flex items-start gap-3">
        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-0.5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
          AI
        </span>
        <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

// ── Quarterly row ──────────────────────────────────────────────────────────────

function QuarterRow({ q, isFirst }: { q: QuarterlyEarning; isFirst: boolean }) {
  const beat    = q.surprisePercentage != null ? q.surprisePercentage > 0 : null
  const reported = q.reportedEps
  const estimated = q.estimatedEps

  const maxAbs = Math.max(
    Math.abs(reported ?? 0),
    Math.abs(estimated ?? 0),
    0.01,
  )

  const repWidth  = reported  != null ? Math.min(100, (Math.abs(reported)  / maxAbs) * 100) : 0
  const estWidth  = estimated != null ? Math.min(100, (Math.abs(estimated) / maxAbs) * 100) : 0

  return (
    <div className={`px-4 py-3 ${isFirst ? '' : 'border-t border-slate-800/60'}`}>
      <div className="flex items-center justify-between mb-2 gap-3">
        <div>
          <div className="text-xs font-mono text-slate-300">
            {fmtShortDate(q.fiscalDateEnding)}
          </div>
          {q.reportedDate && (
            <div className="text-[10px] text-slate-700 mt-0.5">
              Reported {fmtShortDate(q.reportedDate)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {q.surprisePercentage != null && (
            <div className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full
              ${beat
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}
            >
              {beat ? '+' : ''}{q.surprisePercentage.toFixed(1)}% {beat ? '▲ Beat' : '▼ Miss'}
            </div>
          )}
        </div>
      </div>

      {/* EPS bars */}
      <div className="space-y-1.5">
        {/* Reported */}
        <div className="flex items-center gap-2">
          <div className="text-[9px] text-slate-600 w-14 text-right shrink-0">Reported</div>
          <div className="flex-1 h-4 bg-slate-800/50 rounded-md overflow-hidden">
            {reported != null && (
              <div
                className={`h-full rounded-md transition-all ${beat === true ? 'bg-emerald-500/50' : beat === false ? 'bg-red-500/50' : 'bg-slate-600/50'}`}
                style={{ width: `${repWidth}%` }}
              />
            )}
          </div>
          <div className={`text-[10px] font-mono w-14 shrink-0 ${
            reported == null ? 'text-slate-700' :
            beat === true ? 'text-emerald-400' :
            beat === false ? 'text-red-400' : 'text-slate-400'
          }`}>
            {reported != null ? `$${reported.toFixed(2)}` : '—'}
          </div>
        </div>
        {/* Estimated */}
        <div className="flex items-center gap-2">
          <div className="text-[9px] text-slate-600 w-14 text-right shrink-0">Estimate</div>
          <div className="flex-1 h-4 bg-slate-800/50 rounded-md overflow-hidden">
            {estimated != null && (
              <div
                className="h-full rounded-md bg-slate-600/30 border border-slate-600/30"
                style={{ width: `${estWidth}%` }}
              />
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-600 w-14 shrink-0">
            {estimated != null ? `$${estimated.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EarningsSymbolPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const sym = (symbol as string).toUpperCase()

  const [quote, setQuote]   = useState<Quote | null>(null)
  const [history, setHistory] = useState<QuarterlyEarning[]>([])
  const [histError, setHistError] = useState<string | null>(null)
  const [setup, setSetup]   = useState<EarningsSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [quoteRes, weekRes] = await Promise.allSettled([
        fetch(`${BACKEND}/v1/quote/${sym}`).then(r => r.json()),
        fetch(`${BACKEND}/v1/earnings/week`).then(r => r.json()),
      ])

      if (quoteRes.status === 'fulfilled' && quoteRes.value?.data) {
        setQuote(quoteRes.value.data)
      }
      if (weekRes.status === 'fulfilled' && Array.isArray(weekRes.value)) {
        const found = weekRes.value.find((s: EarningsSetup) => s.symbol === sym)
        if (found) setSetup(found)
      }
      setLoading(false)
    }

    async function loadHistory() {
      try {
        const res  = await fetch(`${BACKEND}/v1/earnings/${sym}`)
        const json = await res.json()
        if (json.error) { setHistError(json.error); return }
        setHistory((json.quarterlyEarnings ?? []).slice(0, 8))
      } catch {
        setHistError('Failed to load earnings history')
      } finally {
        setHistLoading(false)
      }
    }

    load()
    loadHistory()
  }, [sym])

  const cls  = quote ? priceClass(quote.change) : ''
  const sign = quote && quote.change >= 0 ? '+' : ''
  const extCls = quote?.extendedChange != null ? priceClass(quote.extendedChange) : ''
  const extSign = quote?.extendedChange != null && quote.extendedChange >= 0 ? '+' : ''

  const moveColor = setup?.expectedMovePercent != null
    ? setup.expectedMovePercent >= 10 ? 'text-orange-400'
    : setup.expectedMovePercent >= 6  ? 'text-yellow-400'
    : 'text-sky-400'
    : 'text-slate-500'

  // Beat stats
  const beatCount = history.filter(q => (q.surprisePercentage ?? 0) > 0).length
  const surprises = history.map(q => q.surprisePercentage).filter((x): x is number => x != null)
  const avgSurprise = surprises.length > 0
    ? surprises.reduce((a, b) => a + b, 0) / surprises.length
    : null

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Back nav */}
      <Link
        href="/earnings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Earnings
      </Link>

      {loading && (
        <div className="space-y-4">
          <div className="h-36 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Quote header ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-mono font-bold text-2xl text-slate-100">{sym}</h1>
                  {quote?.assetType && (
                    <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded uppercase">
                      {quote.assetType}
                    </span>
                  )}
                </div>
                {quote?.name && (
                  <p className="text-slate-400 text-sm mt-0.5">{quote.name}</p>
                )}
                {(quote?.marketCap ?? 0) > 0 && (
                  <p className="text-[11px] text-slate-700 mt-0.5">{fmtLarge(quote?.marketCap ?? 0)}</p>
                )}
              </div>
              <div className="text-right">
                {quote ? (
                  <>
                    <div className={`font-mono font-bold text-3xl ${cls}`}>
                      {fmt(quote.price)}
                      <span className="text-sm text-slate-600 ml-1">{quote.currency}</span>
                    </div>
                    <div className={`font-mono text-sm mt-0.5 ${cls}`}>
                      {sign}{fmt(quote.change)} ({sign}{fmt(quote.changePercent)}%) today
                    </div>
                    {quote.extendedPrice != null && quote.extendedChange != null && quote.extendedChangePercent != null && (
                      <div className="mt-2 flex flex-col items-end gap-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                          quote.marketState === 'PRE'
                            ? 'text-sky-400 border-sky-500/30 bg-sky-500/10'
                            : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                        }`}>
                          {quote.marketState === 'PRE' ? 'Pre-Market' : 'After Hours'}
                        </span>
                        <div className={`font-mono font-bold text-xl ${extCls}`}>
                          {fmt(quote.extendedPrice)}
                        </div>
                        <div className={`font-mono text-xs ${extCls}`}>
                          {extSign}{fmt(quote.extendedChange)} ({extSign}{fmt(quote.extendedChangePercent)}%)
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-700 text-sm">Quote unavailable</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Upcoming report card ── */}
          {setup ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-sky-400
                                 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
                  Upcoming
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Earnings Report
                </span>
              </div>

              <div className="p-5">
                {/* Date / time */}
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <div className="text-slate-200 font-semibold">{fmtDate(setup.reportDate)}</div>
                  {setup.alreadyReported ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-slate-400 border-slate-600 bg-slate-800">
                      Results In
                    </span>
                  ) : setup.reportTime && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      setup.reportTime === 'Pre-Market'
                        ? 'text-sky-400 border-sky-500/30 bg-sky-500/10'
                        : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                    }`}>
                      {setup.reportTime}
                    </span>
                  )}
                </div>

                {/* REPORTED: Beat/miss result banner */}
                {setup.alreadyReported && setup.reportedEps != null && (
                  <div className={`rounded-xl p-4 mb-4 flex items-center justify-between
                    ${(setup.epsSurprisePct ?? 0) > 0
                      ? 'bg-emerald-500/10 border border-emerald-500/25'
                      : 'bg-red-500/10 border border-red-500/25'}`}
                  >
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Reported EPS</div>
                      <div className={`font-mono font-bold text-3xl ${
                        (setup.epsSurprisePct ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${setup.reportedEps.toFixed(2)}
                      </div>
                      {setup.epsEstimate != null && (
                        <div className="text-sm text-slate-500 mt-0.5">
                          vs est. ${setup.epsEstimate.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {setup.epsSurprisePct != null && (
                      <div className="text-right">
                        <div className={`font-bold text-xl ${
                          setup.epsSurprisePct > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {setup.epsSurprisePct > 0 ? '▲ Beat' : '▼ Miss'}
                        </div>
                        <div className={`font-mono text-sm mt-0.5 ${
                          setup.epsSurprisePct > 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {setup.epsSurprisePct > 0 ? '+' : ''}{setup.epsSurprisePct.toFixed(1)}%
                        </div>
                        {setup.epsSurprise != null && (
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            {setup.epsSurprise > 0 ? '+' : ''}${setup.epsSurprise.toFixed(2)} vs est
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">

                  {/* Expected move — only for upcoming */}
                  {!setup.alreadyReported && (
                    <div className="bg-slate-800/60 rounded-xl p-3 sm:col-span-1">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Exp. Move</div>
                      {setup.expectedMovePercent != null ? (
                        <>
                          <div className={`font-mono font-bold text-2xl ${moveColor}`}>
                            ±{setup.expectedMovePercent.toFixed(1)}%
                          </div>
                          {setup.atmIv != null && setup.atmIv > 0 && (
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              ATM IV {(setup.atmIv * 100).toFixed(0)}%
                            </div>
                          )}
                          <div className="text-[9px] text-slate-700 mt-1">Options-implied straddle</div>
                        </>
                      ) : (
                        <div className="text-slate-700 font-mono text-lg">—</div>
                      )}
                    </div>
                  )}

                  {/* EPS estimate */}
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">EPS Estimate</div>
                    {setup.epsEstimate != null ? (
                      <>
                        <div className="font-mono font-bold text-xl text-slate-100">
                          ${setup.epsEstimate.toFixed(2)}
                        </div>
                        {setup.analystCount != null && (
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            {setup.analystCount} analysts
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-700 font-mono text-lg">—</div>
                    )}
                  </div>

                  {/* Last year EPS */}
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Last Year EPS</div>
                    {setup.lastYearEps != null ? (
                      <>
                        <div className="font-mono font-bold text-xl text-slate-300">
                          ${setup.lastYearEps.toFixed(2)}
                        </div>
                        {setup.epsEstimate != null && setup.lastYearEps > 0 && (
                          <div className={`text-[10px] mt-0.5 ${
                            setup.epsEstimate > setup.lastYearEps ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {setup.epsEstimate > setup.lastYearEps ? '▲' : '▼'}{' '}
                            {Math.abs(((setup.epsEstimate - setup.lastYearEps) / Math.abs(setup.lastYearEps)) * 100).toFixed(1)}% YoY est.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-700 font-mono text-lg">—</div>
                    )}
                  </div>

                  {/* Beat rate from history */}
                  {history.length > 0 && (
                    <div className="bg-slate-800/40 rounded-xl p-3">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Beat Rate</div>
                      <div className={`font-mono font-bold text-xl ${
                        beatCount >= 3 ? 'text-emerald-400' :
                        beatCount <= 1 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {beatCount}/{history.length}
                      </div>
                      {avgSurprise != null && (
                        <div className={`text-[10px] mt-0.5 ${avgSurprise > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          avg {avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(1)}% surprise
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expected move context bar — only for upcoming */}
                {!setup.alreadyReported && setup.expectedMovePercent != null && quote && (
                  <div className="bg-slate-800/30 rounded-xl p-3">
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">
                      Price Range Implied by Options
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-red-400">
                        ${(quote.price * (1 - setup.expectedMovePercent / 100)).toFixed(2)}
                      </span>
                      <span className="text-slate-400 font-bold">${quote.price.toFixed(2)}</span>
                      <span className="text-emerald-400">
                        ${(quote.price * (1 + setup.expectedMovePercent / 100)).toFixed(2)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-slate-700 rounded-full">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 via-slate-600/10 to-emerald-500/30 rounded-full" />
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-900" />
                    </div>
                    <div className="text-center text-[9px] text-slate-700 mt-1.5">
                      ±{setup.expectedMovePercent.toFixed(1)}% expected move to expiration
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
              <p className="text-sm text-slate-600">{sym} is not in the current earnings setups window.</p>
              <Link href="/earnings" className="text-xs text-sky-600 hover:text-sky-400 underline mt-2 inline-block">
                View all upcoming reports →
              </Link>
            </div>
          )}

          {/* ── AI Analysis ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              AI Analysis
            </h2>
            <AiPanel symbol={sym} />
          </div>

          {/* ── Earnings History ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Earnings History
              </h2>
              {!histLoading && history.length > 0 && (
                <div className="flex items-center gap-3">
                  {avgSurprise != null && (
                    <span className={`text-[10px] font-mono ${avgSurprise > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      avg {avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(1)}%
                    </span>
                  )}
                  <span className={`text-xs font-semibold ${
                    beatCount >= 3 ? 'text-emerald-400' :
                    beatCount <= 1 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {beatCount}/{history.length} beats
                  </span>
                </div>
              )}
            </div>

            {histLoading ? (
              <div className="space-y-px p-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse mb-2" />
                ))}
              </div>
            ) : histError ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-600">{histError}</p>
                {histError.includes('rate limit') && (
                  <p className="text-xs text-slate-700 mt-2">Alpha Vantage free tier limit reached. Try again later.</p>
                )}
              </div>
            ) : history.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-700">
                No earnings history available
              </div>
            ) : (
              <div>
                {history.map((q, i) => (
                  <QuarterRow key={i} q={q} isFirst={i === 0} />
                ))}
              </div>
            )}
          </div>

          {/* ── Price Chart ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Price Chart
            </h2>
            <PriceChart symbol={sym} />
          </div>

          {/* ── Link to full ticker page ── */}
          <div className="flex justify-center">
            <Link
              href={`/ticker/${encodeURIComponent(sym)}`}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300
                         bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl transition-all"
            >
              View full quote & fundamentals for {sym}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}

    </main>
  )
}
