import QuoteSearch from './components/QuoteSearch'
import CommodityDashboard from './components/CommodityDashboard'
import MacroIndicators from './components/MacroIndicators'
import Watchlist from './components/Watchlist'
import AgentChat from './components/AgentChat'

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-xl font-bold tracking-tight">
          market<span className="text-slate-500">-feed</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time quotes · Commodity futures · Macro indicators · AI market analysis
        </p>
      </div>

      {/* Quote lookup */}
      <QuoteSearch />

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
        <span>Sources: Yahoo Finance · Alpha Vantage · FRED</span>
        <a
          href="https://github.com/ksubramanian709/market-feed"
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
