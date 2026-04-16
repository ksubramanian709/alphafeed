import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json([])

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&enableCb=false`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const quotes: Array<{ symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }> =
      data?.quotes ?? []

    const results = quotes
      .filter(q => q.symbol && q.quoteType !== 'MUTUALFUND' && q.quoteType !== 'OPTION')
      .slice(0, 10)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchange ?? '',
        type:     normalizeType(q.quoteType),
      }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}

function normalizeType(qt?: string): string {
  switch (qt?.toUpperCase()) {
    case 'EQUITY':      return 'Equity'
    case 'ETF':         return 'ETF'
    case 'INDEX':       return 'Index'
    case 'CRYPTOCURRENCY': return 'Crypto'
    case 'FUTURE':      return 'Future'
    case 'CURRENCY':    return 'FX'
    default:            return qt ?? 'Equity'
  }
}
