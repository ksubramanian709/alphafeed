'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'Nvidia' }, { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' }, { symbol: 'META', name: 'Meta' },
  { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'JPM', name: 'JPMorgan' },
  { symbol: 'UNH', name: 'UnitedHealth' }, { symbol: 'V', name: 'Visa' },
  { symbol: 'XOM', name: 'ExxonMobil' }, { symbol: 'BRK-B', name: 'Berkshire' },
]

export default function ResearchLanding() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function go(sym: string) {
    const s = sym.trim().toUpperCase()
    if (s) router.push(`/research/${s}`)
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">
            SEC EDGAR · Claude AI · XBRL Financials
          </span>
        </div>
        <h2 className="text-3xl font-bold text-slate-100">Company Research</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
          AI reads 10-K filings and extracts actual financial data — revenue trends,
          margins, debt, R&D, capex — going back years from SEC XBRL filings.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); go(query) }} className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter ticker — e.g. AAPL, NVDA, JPM"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 pr-28
            text-sm text-slate-200 placeholder-slate-600 outline-none
            focus:border-emerald-500/60 transition-all"
        />
        <button type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500
            text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          Research →
        </button>
      </form>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">
          Popular
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map(({ symbol, name }) => (
            <button key={symbol} onClick={() => go(symbol)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800
                hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-xl px-3 py-2
                transition-all group text-left">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-700 to-teal-800
                flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                {symbol.slice(0, 2)}
              </div>
              <div>
                <div className="text-[10px] font-mono text-emerald-400 font-semibold leading-none">{symbol}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          { label: 'Financials', desc: 'Revenue, margins, EPS, debt going back 8+ years from XBRL' },
          { label: '10-K Analysis', desc: 'AI extracts key insights, risks, and guidance from full filing' },
          { label: 'Year-over-Year', desc: 'See what management added, removed, and changed in risk disclosures' },
          { label: 'Earnings History', desc: 'Beat rate, EPS surprises, revenue vs estimates over time' },
        ].map(f => (
          <div key={f.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="text-emerald-400 font-semibold text-[11px] mb-1">{f.label}</div>
            <div className="text-slate-500 text-[11px] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
