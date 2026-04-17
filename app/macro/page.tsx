import Link from 'next/link'
import MacroIndicators from '../components/MacroIndicators'

export default function MacroPage() {
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
          <h1 className="text-2xl font-bold text-slate-100">Macro Indicators</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400
            bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
            FRED
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Federal Reserve economic data — inflation, GDP, employment, interest rates, yield curve and more.
        </p>
      </div>

      <MacroIndicators />

    </main>
  )
}
