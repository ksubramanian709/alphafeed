import MarketPulse from './components/MarketPulse'
import QuoteSearch from './components/QuoteSearch'
import HomeTabs from './components/HomeTabs'

// ── Differentiator cards ───────────────────────────────────────────────────────

const DIFFERENTIATORS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'emerald',
    title: 'AI That Actually Reads the Market',
    body: 'Not just charts. AlphaFeed runs a Claude-powered intelligence layer that synthesizes news, fundamentals, and earnings data into plain-English analysis — on demand, per ticker.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'sky',
    title: 'Earnings Decision Engine',
    body: 'Options-implied expected move, historical beat rate, EPS vs. last year, and analyst consensus — all in one view. Know what the market is pricing in before the report drops.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    color: 'violet',
    title: 'Everything in One Place',
    body: 'Global indices, sector ETFs, futures, crypto, forex, FRED macro data, options chains, and a full stock screener — no juggling between Bloomberg, TradingView, and five other tabs.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'amber',
    title: 'Zero Paywalls',
    body: 'Full access, no subscription. Most platforms lock earnings data, screeners, or options chains behind $30/month tiers. AlphaFeed is free and open — built to be the tool you actually reach for.',
  },
]

const colorMap: Record<string, { icon: string; badge: string; border: string; glow: string }> = {
  emerald: {
    icon:   'text-emerald-400',
    badge:  'bg-emerald-500/10 border-emerald-500/20',
    border: 'hover:border-emerald-500/25',
    glow:   'group-hover:bg-emerald-500/5',
  },
  sky: {
    icon:   'text-sky-400',
    badge:  'bg-sky-500/10 border-sky-500/20',
    border: 'hover:border-sky-500/25',
    glow:   'group-hover:bg-sky-500/5',
  },
  violet: {
    icon:   'text-violet-400',
    badge:  'bg-violet-500/10 border-violet-500/20',
    border: 'hover:border-violet-500/25',
    glow:   'group-hover:bg-violet-500/5',
  },
  amber: {
    icon:   'text-amber-400',
    badge:  'bg-amber-500/10 border-amber-500/20',
    border: 'hover:border-amber-500/25',
    glow:   'group-hover:bg-amber-500/5',
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

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
        <p className="text-slate-400 text-base mb-2 max-w-lg mx-auto leading-relaxed">
          The market intelligence terminal built for serious traders —
          without the Bloomberg price tag.
        </p>
        <p className="text-slate-600 text-sm mb-8 max-w-md mx-auto leading-relaxed">
          Real-time data across every asset class, an AI layer that synthesizes it all,
          and tools most platforms lock behind paywalls.
        </p>

        {/* Search */}
        <div className="max-w-xl mx-auto">
          <QuoteSearch />
        </div>

        {/* Market coverage tags */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {['NYSE', 'NASDAQ', 'Crypto', 'Commodities', 'Forex', 'Macro'].map(label => (
            <span key={label}
              className="text-[10px] uppercase tracking-widest text-slate-600
                border border-slate-800 px-2.5 py-1 rounded-full hover:border-slate-700
                hover:text-slate-500 transition-colors cursor-default">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Why AlphaFeed ─────────────────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-semibold whitespace-nowrap">
            Why AlphaFeed
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIFFERENTIATORS.map(d => {
            const c = colorMap[d.color]
            return (
              <div key={d.title}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800
                  bg-slate-900/50 p-5 transition-all duration-300 ${c.border}`}>
                {/* Subtle glow on hover */}
                <div className={`absolute inset-0 transition-colors duration-300 ${c.glow}`} />

                <div className="relative">
                  {/* Icon badge */}
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl
                    border mb-4 ${c.badge} ${c.icon}`}>
                    {d.icon}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-200 mb-2 leading-snug">
                    {d.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {d.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Stat strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: '3,600+', label: 'Equities screened'   },
            { value: '60+',    label: 'Global markets'      },
            { value: 'Live',   label: 'Earnings updates'    },
            { value: 'Free',   label: 'No subscription'     },
          ].map(stat => (
            <div key={stat.label}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <div className="text-lg font-bold text-emerald-400 font-mono">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Market Pulse ──────────────────────────────────────────────────────── */}
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
