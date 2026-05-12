'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const POPULAR = [
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'NVDA',  name: 'Nvidia' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'META',  name: 'Meta' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'JPM',   name: 'JPMorgan' },
  { symbol: 'V',     name: 'Visa' },
  { symbol: 'UNH',   name: 'UnitedHealth' },
  { symbol: 'XOM',   name: 'ExxonMobil' },
  { symbol: 'BRK-B', name: 'Berkshire' },
]

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'indigo',
    title: '10-K Deep Dive',
    body: 'Claude reads the full SEC 10-K filing and extracts key insights, risk factors, and opportunities — in seconds, not hours.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'emerald',
    title: 'Earnings Intelligence',
    body: 'Track quarterly EPS surprises, beat rates, and revenue trends. See how guidance held up against actuals over time.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'violet',
    title: 'Year-over-Year Changes',
    body: 'AI compares annual filings to surface what management added, removed, or changed in their risk disclosures and outlook.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'amber',
    title: 'All SEC Filings',
    body: 'Browse every 10-K and 10-Q for any US public company, with direct links to the original EDGAR filing.',
  },
]

const colorMap: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  indigo: { icon: 'text-indigo-400',  accent: 'bg-indigo-500/10 border-indigo-500/20', border: 'hover:border-indigo-500/30', bg: 'group-hover:bg-indigo-500/5' },
  emerald:{ icon: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20', border: 'hover:border-emerald-500/30', bg: 'group-hover:bg-emerald-500/5' },
  violet: { icon: 'text-violet-400',  accent: 'bg-violet-500/10 border-violet-500/20', border: 'hover:border-violet-500/30', bg: 'group-hover:bg-violet-500/5' },
  amber:  { icon: 'text-amber-400',   accent: 'bg-amber-500/10 border-amber-500/20', border: 'hover:border-amber-500/30', bg: 'group-hover:bg-amber-500/5' },
}

export default function Home() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function go(sym: string) {
    const s = sym.trim().toUpperCase()
    if (s) router.push(`/research/${s}`)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold">
            Powered by SEC EDGAR + Claude AI
          </span>
        </div>

        <div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="text-indigo-400">Alpha</span>
            <span className="text-slate-100">Feed</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Research any public company. AI reads the SEC filings so you don't have to.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto">
          <form onSubmit={e => { e.preventDefault(); go(query) }} className="relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ticker or company name — e.g. AAPL, NVDA, JPM"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 pr-24
                text-sm text-slate-200 placeholder-slate-600 outline-none
                focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            <button type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500
                text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
              Research →
            </button>
          </form>
        </div>
      </div>

      {/* ── Popular companies ─────────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold text-center mb-4">
          Popular Companies
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {POPULAR.map(({ symbol, name }) => (
            <button key={symbol} onClick={() => go(symbol)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800
                hover:border-indigo-500/40 hover:bg-indigo-500/5 rounded-xl px-3.5 py-2
                transition-all group">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700
                flex items-center justify-center text-[9px] font-bold text-white">
                {symbol.slice(0, 2)}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-mono text-indigo-400 font-semibold leading-none">{symbol}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-semibold whitespace-nowrap">
            What You Get
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => {
            const c = colorMap[f.color]
            return (
              <div key={f.title}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800
                  bg-slate-900/50 p-5 transition-all duration-300 ${c.border}`}>
                <div className={`absolute inset-0 transition-colors duration-300 ${c.bg}`} />
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl
                    border mb-4 ${c.accent} ${c.icon}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800/60 pt-5 flex flex-col sm:flex-row items-center
        justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="text-indigo-500 font-semibold">Alpha</span>
          <span>Feed</span>
          <span className="text-slate-800 mx-1">·</span>
          <span>SEC EDGAR · Claude AI · Yahoo Finance · FRED</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/markets" className="hover:text-slate-500 transition-colors">Markets</Link>
          <Link href="/screener" className="hover:text-slate-500 transition-colors">Screener</Link>
          <a href="https://github.com/ksubramanian709/alphafeed" target="_blank" rel="noopener noreferrer"
            className="hover:text-slate-500 transition-colors">GitHub →</a>
        </div>
      </div>
    </main>
  )
}
