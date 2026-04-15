import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Extract cookie pairs from a Set-Cookie header string
function parseCookies(setCookie: string | null): string {
  if (!setCookie) return ''
  return setCookie
    .split(/,(?=[^ ]+ *=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

function mapContracts(contracts: any[]): any[] {
  if (!contracts) return []
  return contracts.map(c => ({
    contractSymbol:   c.contractSymbol ?? '',
    strike:           c.strike ?? 0,
    lastPrice:        c.lastPrice ?? 0,
    bid:              c.bid ?? 0,
    ask:              c.ask ?? 0,
    change:           c.change ?? 0,
    changePercent:    c.percentChange ?? 0,
    volume:           c.volume ?? 0,
    openInterest:     c.openInterest ?? 0,
    impliedVolatility: c.impliedVolatility ?? 0,
    inTheMoney:       c.inTheMoney ?? false,
    expiration:       c.expiration ?? 0,
    lastTradeDate:    c.lastTradeDate ?? 0,
    contractSize:     c.contractSize ?? 'REGULAR',
    delta: 0, gamma: 0, theta: 0, vega: 0,
  }))
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await context.params
  const symbol = rawSymbol.toUpperCase()
  const expiration = request.nextUrl.searchParams.get('expiration')

  try {
    // ── Step 1: warm up session & grab cookies ────────────────────────────────
    const homeResp = await fetch('https://finance.yahoo.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    })
    const cookies = parseCookies(homeResp.headers.get('set-cookie'))

    // ── Step 2: get crumb ─────────────────────────────────────────────────────
    const crumbResp = await fetch(
      'https://query2.finance.yahoo.com/v1/test/getcrumb',
      { headers: { 'User-Agent': UA, 'Accept': '*/*', 'Cookie': cookies } }
    )
    const crumb = (await crumbResp.text()).trim()

    if (!crumb || crumb.startsWith('{') || crumb.toLowerCase().includes('unauthorized')) {
      return NextResponse.json({ error: 'Unable to authenticate with Yahoo Finance' }, { status: 502 })
    }

    // ── Step 3: fetch options chain ───────────────────────────────────────────
    let url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(crumb)}`
    if (expiration) url += `&date=${expiration}`

    const optResp = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Cookie': cookies,
      },
    })
    const raw = await optResp.json()

    if (!optResp.ok) {
      const msg = raw?.optionChain?.error?.description ?? raw?.message ?? 'Yahoo Finance error'
      return NextResponse.json({ error: msg }, { status: optResp.status })
    }

    const result = raw?.optionChain?.result?.[0]
    if (!result) {
      return NextResponse.json(
        { error: `No options data for ${symbol}. It may not have listed options.` },
        { status: 404 }
      )
    }

    const slice = result.options?.[0]
    if (!slice) {
      return NextResponse.json({ error: `No contracts found for ${symbol}` }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        underlyingSymbol:   symbol,
        underlyingPrice:    result.quote?.regularMarketPrice ?? 0,
        expirationDate:     slice.expirationDate ?? 0,
        allExpirationDates: result.expirationDates ?? [],
        strikes:            result.strikes ?? [],
        calls:              mapContracts(slice.calls),
        puts:               mapContracts(slice.puts),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
