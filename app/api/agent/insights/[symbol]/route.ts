import { NextRequest, NextResponse } from 'next/server'
import { BACKEND } from '@/lib/backend'

export const maxDuration = 45

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const assetType = req.nextUrl.searchParams.get('assetType') ?? 'EQUITY'
  try {
    const res = await fetch(
      `${BACKEND}/v1/agent/insights/${encodeURIComponent(symbol.toUpperCase())}?assetType=${encodeURIComponent(assetType)}`,
      {
        signal: AbortSignal.timeout(42_000),
        next: { revalidate: 14400 },  // 4h — same as backend Caffeine cache
      }
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'AI insights temporarily unavailable', symbol: symbol.toUpperCase() },
      { status: 502 }
    )
  }
}
