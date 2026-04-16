'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [items, setItems]           = useState<CalendarItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewDate, setViewDate]     = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
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
  }

  function goToTicker(symbol: string) {
    router.push(`/ticker/${encodeURIComponent(symbol)}`)
  }

  const selectedItems = selectedDate ? sortDay(byDate[selectedDate] ?? []) : []
  const filteredSelected = search.trim()
    ? selectedItems.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        i.name?.toLowerCase().includes(search.toLowerCase()))
    : selectedItems

  const searchResults = search.trim()
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
      {search.trim() && (
        <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">No results for "{search}"</p>
          ) : (
            <div className="divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
              {searchResults.map((item, i) => (
                <SearchRow key={i} item={item} onSelect={() => goToTicker(item.symbol)} />
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
                                onClick={e => { e.stopPropagation(); goToTicker(item.symbol) }}
                                className={`rounded px-1 py-[2px] truncate leading-tight cursor-pointer
                                  hover:brightness-125 transition-all
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
                <button onClick={() => setSelectedDate(null)}
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
                    onSelect={() => goToTicker(item.symbol)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SearchRow({ item, onSelect }: {
  item: CalendarItem
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left hover:bg-slate-800/40"
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

