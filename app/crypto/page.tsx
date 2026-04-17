import Link from 'next/link'
import CryptoPanel from '../components/CryptoPanel'

export default function CryptoPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-100">Crypto Markets</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400
            bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
            Live
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Real-time prices, market cap, 24h volume and change for top cryptocurrencies.
        </p>
      </div>

      <CryptoPanel />

    </main>
  )
}
