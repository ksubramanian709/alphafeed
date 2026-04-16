import Link from 'next/link'
import MarketsOverview from './components/MarketsOverview'
import MarketPulse from './components/MarketPulse'
import QuoteSearch from './components/QuoteSearch'
import NewsFeed from './components/NewsFeed'
import DailyBriefing from './components/DailyBriefing'
import CommodityDashboard from './components/CommodityDashboard'
import CryptoPanel from './components/CryptoPanel'
import MacroIndicators from './components/MacroIndicators'
import Watchlist from './components/Watchlist'
import AgentChat from './components/AgentChat'

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          <span className="text-emerald-400">Alpha</span>
          <span className="text-slate-100">Feed</span>
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Real-time market intelligence &middot; AI-powered analysis
        </p>

        {/* Search — centrepiece */}
        <div className="max-w-xl mx-auto">
          <QuoteSearch />
        </div>

        {/* Market coverage tags */}
        <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
          {['NYSE', 'NASDAQ', 'Crypto', 'Commodities', 'Forex', 'Macro'].map(label => (
            <span key={label} className="text-[10px] uppercase tracking-widest text-slate-600 border border-slate-800 px-2.5 py-1 rounded-full">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Market Pulse — categorized color-coded overview ─────────── */}
      <MarketPulse />

      {/* ── Screener CTA ────────────────────────────────────────────── */}
      <Link href="/screener" className="block group">
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 hover:border-emerald-500/40 transition-all duration-300">

          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />

          {/* Glow */}
          <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  New
                </span>
                <span className="text-[10px] text-slate-600 uppercase tracking-widest">Feature</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Stock Screener</h2>
              <p className="text-sm text-slate-400 max-w-md">
                Filter 3,600+ US-listed equities by P/E, market cap, EPS, dividend yield, beta, and more. Prices refresh every 60 seconds.
              </p>

              {/* Preset pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { label: 'Value Stocks',   sub: 'P/E < 20'   },
                  { label: 'High Growth',    sub: 'Rev > 15%'  },
                  { label: 'Dividend',       sub: 'Yield > 2%' },
                  { label: 'Low Volatility', sub: 'Beta < 0.8' },
                  { label: 'High ROE',       sub: '> 20%'      },
                ].map(p => (
                  <span key={p.label} className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-400 group-hover:border-slate-600 transition-colors">
                    <span className="text-slate-300">{p.label}</span>
                    <span className="text-slate-600">{p.sub}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 bg-emerald-600 group-hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
                Open Screener
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Earnings CTA ────────────────────────────────────────────── */}
      <Link href="/earnings" className="block group">
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 p-6 hover:border-sky-500/40 transition-all duration-300">
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
          <div className="absolute top-0 right-0 w-64 h-32 bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                  Decision Engine
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Earnings</h2>
              <p className="text-sm text-slate-400 max-w-md">
                Options-implied expected move, beat/miss history, EPS estimates, and AI read — for every major earnings report this week.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Expected Move ±%', 'Beat Rate', 'EPS vs Last Year', 'AI Read'].map(label => (
                  <span key={label} className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-400 group-hover:border-slate-600 transition-colors">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 bg-sky-700 group-hover:bg-sky-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
                View Setups
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Main 2-column grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: news */}
        <div className="lg:col-span-2 space-y-6">
          <DailyBriefing />
        </div>

        {/* Right: watchlist + agent */}
        <div className="space-y-6">
          <Watchlist />
          <AgentChat />
        </div>

      </div>

      {/* ── Commodities + Crypto ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommodityDashboard />
        <CryptoPanel />
      </div>

      {/* ── Macro — only renders if FRED key is configured ──────────── */}
      <MacroIndicators />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800/60 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-semibold">Alpha</span>
          <span>Feed</span>
          <span className="text-slate-800 mx-1">·</span>
          <span>Yahoo Finance · Alpha Vantage · FRED · Brave Search</span>
        </div>
        <a
          href="https://github.com/ksubramanian709/alphafeed"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-500 transition-colors"
        >
          GitHub →
        </a>
      </div>

    </main>
  )
}
