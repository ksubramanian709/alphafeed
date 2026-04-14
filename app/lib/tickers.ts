export interface Ticker {
  symbol: string
  name: string
  exchange: string
  type: string
}

// Comprehensive ticker database: S&P 500 + popular ETFs + futures + indices + crypto
export const TICKERS: Ticker[] = [
  // ── Mega-cap / most searched ──
  { symbol:'AAPL',  name:'Apple Inc.',                         exchange:'NASDAQ', type:'Equity' },
  { symbol:'MSFT',  name:'Microsoft Corporation',              exchange:'NASDAQ', type:'Equity' },
  { symbol:'NVDA',  name:'NVIDIA Corporation',                 exchange:'NASDAQ', type:'Equity' },
  { symbol:'GOOGL', name:'Alphabet Inc. (Google)',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'GOOG',  name:'Alphabet Inc. Class C',              exchange:'NASDAQ', type:'Equity' },
  { symbol:'AMZN',  name:'Amazon.com Inc.',                    exchange:'NASDAQ', type:'Equity' },
  { symbol:'META',  name:'Meta Platforms Inc. (Facebook)',     exchange:'NASDAQ', type:'Equity' },
  { symbol:'TSLA',  name:'Tesla Inc.',                         exchange:'NASDAQ', type:'Equity' },
  { symbol:'AVGO',  name:'Broadcom Inc.',                      exchange:'NASDAQ', type:'Equity' },
  { symbol:'JPM',   name:'JPMorgan Chase & Co.',               exchange:'NYSE',   type:'Equity' },
  { symbol:'LLY',   name:'Eli Lilly and Company',             exchange:'NYSE',   type:'Equity' },
  { symbol:'V',     name:'Visa Inc.',                          exchange:'NYSE',   type:'Equity' },
  { symbol:'UNH',   name:'UnitedHealth Group Inc.',            exchange:'NYSE',   type:'Equity' },
  { symbol:'XOM',   name:'Exxon Mobil Corporation',           exchange:'NYSE',   type:'Equity' },
  { symbol:'MA',    name:'Mastercard Inc.',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'JNJ',   name:'Johnson & Johnson',                  exchange:'NYSE',   type:'Equity' },
  { symbol:'PG',    name:'Procter & Gamble Co.',               exchange:'NYSE',   type:'Equity' },
  { symbol:'HD',    name:'The Home Depot Inc.',                exchange:'NYSE',   type:'Equity' },
  { symbol:'COST',  name:'Costco Wholesale Corporation',       exchange:'NASDAQ', type:'Equity' },
  { symbol:'ABBV',  name:'AbbVie Inc.',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'BAC',   name:'Bank of America Corporation',        exchange:'NYSE',   type:'Equity' },
  { symbol:'MRK',   name:'Merck & Co. Inc.',                   exchange:'NYSE',   type:'Equity' },
  { symbol:'CVX',   name:'Chevron Corporation',                exchange:'NYSE',   type:'Equity' },
  { symbol:'WMT',   name:'Walmart Inc.',                       exchange:'NYSE',   type:'Equity' },
  { symbol:'NFLX',  name:'Netflix Inc.',                       exchange:'NASDAQ', type:'Equity' },
  { symbol:'AMD',   name:'Advanced Micro Devices Inc.',        exchange:'NASDAQ', type:'Equity' },
  { symbol:'ORCL',  name:'Oracle Corporation',                 exchange:'NYSE',   type:'Equity' },
  { symbol:'CRM',   name:'Salesforce Inc.',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'KO',    name:'The Coca-Cola Company',              exchange:'NYSE',   type:'Equity' },
  { symbol:'PEP',   name:'PepsiCo Inc.',                       exchange:'NASDAQ', type:'Equity' },
  { symbol:'TMO',   name:'Thermo Fisher Scientific Inc.',      exchange:'NYSE',   type:'Equity' },
  { symbol:'ACN',   name:'Accenture plc',                      exchange:'NYSE',   type:'Equity' },
  { symbol:'MCD',   name:'McDonald\'s Corporation',            exchange:'NYSE',   type:'Equity' },
  { symbol:'ABT',   name:'Abbott Laboratories',                exchange:'NYSE',   type:'Equity' },
  { symbol:'ADBE',  name:'Adobe Inc.',                         exchange:'NASDAQ', type:'Equity' },
  { symbol:'CSCO',  name:'Cisco Systems Inc.',                 exchange:'NASDAQ', type:'Equity' },
  { symbol:'IBM',   name:'IBM Corporation',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'GE',    name:'GE Aerospace',                       exchange:'NYSE',   type:'Equity' },
  { symbol:'NOW',   name:'ServiceNow Inc.',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'QCOM',  name:'Qualcomm Inc.',                      exchange:'NASDAQ', type:'Equity' },
  { symbol:'PLTR',  name:'Palantir Technologies Inc.',         exchange:'NYSE',   type:'Equity' },
  { symbol:'INTU',  name:'Intuit Inc.',                        exchange:'NASDAQ', type:'Equity' },
  { symbol:'AMGN',  name:'Amgen Inc.',                         exchange:'NASDAQ', type:'Equity' },
  { symbol:'TXN',   name:'Texas Instruments Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'ISRG',  name:'Intuitive Surgical Inc.',            exchange:'NASDAQ', type:'Equity' },
  { symbol:'GS',    name:'Goldman Sachs Group Inc.',           exchange:'NYSE',   type:'Equity' },
  { symbol:'MS',    name:'Morgan Stanley',                     exchange:'NYSE',   type:'Equity' },
  { symbol:'BLK',   name:'BlackRock Inc.',                     exchange:'NYSE',   type:'Equity' },
  { symbol:'SPGI',  name:'S&P Global Inc.',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'CAT',   name:'Caterpillar Inc.',                   exchange:'NYSE',   type:'Equity' },
  { symbol:'RTX',   name:'RTX Corporation (Raytheon)',         exchange:'NYSE',   type:'Equity' },
  { symbol:'PFE',   name:'Pfizer Inc.',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'BKNG',  name:'Booking Holdings Inc.',              exchange:'NASDAQ', type:'Equity' },
  { symbol:'UBER',  name:'Uber Technologies Inc.',             exchange:'NYSE',   type:'Equity' },
  { symbol:'T',     name:'AT&T Inc.',                          exchange:'NYSE',   type:'Equity' },
  { symbol:'VZ',    name:'Verizon Communications Inc.',        exchange:'NYSE',   type:'Equity' },
  { symbol:'DIS',   name:'The Walt Disney Company',            exchange:'NYSE',   type:'Equity' },
  { symbol:'BA',    name:'The Boeing Company',                 exchange:'NYSE',   type:'Equity' },
  { symbol:'HON',   name:'Honeywell International Inc.',       exchange:'NASDAQ', type:'Equity' },
  { symbol:'NEE',   name:'NextEra Energy Inc.',                exchange:'NYSE',   type:'Equity' },
  { symbol:'UNP',   name:'Union Pacific Corporation',          exchange:'NYSE',   type:'Equity' },
  { symbol:'LOW',   name:'Lowe\'s Companies Inc.',             exchange:'NYSE',   type:'Equity' },
  { symbol:'ELV',   name:'Elevance Health Inc.',               exchange:'NYSE',   type:'Equity' },
  { symbol:'BMY',   name:'Bristol-Myers Squibb Company',       exchange:'NYSE',   type:'Equity' },
  { symbol:'ETN',   name:'Eaton Corporation plc',              exchange:'NYSE',   type:'Equity' },
  { symbol:'AMAT',  name:'Applied Materials Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'LRCX',  name:'Lam Research Corporation',          exchange:'NASDAQ', type:'Equity' },
  { symbol:'SYK',   name:'Stryker Corporation',                exchange:'NYSE',   type:'Equity' },
  { symbol:'ADI',   name:'Analog Devices Inc.',                exchange:'NASDAQ', type:'Equity' },
  { symbol:'MMC',   name:'Marsh & McLennan Companies',         exchange:'NYSE',   type:'Equity' },
  { symbol:'CI',    name:'The Cigna Group',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'VRTX',  name:'Vertex Pharmaceuticals Inc.',        exchange:'NASDAQ', type:'Equity' },
  { symbol:'AXP',   name:'American Express Company',           exchange:'NYSE',   type:'Equity' },
  { symbol:'REGN',  name:'Regeneron Pharmaceuticals Inc.',     exchange:'NASDAQ', type:'Equity' },
  { symbol:'PLD',   name:'Prologis Inc.',                      exchange:'NYSE',   type:'Equity' },
  { symbol:'MU',    name:'Micron Technology Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'KLAC',  name:'KLA Corporation',                    exchange:'NASDAQ', type:'Equity' },
  { symbol:'HCA',   name:'HCA Healthcare Inc.',                exchange:'NYSE',   type:'Equity' },
  { symbol:'PYPL',  name:'PayPal Holdings Inc.',               exchange:'NASDAQ', type:'Equity' },
  { symbol:'SBUX',  name:'Starbucks Corporation',              exchange:'NASDAQ', type:'Equity' },
  { symbol:'ZTS',   name:'Zoetis Inc.',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'AON',   name:'Aon plc',                            exchange:'NYSE',   type:'Equity' },
  { symbol:'GILD',  name:'Gilead Sciences Inc.',               exchange:'NASDAQ', type:'Equity' },
  { symbol:'CME',   name:'CME Group Inc.',                     exchange:'NASDAQ', type:'Equity' },
  { symbol:'PANW',  name:'Palo Alto Networks Inc.',            exchange:'NASDAQ', type:'Equity' },
  { symbol:'SNPS',  name:'Synopsys Inc.',                      exchange:'NASDAQ', type:'Equity' },
  { symbol:'CDNS',  name:'Cadence Design Systems Inc.',        exchange:'NASDAQ', type:'Equity' },
  { symbol:'MCO',   name:'Moody\'s Corporation',               exchange:'NYSE',   type:'Equity' },
  { symbol:'WFC',   name:'Wells Fargo & Company',              exchange:'NYSE',   type:'Equity' },
  { symbol:'TJX',   name:'The TJX Companies Inc.',             exchange:'NYSE',   type:'Equity' },
  { symbol:'USB',   name:'U.S. Bancorp',                       exchange:'NYSE',   type:'Equity' },
  { symbol:'C',     name:'Citigroup Inc.',                     exchange:'NYSE',   type:'Equity' },
  { symbol:'ADP',   name:'Automatic Data Processing Inc.',     exchange:'NASDAQ', type:'Equity' },
  { symbol:'INTC',  name:'Intel Corporation',                  exchange:'NASDAQ', type:'Equity' },
  { symbol:'ABNB',  name:'Airbnb Inc.',                        exchange:'NASDAQ', type:'Equity' },
  { symbol:'COIN',  name:'Coinbase Global Inc.',               exchange:'NASDAQ', type:'Equity' },
  { symbol:'HOOD',  name:'Robinhood Markets Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'SOFI',  name:'SoFi Technologies Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'RBLX',  name:'Roblox Corporation',                 exchange:'NYSE',   type:'Equity' },
  { symbol:'SNAP',  name:'Snap Inc.',                          exchange:'NYSE',   type:'Equity' },
  { symbol:'PINS',  name:'Pinterest Inc.',                     exchange:'NYSE',   type:'Equity' },
  { symbol:'TWLO',  name:'Twilio Inc.',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'DDOG',  name:'Datadog Inc.',                       exchange:'NASDAQ', type:'Equity' },
  { symbol:'SNOW',  name:'Snowflake Inc.',                     exchange:'NYSE',   type:'Equity' },
  { symbol:'NET',   name:'Cloudflare Inc.',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'ZM',    name:'Zoom Video Communications Inc.',     exchange:'NASDAQ', type:'Equity' },
  { symbol:'SHOP',  name:'Shopify Inc.',                       exchange:'NYSE',   type:'Equity' },
  { symbol:'SQ',    name:'Block Inc. (Square)',                exchange:'NYSE',   type:'Equity' },
  { symbol:'MELI',  name:'MercadoLibre Inc.',                  exchange:'NASDAQ', type:'Equity' },
  { symbol:'SE',    name:'Sea Limited',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'BABA',  name:'Alibaba Group Holding Ltd.',         exchange:'NYSE',   type:'Equity' },
  { symbol:'JD',    name:'JD.com Inc.',                        exchange:'NASDAQ', type:'Equity' },
  { symbol:'PDD',   name:'PDD Holdings Inc. (Temu/Pinduoduo)', exchange:'NASDAQ', type:'Equity' },
  { symbol:'TSM',   name:'Taiwan Semiconductor Manufacturing', exchange:'NYSE',   type:'Equity' },
  { symbol:'ASML',  name:'ASML Holding N.V.',                  exchange:'NASDAQ', type:'Equity' },
  { symbol:'NVO',   name:'Novo Nordisk A/S',                   exchange:'NYSE',   type:'Equity' },
  { symbol:'TM',    name:'Toyota Motor Corporation',           exchange:'NYSE',   type:'Equity' },
  { symbol:'SAP',   name:'SAP SE',                             exchange:'NYSE',   type:'Equity' },
  { symbol:'BRK-B', name:'Berkshire Hathaway Inc. Class B',   exchange:'NYSE',   type:'Equity' },
  { symbol:'BRK-A', name:'Berkshire Hathaway Inc. Class A',   exchange:'NYSE',   type:'Equity' },
  { symbol:'F',     name:'Ford Motor Company',                 exchange:'NYSE',   type:'Equity' },
  { symbol:'GM',    name:'General Motors Company',             exchange:'NYSE',   type:'Equity' },
  { symbol:'RIVN',  name:'Rivian Automotive Inc.',             exchange:'NASDAQ', type:'Equity' },
  { symbol:'LCID',  name:'Lucid Group Inc.',                   exchange:'NASDAQ', type:'Equity' },
  { symbol:'NIO',   name:'NIO Inc.',                           exchange:'NYSE',   type:'Equity' },
  { symbol:'X',     name:'United States Steel Corporation',    exchange:'NYSE',   type:'Equity' },
  { symbol:'FCX',   name:'Freeport-McMoRan Inc.',             exchange:'NYSE',   type:'Equity' },
  { symbol:'AA',    name:'Alcoa Corporation',                  exchange:'NYSE',   type:'Equity' },
  { symbol:'CLF',   name:'Cleveland-Cliffs Inc.',              exchange:'NYSE',   type:'Equity' },
  { symbol:'CVS',   name:'CVS Health Corporation',             exchange:'NYSE',   type:'Equity' },
  { symbol:'WBA',   name:'Walgreens Boots Alliance Inc.',      exchange:'NASDAQ', type:'Equity' },
  { symbol:'MRNA',  name:'Moderna Inc.',                       exchange:'NASDAQ', type:'Equity' },
  { symbol:'BNTX',  name:'BioNTech SE',                        exchange:'NASDAQ', type:'Equity' },
  { symbol:'BIIB',  name:'Biogen Inc.',                        exchange:'NASDAQ', type:'Equity' },
  { symbol:'ILMN',  name:'Illumina Inc.',                      exchange:'NASDAQ', type:'Equity' },
  { symbol:'DAL',   name:'Delta Air Lines Inc.',               exchange:'NYSE',   type:'Equity' },
  { symbol:'UAL',   name:'United Airlines Holdings Inc.',      exchange:'NASDAQ', type:'Equity' },
  { symbol:'AAL',   name:'American Airlines Group Inc.',       exchange:'NASDAQ', type:'Equity' },
  { symbol:'LUV',   name:'Southwest Airlines Co.',             exchange:'NYSE',   type:'Equity' },
  { symbol:'CCL',   name:'Carnival Corporation',               exchange:'NYSE',   type:'Equity' },
  { symbol:'RCL',   name:'Royal Caribbean Group',              exchange:'NYSE',   type:'Equity' },
  { symbol:'NCLH',  name:'Norwegian Cruise Line Holdings',     exchange:'NYSE',   type:'Equity' },
  { symbol:'MAR',   name:'Marriott International Inc.',        exchange:'NASDAQ', type:'Equity' },
  { symbol:'HLT',   name:'Hilton Worldwide Holdings Inc.',     exchange:'NYSE',   type:'Equity' },
  { symbol:'MGM',   name:'MGM Resorts International',          exchange:'NYSE',   type:'Equity' },
  { symbol:'WYNN',  name:'Wynn Resorts Ltd.',                  exchange:'NASDAQ', type:'Equity' },
  { symbol:'LVS',   name:'Las Vegas Sands Corp.',              exchange:'NYSE',   type:'Equity' },

  // ── Energy ──
  { symbol:'OXY',   name:'Occidental Petroleum Corporation',  exchange:'NYSE',   type:'Equity' },
  { symbol:'COP',   name:'ConocoPhillips',                    exchange:'NYSE',   type:'Equity' },
  { symbol:'SLB',   name:'SLB (Schlumberger)',                 exchange:'NYSE',   type:'Equity' },
  { symbol:'MPC',   name:'Marathon Petroleum Corporation',     exchange:'NYSE',   type:'Equity' },
  { symbol:'PSX',   name:'Phillips 66',                        exchange:'NYSE',   type:'Equity' },
  { symbol:'HAL',   name:'Halliburton Company',                exchange:'NYSE',   type:'Equity' },
  { symbol:'BKR',   name:'Baker Hughes Company',               exchange:'NASDAQ', type:'Equity' },

  // ── Indices ──
  { symbol:'^GSPC', name:'S&P 500 Index',                     exchange:'SNP',    type:'Index' },
  { symbol:'^DJI',  name:'Dow Jones Industrial Average',      exchange:'DJI',    type:'Index' },
  { symbol:'^IXIC', name:'NASDAQ Composite',                   exchange:'NASDAQ', type:'Index' },
  { symbol:'^RUT',  name:'Russell 2000',                       exchange:'RUT',    type:'Index' },
  { symbol:'^VIX',  name:'CBOE Volatility Index (VIX)',        exchange:'CBOE',   type:'Index' },
  { symbol:'^TNX',  name:'10-Year Treasury Yield',             exchange:'CBOE',   type:'Index' },
  { symbol:'^TYX',  name:'30-Year Treasury Yield',             exchange:'CBOE',   type:'Index' },
  { symbol:'^IRX',  name:'13-Week Treasury Bill',              exchange:'CBOE',   type:'Index' },
  { symbol:'^FTSE', name:'FTSE 100 (UK)',                      exchange:'LSE',    type:'Index' },
  { symbol:'^N225', name:'Nikkei 225 (Japan)',                 exchange:'OSA',    type:'Index' },
  { symbol:'^HSI',  name:'Hang Seng Index (Hong Kong)',        exchange:'HKSE',   type:'Index' },
  { symbol:'^DAX',  name:'DAX (Germany)',                      exchange:'GER',    type:'Index' },

  // ── Commodity Futures ──
  { symbol:'CL=F',  name:'Crude Oil WTI Futures',             exchange:'NYMEX',  type:'Futures' },
  { symbol:'BZ=F',  name:'Brent Crude Oil Futures',           exchange:'ICE',    type:'Futures' },
  { symbol:'NG=F',  name:'Natural Gas Futures',               exchange:'NYMEX',  type:'Futures' },
  { symbol:'RB=F',  name:'RBOB Gasoline Futures',             exchange:'NYMEX',  type:'Futures' },
  { symbol:'HO=F',  name:'Heating Oil Futures',               exchange:'NYMEX',  type:'Futures' },
  { symbol:'GC=F',  name:'Gold Futures',                      exchange:'COMEX',  type:'Futures' },
  { symbol:'SI=F',  name:'Silver Futures',                    exchange:'COMEX',  type:'Futures' },
  { symbol:'HG=F',  name:'Copper Futures',                    exchange:'COMEX',  type:'Futures' },
  { symbol:'PL=F',  name:'Platinum Futures',                  exchange:'NYMEX',  type:'Futures' },
  { symbol:'PA=F',  name:'Palladium Futures',                 exchange:'NYMEX',  type:'Futures' },
  { symbol:'ZC=F',  name:'Corn Futures',                      exchange:'CBOT',   type:'Futures' },
  { symbol:'ZW=F',  name:'Wheat Futures',                     exchange:'CBOT',   type:'Futures' },
  { symbol:'ZS=F',  name:'Soybean Futures',                   exchange:'CBOT',   type:'Futures' },
  { symbol:'ZL=F',  name:'Soybean Oil Futures',               exchange:'CBOT',   type:'Futures' },
  { symbol:'ZM=F',  name:'Soybean Meal Futures',              exchange:'CBOT',   type:'Futures' },
  { symbol:'CC=F',  name:'Cocoa Futures',                     exchange:'ICE',    type:'Futures' },
  { symbol:'CT=F',  name:'Cotton Futures',                    exchange:'ICE',    type:'Futures' },
  { symbol:'KC=F',  name:'Coffee Futures',                    exchange:'ICE',    type:'Futures' },
  { symbol:'SB=F',  name:'Sugar Futures',                     exchange:'ICE',    type:'Futures' },
  { symbol:'LE=F',  name:'Live Cattle Futures',               exchange:'CME',    type:'Futures' },
  { symbol:'GF=F',  name:'Feeder Cattle Futures',             exchange:'CME',    type:'Futures' },
  { symbol:'HE=F',  name:'Lean Hogs Futures',                 exchange:'CME',    type:'Futures' },
  { symbol:'LBS=F', name:'Lumber Futures',                    exchange:'CME',    type:'Futures' },

  // ── Crypto ──
  { symbol:'BTC-USD',  name:'Bitcoin USD',                    exchange:'CCC',    type:'Crypto' },
  { symbol:'ETH-USD',  name:'Ethereum USD',                   exchange:'CCC',    type:'Crypto' },
  { symbol:'SOL-USD',  name:'Solana USD',                     exchange:'CCC',    type:'Crypto' },
  { symbol:'BNB-USD',  name:'BNB USD',                        exchange:'CCC',    type:'Crypto' },
  { symbol:'XRP-USD',  name:'XRP USD',                        exchange:'CCC',    type:'Crypto' },
  { symbol:'DOGE-USD', name:'Dogecoin USD',                   exchange:'CCC',    type:'Crypto' },
  { symbol:'ADA-USD',  name:'Cardano USD',                    exchange:'CCC',    type:'Crypto' },
  { symbol:'AVAX-USD', name:'Avalanche USD',                  exchange:'CCC',    type:'Crypto' },
  { symbol:'LINK-USD', name:'Chainlink USD',                  exchange:'CCC',    type:'Crypto' },
  { symbol:'DOT-USD',  name:'Polkadot USD',                   exchange:'CCC',    type:'Crypto' },

  // ── Major ETFs ──
  { symbol:'SPY',   name:'SPDR S&P 500 ETF Trust',           exchange:'NYSE',   type:'ETF' },
  { symbol:'QQQ',   name:'Invesco QQQ Trust (NASDAQ 100)',    exchange:'NASDAQ', type:'ETF' },
  { symbol:'IWM',   name:'iShares Russell 2000 ETF',         exchange:'NYSE',   type:'ETF' },
  { symbol:'DIA',   name:'SPDR Dow Jones Industrial Avg ETF',exchange:'NYSE',   type:'ETF' },
  { symbol:'VTI',   name:'Vanguard Total Stock Market ETF',  exchange:'NYSE',   type:'ETF' },
  { symbol:'VOO',   name:'Vanguard S&P 500 ETF',             exchange:'NYSE',   type:'ETF' },
  { symbol:'VEA',   name:'Vanguard FTSE Developed Markets ETF',exchange:'NYSE', type:'ETF' },
  { symbol:'VWO',   name:'Vanguard FTSE Emerging Markets ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'GLD',   name:'SPDR Gold Shares ETF',             exchange:'NYSE',   type:'ETF' },
  { symbol:'SLV',   name:'iShares Silver Trust ETF',         exchange:'NYSE',   type:'ETF' },
  { symbol:'USO',   name:'United States Oil Fund ETF',       exchange:'NYSE',   type:'ETF' },
  { symbol:'UNG',   name:'United States Natural Gas Fund ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'TLT',   name:'iShares 20+ Year Treasury Bond ETF',exchange:'NASDAQ',type:'ETF' },
  { symbol:'HYG',   name:'iShares iBoxx High Yield Corp Bond ETF',exchange:'NYSE',type:'ETF' },
  { symbol:'LQD',   name:'iShares iBoxx Invest Grade Corp Bond ETF',exchange:'NYSE',type:'ETF' },
  { symbol:'XLF',   name:'Financial Select Sector SPDR ETF', exchange:'NYSE',   type:'ETF' },
  { symbol:'XLE',   name:'Energy Select Sector SPDR ETF',    exchange:'NYSE',   type:'ETF' },
  { symbol:'XLK',   name:'Technology Select Sector SPDR ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'XLV',   name:'Health Care Select Sector SPDR ETF',exchange:'NYSE', type:'ETF' },
  { symbol:'XLY',   name:'Consumer Discret Select Sector ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'XLP',   name:'Consumer Staples Select Sector ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'XLI',   name:'Industrial Select Sector SPDR ETF',exchange:'NYSE',  type:'ETF' },
  { symbol:'XLU',   name:'Utilities Select Sector SPDR ETF', exchange:'NYSE',   type:'ETF' },
  { symbol:'XLB',   name:'Materials Select Sector SPDR ETF', exchange:'NYSE',   type:'ETF' },
  { symbol:'ARKK',  name:'ARK Innovation ETF',               exchange:'NYSE',   type:'ETF' },
  { symbol:'SQQQ',  name:'ProShares UltraPro Short QQQ',     exchange:'NASDAQ', type:'ETF' },
  { symbol:'TQQQ',  name:'ProShares UltraPro QQQ',           exchange:'NASDAQ', type:'ETF' },
  { symbol:'SPXU',  name:'ProShares UltraPro Short S&P 500', exchange:'NYSE',   type:'ETF' },
  { symbol:'UPRO',  name:'ProShares UltraPro S&P 500',       exchange:'NYSE',   type:'ETF' },
  { symbol:'UVXY',  name:'ProShares Ultra VIX Short-Term ETF',exchange:'CBOE',  type:'ETF' },
  { symbol:'IBIT',  name:'iShares Bitcoin Trust ETF',        exchange:'NASDAQ', type:'ETF' },
  { symbol:'FBTC',  name:'Fidelity Wise Origin Bitcoin Fund', exchange:'CBOE',  type:'ETF' },

  // ── Currencies ──
  { symbol:'EURUSD=X', name:'Euro / US Dollar',              exchange:'CCY',    type:'Currency' },
  { symbol:'JPY=X',    name:'US Dollar / Japanese Yen',      exchange:'CCY',    type:'Currency' },
  { symbol:'GBPUSD=X', name:'British Pound / US Dollar',     exchange:'CCY',    type:'Currency' },
  { symbol:'CNY=X',    name:'US Dollar / Chinese Yuan',      exchange:'CCY',    type:'Currency' },
  { symbol:'CAD=X',    name:'US Dollar / Canadian Dollar',   exchange:'CCY',    type:'Currency' },
  { symbol:'AUDUSD=X', name:'Australian Dollar / US Dollar', exchange:'CCY',    type:'Currency' },
  { symbol:'CHF=X',    name:'US Dollar / Swiss Franc',       exchange:'CCY',    type:'Currency' },
  { symbol:'DX-Y.NYB', name:'US Dollar Index',               exchange:'ICE',    type:'Currency' },
]

// Fuzzy search: score each ticker by relevance to query
export function searchTickers(query: string, limit = 7): Ticker[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  // Remove common filler words
  const clean = q.replace(/\b(stock|shares|etf|futures|index|fund|inc|corp|co|ltd|plc)\b/g, '').trim()

  const scored = TICKERS.map(t => {
    const sym  = t.symbol.toLowerCase()
    const name = t.name.toLowerCase()
    let score  = 0

    // Exact symbol match
    if (sym === clean) score += 200
    // Symbol starts with query
    else if (sym.startsWith(clean)) score += 100
    // Symbol contains query
    else if (sym.includes(clean)) score += 60

    // Name starts with query
    if (name.startsWith(clean)) score += 80
    // Every word in query appears in name
    const words = clean.split(/\s+/).filter(Boolean)
    const matchedWords = words.filter(w => name.includes(w) || sym.includes(w))
    score += matchedWords.length * 20

    // Fuzzy: handle typos using character overlap
    if (score === 0) {
      score += fuzzyScore(clean, sym) * 40
      score += fuzzyScore(clean, name) * 15
    }

    return { ticker: t, score }
  })

  return scored
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.ticker)
}

// Simple bigram similarity (handles typos well)
function fuzzyScore(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return b.includes(a) ? 0.5 : 0
  const aBigrams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2)
    aBigrams.set(bg, (aBigrams.get(bg) ?? 0) + 1)
  }
  let intersection = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2)
    const count = aBigrams.get(bg) ?? 0
    if (count > 0) { intersection++; aBigrams.set(bg, count - 1) }
  }
  return (2 * intersection) / (a.length + b.length - 2)
}
