import Link from 'next/link'
import ForexPanel from '../components/ForexPanel'

export default function ForexPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-100">Forex</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400
            bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
            Live
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Major, cross and emerging market currency pairs — plus the Dollar Index and US yield curve.
          Refreshes every 60 seconds.
        </p>
      </div>

      <ForexPanel />

    </main>
  )
}
