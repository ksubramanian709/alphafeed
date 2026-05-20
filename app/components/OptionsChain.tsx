'use client'
import { BACKEND } from '@/lib/backend'
import { useEffect, useState, useRef } from 'react'


interface Contract {
  contractSymbol: string
  strike: number
  lastPrice: number
  bid: number
  ask: number
  change: number
  changePercent: number
  volume: number
  openInterest: number
  impliedVolatility: number
  inTheMoney: boolean
  expiration: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

interface OptionsChain {
  underlyingSymbol: string
  underlyingPrice: number
  expirationDate: number
  allExpirationDates: number[]
  strikes: number[]
  calls: Contract[]
  puts: Contract[]
}

type Tab = 'calls' | 'puts' | 'both'

function fmtExp(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtNum(n: number, dec = 2): string {
  if (!n && n !== 0) return '—'
  return n.toFixed(dec)
}

function fmtVol(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function daysToExpiry(epoch: number): number {
  return Math.max(0, Math.round((epoch * 1000 - Date.now()) / 86_400_000))
}

interface Props { symbol: string; underlyingPrice?: number }

export default function OptionsChain({ symbol, underlyingPrice }: Props) {
  const [open, setOpen]           = useState(false)
  const [chain, setChain]         = useState<OptionsChain | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [tab, setTab]             = useState<Tab>('both')
  const [selectedExp, setSelectedExp] = useState<number | null>(null)
  const [strikeFilter, setStrikeFilter] = useState<'all' | 'itm' | 'otm' | 'near'>('near')
  const fetchedRef                = useRef(false)

  function toggle() {
    if (!open && !fetchedRef.current) {
      fetchedRef.current = true
      fetchChain()
    }
    setOpen(o => !o)
  }

  async function fetchChain(expiration?: number) {
    setLoading(true)
    setError('')
    try {
      const url = expiration
        ? `${BACKEND}/v1/options/${symbol}?expiration=${expiration}`
        : `${BACKEND}/v1/options/${symbol}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.error || !json.data) {
        setError(json.error || 'No options data available for this symbol.')
        setChain(null)
      } else {
        setChain(json.data)
        setSelectedExp(json.data.expirationDate)
      }
    } catch {
      setError('Failed to load options chain.')
    } finally {
      setLoading(false)
    }
  }

  // Reset on symbol change so new symbol fetches fresh data
  useEffect(() => {
    setOpen(false)
    setChain(null)
    setError('')
    fetchedRef.current = false
  }, [symbol])

  function handleExpChange(epoch: number) {
    setSelectedExp(epoch)
    fetchChain(epoch)
  }

  const spotPrice = chain?.underlyingPrice ?? underlyingPrice ?? 0

  function filterContracts(contracts: Contract[]): Contract[] {
    if (!contracts || !spotPrice) return contracts ?? []
    if (strikeFilter === 'all') return contracts
    if (strikeFilter === 'itm') return contracts.filter(c => c.inTheMoney)
    if (strikeFilter === 'otm') return contracts.filter(c => !c.inTheMoney)
    // near: ±10% of spot
    return contracts.filter(c =>
      c.strike >= spotPrice * 0.90 && c.strike <= spotPrice * 1.10
    )
  }

  const filteredCalls = chain ? filterContracts(chain.calls) : []
  const filteredPuts  = chain ? filterContracts(chain.puts)  : []

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* Collapse toggle header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Options Chain
          </span>
          {chain && selectedExp && (
            <span className="text-xs text-slate-600">
              <span className="font-mono text-slate-400">${fmtNum(spotPrice)}</span>
              <span className="ml-2">· {daysToExpiry(selectedExp)}d to expiry</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="w-3.5 h-3.5 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          )}
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!open && <div />}
      {open && <div className="border-t border-slate-800 p-5 space-y-4">

      {/* Sub-header row: calls/puts tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div />

        {/* Calls / Both / Puts tabs */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
          {(['calls', 'both', 'puts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                tab === t
                  ? t === 'calls'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : t === 'puts'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-700 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Expiration date picker */}
      {chain && chain.allExpirationDates.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {chain.allExpirationDates.slice(0, 12).map(epoch => (
            <button
              key={epoch}
              onClick={() => handleExpChange(epoch)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedExp === epoch
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {fmtExp(epoch)}
            </button>
          ))}
        </div>
      )}

      {/* Strike filter */}
      {chain && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Show:</span>
          {(['near', 'all', 'itm', 'otm'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStrikeFilter(f)}
              className={`px-2 py-0.5 rounded transition-colors capitalize ${
                strikeFilter === f
                  ? 'text-slate-200 bg-slate-700'
                  : 'hover:text-slate-300'
              }`}
            >
              {f === 'near' ? '±10% strikes' : f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="h-32 flex items-center justify-center text-slate-600 text-xs animate-pulse">
          Loading options chain…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-8 space-y-1">
          <p className="text-sm text-slate-500">{error}</p>
          {error.includes('TRADIER_API_KEY') && (
            <p className="text-xs text-slate-600">
              Get a free key at{' '}
              <a href="https://developer.tradier.com" target="_blank" rel="noopener noreferrer"
                className="text-emerald-500 hover:underline">
                developer.tradier.com
              </a>
              , then set <code className="text-slate-400">TRADIER_API_KEY</code> on Render.
            </p>
          )}
        </div>
      )}

      {/* Chain tables */}
      {!loading && chain && (
        <div className={`grid gap-4 ${tab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

          {/* Calls */}
          {(tab === 'calls' || tab === 'both') && (
            <div>
              {tab === 'both' && (
                <div className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-widest">
                  Calls
                </div>
              )}
              <ContractTable
                contracts={filteredCalls}
                type="call"
                spotPrice={spotPrice}
              />
            </div>
          )}

          {/* Puts */}
          {(tab === 'puts' || tab === 'both') && (
            <div>
              {tab === 'both' && (
                <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-widest">
                  Puts
                </div>
              )}
              <ContractTable
                contracts={filteredPuts}
                type="put"
                spotPrice={spotPrice}
              />
            </div>
          )}
        </div>
      )}
      </div>}
    </div>
  )
}

// ── Contract table ────────────────────────────────────────────────────────────

interface TableProps {
  contracts: Contract[]
  type: 'call' | 'put'
  spotPrice: number
}

function ContractTable({ contracts, type, spotPrice }: TableProps) {
  const itmColor = type === 'call' ? 'bg-emerald-500/5' : 'bg-red-500/5'
  const itmText  = type === 'call' ? 'text-emerald-400' : 'text-red-400'

  if (!contracts.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">No contracts</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-slate-600 border-b border-slate-800">
            <th className="text-left pb-2 pr-3 font-normal">Strike</th>
            <th className="text-right pb-2 px-2 font-normal">Bid</th>
            <th className="text-right pb-2 px-2 font-normal">Ask</th>
            <th className="text-right pb-2 px-2 font-normal">Last</th>
            <th className="text-right pb-2 px-2 font-normal">IV%</th>
            <th className="text-right pb-2 px-2 font-normal hidden sm:table-cell">Delta</th>
            <th className="text-right pb-2 px-2 font-normal hidden sm:table-cell">Theta</th>
            <th className="text-right pb-2 px-2 font-normal">Vol</th>
            <th className="text-right pb-2 pl-2 font-normal">OI</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const isAtm = Math.abs(c.strike - spotPrice) / spotPrice < 0.005
            return (
              <tr
                key={c.contractSymbol}
                className={`border-b border-slate-800/50 transition-colors hover:bg-slate-800/40 ${
                  isAtm
                    ? 'border-l-2 border-l-yellow-500/50'
                    : c.inTheMoney
                    ? itmColor
                    : ''
                }`}
              >
                <td className={`py-1.5 pr-3 font-semibold ${c.inTheMoney ? itmText : 'text-slate-300'}`}>
                  {c.strike.toFixed(c.strike < 10 ? 3 : c.strike < 1000 ? 2 : 0)}
                  {isAtm && <span className="ml-1 text-yellow-500/70 text-[9px]">ATM</span>}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-400">
                  {c.bid > 0 ? fmtNum(c.bid) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-400">
                  {c.ask > 0 ? fmtNum(c.ask) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-300">
                  {c.lastPrice > 0 ? fmtNum(c.lastPrice) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-purple-400">
                  {c.impliedVolatility > 0
                    ? `${(c.impliedVolatility * 100).toFixed(1)}%`
                    : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-blue-400 hidden sm:table-cell">
                  {c.delta !== 0 ? fmtNum(c.delta, 3) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-orange-400 hidden sm:table-cell">
                  {c.theta !== 0 ? fmtNum(c.theta, 3) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-400">
                  {fmtVol(c.volume)}
                </td>
                <td className="py-1.5 pl-2 text-right text-slate-500">
                  {fmtVol(c.openInterest)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
