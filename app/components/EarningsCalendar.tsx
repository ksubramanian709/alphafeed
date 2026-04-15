'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface CalendarItem {
  symbol: string
  name: string
  reportDate: string
  fiscalDateEnding: string
  estimate: number | null
  currency: string
}

interface QuarterlyEarning {
  fiscalDateEnding: string
  reportedDate: string
  reportedEps: number | null
  estimatedEps: number | null
  surprise: number | null
  surprisePercentage: number | null
}

interface EarningsHistory {
  symbol: string
  quarterlyEarnings: QuarterlyEarning[] | null
  error?: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtShortDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function fmtQuarter(s: string) {
  if (!s) return '—'
  const d = new Date(s); const m = d.getUTCMonth() + 1; const y = d.getUTCFullYear()
  return `${m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4'} ${y}`
}

function fmtEps(n: number | null) {
  if (n == null) return '—'
  return (n >= 0 ? '' : '−') + Math.abs(n).toFixed(2)
}

// Build a 6-row × 7-col calendar grid for the given month
function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startDow = first.getDay() // 0=Sun
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const grid: (Date | null)[][] = []
  for (let r = 0; r < cells.length / 7; r++) grid.push(cells.slice(r * 7, r * 7 + 7))
  return grid
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Major companies by market cap — these get shown first and by default
const MAJOR = new Set([
  // Mega cap
  'AAPL','MSFT','NVDA','AMZN','GOOGL','GOOG','META','TSLA','BRK.B','AVGO',
  'JPM','LLY','V','UNH','XOM','MA','JNJ','PG','COST','HD','NFLX','BAC',
  'CRM','ABBV','AMD','ORCL','KO','CVX','MRK','PEP','ADBE','TMO','CSCO',
  'ACN','LIN','MCD','WMT','ABT','NKE','DHR','TXN','QCOM','HON','PM','GE',
  'AMGN','IBM','RTX','CAT','SPGI','INTU','LOW','GS','BLK','SBUX','MDT',
  'DE','BA','AMAT','SYK','ISRG','MMC','GILD','BX','MO','ADP','BMY',
  'BKNG','VRTX','ELV','REGN','ZTS','ADI','LRCX','PLD','CB','PGR',
  'MDLZ','EOG','CI','SO','DUK','ITW','ETN','SHW','TJX','CL','WM',
  'PYPL','APD','AON','HCA','CME','MAR','UBER','ABNB','NOW','SNOW',
  'PANW','CRWD','NET','ZS','MDB','DDOG','PLTR','COIN','HOOD',
  'F','GM','T','VZ','DIS','CMCSA','NFLX','PARA','WBD',
  'MS','C','WFC','USB','AXP','COF','SCHW','BK','TFC',
  'PFE','MRK','GILD','BIIB','MRNA','BNTX','HZNP',
  'UPS','FDX','LMT','NOC','GD','HII','L3H',
  'MSCI','ICE','MCO','FIS','FISV','PAYX','ADP',
  'FICO','CDNS','SNPS','KLAC','MRVL','MCHP','ON',
  'SHOP','SQ','ROKU','TTD','TWLO','ZM','DOCU',
  'NVO','ASML','TSM','BABA','JD','PDD','BIDU',
  'V','MA','PYPL','ADYEY',
  'WBA','CVS','MCK','ABC','CAH',
  'NEE','AEP','D','EXC','SRE',
  'AMT','PLD','EQIX','CCI','SPG',
  'FCX','NEM','AA','X','NUE',
  'RIVN','LCID','NIO','LI','XPEV',
  'ENPH','FSLR','SEDG','RUN',
  'RBLX','U','TTWO','EA','ATVI','NTES',
])

// Shorten a company name to fit a small calendar cell
function shortName(name: string): string {
  if (!name) return ''
  const stopWords = ['Inc.','Inc','Corp.','Corp','Co.','Co','Ltd.','Ltd','Group','Holdings','Technologies','Technology','International','Incorporated','LLC','PLC','N.V.','S.A.']
  let s = name
  for (const w of stopWords) s = s.replace(new RegExp('\\s*,?\\s*' + w.replace('.','\\.')  + '\\s*$', 'i'), '')
  return s.trim().slice(0, 16)
}

// ── component ─────────────────────────────────────────────────────────────────

export default function EarningsCalendar() {
  const [items, setItems]           = useState<CalendarItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewDate, setViewDate]     = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [detail, setDetail]         = useState<{ symbol: string; item: CalendarItem } | null>(null)
  const [history, setHistory]       = useState<EarningsHistory | null>(null)
  const [histLoading, setHistLoading] = useState(false)
  const [showAll, setShowAll]       = useState(false)

  useEffect(() => {
    fetch(`${API}/v1/earnings/calendar`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: CalendarItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  // Filter to major companies unless showAll is on
  const visibleItems = showAll ? items : items.filter(i => MAJOR.has(i.symbol))

  // Sort each day: major companies first, then alphabetical
  function sortDay(arr: CalendarItem[]): CalendarItem[] {
    return [...arr].sort((a, b) => {
      const am = MAJOR.has(a.symbol) ? 0 : 1
      const bm = MAJOR.has(b.symbol) ? 0 : 1
      return am !== bm ? am - bm : a.symbol.localeCompare(b.symbol)
    })
  }

  // Group items by date
  const byDate = visibleItems.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    acc[item.reportDate] = acc[item.reportDate] ?? []
    acc[item.reportDate].push(item)
    return acc
  }, {})

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const grid  = buildGrid(year, month)

  const todayKey = toDateKey(new Date())

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null) }

  function selectDate(key: string) {
    setSelectedDate(prev => prev === key ? null : key)
    setDetail(null)
    setHistory(null)
  }

  async function openDetail(item: CalendarItem) {
    setDetail({ symbol: item.symbol, item })
    setHistory(null)
    setHistLoading(true)
    try {
      const r = await fetch(`${API}/v1/earnings/${item.symbol}`)
      const d: EarningsHistory = await r.json()
      setHistory(d)
    } catch {
      setHistory({ symbol: item.symbol, quarterlyEarnings: null, error: 'Failed to load history.' })
    } finally {
      setHistLoading(false)
    }
  }

  const selectedItems = selectedDate ? sortDay(byDate[selectedDate] ?? []) : []
  const filteredSelected = search.trim()
    ? selectedItems.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        i.name?.toLowerCase().includes(search.toLowerCase()))
    : selectedItems

  // Search across all items (respects showAll)
  const searchResults = search.trim() && !selectedDate
    ? sortDay(visibleItems.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        i.name?.toLowerCase().includes(search.toLowerCase())))
    : []

  return (
    <section>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Earnings Calendar
          </h2>
          {/* Major / All toggle */}
          <div className="flex rounded-md overflow-hidden border border-slate-700 text-[10px]">
            <button
              onClick={() => setShowAll(false)}
              className={`px-2.5 py-1 transition-colors ${!showAll ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Major
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-2.5 py-1 transition-colors ${showAll ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-xs
                       placeholder-slate-600 focus:outline-none focus:border-slate-500 w-40"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* ── Global search results (no date selected) ── */}
      {search.trim() && !selectedDate && (
        <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">No results for "{search}"</p>
          ) : (
            <div className="divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
              {searchResults.map((item, i) => (
                <SearchRow key={i} item={item} onSelect={() => openDetail(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-600 text-xs animate-pulse">
          Loading calendar…
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <button onClick={prevMonth}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-200">{fmtMonthYear(viewDate)}</span>
            <button onClick={nextMonth}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {DOW.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-slate-600 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 border-b border-slate-800/50 last:border-0">
                {row.map((day, ci) => {
                  const key      = day ? toDateKey(day) : ''
                  const dayItems = key ? sortDay(byDate[key] ?? []) : []
                  const isToday  = key === todayKey
                  const isSel    = key === selectedDate
                  const isWkend  = day ? (day.getDay() === 0 || day.getDay() === 6) : false
                  const hasData  = dayItems.length > 0
                  const shown    = dayItems.slice(0, 2)
                  const extra    = dayItems.length - shown.length

                  return (
                    <div
                      key={ci}
                      onClick={() => hasData && day && selectDate(key)}
                      className={`min-h-[80px] p-1.5 border-r border-slate-800/50 last:border-r-0
                        ${!day ? 'bg-slate-950/40' : ''}
                        ${isWkend && day ? 'bg-slate-900/40' : ''}
                        ${hasData ? 'cursor-pointer hover:bg-slate-800/40' : ''}
                        ${isSel ? 'ring-1 ring-inset ring-emerald-500/50 bg-emerald-500/5' : ''}
                        transition-colors`}
                    >
                      {day && (
                        <>
                          <div className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1
                            ${isToday ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-[3px]">
                            {shown.map((item, i) => (
                              <div key={i}
                                className={`rounded px-1 py-[2px] truncate leading-tight
                                  ${MAJOR.has(item.symbol)
                                    ? 'bg-slate-700 text-slate-200'
                                    : 'bg-slate-800/80 text-slate-400'}`}>
                                <div className="text-[9px] font-mono font-bold truncate">{item.symbol}</div>
                                <div className="text-[8px] text-slate-500 truncate leading-none mt-[1px]">
                                  {shortName(item.name)}
                                </div>
                              </div>
                            ))}
                            {extra > 0 && (
                              <div className="text-[9px] text-slate-600 pl-1 pt-[1px]">
                                +{extra} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Selected day panel */}
          {selectedDate && (
            <div className="border-t border-slate-700 bg-slate-800/30">
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  {fmtShortDate(selectedDate)}
                  <span className="text-slate-600 font-normal ml-2">
                    {selectedItems.length} report{selectedItems.length !== 1 ? 's' : ''}
                  </span>
                </span>
                <button onClick={() => { setSelectedDate(null); setDetail(null) }}
                  className="text-slate-600 hover:text-slate-400 text-xs">✕</button>
              </div>

              {/* Search within day */}
              {selectedItems.length > 5 && (
                <div className="px-4 pt-3">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter this day…"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs
                               placeholder-slate-600 focus:outline-none focus:border-slate-500"
                  />
                </div>
              )}

              <div className="divide-y divide-slate-800/50 max-h-52 overflow-y-auto">
                {filteredSelected.map((item, i) => (
                  <SearchRow
                    key={i}
                    item={item}
                    active={detail?.symbol === item.symbol}
                    onSelect={() => openDetail(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Company detail panel ── */}
      {detail && (
        <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Detail header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-bold text-lg text-slate-100">{detail.symbol}</span>
                {detail.item.estimate !== null && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    Est. EPS {detail.item.estimate.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{detail.item.name}</p>
              <p className="text-xs text-slate-600 mt-1">
                Reports <span className="text-slate-400">{fmtShortDate(detail.item.reportDate)}</span>
              </p>
            </div>
            <button onClick={() => { setDetail(null); setHistory(null) }}
              className="text-slate-600 hover:text-slate-400 shrink-0 mt-0.5">✕</button>
          </div>

          {/* History */}
          {histLoading && (
            <div className="flex items-center justify-center h-32 text-slate-600 text-xs animate-pulse">
              Loading earnings history…
            </div>
          )}

          {!histLoading && history?.error && !history.quarterlyEarnings && (
            <p className="text-xs text-slate-500 text-center py-8">{history.error}</p>
          )}

          {!histLoading && history?.quarterlyEarnings && history.quarterlyEarnings.length > 0 && (
            <div className="px-5 py-4">
              {/* Beat rate summary */}
              <BeatRateBar quarters={history.quarterlyEarnings} />

              {/* EPS bars chart */}
              <EpsChart quarters={history.quarterlyEarnings} />

              {/* Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-slate-600 border-b border-slate-800">
                      <th className="text-left pb-2 font-normal">Quarter</th>
                      <th className="text-right pb-2 px-3 font-normal">Est.</th>
                      <th className="text-right pb-2 px-3 font-normal">Actual</th>
                      <th className="text-right pb-2 px-3 font-normal">Surprise</th>
                      <th className="text-right pb-2 pl-3 font-normal">vs Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.quarterlyEarnings.map((q, i) => {
                      const beat = (q.surprise ?? 0) > 0
                      const miss = (q.surprise ?? 0) < 0
                      return (
                        <tr key={i} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30">
                          <td className="py-2 pr-3">
                            <div className="text-slate-300">{fmtQuarter(q.fiscalDateEnding)}</div>
                            <div className="text-slate-700 text-[10px]">{q.reportedDate ?? '—'}</div>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">{fmtEps(q.estimatedEps)}</td>
                          <td className={`py-2 px-3 text-right font-semibold
                            ${beat ? 'text-emerald-400' : miss ? 'text-red-400' : 'text-slate-300'}`}>
                            {fmtEps(q.reportedEps)}
                          </td>
                          <td className={`py-2 px-3 text-right
                            ${beat ? 'text-emerald-400' : miss ? 'text-red-400' : 'text-slate-500'}`}>
                            {q.surprise != null ? (beat ? '+' : '') + q.surprise.toFixed(2) : '—'}
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                              ${beat ? 'bg-emerald-500/15 text-emerald-400' :
                                miss ? 'bg-red-500/15 text-red-400' :
                                       'bg-slate-700 text-slate-500'}`}>
                              {q.surprisePercentage != null
                                ? (beat ? '+' : '') + q.surprisePercentage.toFixed(1) + '%'
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SearchRow({ item, active, onSelect }: {
  item: CalendarItem
  active?: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left
        ${active ? 'bg-slate-700/60' : 'hover:bg-slate-800/40'}`}
    >
      <div className="min-w-0">
        <span className="font-mono text-sm font-bold text-slate-100">{item.symbol}</span>
        {item.name && (
          <span className="text-xs text-slate-600 ml-2 truncate hidden sm:inline">{item.name}</span>
        )}
        <span className="text-[10px] text-slate-700 ml-2 hidden sm:inline">{item.reportDate}</span>
      </div>
      <div className="shrink-0 ml-4 text-right">
        {item.estimate !== null ? (
          <span className="font-mono text-xs text-slate-400">
            Est. <span className="text-slate-300">{item.estimate.toFixed(2)}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </div>
    </button>
  )
}

function BeatRateBar({ quarters }: { quarters: QuarterlyEarning[] }) {
  const beats = quarters.filter(q => (q.surprise ?? 0) > 0).length
  const pct   = Math.round((beats / quarters.length) * 100)
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-500">Beat rate — last {quarters.length} quarters</span>
        <span className={`font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {beats}/{quarters.length} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function EpsChart({ quarters }: { quarters: QuarterlyEarning[] }) {
  const reversed = [...quarters].reverse() // oldest → newest
  const values   = reversed.map(q => q.reportedEps ?? 0)
  const max      = Math.max(...values.map(Math.abs), 0.01)

  return (
    <div>
      <p className="text-xs text-slate-600 mb-2">EPS per quarter</p>
      <div className="flex items-end gap-1 h-16">
        {reversed.map((q, i) => {
          const val  = q.reportedEps ?? 0
          const est  = q.estimatedEps ?? 0
          const beat = val > est
          const miss = val < est
          const h    = Math.max(4, Math.round((Math.abs(val) / max) * 56))
          const color = beat ? 'bg-emerald-500' : miss ? 'bg-red-500' : 'bg-slate-500'
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex
                              flex-col items-center pointer-events-none z-10">
                <div className="bg-slate-700 text-slate-200 text-[10px] font-mono rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  {fmtQuarter(q.fiscalDateEnding)}: {val >= 0 ? '' : '−'}{Math.abs(val).toFixed(2)}
                  {q.surprisePercentage != null && (
                    <span className={`ml-1 ${beat ? 'text-emerald-400' : miss ? 'text-red-400' : ''}`}>
                      ({beat ? '+' : ''}{q.surprisePercentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
              </div>
              <div className={`w-full rounded-t-sm ${color} opacity-80 hover:opacity-100 transition-opacity`}
                style={{ height: `${h}px` }} />
            </div>
          )
        })}
      </div>
      {/* Quarter labels */}
      <div className="flex gap-1 mt-1">
        {reversed.map((q, i) => (
          <div key={i} className="flex-1 text-center text-[8px] text-slate-700 truncate">
            {fmtQuarter(q.fiscalDateEnding).replace(' ', "'")}
          </div>
        ))}
      </div>
    </div>
  )
}
