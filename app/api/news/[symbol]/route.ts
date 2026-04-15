import { NextRequest, NextResponse } from 'next/server'
import { TICKERS } from '../../../lib/tickers'

export const runtime = 'nodejs'

const UA = 'Mozilla/5.0 (compatible; MarketFeedBot/1.0)'

interface NewsItem {
  title: string
  url: string | null
  source: string
  publishedAt: string | null
  sentiment: string
  imageUrl: string | null
}

// ── RSS helpers ────────────────────────────────────────────────────────────

function extractTag(block: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(cdataRe) ?? block.match(plainRe)
  return m ? m[1].trim() : ''
}

function extractImage(block: string, articleUrl: string | null): string | null {
  // 1. <media:content url="..."> — Yahoo Finance, most RSS feeds
  let m = block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*/i)
  if (m && isImageUrl(m[1])) return m[1]

  // 2. <media:thumbnail url="..."> — Seeking Alpha, Google News
  m = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*/i)
  if (m && isImageUrl(m[1])) return m[1]

  // 3. <enclosure> with image type
  m = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*/i)
  if (m && isImageUrl(m[1])) return m[1]

  // 4. <img src="..."> embedded in description CDATA
  m = block.match(/<img[^>]+src=["']([^"']+)["'][^>]*/i)
  if (m && isImageUrl(m[1]) && !isTracker(m[1])) return m[1]

  // 5. Fallback: publication logo via Google's favicon service
  if (articleUrl) {
    try {
      const domain = new URL(articleUrl).hostname.replace(/^www\./, '')
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch {}
  }

  return null
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) ||
    url.includes('/image') || url.includes('/photo') || url.includes('/img') ||
    url.includes('media') || url.includes('favicon')
}

function isTracker(url: string): boolean {
  return url.includes('pixel') || url.includes('tracker') ||
    url.includes('beacon') || url.includes('1x1')
}

function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

function parseDate(s: string): string | null {
  if (!s) return null
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return null
}

function parseItems(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null && items.length < 8) {
    const block = m[1]
    const title = cleanText(extractTag(block, 'title'))
    if (!title) continue
    const link    = extractTag(block, 'link') || extractTag(block, 'guid')
    const pubDate = extractTag(block, 'pubDate')
    const src     = cleanText(extractTag(block, 'source')) || sourceName
    const imageUrl = extractImage(block, link || null)
    items.push({
      title,
      url: link || null,
      source: src,
      publishedAt: parseDate(pubDate),
      sentiment: 'Neutral',
      imageUrl,
    })
  }
  return items
}

async function fetchRss(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseItems(xml, sourceName)
  } catch {
    return []
  }
}

function deduplicate(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

  const ticker = TICKERS.find(t => t.symbol === symbol)
  const companyName = ticker?.name ?? symbol
  const searchName = companyName
    .replace(/\b(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|LLC|Co\.?|Company|Holdings?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const yahooUrl       = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`
  const googleByName   = `https://news.google.com/rss/search?q=${encodeURIComponent(searchName + ' stock')}&hl=en-US&gl=US&ceid=US:en`
  const googleBySymbol = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + ' stock market')}&hl=en-US&gl=US&ceid=US:en`
  const seekingAlphaUrl = `https://seekingalpha.com/api/sa/combined/${encodeURIComponent(symbol)}.xml`

  const [yahoo, googleName, googleSym, seekingAlpha] = await Promise.all([
    fetchRss(yahooUrl,        'Yahoo Finance'),
    fetchRss(googleByName,    'Google News'),
    fetchRss(googleBySymbol,  'Google News'),
    fetchRss(seekingAlphaUrl, 'Seeking Alpha'),
  ])

  const merged = [...yahoo, ...seekingAlpha, ...googleName, ...googleSym]
  const result = deduplicate(merged)
    .sort((a, b) => {
      if (!a.publishedAt) return 1
      if (!b.publishedAt) return -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, 15)

  if (result.length === 0) {
    return NextResponse.json({ error: `No news found for ${symbol}` }, { status: 404 })
  }
  return NextResponse.json({ data: result, source: 'rss_aggregated' })
}
