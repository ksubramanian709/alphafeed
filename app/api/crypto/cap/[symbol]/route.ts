import { NextRequest, NextResponse } from 'next/server'

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple',
  BNB: 'binancecoin', DOGE: 'dogecoin', ADA: 'cardano',
  AVAX: 'avalanche-2', LINK: 'chainlink', MATIC: 'matic-network',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const base = symbol.replace(/-USD$/i, '').toUpperCase()
  const id = COIN_IDS[base]
  if (!id) return NextResponse.json({ marketCap: 0 })

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ marketCap: 0 })
    const data = await res.json()
    return NextResponse.json({ marketCap: data[id]?.usd_market_cap ?? 0 })
  } catch {
    return NextResponse.json({ marketCap: 0 })
  }
}
