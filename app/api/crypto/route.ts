import { NextRequest, NextResponse } from 'next/server'

// CoinGecko free API — no key required, covers top 250 coins
export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') ?? '1'

  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets` +
      `?vs_currency=usd` +
      `&order=market_cap_desc` +
      `&per_page=100` +
      `&page=${page}` +
      `&sparkline=false` +
      `&price_change_percentage=24h`

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 }, // cache 60s at CDN edge
    })

    if (res.status === 429) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()

    // Normalize to a leaner shape
    const coins = data.map((c: {
      id: string; symbol: string; name: string; image: string;
      current_price: number; price_change_percentage_24h: number;
      market_cap: number; total_volume: number; market_cap_rank: number;
    }) => ({
      id:           c.id,
      symbol:       c.symbol.toUpperCase(),
      name:         c.name,
      image:        c.image,
      price:        c.current_price,
      change24h:    c.price_change_percentage_24h ?? 0,
      marketCap:    c.market_cap,
      volume24h:    c.total_volume,
      rank:         c.market_cap_rank,
    }))

    return NextResponse.json(coins)
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
