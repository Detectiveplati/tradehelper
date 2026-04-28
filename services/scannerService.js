/**
 * Trade Candidate Scanner Service
 * Finds stocks worth watching for day trading
 */

const fetch = require('node-fetch');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const POLYGON_BASE_URL = 'https://api.polygon.io';
const ALPHAVANTAGE_BASE_URL = 'https://www.alphavantage.co';

const STOCK_API_PROVIDER = process.env.STOCK_API_PROVIDER || 'finnhub';
const STOCK_API_KEY = process.env.STOCK_API_KEY || '';
const FRED_API_KEY = process.env.FRED_API_KEY || '';

// 100 popular stocks for day trading (default watchlist)
const DEFAULT_WATCHLIST = [
  // Tech Giants (10)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'NFLX', 'INTC',
  // Semiconductors (8)
  'QCOM', 'AVGO', 'MCHP', 'LRCX', 'NXPI', 'ASML', 'SLAB', 'MRVL',
  // Cloud/SaaS (12)
  'SHOP', 'CRWD', 'OKTA', 'SNOW', 'DDOG', 'NET', 'CYBR', 'PANW', 'UPST', 'AFRM', 'COIN', 'RBLX',
  // Fintech (6)
  'SQ', 'PYPL', 'V', 'MA', 'AFRM', 'DASH',
  // Financial Services (10)
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'BX', 'KKR', 'APO', 'SCHW',
  // Healthcare/Pharma (10)
  'JNJ', 'PFE', 'ABBV', 'MRK', 'AZN', 'BNTX', 'MRNA', 'VRTX', 'REGN', 'AMGN',
  // Retail/Consumer (10)
  'WMT', 'TGT', 'HD', 'LOW', 'DIS', 'MCD', 'SBUX', 'BKNG', 'ABNB', 'RH',
  // Industrial/Aerospace (8)
  'CAT', 'BA', 'GE', 'RTX', 'LMT', 'NOC', 'COST', 'MMM',
  // Energy (6)
  'XOM', 'CVX', 'COP', 'MPC', 'PSX', 'EOG',
  // Communications (4)
  'CRM', 'ADBE', 'AVGO', 'ASML',
  // Transportation/Auto (5)
  'F', 'GM', 'TM', 'HMC', 'LI',
  // Hospitality/Airlines (4)
  'AAL', 'DAL', 'UAL', 'MGM',
  // Real Estate/Property (4)
  'SPG', 'PLD', 'DLR', 'EQIX',
  // ETFs & Indices (8)
  'SPY', 'QQQ', 'IWM', 'EEM', 'EWJ', 'EWG', 'FXI', 'ASHR',
  // Commodities/Fixed Income (5)
  'GLD', 'SLV', 'TLT', 'IEF', 'AGG',
  // EV/Auto Adjacent (4)
  'NIO', 'XPEV', 'RIVN', 'LCID',
  // Utilities (3)
  'NEE', 'DUK', 'SO',
  // Biotech (5)
  'BIIB', 'GILD', 'ILMN', 'VEEV', 'ZOOM'
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fetch Stock Data
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStockData(ticker) {
  try {
    if (STOCK_API_PROVIDER === 'finnhub') {
      return await fetchFromFinnhub(ticker);
    } else if (STOCK_API_PROVIDER === 'polygon') {
      return await fetchFromPolygon(ticker);
    } else if (STOCK_API_PROVIDER === 'alphavantage') {
      return await fetchFromAlphaVantage(ticker);
    } else {
      return generateMockStockData(ticker);
    }
  } catch (err) {
    console.error(`⚠️  Stock data error (${ticker}):`, err.message);
    return null;
  }
}

async function fetchFromFinnhub(ticker) {
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${ticker}&token=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.c) {
    throw new Error(`Finnhub: No data for ${ticker}`);
  }

  const changePercent = ((data.c - data.pc) / data.pc) * 100;

  return {
    ticker,
    currentPrice: data.c,
    previousClose: data.pc,
    bid: data.bid || null,
    ask: data.ask || null,
    bidSize: data.bidSize,
    askSize: data.askSize,
    timestamp: new Date().toISOString(),
    dataQuality: 'real',
    change: data.c - data.pc,
    changePercent,
    isPremarket: false, // Finnhub quote doesn't distinguish premarket
  };
}

async function fetchFromPolygon(ticker) {
  // Get latest quote
  const url = `${POLYGON_BASE_URL}/v3/quotes/latest?ticker=${ticker}&apiKey=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Polygon API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results) {
    throw new Error(`Polygon: No data for ${ticker}`);
  }

  const quote = data.results;
  const change = (quote.c || 0) - (quote.o || 0);
  const changePercent = quote.o ? (change / quote.o) * 100 : 0;

  return {
    ticker,
    currentPrice: quote.c || quote.o || 0,
    previousClose: quote.o || 0,
    bid: quote.bp || null,
    ask: quote.ap || null,
    bidSize: quote.bs,
    askSize: quote.as,
    timestamp: quote.t || new Date().toISOString(),
    dataQuality: 'real',
    change,
    changePercent,
    isPremarket: false,
  };
}

async function fetchFromAlphaVantage(ticker) {
  const url = `${ALPHAVANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
    throw new Error(`Alpha Vantage: No data for ${ticker}`);
  }

  const quote = data['Global Quote'];
  const price = parseFloat(quote['05. price']);
  const previousClose = parseFloat(quote['08. previous close']);
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  return {
    ticker,
    currentPrice: price,
    previousClose,
    bid: null,
    ask: null,
    bidSize: 0,
    askSize: 0,
    timestamp: new Date().toISOString(),
    dataQuality: 'real',
    change,
    changePercent,
    isPremarket: false,
  };
}

function generateMockStockData(ticker) {
  const moves = [-8, -5, -2, 2, 4, 6, 8, 12];
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  const basePrice = Math.random() * 300 + 10;
  const changePercent = randomMove;
  const change = (changePercent / 100) * basePrice;

  return {
    ticker,
    currentPrice: basePrice,
    previousClose: basePrice - change,
    bid: basePrice - 0.02,
    ask: basePrice + 0.02,
    bidSize: Math.floor(Math.random() * 10000) + 1000,
    askSize: Math.floor(Math.random() * 10000) + 1000,
    timestamp: new Date().toISOString(),
    dataQuality: 'mock',
    change,
    changePercent,
    isPremarket: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Calculations
// ─────────────────────────────────────────────────────────────────────────────

function calculateRelativeVolume(dailyVolume, averageVolume = 5000000) {
  if (!dailyVolume || averageVolume === 0) return 0;
  return (dailyVolume / averageVolume).toFixed(2);
}

function calculateSpread(bid, ask) {
  if (!bid || !ask || bid === 0) {
    return {
      spread: null,
      spreadPercent: null,
      tightness: 'unavailable',
    };
  }

  const spread = ask - bid;
  const spreadPercent = ((spread / bid) * 100).toFixed(3);

  let tightness = 'wide';
  if (spreadPercent < 0.05) tightness = 'tight';
  else if (spreadPercent < 0.10) tightness = 'normal';
  else if (spreadPercent < 0.20) tightness = 'slightly-wide';

  return {
    spread: spread.toFixed(2),
    spreadPercent: parseFloat(spreadPercent),
    tightness,
  };
}

function calculateLiquidityScore(dailyVolume, spread, price) {
  let score = 100;

  // Volume component (40 points)
  if (dailyVolume < 100000) score -= 40;
  else if (dailyVolume < 500000) score -= 20;
  else if (dailyVolume < 1000000) score -= 5;

  // Spread component (40 points)
  if (!spread || spread.spreadPercent === null) score -= 40;
  else if (spread.spreadPercent > 0.50) score -= 30;
  else if (spread.spreadPercent > 0.20) score -= 15;
  else if (spread.spreadPercent > 0.10) score -= 5;

  // Price component (20 points)
  if (price < 10) score -= 20;
  else if (price < 50) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Classification
// ─────────────────────────────────────────────────────────────────────────────

function classifyScannerStatus(candidate, marketBias) {
  const {
    currentPrice,
    premarketMovePercent,
    relativeVolume,
    hasNews,
    spread,
    liquidityScore,
  } = candidate;

  // WATCH criteria (all conditions must be met)
  const isWatch =
    currentPrice > 10 &&
    Math.abs(premarketMovePercent) > 3 &&
    relativeVolume > 2 &&
    hasNews &&
    spread.tightness !== 'wide' &&
    spread.tightness !== 'unavailable' &&
    liquidityScore > 60 &&
    (marketBias === 'Bullish' || marketBias === 'Mixed');

  if (isWatch) {
    return {
      status: 'Watch',
      reason: null,
    };
  }

  // CAUTION criteria
  const isCaution =
    currentPrice > 10 &&
    Math.abs(premarketMovePercent) > 2 &&
    (relativeVolume > 1.5 || hasNews) &&
    liquidityScore > 40 &&
    spread.tightness !== 'unavailable' &&
    marketBias !== 'Risk-Off';

  if (isCaution) {
    return {
      status: 'Caution',
      reason: null,
    };
  }

  // REJECT
  let rejectReasons = [];

  if (currentPrice <= 10) rejectReasons.push('Price too low (< $10)');
  if (Math.abs(premarketMovePercent) <= 1) rejectReasons.push('No significant premarket move');
  if (relativeVolume < 1) rejectReasons.push('Low relative volume');
  if (!hasNews) rejectReasons.push('No news catalyst');
  if (spread.tightness === 'wide' || spread.tightness === 'unavailable')
    rejectReasons.push('Wide spread or unavailable');
  if (liquidityScore < 40) rejectReasons.push('Poor liquidity');
  if (marketBias === 'Risk-Off') rejectReasons.push('Market in Risk-Off mode');

  return {
    status: 'Reject',
    reason: rejectReasons.length > 0 ? rejectReasons.join('; ') : 'Does not meet criteria',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateExplanations(candidate, relativeVolume, spread) {
  return {
    premarketMove: `This stock is ${Math.abs(candidate.premarketMovePercent) > 0 ? 'already' : 'not yet'} moving ${candidate.premarketMovePercent > 0 ? 'up' : 'down'} before official market hours. This may indicate traders reacting to overnight news.`,

    relativeVolume: `The stock is trading ${relativeVolume}x its normal daily volume. Higher relative volume means more traders are interested today, which can lead to bigger price swings.`,

    spread: `The spread is $${spread.spread || 'unavailable'}. This is the gap between buy and sell prices. A tight spread (under $0.05) makes it easier to enter and exit positions without losing money.`,

    liquidity: `Liquidity score: ${candidate.liquidityScore}/100. This measures whether you can easily buy and sell without moving the price much. Score above 60 is good for day trading.`,

    catalyst: candidate.hasNews
      ? `${candidate.catalystSummary || 'News or catalyst detected'}`
      : 'No obvious news catalyst. Be cautious trading without a clear reason for movement.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock News & Catalyst Data
// ─────────────────────────────────────────────────────────────────────────────

function generateMockCatalyst(ticker, changePercent) {
  const catalysts = [
    `Earnings announcement scheduled`,
    `FDA approval expected`,
    `Analyst upgrade/downgrade`,
    `Product launch announced`,
    `Acquisition rumor`,
    `CEO transition news`,
    `Quarterly guidance raised`,
    `Patent approval`,
  ];

  if (Math.abs(changePercent) > 5 && Math.random() > 0.4) {
    return {
      hasNews: true,
      catalyst: catalysts[Math.floor(Math.random() * catalysts.length)],
    };
  }

  return {
    hasNews: Math.random() > 0.7,
    catalyst: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Scanning Function
// ─────────────────────────────────────────────────────────────────────────────

async function scanTradeCandidates(marketBias = 'Mixed', customWatchlist = null) {
  console.log('🔍 Starting trade candidate scan...');

  const candidates = [];

  // Use custom watchlist if provided, otherwise use default
  const watchlist = customWatchlist && customWatchlist.length > 0 ? customWatchlist : DEFAULT_WATCHLIST;
  console.log(`📋 Scanning ${watchlist.length} stocks from watchlist`);

  // Fetch data for each ticker in parallel
  const promises = watchlist.map(ticker => fetchStockData(ticker));
  const stockDataArray = await Promise.all(promises);

  for (let i = 0; i < watchlist.length; i++) {
    const ticker = watchlist[i];
    const stockData = stockDataArray[i];

    if (!stockData) {
      console.warn(`⚠️  Skipping ${ticker} - no data`);
      continue;
    }

    // Calculate metrics
    const dailyVolume = Math.floor(Math.random() * 20000000) + 1000000;
    const averageVolume = Math.floor(dailyVolume / (Math.random() * 2 + 0.5));
    const relativeVolume = calculateRelativeVolume(dailyVolume, averageVolume);
    const spread = calculateSpread(stockData.bid, stockData.ask);
    const liquidityScore = calculateLiquidityScore(dailyVolume, spread, stockData.currentPrice);

    // Get catalyst info
    const { hasNews, catalyst } = generateMockCatalyst(ticker, stockData.changePercent);

    // Build candidate object
    const candidate = {
      ticker,
      companyName: `${ticker} Inc`,
      currentPrice: parseFloat(stockData.currentPrice.toFixed(2)),
      premarketMovePercent: parseFloat(stockData.changePercent.toFixed(2)),
      relativeVolume: parseFloat(relativeVolume),
      dailyVolume,
      bid: stockData.bid ? parseFloat(stockData.bid.toFixed(2)) : null,
      ask: stockData.ask ? parseFloat(stockData.ask.toFixed(2)) : null,
      spread: spread,
      spreadValue: spread.spread ? parseFloat(spread.spread) : null,
      tightness: spread.tightness,
      hasNews,
      catalystSummary: catalyst || 'No specific news',
      sector: 'Technology',
      liquidityScore,
      source: STOCK_API_PROVIDER,
      timestamp: new Date(),
    };

    // Classify status
    const { status, reason } = classifyScannerStatus(candidate, marketBias);
    candidate.scannerStatus = status;
    candidate.rejectionReason = reason;

    // Generate explanations
    candidate.explanations = generateExplanations(candidate, relativeVolume, candidate.spread);

    candidates.push(candidate);
  }

  console.log(`✅ Scanned ${candidates.length} candidates`);

  return {
    marketBias,
    candidates: candidates.sort((a, b) => {
      // Sort by: Watch > Caution > Reject, then by relative volume
      const statusOrder = { Watch: 0, Caution: 1, Reject: 2 };
      if (statusOrder[a.scannerStatus] !== statusOrder[b.scannerStatus]) {
        return statusOrder[a.scannerStatus] - statusOrder[b.scannerStatus];
      }
      return b.relativeVolume - a.relativeVolume;
    }),
    timestamp: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  scanTradeCandidates,
  calculateRelativeVolume,
  calculateSpread,
  calculateLiquidityScore,
  classifyScannerStatus,
  generateExplanations,
};
