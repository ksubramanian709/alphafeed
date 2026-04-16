'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL

interface Stock {
  symbol: string
  name: string
  sector: string
  currentPrice: number | null
  changePercent: number | null
  marketCap: number | null
  peRatio: number | null
  forwardPE: number | null
  eps: number | null
  priceToBook: number | null
  dividendYield: number | null
  beta: number | null
  ma50: number | null
  ma200: number | null
}

function fmtLarge(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${(n * 100).toFixed(2)}%`
}
function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n == null) return '—'
  return n.toFixed(dec)
}
function chgClass(n: number | null | undefined): string {
  if (n == null) return 'text-slate-500'
  return n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-slate-400'
}

type Filters = {
  sector: string
  minPE: string
  maxPE: string
  minMarketCapB: string
  maxMarketCapB: string
  minDivYield: string
  minEps: string
  maxBeta: string
}

const EMPTY: Filters = {
  sector: '', minPE: '', maxPE: '', minMarketCapB: '', maxMarketCapB: '',
  minDivYield: '', minEps: '', maxBeta: '',
}

const SORT_COLS = [
  { key: 'marketCap',    label: 'Mkt Cap' },
  { key: 'peRatio',      label: 'P/E' },
  { key: 'forwardPE',    label: 'Fwd P/E' },
  { key: 'eps',          label: 'EPS' },
  { key: 'priceToBook',  label: 'P/B' },
  { key: 'dividendYield',label: 'Div Yield' },
  { key: 'beta',         label: 'Beta' },
  { key: 'changePercent',label: '% Chg' },
]

const PRESET_FILTERS: { label: string; icon: string; params: Partial<Filters> }[] = [
  { label: 'Large Cap',   icon: '🏦', params: { minMarketCapB: '10' } },
  { label: 'Value',       icon: '💎', params: { minPE: '1', maxPE: '20' } },
  { label: 'Dividend',    icon: '💰', params: { minDivYield: '2' } },
  { label: 'Low Beta',    icon: '🛡️', params: { maxBeta: '0.8' } },
  { label: 'Mega Cap',    icon: '🌐', params: { minMarketCapB: '200' } },
]

export default function ScreenerPage() {
  const router = useRouter()
  const [filters, setFilters]   = useState<Filters>(EMPTY)
  const [sortBy, setSortBy]     = useState('marketCap')
  const [sortDesc, setSortDesc] = useState(true)
  const [results, setResults]   = useState<Stock[]>([])
  const [loading, setLoading]   = useState(false)
  const [sectors, setSectors]   = useState<string[]>([])
  const [total, setTotal]       = useState(0)
  const [searched, setSearched] = useState(false)
  const [query, setQuery]       = useState('')

  useEffect(() => {
    fetch(`${API}/v1/screener/sectors`).then(r => r.json()).then(setSectors).catch(() => {})
  }, [])

  const runScreen = useCallback(async (f: Filters = filters, sb = sortBy, sd = sortDesc) => {
    setLoading(true)
    setSearched(true)
    try {
      const p = new URLSearchParams()
      if (f.sector)        p.set('sector',        f.sector)
      if (f.minPE)         p.set('minPE',         f.minPE)
      if (f.maxPE)         p.set('maxPE',         f.maxPE)
      if (f.minMarketCapB) p.set('minMarketCapB', f.minMarketCapB)
      if (f.maxMarketCapB) p.set('maxMarketCapB', f.maxMarketCapB)
      if (f.minDivYield)   p.set('minDivYield',   f.minDivYield)
      if (f.minEps)        p.set('minEps',        f.minEps)
      if (f.maxBeta)       p.set('maxBeta',       f.maxBeta)
      p.set('sortBy',   sb)
      p.set('sortDesc', String(sd))
      const res  = await fetch(`${API}/v1/screener?${p}`)
      const json = await res.json()
      setResults(json)
      setTotal(json.length)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [filters, sortBy, sortDesc])

  function handleSort(col: string) {
    const nd = col === sortBy ? !sortDesc : true
    setSortBy(col); setSortDesc(nd)
    if (searched) runScreen(filters, col, nd)
  }

  function applyPreset(params: Partial<Filters>) {
    const next = { ...EMPTY, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) }
    setFilters(next); runScreen(next, sortBy, sortDesc)
  }

  function clearFilters() { setFilters(EMPTY); setResults([]); setSearched(false); setQuery('') }
  function set(key: keyof Filters, val: string) { setFilters(prev => ({ ...prev, [key]: val })) }

  const q = query.trim().toLowerCase()
  const displayed = q
    ? results.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.sector ?? '').toLowerCase().includes(q))
    : results

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.push('/')} className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2 block">
            ← Back to dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-100">Stock Screener</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            3,600+ US-listed equities across all sectors
          </p>
        </div>

        {searched && (
          <div className="flex items-center gap-4 mt-6">
            <div className="relative">
              <input type="text" placeholder="Search symbol or name…" value={query}
                onChange={e => setQuery(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 w-52"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">✕</button>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-slate-100">{displayed.length}</div>
              <div className="text-xs text-slate-500">{query ? `of ${total}` : 'matches'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESET_FILTERS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.params as Partial<Filters>)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors">
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
        {searched && (
          <button onClick={clearFilters}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Sector</label>
            <select value={filters.sector} onChange={e => set('sector', e.target.value)}
              className={inputCls + " cursor-pointer"}>
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">P/E Ratio</label>
            <div className="flex gap-1.5">
              <input type="number" placeholder="Min" value={filters.minPE} onChange={e => set('minPE', e.target.value)} className={inputCls} />
              <input type="number" placeholder="Max" value={filters.maxPE} onChange={e => set('maxPE', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Market Cap ($B)</label>
            <div className="flex gap-1.5">
              <input type="number" placeholder="Min" value={filters.minMarketCapB} onChange={e => set('minMarketCapB', e.target.value)} className={inputCls} />
              <input type="number" placeholder="Max" value={filters.maxMarketCapB} onChange={e => set('maxMarketCapB', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Min Div Yield %</label>
            <input type="number" placeholder="e.g. 2" step="0.5" value={filters.minDivYield}
              onChange={e => set('minDivYield', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Min EPS ($)</label>
            <input type="number" placeholder="e.g. 1" step="0.5" value={filters.minEps}
              onChange={e => set('minEps', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Max Beta</label>
            <input type="number" placeholder="e.g. 1.5" step="0.1" value={filters.maxBeta}
              onChange={e => set('maxBeta', e.target.value)} className={inputCls} />
          </div>

          <div className="flex items-end col-span-2 sm:col-span-1">
            <button onClick={() => runScreen()} disabled={loading}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors">
              {loading ? 'Loading…' : 'Run Screen'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
          ))}
          <p className="text-xs text-slate-600 text-center pt-2">
            First run fetches 3,600+ stocks — takes ~10s, then cached for 1 hour
          </p>
        </div>
      )}

      {/* Empty prompt */}
      {!loading && !searched && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Set filters and click <span className="text-slate-400">Run Screen</span></p>
          <p className="text-xs mt-1">Or pick a preset · First load fetches all US equities (~10s)</p>
        </div>
      )}

      {/* No results */}
      {!loading && searched && displayed.length === 0 && (
        <div className="text-center py-12 text-slate-600 text-sm">
          {query ? `No results matching "${query}".` : 'No stocks match your filters.'}
        </div>
      )}

      {/* Results table */}
      {!loading && displayed.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 bg-slate-950/50">
                  <th className="text-left px-4 py-3 font-normal w-44 sticky left-0 bg-slate-950/80">Company</th>
                  <th className="text-left px-3 py-3 font-normal whitespace-nowrap">Sector</th>
                  <th className="text-right px-3 py-3 font-normal whitespace-nowrap">Price</th>
                  {SORT_COLS.map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="text-right px-3 py-3 font-normal cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap">
                      {col.label}
                      {sortBy === col.key && <span className="ml-1 text-emerald-500">{sortDesc ? '↓' : '↑'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((s, i) => (
                  <tr key={s.symbol} onClick={() => router.push(`/ticker/${s.symbol}`)}
                    className={`border-b border-slate-800/40 hover:bg-slate-800/50 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/10'}`}>

                    <td className="px-4 py-2.5 sticky left-0 bg-inherit">
                      <div className="font-mono font-semibold text-slate-100">{s.symbol}</div>
                      <div className="text-slate-500 truncate max-w-[140px]" title={s.name ?? ''}>{s.name ?? '—'}</div>
                    </td>

                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.sector ?? '—'}</td>

                    <td className="px-3 py-2.5 text-right">
                      <div className="font-mono text-slate-200">{s.currentPrice ? `$${fmtNum(s.currentPrice)}` : '—'}</div>
                      <div className={`font-mono text-xs ${chgClass(s.changePercent)}`}>
                        {s.changePercent != null ? `${s.changePercent > 0 ? '+' : ''}${fmtNum(s.changePercent)}%` : '—'}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">{fmtLarge(s.marketCap)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">{fmtNum(s.peRatio)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">{fmtNum(s.forwardPE)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                      {s.eps != null ? `$${fmtNum(s.eps)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">{fmtNum(s.priceToBook)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                      {s.dividendYield ? fmtPct(s.dividendYield) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${s.beta != null ? (s.beta > 1.5 ? 'text-red-400' : s.beta < 0.8 ? 'text-blue-400' : 'text-slate-300') : 'text-slate-600'}`}>
                      {fmtNum(s.beta)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${chgClass(s.changePercent)}`}>
                      {s.changePercent != null ? `${s.changePercent > 0 ? '+' : ''}${fmtNum(s.changePercent)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-600">
            <span>Showing {displayed.length}{query ? ` of ${total}` : ''} stocks</span>
            <span>Click any row for full analysis · Data from Yahoo Finance</span>
          </div>
        </div>
      )}
    </main>
  )
}
