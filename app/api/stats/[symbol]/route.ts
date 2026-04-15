import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BACKEND = process.env.NEXT_PUBLIC_API_URL

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  const empty = { marketCap: 0, fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0 }

  if (!BACKEND) return NextResponse.json(empty)

  try {
    const res = await fetch(`${BACKEND}/v1/fundamentals/${encodeURIComponent(symbol)}`, {
      next: { revalidate: 3600 }, // cache 1 hour on CDN too
    })
    if (!res.ok) return NextResponse.json(empty)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(empty)
  }
}
