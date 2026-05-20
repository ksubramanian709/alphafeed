import { NextRequest, NextResponse } from 'next/server'
import { BACKEND } from '@/lib/backend'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  try {
    const res = await fetch(`${BACKEND}/v1/news/${encodeURIComponent(symbol.toUpperCase())}`, {
      headers: { 'User-Agent': 'AlphaFeed/1.0' },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 300 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'News unavailable' }, { status: 502 })
  }
}
