'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchTickers, type Ticker } from '../lib/tickers'

type SearchResult = Ticker

export default function QuoteSearch() {
  const router = useRouter()

  const [input, setInput]             = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showDrop, setShowDrop]       = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  // Instant local fuzzy search
  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setSuggestions([]); setShowDrop(false); return }
    const results = searchTickers(q)
    setSuggestions(results)
    setShowDrop(results.length > 0)
    setActiveIdx(-1)
  }, [])

  useEffect(() => { runSearch(input) }, [input, runSearch])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropRef.current?.contains(e.target as Node)) return
      setShowDrop(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function navigate(sym: string) {
    setInput(sym)
    setShowDrop(false)
    router.push(`/ticker/${encodeURIComponent(sym)}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); navigate(suggestions[activeIdx >= 0 ? activeIdx : 0].symbol) }
    else if (e.key === 'Escape') setShowDrop(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showDrop && suggestions.length > 0) {
      navigate(suggestions[activeIdx >= 0 ? activeIdx : 0].symbol)
    } else if (input.trim()) {
      navigate(input.trim().toUpperCase())
    }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Quote Lookup
      </h2>

      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowDrop(true) }}
            onFocus={() => { if (suggestions.length > 0) setShowDrop(true) }}
            onKeyDown={onKeyDown}
            placeholder="Search by name or ticker — Apple, palantir, crude oil…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2.5 text-sm
                       placeholder-slate-600 focus:outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {showDrop && suggestions.length > 0 && (
          <div
            ref={dropRef}
            className="absolute z-30 w-full mt-1 bg-slate-900 border border-slate-700
                       rounded-lg shadow-2xl overflow-hidden"
          >
            {suggestions.map((r, i) => (
              <div
                key={r.symbol + i}
                onMouseDown={e => { e.preventDefault(); navigate(r.symbol) }}
                className={`px-4 py-2.5 cursor-pointer flex items-center gap-3
                            border-b border-slate-800 last:border-0 select-none
                            ${i === activeIdx ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
              >
                <span className="font-mono text-sm font-bold text-slate-100 w-24 shrink-0">{r.symbol}</span>
                <span className="text-xs text-slate-400 flex-1 truncate">{r.name}</span>
                <span className="text-xs text-slate-600 hidden sm:block shrink-0">{r.exchange}</span>
                <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{r.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
