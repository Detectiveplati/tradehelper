/**
 * Market Condition API Routes
 * 
 * GET /api/market-condition — Get current market condition with real-time data
 * GET /api/market-condition/cached — Get last cached market condition
 */
const express = require('express');
const router = express.Router();
const { getMarketCondition, getLatestCachedMarketCondition } = require('../services/marketConditionService');

/**
 * GET /api/market-condition
 * 
 * Fetch real-time market condition data
 * Falls back to cached data if any API fails
 * 
 * Response:
 * {
 *   spy: { symbol, label, value, changePercent, direction, status, explanation, timestamp },
 *   qqq: { ... },
 *   vix: { ... },
 *   tenYearYield: { ... },
 *   dxy: { ... },
 *   overallMarketBias: "Bullish|Bearish|Mixed|Risk-Off",
 *   summary: "Plain English summary",
 *   sources: { spy, qqq, vix, tenYearYield, dxy },
 *   errors: [ { source, message, timestamp } ] or null,
 *   timestamp: Date
 * }
 */
router.get('/', async (req, res) => {
  try {
    const marketCondition = await getMarketCondition();

    // If all data failed, try cached
    if (
      !marketCondition.spy &&
      !marketCondition.qqq &&
      !marketCondition.vix &&
      !marketCondition.tenYearYield &&
      !marketCondition.dxy
    ) {
      const cached = await getLatestCachedMarketCondition();
      if (cached) {
        return res.json({
          ...cached,
          isCached: true,
          cacheWarning: 'All API endpoints failed. Showing last cached snapshot.',
        });
      }

      return res.status(503).json({
        error: 'Unable to fetch market data',
        message: 'All API endpoints failed and no cached data available',
      });
    }

    return res.json(marketCondition);
  } catch (err) {
    console.error('Market condition error:', err);

    // Try cached as fallback
    try {
      const cached = await getLatestCachedMarketCondition();
      if (cached) {
        return res.json({
          ...cached,
          isCached: true,
          cacheWarning: 'API error. Showing last cached snapshot.',
        });
      }
    } catch (_) {}

    return res.status(500).json({
      error: 'Failed to fetch market condition',
      message: err.message,
    });
  }
});

/**
 * GET /api/market-condition/cached
 * 
 * Get the latest cached market condition snapshot
 * Useful for fallback or background updates
 */
router.get('/cached', async (req, res) => {
  try {
    const cached = await getLatestCachedMarketCondition();

    if (!cached) {
      return res.status(404).json({
        error: 'No cached market condition found',
        message: 'Run /api/market-condition first to populate cache',
      });
    }

    return res.json({
      ...cached,
      isCached: true,
      source: 'cache',
    });
  } catch (err) {
    console.error('Cached market condition error:', err);
    return res.status(500).json({
      error: 'Failed to fetch cached market condition',
      message: err.message,
    });
  }
});

module.exports = router;
