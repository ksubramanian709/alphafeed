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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return d >= sunday && d <= saturday
}

function isNextWeek(dateStr: string): boolean {
  const d     = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextSunday = new Date(today)
  nextSunday.setDate(today.getDate() - today.getDay() + 7)
  const nextSaturday = new Date(nextSunday)
  nextSaturday.setDate(nextSunday.getDate() + 6)
  return d >= nextSunday && d <= nextSaturday
}

export default function EarningsCalendar() {
  const [items, setItems]     = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'week' | 'next' | 'month'>('week')

  useEffect(() => {
    fetch(`${API}/v1/earnings/calendar`)
      .then(r => r.json())
      .then((data: CalendarItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(item => {
    if (filter === 'week')  return isThisWeek(item.reportDate)
    if (filter === 'next')  return isNextWeek(item.reportDate)
    return true
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    acc[item.reportDate] = acc[item.reportDate] ?? []
    acc[item.reportDate].push(item)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort()

  return (
    <section>
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
                filter === key
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
          No earnings scheduled for this period.
        </div>
      )}

      {!loading && dates.length > 0 && (
        <div className="space-y-3">
          {dates.map(date => (
            <div key={date} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Date header */}
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400">{fmtDate(date)}</span>
                <span className="text-xs text-slate-600 ml-2">{grouped[date].length} report{grouped[date].length !== 1 ? 's' : ''}</span>
              </div>

              {/* Companies */}
              <div className="divide-y divide-slate-800/50">
                {grouped[date].map((item, i) => (
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
                            {item.estimate >= 0 ? '' : ''}{item.estimate.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-700">No estimate</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
