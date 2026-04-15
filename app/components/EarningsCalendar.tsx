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

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isThisWeek(dateStr: string): boolean {
  const d     = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sunday = new Date(today); sunday.setDate(today.getDate() - today.getDay())
  const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6)
  return d >= sunday && d <= saturday
}

function isNextWeek(dateStr: string): boolean {
  const d     = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const nextSunday = new Date(today); nextSunday.setDate(today.getDate() - today.getDay() + 7)
  const nextSaturday = new Date(nextSunday); nextSaturday.setDate(nextSunday.getDate() + 6)
  return d >= nextSunday && d <= nextSaturday
}

const PAGE_SIZE = 8

export default function EarningsCalendar() {
  const [items, setItems]       = useState<CalendarItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'week' | 'next' | 'month'>('month')
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`${API}/v1/earnings/calendar`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((data: CalendarItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  // Reset expanded state when filter or search changes
  useEffect(() => { setExpanded({}) }, [filter, search])

  const q = search.trim().toLowerCase()

  const filtered = items.filter(item => {
    const matchesPeriod =
      filter === 'week'  ? isThisWeek(item.reportDate) :
      filter === 'next'  ? isNextWeek(item.reportDate) :
      true
    const matchesSearch = !q ||
      item.symbol.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q)
    return matchesPeriod && matchesSearch
  })

  const grouped = filtered.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    acc[item.reportDate] = acc[item.reportDate] ?? []
    acc[item.reportDate].push(item)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort()

  return (
    <section>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Earnings Calendar
        </h2>
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
          {([
            { key: 'week',  label: 'This Week' },
            { key: 'next',  label: 'Next Week' },
            { key: 'month', label: 'This Month' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 transition-colors ${
                filter === key ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search symbol or company…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm
                     placeholder-slate-600 focus:outline-none focus:border-slate-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 text-xs"
          >✕</button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && dates.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-sm border border-slate-800 rounded-xl">
          {q ? `No results for "${search}"` : 'No earnings scheduled for this period.'}
        </div>
      )}

      {!loading && dates.length > 0 && (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {dates.map(date => {
            const all     = grouped[date]
            const isExp   = !!expanded[date]
            const visible = isExp ? all : all.slice(0, PAGE_SIZE)
            const extra   = all.length - PAGE_SIZE

            return (
              <div key={date} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">{fmtDate(date)}</span>
                    <span className="text-xs text-slate-600 ml-2">
                      {all.length} report{all.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/50">
                  {visible.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/30 transition-colors">
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-bold text-slate-100">{item.symbol}</span>
                        {item.name && (
                          <span className="text-xs text-slate-600 ml-2 truncate hidden sm:inline">{item.name}</span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {item.estimate !== null ? (
                          <div>
                            <span className="text-xs text-slate-500">Est. EPS </span>
                            <span className="font-mono text-xs text-slate-300">
                              {item.estimate.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-700">No estimate</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {extra > 0 && (
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [date]: !prev[date] }))}
                      className="w-full px-4 py-2 text-xs text-slate-500 hover:text-slate-300
                                 hover:bg-slate-800/30 transition-colors text-left"
                    >
                      {isExp ? '▲ Show less' : `▼ Show ${extra} more`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
