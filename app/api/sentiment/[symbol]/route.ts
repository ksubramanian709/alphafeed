import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://market-feed-production.up.railway.app'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  try {
    const res = await fetch(`${BACKEND}/v1/sentiment/${encodeURIComponent(symbol.toUpperCase())}`, {
      signal: AbortSignal.timeout(30_000),
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Sentiment unavailable' }, { status: 502 })
  }
}
