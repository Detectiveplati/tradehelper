/**
 * Market Condition Service
 * 
 * Fetches real-time market data from:
 * - FRED API (VIX, 10-year yield, USD index)
 * - Stock market APIs (SPY, QQQ)
 * 
 * Returns normalized market condition object with scoring and plain-English explanations.
 */
const fetch = require('node-fetch');
const MarketSnapshot = require('../models/MarketSnapshot');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const FRED_API_KEY = process.env.FRED_API_KEY || 'mock';
const STOCK_API_KEY = process.env.STOCK_API_KEY || 'mock';
const STOCK_API_PROVIDER = process.env.STOCK_API_PROVIDER || 'mock';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const POLYGON_BASE_URL = 'https://api.polygon.io';
const ALPHAVANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// FRED Series IDs
const FRED_SERIES = {
  VIX: 'VIXCLS',
  TEN_YEAR_YIELD: 'DGS10',
  USD_INDEX: 'DTWEXBGS', // Broad dollar index
};

// ─────────────────────────────────────────────────────────────────────────────
// FRED API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch FRED data for a given series
 * Returns: { value, previousValue, date }
 */
async function fetchFredData(seriesId) {
  try {
    if (FRED_API_KEY === 'mock' || !FRED_API_KEY) {
      return generateMockFredData(seriesId);
    }

    const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&limit=2&sort_order=desc&file_type=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();
    const observations = data.observations || [];

    if (observations.length < 2) {
      throw new Error(`FRED: Insufficient data for ${seriesId}`);
    }

    // Latest and previous
    const latest = parseFloat(observations[0].value);
    const previous = parseFloat(observations[1].value);

    if (isNaN(latest) || isNaN(previous)) {
      throw new Error(`FRED: Invalid data for ${seriesId}`);
    }

    return {
      value: latest,
      previousValue: previous,
      date: new Date(observations[0].date),
      change: latest - previous,
      changePercent: ((latest - previous) / Math.abs(previous)) * 100,
    };
  } catch (err) {
    console.error(`⚠️  FRED fetch error (${seriesId}):`, err.message);
    return null;
  }
}

/**
 * Generate mock FRED data for testing
 */
function generateMockFredData(seriesId) {
  const mocks = {
    VIXCLS: {
      value: 18.5,
      previousValue: 17.2,
      date: new Date(),
      change: 1.3,
      changePercent: 7.56,
    },
    DGS10: {
      value: 4.25,
      previousValue: 4.18,
      date: new Date(),
      change: 0.07,
      changePercent: 1.67,
    },
    DTWEXBGS: {
      value: 105.2,
      previousValue: 104.8,
      date: new Date(),
      change: 0.4,
      changePercent: 0.38,
    },
  };
  return mocks[seriesId] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch stock quote (SPY or QQQ)
 * Provider: finnhub, polygon, alphavantage, or mock
 */
async function fetchStockQuote(symbol) {
  try {
    if (STOCK_API_PROVIDER === 'mock' || !STOCK_API_KEY || STOCK_API_KEY === 'mock') {
      return generateMockStockQuote(symbol);
    }

    if (STOCK_API_PROVIDER === 'finnhub') {
      return await fetchFromFinnhub(symbol);
    } else if (STOCK_API_PROVIDER === 'polygon') {
      return await fetchFromPolygon(symbol);
    } else if (STOCK_API_PROVIDER === 'alphavantage') {
      return await fetchFromAlphaVantage(symbol);
    } else {
      return generateMockStockQuote(symbol);
    }
  } catch (err) {
    console.error(`⚠️  Stock API error (${symbol}):`, err.message);
    return null;
  }
}

/**
 * Finnhub API fetch
 */
async function fetchFromFinnhub(symbol) {
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.c) {
    throw new Error(`Finnhub: No data for ${symbol}`);
  }

  return {
    value: data.c, // current price
    previousClose: data.pc, // previous close
    changePercent: ((data.c - data.pc) / data.pc) * 100,
    timestamp: new Date(),
  };
}

/**
 * Polygon.io API fetch
 */
async function fetchFromPolygon(symbol) {
  const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apikey=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Polygon API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || !data.results[0]) {
    throw new Error(`Polygon: No data for ${symbol}`);
  }

  const ticker = data.results[0];
  const price = ticker.lastTrade?.p || ticker.lastQuote?.ask;

  if (!price) {
    throw new Error(`Polygon: No price data for ${symbol}`);
  }

  return {
    value: price,
    previousClose: ticker.prevClose,
    changePercent: ((price - ticker.prevClose) / ticker.prevClose) * 100,
    timestamp: new Date(),
  };
}

/**
 * Alpha Vantage API fetch
 */
async function fetchFromAlphaVantage(symbol) {
  const url = `${ALPHAVANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${STOCK_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
    throw new Error(`Alpha Vantage: No data for ${symbol}`);
  }

  const quote = data['Global Quote'];
  const price = parseFloat(quote['05. price']);
  const previousClose = parseFloat(quote['08. previous close']);

  if (isNaN(price) || isNaN(previousClose)) {
    throw new Error(`Alpha Vantage: Invalid price data for ${symbol}`);
  }

  return {
    value: price,
    previousClose,
    changePercent: ((price - previousClose) / previousClose) * 100,
    timestamp: new Date(),
  };
}

/**
 * Generate mock stock quote for testing
 */
function generateMockStockQuote(symbol) {
  const mocks = {
    SPY: {
      value: 542.8,
      previousClose: 540.1,
      changePercent: 0.5,
      timestamp: new Date(),
    },
    QQQ: {
      value: 475.3,
      previousClose: 473.2,
      changePercent: 0.44,
      timestamp: new Date(),
    },
  };
  return mocks[symbol] || { value: 100, previousClose: 99.5, changePercent: 0.5, timestamp: new Date() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring & Status Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine direction and status for a stock (SPY or QQQ)
 */
function scoreStock(changePercent) {
  let direction = 'Flat';
  let status = 'Neutral';

  if (changePercent > 0.3) {
    direction = 'Up';
    status = 'Bullish';
  } else if (changePercent < -0.3) {
    direction = 'Down';
    status = 'Bearish';
  } else {
    direction = 'Flat';
    status = 'Neutral';
  }

  return { direction, status };
}

/**
 * Determine direction and status for VIX
 */
function scoreVix(value) {
  let direction = '';
  let status = '';

  if (value < 15) {
    direction = 'Low';
    status = 'Calm / Bullish';
  } else if (value < 20) {
    direction = 'Normal';
    status = 'Neutral';
  } else if (value < 30) {
    direction = 'High';
    status = 'Caution';
  } else {
    direction = 'Extreme';
    status = 'Panic / Bearish';
  }

  return { direction, status };
}

/**
 * Determine direction and status for 10-year yield
 * Change in basis points (1 bp = 0.01%)
 */
function scoreYield(change) {
  let direction = '';
  let status = '';

  if (change > 0.1) {
    direction = 'Rising';
    status = 'Bearish for growth';
  } else if (change < -0.1) {
    direction = 'Falling';
    status = 'Bullish for growth';
  } else {
    direction = 'Flat';
    status = 'Neutral';
  }

  return { direction, status };
}

/**
 * Determine direction and status for DXY/USD
 */
function scoreDxy(changePercent) {
  let direction = '';
  let status = '';

  if (changePercent > 0.5) {
    direction = 'Rising';
    status = 'Bearish / Caution';
  } else if (changePercent < -0.5) {
    direction = 'Falling';
    status = 'Bullish for risk assets';
  } else {
    direction = 'Flat';
    status = 'Neutral';
  }

  return { direction, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation Functions
// ─────────────────────────────────────────────────────────────────────────────

function getStockExplanation(symbol, direction) {
  if (symbol === 'SPY') {
    if (direction === 'Up') {
      return 'SPY is rising — the broad US market is stronger. Long trades have better support when the overall market is positive.';
    } else if (direction === 'Down') {
      return 'SPY is falling — the broad US market is weaker. This is a headwind for most trading strategies.';
    } else {
      return 'SPY is flat — the broad US market is in consolidation. Look for other confirmation signals before trading.';
    }
  }

  if (symbol === 'QQQ') {
    if (direction === 'Up') {
      return 'QQQ is rising — tech and growth stocks are stronger. This matters because many day trading stocks follow Nasdaq momentum.';
    } else if (direction === 'Down') {
      return 'QQQ is falling — tech and growth stocks are weaker. This is a headwind for growth-focused day trading.';
    } else {
      return 'QQQ is flat — tech stocks are in consolidation. Reduced momentum in high-beta names.';
    }
  }

  return 'Stock direction unclear.';
}

function getVixExplanation(status) {
  if (status === 'Calm / Bullish') {
    return 'Low VIX means market fear is low. This usually means calmer price action and lower intraday volatility — good conditions for range trading.';
  } else if (status === 'Neutral') {
    return 'Normal VIX means market fear is moderate. Typical conditions for day trading with moderate volatility.';
  } else if (status === 'Caution') {
    return 'High VIX means market fear is elevated. This usually means more panic, wider price swings, and higher risk for day trading.';
  } else if (status === 'Panic / Bearish') {
    return 'Extreme VIX means panic selling is in effect. Volatility spikes create whipsaw conditions and wider stops needed.';
  }
  return 'VIX status unclear.';
}

function getYieldExplanation(direction) {
  if (direction === 'Rising') {
    return 'Rising yield means interest rates are moving up. This can pressure growth stocks because money becomes more expensive and investors may reduce risk.';
  } else if (direction === 'Falling') {
    return 'Falling yield means interest rates are moving down. This tends to support growth stocks as borrowing costs decrease.';
  } else {
    return 'Yields are flat. No new pressure or support from interest rate moves.';
  }
}

function getDxyExplanation(direction, isProxy) {
  const proxyLabel = isProxy ? ' (USD proxy)' : '';
  if (direction === 'Rising') {
    return `A stronger US dollar${proxyLabel} can pressure stocks, especially multinational companies and risk assets. Investors may rotate to USD safety.`;
  } else if (direction === 'Falling') {
    return `A weaker US dollar${proxyLabel} tends to support risk assets and commodities. Investors may rotate away from USD safety into equities.`;
  } else {
    return `The US dollar${proxyLabel} is flat. No new pressure or support from FX moves.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Overall Market Bias
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine overall market bias from all indicators
 * Returns: { bias: "Bullish|Bearish|Mixed|Risk-Off", summary: "..." }
 */
function calculateOverallBias(spy, qqq, vix, yield10, dxy) {
  const signals = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
  };

  // SPY scoring
  if (spy && spy.status === 'Bullish') signals.bullish++;
  else if (spy && spy.status === 'Bearish') signals.bearish++;
  else signals.neutral++;

  // QQQ scoring
  if (qqq && qqq.status === 'Bullish') signals.bullish++;
  else if (qqq && qqq.status === 'Bearish') signals.bearish++;
  else signals.neutral++;

  // VIX scoring (inverted)
  if (vix && (vix.status === 'Calm / Bullish' || vix.status === 'Neutral')) signals.bullish++;
  else if (vix && vix.status !== 'Neutral') signals.bearish++;
  else signals.neutral++;

  // Yield scoring (inverted for growth)
  if (yield10 && yield10.status === 'Bullish for growth') signals.bullish++;
  else if (yield10 && yield10.status === 'Bearish for growth') signals.bearish++;
  else signals.neutral++;

  // DXY scoring (inverted)
  if (dxy && dxy.status === 'Bullish for risk assets') signals.bullish++;
  else if (dxy && dxy.status === 'Bearish / Caution') signals.bearish++;
  else signals.neutral++;

  // Determine bias
  let bias = 'Mixed';
  if (signals.bullish >= 4) {
    bias = 'Bullish';
  } else if (signals.bearish >= 4) {
    bias = 'Risk-Off';
  } else if (signals.bearish >= 3 && signals.bullish <= 1) {
    bias = 'Risk-Off';
  } else if (signals.bullish >= 3 && signals.bearish <= 1) {
    bias = 'Bullish';
  }

  // Generate summary
  let summary = generateBiasSummary(bias, { spy, qqq, vix, yield10, dxy });

  return { bias, summary };
}

/**
 * Generate plain-English summary of market bias
 */
function generateBiasSummary(bias, indicators) {
  const { spy, qqq, vix, yield10, dxy } = indicators;

  if (bias === 'Bullish') {
    return `Strong bullish setup: SPY and QQQ are up, VIX is calm, and yields are not rising. Good conditions for long-biased trading strategies.`;
  } else if (bias === 'Risk-Off') {
    return `Risk-off environment: SPY/QQQ are down or flat, VIX is elevated, and yields may be rising. Consider reducing position sizes or waiting for clearer setups.`;
  } else {
    // Mixed
    const details = [];
    if (spy?.status === 'Bullish') details.push('SPY is up');
    if (qqq?.status === 'Bullish') details.push('QQQ is up');
    if (vix?.status?.includes('Caution') || vix?.status?.includes('Panic')) details.push('VIX is elevated');
    if (yield10?.status === 'Bearish for growth') details.push('yields are rising');

    const msgParts = details.length > 0 ? `(${details.join(', ')})` : '';
    return `Mixed market conditions ${msgParts}. Trade smaller or wait for clearer setups. Confirmation from other indicators is important.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Service Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch and normalize all market condition data
 * Returns: Market condition object with scoring, status, and explanations
 */
async function getMarketCondition() {
  const errors = [];
  const sources = {};

  // Fetch all data in parallel
  const [spyData, qqqData, vixData, yield10Data, dxyData] = await Promise.all([
    fetchStockQuote('SPY'),
    fetchStockQuote('QQQ'),
    fetchFredData(FRED_SERIES.VIX),
    fetchFredData(FRED_SERIES.TEN_YEAR_YIELD),
    fetchFredData(FRED_SERIES.USD_INDEX),
  ]);

  // Process SPY
  let spy = null;
  if (spyData) {
    const { direction, status } = scoreStock(spyData.changePercent);
    spy = {
      symbol: 'SPY',
      label: 'S&P 500 Proxy',
      value: parseFloat(spyData.value.toFixed(2)),
      changePercent: parseFloat(spyData.changePercent.toFixed(2)),
      direction,
      status,
      explanation: getStockExplanation('SPY', direction),
      timestamp: spyData.timestamp,
    };
    sources.spy = STOCK_API_PROVIDER;
  } else {
    errors.push({ source: 'SPY', message: `Failed to fetch SPY data (provider: ${STOCK_API_PROVIDER})`, timestamp: new Date() });
  }

  // Process QQQ
  let qqq = null;
  if (qqqData) {
    const { direction, status } = scoreStock(qqqData.changePercent);
    qqq = {
      symbol: 'QQQ',
      label: 'Nasdaq Proxy',
      value: parseFloat(qqqData.value.toFixed(2)),
      changePercent: parseFloat(qqqData.changePercent.toFixed(2)),
      direction,
      status,
      explanation: getStockExplanation('QQQ', direction),
      timestamp: qqqData.timestamp,
    };
    sources.qqq = STOCK_API_PROVIDER;
  } else {
    errors.push({ source: 'QQQ', message: `Failed to fetch QQQ data (provider: ${STOCK_API_PROVIDER})`, timestamp: new Date() });
  }

  // Process VIX
  let vix = null;
  if (vixData) {
    const { direction, status } = scoreVix(vixData.value);
    vix = {
      symbol: FRED_SERIES.VIX,
      label: 'VIX Fear Index',
      value: parseFloat(vixData.value.toFixed(2)),
      changePercent: parseFloat(vixData.changePercent.toFixed(2)),
      direction,
      status,
      explanation: getVixExplanation(status),
      timestamp: vixData.date,
    };
    sources.vix = 'FRED';
  } else {
    errors.push({ source: 'VIX', message: 'Failed to fetch VIX data from FRED', timestamp: new Date() });
  }

  // Process 10-Year Yield
  let tenYearYield = null;
  if (yield10Data) {
    const { direction, status } = scoreYield(yield10Data.change);
    tenYearYield = {
      symbol: FRED_SERIES.TEN_YEAR_YIELD,
      label: '10-Year Treasury Yield',
      value: parseFloat(yield10Data.value.toFixed(2)),
      change: parseFloat(yield10Data.change.toFixed(2)),
      direction,
      status,
      explanation: getYieldExplanation(direction),
      timestamp: yield10Data.date,
    };
    sources.tenYearYield = 'FRED';
  } else {
    errors.push({ source: 'DGS10', message: 'Failed to fetch 10-year yield from FRED', timestamp: new Date() });
  }

  // Process DXY/USD
  let dxy = null;
  if (dxyData) {
    const { direction, status } = scoreDxy(dxyData.changePercent);
    dxy = {
      symbol: 'DTWEXBGS',
      label: 'US Dollar Index (Broad)',
      value: parseFloat(dxyData.value.toFixed(2)),
      changePercent: parseFloat(dxyData.changePercent.toFixed(2)),
      direction,
      status,
      explanation: getDxyExplanation(direction, false),
      isProxy: false,
      timestamp: dxyData.date,
    };
    sources.dxy = 'FRED';
  } else {
    errors.push({ source: 'DXY', message: 'Failed to fetch USD index from FRED', timestamp: new Date() });
    // Try fallback: use UUP ETF as proxy
    const uupData = await fetchStockQuote('UUP');
    if (uupData) {
      const { direction, status } = scoreDxy(uupData.changePercent);
      dxy = {
        symbol: 'UUP',
        label: 'US Dollar Index (UUP Proxy)',
        value: parseFloat(uupData.value.toFixed(2)),
        changePercent: parseFloat(uupData.changePercent.toFixed(2)),
        direction,
        status,
        explanation: getDxyExplanation(direction, true),
        isProxy: true,
        timestamp: uupData.timestamp,
      };
      sources.dxy = `${STOCK_API_PROVIDER} (UUP proxy)`;
    }
  }

  // Calculate overall bias
  const { bias: overallMarketBias, summary } = calculateOverallBias(spy, qqq, vix, tenYearYield, dxy);

  const result = {
    spy,
    qqq,
    vix,
    tenYearYield,
    dxy,
    overallMarketBias,
    summary,
    sources,
    errors: errors.length > 0 ? errors : null,
    timestamp: new Date(),
  };

  // Cache snapshot to MongoDB
  try {
    await MarketSnapshot.create({
      snapshotDate: new Date(),
      data: result,
      sources,
      errors,
    });
  } catch (cacheErr) {
    console.error('⚠️  Failed to cache market snapshot:', cacheErr.message);
  }

  return result;
}

/**
 * Get the latest cached market condition (if available)
 */
async function getLatestCachedMarketCondition() {
  try {
    const latest = await MarketSnapshot.findOne().sort({ snapshotDate: -1 }).lean();
    return latest ? latest.data : null;
  } catch (err) {
    console.error('⚠️  Failed to fetch cached market condition:', err.message);
    return null;
  }
}

module.exports = {
  getMarketCondition,
  getLatestCachedMarketCondition,
};
