import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q?.trim()) {
    return NextResponse.json({ results: [] })
  }

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=7&newsCount=0&enableFuzzyQuery=true&enableCb=false`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const json = await res.json()
    const quotes = json?.finance?.result ?? []

    const results = quotes
      .filter((r: any) => r.symbol)
      .map((r: any) => ({
        symbol:   r.symbol,
        name:     r.longname ?? r.shortname ?? r.symbol,
        exchange: r.exchDisp ?? r.exchange ?? '',
        type:     r.typeDisp ?? r.quoteType ?? '',
      }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
