import { NextRequest, NextResponse } from 'next/server'

// Module-level crumb cache (persists across warm invocations)
let _crumb = ''
let _cookie = ''
let _crumbExpiry = 0

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const SKIP = new Set(['path', 'domain', 'expires', 'max-age', 'secure', 'httponly', 'samesite'])

function parseCookies(setCookieLines: string[]): string {
  const map = new Map<string, string>()
  for (const line of setCookieLines) {
    for (const part of line.split(';')) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const k = part.slice(0, eq).trim()
      const v = part.slice(eq + 1).trim()
      if (k && !SKIP.has(k.toLowerCase())) map.set(k, v)
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

async function refreshCrumb(): Promise<boolean> {
  try {
    const homeRes = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    })

    // Node 18+ exposes getSetCookie(); fall back to splitting the combined header
    const rawLines: string[] =
      typeof (homeRes.headers as any).getSetCookie === 'function'
        ? (homeRes.headers as any).getSetCookie()
        : (homeRes.headers.get('set-cookie') ?? '')
            .split(/,(?=[A-Za-z_-]+=)/)

    const cookie = parseCookies(rawLines)
    if (!cookie) return false

    const crumbRes = await fetch(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
      { headers: { 'User-Agent': UA, Cookie: cookie } }
    )
    const crumb = (await crumbRes.text()).trim()
    // Sanity check: crumb is a short alphanumeric token, not JSON
    if (!crumb || crumb.startsWith('{') || crumb.length > 32) return false

    _crumb = crumb
    _cookie = cookie
    _crumbExpiry = Date.now() + 3 * 60 * 60 * 1000 // 3 h
    return true
  } catch {
    return false
  }
}

async function fetchSummary(symbol: string): Promise<Record<string, number> | null> {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}` +
    `?modules=summaryDetail,price&crumb=${encodeURIComponent(_crumb)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: _cookie, Accept: 'application/json' },
  })
  const data = await res.json()
  const r = data?.quoteSummary?.result?.[0]
  if (!r) {
    // Check if it's an auth error so caller can retry
    if (data?.quoteSummary?.error?.code === 'Unauthorized') return null
    return null
  }
  const sd = r.summaryDetail
  const pr = r.price
  return {
    marketCap:        sd?.marketCap?.raw        || pr?.marketCap?.raw        || 0,
    fiftyTwoWeekHigh: sd?.fiftyTwoWeekHigh?.raw || 0,
    fiftyTwoWeekLow:  sd?.fiftyTwoWeekLow?.raw  || 0,
  }
}

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  const empty = { marketCap: 0, fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0 }

  try {
    // Ensure we have a valid crumb
    if (!_crumb || Date.now() > _crumbExpiry) {
      const ok = await refreshCrumb()
      if (!ok) return NextResponse.json(empty)
    }

    let result = await fetchSummary(symbol)

    // If unauthorized, refresh once and retry
    if (result === null) {
      const ok = await refreshCrumb()
      if (!ok) return NextResponse.json(empty)
      result = await fetchSummary(symbol)
    }

    return NextResponse.json(result ?? empty)
  } catch {
    return NextResponse.json(empty)
  }
}
