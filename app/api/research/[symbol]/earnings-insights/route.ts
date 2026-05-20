import { NextRequest, NextResponse } from 'next/server'
import { BACKEND } from '@/lib/backend'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  try {
    const res = await fetch(`${BACKEND}/v1/research/${symbol.toUpperCase()}/earnings-insights`, {
      signal: AbortSignal.timeout(60000),
      next: { revalidate: 43200 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
