import Link from 'next/link'
import MarketPulse from '../components/MarketPulse'

export default function MarketsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-100">Global Markets</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500
            bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Live
          </span>
        </div>
        <p className="text-sm text-slate-500">
          US & global indices, sector ETFs, mega-cap equities, crypto and commodities — all in one place.
        </p>
      </div>

      <MarketPulse />

    </main>
  )
}
