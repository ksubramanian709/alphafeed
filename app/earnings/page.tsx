'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import EarningsCalendar from '../components/EarningsCalendar'

const API = process.env.NEXT_PUBLIC_API_URL

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
  currentPrice: number
  changePercent: number
  marketCap: number
  expectedMovePercent: number | null
  atmIv: number | null
  history: QuarterlyEarning[]
  beatCount: number | null
  avgSurprisePct: number | null
  error: string | null
  alreadyReported: boolean
  reportedEps: number | null
  epsSurprise: number | null
  epsSurprisePct: number | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return p.toFixed(2)
}

function fmtCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n}`
}

function fmtDate(s: string) {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function shortName(name: string | null) {
  if (!name) return ''
  const stop = ['Inc.','Inc','Corp.','Corp','Co.','Co','Ltd.','Ltd','Group','Holdings',
    'Technologies','Technology','International','Incorporated','LLC','PLC','N.V.','S.A.','& Co.']
  let s = name
  for (const w of stop) s = s.replace(new RegExp('\\s*,?\\s*' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '')
  return s.trim().slice(0, 24)
}

// ── Beat dots ──────────────────────────────────────────────────────────────────

function BeatDots({ history }: { history: QuarterlyEarning[] }) {
  const items = history.slice(0, 4)
  const padded = [...items, ...Array(Math.max(0, 4 - items.length)).fill(null)]
  return (
    <div className="flex gap-1">
      {padded.map((q, i) => {
        const beat = q?.surprisePercentage != null ? q.surprisePercentage > 0 : null
        return (
          <div
            key={i}
            title={q?.surprisePercentage != null
              ? `${q.surprisePercentage > 0 ? '+' : ''}${q.surprisePercentage.toFixed(1)}% surprise`
              : 'No data'}
            className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold
              ${beat === true  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                beat === false ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                                 'bg-slate-800/60 text-slate-700 border border-slate-700/50'}`}
          >
            {beat === true ? '✓' : beat === false ? '✗' : '·'}
          </div>
        )
      })}
    </div>
  )
}

// ── History panel (lazy) ───────────────────────────────────────────────────────

function HistoryPanel({ symbol }: { symbol: string }) {
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'done' | 'error'
    history: QuarterlyEarning[]
    beatCount: number
    avgSurprise: number | null
  }>({ status: 'idle', history: [], beatCount: 0, avgSurprise: null })

  async function load() {
    setState(s => ({ ...s, status: 'loading' }))
    try {
      const res  = await fetch(`${API}/v1/earnings/${encodeURIComponent(symbol)}`)
      const json = await res.json()
      const quarters: QuarterlyEarning[] = (json.quarterlyEarnings ?? []).slice(0, 4)
      const surprises = quarters.map(q => q.surprisePercentage).filter((x): x is number => x != null)
      const beatCount = surprises.filter(s => s > 0).length
      const avgSurprise = surprises.length > 0
        ? surprises.reduce((a, b) => a + b, 0) / surprises.length
        : null
      setState({ status: 'done', history: quarters, beatCount, avgSurprise })
    } catch {
      setState(s => ({ ...s, status: 'error' }))
    }
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 border border-slate-700/40
                   hover:bg-slate-800/60 hover:border-slate-600 transition-colors group"
      >
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Beat History</span>
        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Load 4Q →</span>
      </button>
    )
  }
  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 border border-slate-700/40">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Beat History</span>
        <div className="flex gap-1">
          {[0,1,2,3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-slate-700 animate-pulse" />)}
        </div>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 border border-slate-700/40">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Beat History</span>
        <span className="text-[10px] text-slate-700">Unavailable</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 border border-slate-700/40">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Beat History</span>
        <BeatDots history={state.history} />
      </div>
      <div className="text-right">
        {state.history.length > 0 && (
          <div className={`text-[10px] font-semibold ${
            state.beatCount >= 3 ? 'text-emerald-400' :
            state.beatCount <= 1 ? 'text-red-400' : 'text-slate-400'
          }`}>Beat {state.beatCount}/{state.history.length}</div>
        )}
        {state.avgSurprise != null && (
          <div className={`text-[9px] ${state.avgSurprise > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            avg {state.avgSurprise > 0 ? '+' : ''}{state.avgSurprise.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

// ── Setup Card ─────────────────────────────────────────────────────────────────

function SetupCard({ s }: { s: EarningsSetup }) {
  const up   = s.changePercent > 0
  const dn   = s.changePercent < 0
  const col  = up ? 'text-emerald-400' : dn ? 'text-red-400' : 'text-slate-400'
  const sign = s.changePercent >= 0 ? '+' : ''

  const moveColor = s.expectedMovePercent != null
    ? s.expectedMovePercent >= 10 ? 'text-orange-400'
    : s.expectedMovePercent >= 6  ? 'text-yellow-400'
    : 'text-sky-400'
    : 'text-slate-600'

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3
                    hover:border-slate-700 transition-colors">

      {/* Top row: symbol + date */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-100 text-sm">{s.symbol}</span>
            {s.marketCap > 0 && (
              <span className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {fmtCap(s.marketCap)}
              </span>
            )}
            {s.alreadyReported && (
              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full
                               bg-slate-700 text-slate-400 border border-slate-600">
                Reported
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{shortName(s.name)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-slate-400 font-semibold">{fmtDate(s.reportDate)}</div>
          {s.reportTime && !s.alreadyReported && (
            <div className={`text-[9px] mt-0.5 ${s.reportTime === 'Pre-Market' ? 'text-sky-500' : 'text-orange-400'}`}>
              {s.reportTime}
            </div>
          )}
        </div>
      </div>

      {/* Beat/miss banner for reported companies */}
      {s.alreadyReported && s.reportedEps != null && (
        <div className={`rounded-xl px-3 py-2 flex items-center justify-between
          ${s.epsSurprisePct != null && s.epsSurprisePct > 0
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : s.epsSurprisePct != null && s.epsSurprisePct < 0
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-slate-800/40 border border-slate-700/40'}`}
        >
          <div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-0.5">Reported EPS</div>
            <div className={`font-mono font-bold text-base ${
              s.epsSurprisePct != null && s.epsSurprisePct > 0 ? 'text-emerald-400' :
              s.epsSurprisePct != null && s.epsSurprisePct < 0 ? 'text-red-400' : 'text-slate-200'
            }`}>
              ${s.reportedEps.toFixed(2)}
            </div>
            {s.epsEstimate != null && (
              <div className="text-[10px] text-slate-600">est. ${s.epsEstimate.toFixed(2)}</div>
            )}
          </div>
          {s.epsSurprisePct != null && (
            <div className={`text-right`}>
              <div className={`font-mono font-bold text-sm ${
                s.epsSurprisePct > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {s.epsSurprisePct > 0 ? '▲ Beat' : '▼ Miss'}
              </div>
              <div className={`font-mono text-[10px] ${s.epsSurprisePct > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {s.epsSurprisePct > 0 ? '+' : ''}{s.epsSurprisePct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats grid — only for upcoming companies */}
      {!s.alreadyReported && (
        <div className="grid grid-cols-3 gap-1.5">

          {/* Price */}
          <div className="bg-slate-800/40 rounded-xl p-2.5">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Price</div>
            <div className={`font-mono font-bold text-sm ${s.currentPrice > 0 ? 'text-slate-100' : 'text-slate-600'}`}>
              {s.currentPrice > 0 ? `$${fmtPrice(s.currentPrice)}` : '—'}
            </div>
            {s.currentPrice > 0 && (
              <div className={`font-mono text-[10px] ${col}`}>{sign}{s.changePercent.toFixed(2)}%</div>
            )}
          </div>

          {/* Expected move */}
          <div className={`rounded-xl p-2.5 ${s.expectedMovePercent != null ? 'bg-slate-800/60' : 'bg-slate-800/30'}`}>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Exp. Move</div>
            {s.expectedMovePercent != null ? (
              <>
                <div className={`font-mono font-bold text-sm ${moveColor}`}>
                  ±{s.expectedMovePercent.toFixed(1)}%
                </div>
                {s.atmIv != null && s.atmIv > 0 && (
                  <div className="text-[10px] text-slate-600">IV {(s.atmIv * 100).toFixed(0)}%</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-700 font-mono">—</div>
            )}
          </div>

          {/* EPS estimate */}
          <div className="bg-slate-800/40 rounded-xl p-2.5">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">EPS Est.</div>
            {s.epsEstimate != null ? (
              <>
                <div className="font-mono font-bold text-sm text-slate-100">
                  {s.epsEstimate.toFixed(2)}
                </div>
                {s.lastYearEps != null && (
                  <div className="text-[10px] text-slate-600">vs {s.lastYearEps.toFixed(2)} LY</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-700 font-mono">—</div>
            )}
          </div>
        </div>
      )}

      {/* Price + EPS for reported companies (compact) */}
      {s.alreadyReported && s.currentPrice > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-800/30 rounded-xl p-2.5">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Price</div>
            <div className="font-mono font-bold text-sm text-slate-100">${fmtPrice(s.currentPrice)}</div>
            <div className={`font-mono text-[10px] ${col}`}>{sign}{s.changePercent.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-2.5">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">EPS Estimate</div>
            <div className="font-mono font-bold text-sm text-slate-400">
              {s.epsEstimate != null ? `$${s.epsEstimate.toFixed(2)}` : '—'}
            </div>
            {s.lastYearEps != null && (
              <div className="text-[10px] text-slate-600">LY ${s.lastYearEps.toFixed(2)}</div>
            )}
          </div>
        </div>
      )}

      {/* Beat history — lazy */}
      <HistoryPanel symbol={s.symbol} />

      {/* CTA — dedicated earnings breakdown page */}
      <Link
        href={`/earnings/${encodeURIComponent(s.symbol)}`}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl
                   bg-gradient-to-r from-sky-900/40 to-indigo-900/40
                   border border-sky-800/40 hover:border-sky-600/60
                   text-xs text-sky-400 hover:text-sky-200 transition-all font-medium"
      >
        Full Earnings Breakdown
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'move' | 'cap'
type Tab = 'setups' | 'calendar'

export default function EarningsPage() {
  const [setups, setSetups] = useState<EarningsSetup[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('date')
  const [filter, setFilter] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [tab, setTab] = useState<Tab>('setups')

  async function load() {
    try {
      const res  = await fetch(`${API}/v1/earnings/calendar`)
      const json = await res.json()
      if (Array.isArray(json)) {
        setSetups(json)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch { /* retry later */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const sorted = [...setups]
    .filter(s => {
      if (!filter) return true
      const f = filter.toLowerCase()
      return s.symbol.toLowerCase().includes(f) || (s.name ?? '').toLowerCase().includes(f)
    })
    .sort((a, b) => {
      if (sort === 'move') {
        return (b.expectedMovePercent ?? -1) - (a.expectedMovePercent ?? -1)
      }
      if (sort === 'cap') return (b.marketCap ?? 0) - (a.marketCap ?? 0)
      return a.reportDate.localeCompare(b.reportDate) || (b.marketCap ?? 0) - (a.marketCap ?? 0)
    })

  const byDate = sorted.reduce<Record<string, EarningsSetup[]>>((acc, s) => {
    acc[s.reportDate] = acc[s.reportDate] ?? []
    acc[s.reportDate].push(s)
    return acc
  }, {})

  const dateGroups = sort === 'date'
    ? Object.entries(byDate)
    : [['all', sorted] as [string, EarningsSetup[]]]

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors mb-4 inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          AlphaFeed
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mt-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-100 uppercase">
                Earnings
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400
                               bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                Decision Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Expected move · beat history · EPS estimates · AI breakdown
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && setups.length > 0 && (
              <span className="text-[10px] text-slate-700 border border-slate-800 px-2 py-1 rounded-full">
                {setups.length} reports this week
              </span>
            )}
            {lastUpdate && (
              <span className="text-[10px] text-slate-700">updated {lastUpdate}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-xl p-1 mb-6 w-fit">
        {([
          { key: 'setups',   label: 'Setups'   },
          { key: 'calendar', label: 'Calendar' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tab === t.key
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
            {t.key === 'setups' && !loading && setups.length > 0 && (
              <span className="ml-1.5 text-[10px] text-slate-600 font-normal">{setups.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <EarningsCalendar />
      )}

      {/* ── Setups tab ── */}
      {tab === 'setups' && (
        <>
          {/* Controls */}
          {!loading && setups.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                {([
                  { key: 'date', label: 'By Date'    },
                  { key: 'move', label: 'By Move'    },
                  { key: 'cap',  label: 'By Mkt Cap' },
                ] as { key: SortKey; label: string }[]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${sort === opt.key ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filter ticker or name…"
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-7 py-2 text-xs
                             placeholder-slate-700 text-slate-300 focus:outline-none focus:border-slate-600 w-52"
                />
                {filter && (
                  <button onClick={() => setFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-sm">
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
                      <div className="h-3 w-28 bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[0,1,2].map(j => <div key={j} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}
                  </div>
                  <div className="h-8 bg-slate-800 rounded-xl animate-pulse" />
                  <div className="h-8 bg-slate-800 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : setups.length === 0 ? (
            <div className="text-center py-24 text-slate-600">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-sm">No major earnings reports in the next 14 days</p>
              <button
                onClick={() => setTab('calendar')}
                className="mt-4 text-xs text-sky-600 hover:text-sky-400 underline"
              >
                View full calendar →
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 text-slate-600 text-sm">
              No results for &ldquo;{filter}&rdquo;
            </div>
          ) : sort === 'date' ? (
            <div className="space-y-8">
              {dateGroups.map(([date, group]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-semibold text-slate-300">{fmtDate(date)}</h2>
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-[10px] text-slate-700">
                      {group.length} report{group.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map(s => <SetupCard key={s.symbol} s={s} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(s => <SetupCard key={s.symbol} s={s} />)}
            </div>
          )}
        </>
      )}

    </main>
  )
}
