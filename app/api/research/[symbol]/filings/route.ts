import { NextRequest, NextResponse } from 'next/server'
import { BACKEND } from '@/lib/backend'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const form = req.nextUrl.searchParams.get('form') ?? '10-K'
  try {
    const res = await fetch(`${BACKEND}/v1/research/${symbol.toUpperCase()}/filings?form=${form}&limit=5`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
