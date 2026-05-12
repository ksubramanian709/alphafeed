import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlphaFeed',
  description: 'Real-time market intelligence and AI-powered analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">

            {/* Left: logo + nav links */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <svg width="20" height="16" viewBox="0 0 42 32" fill="none" aria-hidden="true">
                  <polyline points="3,22 11,16 19,18 27,9 35,5"
                    stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="35" cy="5" r="3" fill="#818cf8" />
                </svg>
                <span className="font-bold text-sm tracking-tight">
                  <span className="text-indigo-400">Alpha</span>
                  <span className="text-slate-100">Feed</span>
                </span>
                <span className="hidden sm:flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5 text-[9px] font-semibold text-indigo-400 tracking-widest uppercase">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                  AI
                </span>
              </Link>

              <div className="flex items-center gap-5">
                <Link href="/" className="text-xs text-slate-500 hover:text-slate-200 transition-colors">
                  Research
                </Link>
                <Link href="/markets" className="text-xs text-slate-500 hover:text-slate-200 transition-colors">
                  Markets
                </Link>
                <Link href="/screener" className="text-xs text-slate-500 hover:text-slate-200 transition-colors">
                  Screener
                </Link>
                <Link href="/earnings" className="text-xs text-slate-500 hover:text-slate-200 transition-colors">
                  Earnings
                </Link>
              </div>
            </div>

            {/* Right: data sources badge */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-600">
              <span>SEC EDGAR</span>
              <span className="text-slate-800">·</span>
              <span>Claude AI</span>
              <span className="text-slate-800">·</span>
              <span>FRED</span>
            </div>

          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
