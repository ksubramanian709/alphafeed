'use client'
import { useState } from 'react'
import Link from 'next/link'
import DailyBriefing from './DailyBriefing'
import AgentChat from './AgentChat'
import CommodityDashboard from './CommodityDashboard'
import CryptoPanel from './CryptoPanel'
import MacroIndicators from './MacroIndicators'
import Watchlist from './Watchlist'

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = 'news' | 'markets' | 'watchlist'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'news',
    label: 'Intelligence',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20V14H7v6M7 4v5h8" />
      </svg>
    ),
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7 12l3-9 4 18 3-9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
]

// ── Feature nav cards ──────────────────────────────────────────────────────────

function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Screener */}
      <Link href="/screener" className="group relative overflow-hidden rounded-xl
        border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40
        hover:bg-emerald-950/20 transition-all duration-300 p-4 flex items-center gap-4">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20
          flex items-center justify-center group-hover:border-emerald-500/40 transition-colors">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
              Stock Screener
            </span>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5
              transition-all duration-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Filter 3,600+ equities by P/E, cap, EPS, beta &amp; more
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {['Value', 'Growth', 'Dividend', 'Low Vol'].map(t => (
              <span key={t} className="text-[9px] uppercase tracking-wide text-slate-600
                border border-slate-800 px-1.5 py-0.5 rounded-md group-hover:border-slate-700 transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Earnings */}
      <Link href="/earnings" className="group relative overflow-hidden rounded-xl
        border border-slate-800 bg-slate-900/60 hover:border-sky-500/40
        hover:bg-sky-950/20 transition-all duration-300 p-4 flex items-center gap-4">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          bg-gradient-to-br from-sky-500/5 via-transparent to-transparent" />
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20
          flex items-center justify-center group-hover:border-sky-500/40 transition-colors">
          <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
              Earnings
            </span>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5
              transition-all duration-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Exp. move, beat rate, EPS estimates &amp; AI read
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {['±% Move', 'Beat Rate', 'AI Read', 'Setups'].map(t => (
              <span key={t} className="text-[9px] uppercase tracking-wide text-slate-600
                border border-slate-800 px-1.5 py-0.5 rounded-md group-hover:border-slate-700 transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Link>

    </div>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

function TabBar({ active, setActive }: { active: TabId; setActive: (t: TabId) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-1.5">
      {TABS.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200 flex-1 sm:flex-initial justify-center sm:justify-start
              ${isActive
                ? 'bg-slate-800 text-slate-100 shadow-sm shadow-black/40'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
          >
            <span className={`transition-colors ${isActive ? 'text-emerald-400' : ''}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5
                bg-emerald-500 rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Tab content panels ─────────────────────────────────────────────────────────

function IntelligenceTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DailyBriefing />
      </div>
      <div>
        <AgentChat />
      </div>
    </div>
  )
}

function MarketsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommodityDashboard />
        <CryptoPanel />
      </div>
      <MacroIndicators />
    </div>
  )
}

function WatchlistTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <Watchlist />
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

function HomeTabsInner() {
  const [active, setActive] = useState<TabId>('news')

  return (
    <div className="space-y-5">
      <FeatureCards />

      {/* Tab bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <TabBar active={active} setActive={setActive} />
        <p className="text-xs text-slate-700 hidden sm:block">
          {active === 'news'      && 'AI-generated market briefing & research assistant'}
          {active === 'markets'   && 'Futures, crypto & global macro indicators'}
          {active === 'watchlist' && 'Your tracked symbols with live quotes'}
        </p>
      </div>

      {/* Tab content */}
      <div>
        {active === 'news'      && <IntelligenceTab />}
        {active === 'markets'   && <MarketsTab />}
        {active === 'watchlist' && <WatchlistTab />}
      </div>
    </div>
  )
}

export default function HomeTabs() {
  return <HomeTabsInner />
}
