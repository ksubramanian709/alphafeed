import MarketPulse from './components/MarketPulse'
import QuoteSearch from './components/QuoteSearch'
import HomeTabs from './components/HomeTabs'

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">
            Live Market Data
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          <span className="text-emerald-400">Alpha</span>
          <span className="text-slate-100">Feed</span>
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          Real-time market intelligence &middot; AI-powered analysis
        </p>

        {/* Search — centrepiece */}
        <div className="max-w-xl mx-auto">
          <QuoteSearch />
        </div>

        {/* Market coverage tags */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {[
            { label: 'NYSE',        color: 'slate' },
            { label: 'NASDAQ',      color: 'slate' },
            { label: 'Crypto',      color: 'slate' },
            { label: 'Commodities', color: 'slate' },
            { label: 'Forex',       color: 'slate' },
            { label: 'Macro',       color: 'slate' },
          ].map(({ label }) => (
            <span key={label}
              className="text-[10px] uppercase tracking-widest text-slate-600
                border border-slate-800 px-2.5 py-1 rounded-full hover:border-slate-700
                hover:text-slate-500 transition-colors cursor-default">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Market Pulse — live ticker strip ──────────────────────────────────── */}
      <MarketPulse />

      {/* ── Tabbed content ────────────────────────────────────────────────────── */}
      <HomeTabs />

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800/60 pt-5 flex flex-col sm:flex-row items-center
        justify-between gap-3 text-xs text-slate-700">
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
