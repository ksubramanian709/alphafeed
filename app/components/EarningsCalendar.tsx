'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL

interface CalendarItem {
  symbol: string
  name: string
  reportDate: string
  fiscalDateEnding: string
  estimate: number | null
  lastYearEPS: number | null
  currency: string
  marketCap: number | null
  reportTime: string | null
  analystCount: number | null
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

interface NewsItem {
  title: string
  url: string
  source: string
  summary: string | null
  publishedAt: string | null
  imageUrl: string | null
}

interface NewsResponse {
  data: NewsItem[]
  source: string
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
  return (n >= 0 ? '' : '−') + '$' + Math.abs(n).toFixed(2)
}

function fmtCap(n: number | null) {
  if (n == null) return null
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n}`
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d ago`
  if (h > 0) return `${h}h ago`
  return `${m}m ago`
}

// Build a 6-row × 7-col calendar grid for the given month
function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const grid: (Date | null)[][] = []
  for (let r = 0; r < cells.length / 7; r++) grid.push(cells.slice(r * 7, r * 7 + 7))
  return grid
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MAJOR = new Set([
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
  'F','GM','T','VZ','DIS','CMCSA','PARA','WBD',
  'MS','C','WFC','USB','AXP','COF','SCHW','BK','TFC',
  'PFE','MRK','BIIB','MRNA','BNTX',
  'UPS','FDX','LMT','NOC','GD',
  'MSCI','ICE','MCO','FIS','FISV','PAYX',
  'FICO','CDNS','SNPS','KLAC','MRVL','MCHP',
  'SHOP','SQ','ROKU','TTD','TWLO','ZM','DOCU',
  'NVO','ASML','TSM','BABA','JD','PDD',
  'WBA','CVS','MCK',
  'NEE','AEP','D','EXC','SRE',
  'AMT','EQIX','CCI','SPG',
  'FCX','NEM',
  'RIVN','NIO',
  'ENPH','FSLR',
  'RBLX','U','TTWO','EA',
])

function shortName(name: string): string {
  if (!name) return ''
  const stopWords = ['Inc.','Inc','Corp.','Corp','Co.','Co','Ltd.','Ltd','Group','Holdings','Technologies','Technology','International','Incorporated','LLC','PLC','N.V.','S.A.']
  let s = name
  for (const w of stopWords) s = s.replace(new RegExp('\\s*,?\\s*' + w.replace('.','\\.')  + '\\s*$', 'i'), '')
  return s.trim().slice(0, 16)
}

function sortDay(arr: CalendarItem[]): CalendarItem[] {
  return [...arr].sort((a, b) => {
    const ac = a.marketCap ?? (MAJOR.has(a.symbol) ? 1 : 0)
    const bc = b.marketCap ?? (MAJOR.has(b.symbol) ? 1 : 0)
    return bc - ac
  })
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
  const [news, setNews]             = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [showAll, setShowAll]       = useState(true)

  useEffect(() => {
    fetch(`${API}/v1/earnings/calendar`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: CalendarItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const visibleItems = showAll ? items : items.filter(i => MAJOR.has(i.symbol))

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
    setNews([])
  }

  async function openDetail(item: CalendarItem) {
    setDetail({ symbol: item.symbol, item })
    setHistory(null)
    setNews([])
    setHistLoading(true)
    setNewsLoading(true)

    // Fetch history and news in parallel
    const [histRes, newsRes] = await Promise.allSettled([
      fetch(`${API}/v1/earnings/${item.symbol}`).then(r => r.json()) as Promise<EarningsHistory>,
      fetch(`${API}/v1/news/${item.symbol}`).then(r => r.json()) as Promise<NewsResponse>,
    ])

    if (histRes.status === 'fulfilled') setHistory(histRes.value)
    else setHistory({ symbol: item.symbol, quarterlyEarnings: null, error: 'Failed to load.' })
    setHistLoading(false)

    if (newsRes.status === 'fulfilled' && newsRes.value?.data) setNews(newsRes.value.data.slice(0, 5))
    setNewsLoading(false)
  }

  const selectedItems = selectedDate ? sortDay(byDate[selectedDate] ?? []) : []
  const filteredSelected = search.trim()
    ? selectedItems.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        i.name?.toLowerCase().includes(search.toLowerCase()))
    : selectedItems

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
          <div className="flex rounded-md overflow-hidden border border-slate-700 text-[10px]">
            <button
              onClick={() => setShowAll(false)}
              className={`px-2.5 py-1 transition-colors ${!showAll ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
            >Major</button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-2.5 py-1 transition-colors ${showAll ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
            >All</button>
          </div>
        </div>
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

      {/* ── Global search results ── */}
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
      ) : items.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-600 text-xs">
          No earnings data available
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
              <div key={d} className="text-center text-[10px] font-medium text-slate-600 py-2">{d}</div>
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
                              <div className="text-[9px] text-slate-600 pl-1 pt-[1px]">+{extra} more</div>
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

      {/* ── Company earnings preview panel ── */}
      {detail && (
        <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link href={`/ticker/${encodeURIComponent(detail.symbol)}`}
                  className="font-mono font-bold text-xl text-slate-100 hover:text-emerald-400 transition-colors">
                  {detail.symbol}
                </Link>
                {detail.item.reportTime && (
                  <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                    {detail.item.reportTime}
                  </span>
                )}
                {detail.item.marketCap && (
                  <span className="text-[10px] text-slate-500">
                    {fmtCap(detail.item.marketCap)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 truncate">{detail.item.name}</p>
              <p className="text-xs text-slate-600 mt-1">
                Reports <span className="text-slate-400">{fmtShortDate(detail.item.reportDate)}</span>
              </p>
            </div>
            <button onClick={() => { setDetail(null); setHistory(null); setNews([]) }}
              className="text-slate-600 hover:text-slate-400 shrink-0 mt-0.5">✕</button>
          </div>

          {/* EPS Estimate card */}
          <div className="px-5 py-4 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="EPS Estimate" value={fmtEps(detail.item.estimate)}
              sub={detail.item.analystCount ? `${detail.item.analystCount} analysts` : undefined} />
            <StatCard label="Last Year EPS" value={fmtEps(detail.item.lastYearEPS)}
              sub={detail.item.lastYearEPS && detail.item.estimate
                ? (() => {
                    const chg = ((detail.item.estimate - detail.item.lastYearEPS) / Math.abs(detail.item.lastYearEPS)) * 100
                    return `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% YoY est.`
                  })()
                : undefined}
              subColor={detail.item.lastYearEPS && detail.item.estimate
                ? detail.item.estimate >= detail.item.lastYearEPS ? 'text-emerald-400' : 'text-red-400'
                : undefined} />
            <StatCard label="Market Cap" value={fmtCap(detail.item.marketCap) ?? '—'} />
            <StatCard label="Report Time" value={detail.item.reportTime ?? 'TBD'} />
          </div>

          {/* History section */}
          {histLoading && (
            <div className="flex items-center justify-center h-24 text-slate-600 text-xs animate-pulse border-b border-slate-800">
              Loading earnings history…
            </div>
          )}

          {!histLoading && history?.error && !history.quarterlyEarnings && (
            <div className="px-5 py-4 border-b border-slate-800">
              <p className="text-xs text-slate-600">{history.error}</p>
            </div>
          )}

          {!histLoading && history?.quarterlyEarnings && history.quarterlyEarnings.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">EPS History</p>
              <BeatRateBar quarters={history.quarterlyEarnings} />
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

          {/* News section */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Recent News — {detail.symbol}
            </p>
            {newsLoading && (
              <div className="text-xs text-slate-600 animate-pulse">Loading news…</div>
            )}
            {!newsLoading && news.length === 0 && (
              <p className="text-xs text-slate-600">No recent news found.</p>
            )}
            {!newsLoading && news.length > 0 && (
              <div className="space-y-3">
                {news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 group hover:bg-slate-800/40 -mx-2 px-2 py-2 rounded-lg transition-colors">
                    {n.imageUrl && (
                      <img src={n.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-slate-800" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                        {n.title}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {n.source}{n.publishedAt ? ` · ${timeAgo(n.publishedAt)}` : ''}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Link to full ticker page */}
            <Link href={`/ticker/${encodeURIComponent(detail.symbol)}`}
              className="mt-4 flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
              View full {detail.symbol} analysis
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor }: {
  label: string; value: string; sub?: string; subColor?: string
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-mono font-semibold text-slate-200">{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${subColor ?? 'text-slate-500'}`}>{sub}</p>}
    </div>
  )
}

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
      <div className="shrink-0 ml-4 text-right flex items-center gap-2">
        {item.reportTime && (
          <span className="text-[9px] text-slate-600 hidden sm:block">{item.reportTime}</span>
        )}
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
  const reversed = [...quarters].reverse()
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
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex
                              flex-col items-center pointer-events-none z-10">
                <div className="bg-slate-700 text-slate-200 text-[10px] font-mono rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  {fmtQuarter(q.fiscalDateEnding)}: {val >= 0 ? '' : '−'}${Math.abs(val).toFixed(2)}
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
