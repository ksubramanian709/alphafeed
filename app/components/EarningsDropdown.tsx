'use client'
import { BACKEND } from '@/lib/backend'
import { useState } from 'react'


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

function fmtEps(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return (n >= 0 ? '' : '') + n.toFixed(2)
}

function fmtSurprise(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function fmtPct(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function fmtQuarter(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const month = d.getUTCMonth() + 1
  const year  = d.getUTCFullYear()
  const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4'
  return `${q} ${year}`
}

export default function EarningsDropdown({ symbol }: { symbol: string }) {
  const [open, setOpen]       = useState(false)
  const [data, setData]       = useState<EarningsHistory | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!open && !data) {
      setLoading(true)
      try {
        const res  = await fetch(`${BACKEND}/v1/earnings/${symbol}`)
        const json = await res.json()
        setData(json)
      } catch {
        setData({ symbol, quarterlyEarnings: null, error: 'Failed to load earnings data.' })
      } finally {
        setLoading(false)
      }
    }
    setOpen(o => !o)
  }

  const beats  = data?.quarterlyEarnings?.filter(q => (q.surprise ?? 0) > 0).length ?? 0
  const total  = data?.quarterlyEarnings?.length ?? 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* Toggle header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Earnings History
          </span>
          {data?.quarterlyEarnings && total > 0 && (
            <span className="text-xs text-slate-600">
              Beat <span className="text-emerald-400 font-mono">{beats}/{total}</span> quarters
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="w-3.5 h-3.5 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          )}
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-800 px-5 py-4">

          {data?.error && !data.quarterlyEarnings && (
            <p className="text-sm text-slate-500 text-center py-4">{data.error}</p>
          )}

          {data?.quarterlyEarnings && data.quarterlyEarnings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-600 border-b border-slate-800">
                    <th className="text-left pb-2 font-normal">Quarter</th>
                    <th className="text-right pb-2 px-3 font-normal">Est. EPS</th>
                    <th className="text-right pb-2 px-3 font-normal">Actual EPS</th>
                    <th className="text-right pb-2 px-3 font-normal">Surprise</th>
                    <th className="text-right pb-2 pl-3 font-normal">vs Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quarterlyEarnings.map((q, i) => {
                    const beat    = q.surprise !== null && q.surprise > 0
                    const miss    = q.surprise !== null && q.surprise < 0
                    const neutral = !beat && !miss

                    return (
                      <tr key={i} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                        <td className="py-2 pr-3">
                          <div className="text-slate-300">{fmtQuarter(q.fiscalDateEnding)}</div>
                          <div className="text-slate-700 text-[10px]">{q.reportedDate ?? '—'}</div>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {fmtEps(q.estimatedEps)}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${beat ? 'text-emerald-400' : miss ? 'text-red-400' : 'text-slate-300'}`}>
                          {fmtEps(q.reportedEps)}
                        </td>
                        <td className={`py-2 px-3 text-right ${beat ? 'text-emerald-400' : miss ? 'text-red-400' : 'text-slate-500'}`}>
                          {fmtSurprise(q.surprise)}
                        </td>
                        <td className="py-2 pl-3 text-right">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            beat    ? 'bg-emerald-500/15 text-emerald-400' :
                            miss    ? 'bg-red-500/15 text-red-400' :
                                      'bg-slate-700 text-slate-500'
                          }`}>
                            {neutral ? '—' : fmtPct(q.surprisePercentage)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data?.quarterlyEarnings?.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">No earnings history available.</p>
          )}
        </div>
      )}
    </div>
  )
}
