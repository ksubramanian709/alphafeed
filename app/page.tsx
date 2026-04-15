import MarketsOverview from './components/MarketsOverview'
import QuoteSearch from './components/QuoteSearch'
import NewsFeed from './components/NewsFeed'
import CommodityDashboard from './components/CommodityDashboard'
import MacroIndicators from './components/MacroIndicators'
import Watchlist from './components/Watchlist'
import AgentChat from './components/AgentChat'

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="text-center pb-8 border-b border-slate-800/60 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        {/* Logo card */}
        <div className="relative flex justify-center mb-5">
          <div className="relative inline-flex">
            {/* Outer glow ring */}
            <div className="absolute -inset-1 bg-emerald-500/20 rounded-2xl blur-lg" />
            {/* Card */}
            <div className="relative bg-[#0d1117] border border-slate-700/70 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">

              {/* Chart icon */}
              <svg width="42" height="32" viewBox="0 0 42 32" fill="none" aria-hidden="true">
                {/* Volume bars */}
                <rect x="1"  y="27" width="5" height="5"  fill="#22c55e" opacity="0.25" rx="1"/>
                <rect x="9"  y="25" width="5" height="7"  fill="#22c55e" opacity="0.25" rx="1"/>
                <rect x="17" y="23" width="5" height="9"  fill="#22c55e" opacity="0.25" rx="1"/>
                <rect x="25" y="20" width="5" height="12" fill="#22c55e" opacity="0.25" rx="1"/>
                <rect x="33" y="18" width="5" height="14" fill="#22c55e" opacity="0.25" rx="1"/>
                {/* Rising line */}
                <polyline
                  points="3,22 11,16 19,18 27,9 35,5"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* Line dots */}
                <circle cx="11" cy="16" r="2.5" fill="#22c55e"/>
                <circle cx="27" cy="9"  r="2.5" fill="#22c55e"/>
                <circle cx="35" cy="5"  r="2.5" fill="#16a34a"/>
                {/* Glow on last dot */}
                <circle cx="35" cy="5"  r="5" fill="#22c55e" opacity="0.15"/>
              </svg>

              {/* Wordmark */}
              <span className="text-3xl font-bold tracking-tight leading-none select-none">
                <span className="text-emerald-400">Alpha</span>
                <span className="text-white">Feed</span>
              </span>

              {/* Live badge */}
              <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1 text-[10px] font-semibold text-emerald-400 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-slate-400 text-sm tracking-wide">
          Real-time market intelligence &middot; AI-powered analysis
        </p>

        {/* Market coverage strip */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {['NYSE', 'NASDAQ', 'Crypto', 'Commodities', 'Forex', 'Macro'].map((label, i, arr) => (
            <span key={label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 tracking-wide">{label}</span>
              {i < arr.length - 1 && <span className="text-slate-700 text-xs">·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Markets overview strip */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Markets
        </h2>
        <MarketsOverview />
      </section>

      {/* Ticker search */}
      <QuoteSearch />

      {/* Market news */}
      <NewsFeed limit={6} title="Market Headlines" />

      {/* Commodity dashboard */}
      <CommodityDashboard />

      {/* Macro indicators (FRED) */}
      <MacroIndicators />

      {/* Watchlist with live WebSocket prices */}
      <Watchlist />

      {/* Agent chat */}
      <AgentChat />

      {/* Footer */}
      <div className="border-t border-slate-800 pt-4 text-xs text-slate-700 flex justify-between">
        <span>Sources: Yahoo Finance · Alpha Vantage · FRED · Brave Search</span>
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
