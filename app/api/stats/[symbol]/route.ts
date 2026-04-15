import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SEC_UA = 'MarketFeedApp contact@marketfeed.app'

// Module-level cache: symbol → CIK (persists across warm invocations)
let tickerToCik: Record<string, string> | null = null
let tickerCacheExpiry = 0

async function getCik(symbol: string): Promise<string | null> {
  const now = Date.now()
  if (!tickerToCik || now > tickerCacheExpiry) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': SEC_UA },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const data: Record<string, { cik_str: number; ticker: string }> = await res.json()
      tickerToCik = {}
      for (const entry of Object.values(data)) {
        tickerToCik[entry.ticker.toUpperCase()] = String(entry.cik_str).padStart(10, '0')
      }
      tickerCacheExpiry = now + 24 * 60 * 60 * 1000 // 24 h
    } catch {
      return null
    }
  }
  return tickerToCik?.[symbol] ?? null
}

async function getSharesOutstanding(cik: string): Promise<number> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/CommonStockSharesOutstanding.json`
    const res = await fetch(url, {
      headers: { 'User-Agent': SEC_UA },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return 0
    const data = await res.json()
    const shares: { end: string; val: number; form: string }[] = data?.units?.shares ?? []
    if (shares.length === 0) return 0
    // Prefer 10-K/10-Q filings, take most recent end date
    const filtered = shares.filter(s => s.form === '10-K' || s.form === '10-Q')
    const list = filtered.length > 0 ? filtered : shares
    list.sort((a, b) => b.end.localeCompare(a.end))
    return list[0]?.val ?? 0
  } catch {
    return 0
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  const price = parseFloat(req.nextUrl.searchParams.get('price') ?? '0')
  const empty = { marketCap: 0, sharesOutstanding: 0 }

  // Only works for US equities (skip indices, futures, crypto, forex)
  if (symbol.startsWith('^') || symbol.endsWith('=F') || symbol.endsWith('=X') || symbol.includes('-USD')) {
    return NextResponse.json(empty)
  }

  try {
    const cik = await getCik(symbol)
    if (!cik) return NextResponse.json(empty)

    const shares = await getSharesOutstanding(cik)
    if (!shares) return NextResponse.json(empty)

    const marketCap = price > 0 ? Math.round(shares * price) : 0
    return NextResponse.json({ marketCap, sharesOutstanding: shares })
  } catch {
    return NextResponse.json(empty)
  }
}
