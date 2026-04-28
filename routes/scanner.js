const express = require('express');
const router = express.Router();
const ScannerSnapshot = require('../models/ScannerSnapshot');
const { scanTradeCandidates } = require('../services/scannerService');

/**
 * GET /api/scanner/candidates
 * Fetch trade candidates from cache or generate new scan
 * Query params:
 *   - watchlist: comma-separated stock tickers (optional, uses default if not provided)
 *   - marketBias: override market bias (optional)
 */
router.get('/candidates', async (req, res) => {
  try {
    // Parse custom watchlist from query if provided
    let customWatchlist = null;
    if (req.query.watchlist) {
      customWatchlist = req.query.watchlist
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && t.length <= 5); // Valid ticker symbols
    }

    // Try to get from cache first (skip if using custom watchlist or if DB is unavailable)
    let snapshot = null;
    if (!customWatchlist) {
      try {
        snapshot = await Promise.race([
          ScannerSnapshot.findOne().sort({ createdAt: -1 }).limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);

        if (snapshot && new Date() - snapshot.createdAt < 5 * 60 * 1000) {
          // Cache is fresh (less than 5 minutes old)
          return res.json({
            marketBias: snapshot.marketBias,
            candidates: snapshot.candidates,
            timestamp: snapshot.createdAt,
            isCached: true,
            cacheAge: Math.floor((new Date() - snapshot.createdAt) / 1000),
          });
        }
      } catch (cacheErr) {
        console.warn('⚠️  Cache lookup failed (DB unavailable), proceeding with fresh scan');
        // Continue without cache
      }
    }

    // Generate new scan
    // Get market bias from query parameter or environment
    const marketBias = req.query.marketBias || process.env.MARKET_BIAS || 'Mixed';

    const scanResults = await scanTradeCandidates(marketBias, customWatchlist);

    // Try to save to cache (only if using default watchlist)
    if (!customWatchlist) {
      try {
        const newSnapshot = new ScannerSnapshot({
          date: new Date(),
          marketBias: scanResults.marketBias,
          candidates: scanResults.candidates,
          source: process.env.STOCK_API_PROVIDER || 'mock',
        });
        await newSnapshot.save();
      } catch (cacheErr) {
        console.warn('⚠️  Failed to cache scan results:', cacheErr.message);
        // Continue - caching is optional
      }
    }

    res.json({
      marketBias: scanResults.marketBias,
      candidates: scanResults.candidates,
      timestamp: new Date(),
      isCached: customWatchlist ? false : false,
      watchlistCount: customWatchlist ? customWatchlist.length : null,
    });
  } catch (err) {
    console.error('❌ Scanner error:', err.message);
    res.status(500).json({
      error: 'Failed to scan candidates',
      message: err.message,
    });
  }
});

/**
 * GET /api/scanner/cached
 * Get last cached scan results
 */
router.get('/cached', async (req, res) => {
  try {
    const snapshot = await ScannerSnapshot.findOne().sort({ createdAt: -1 }).limit(1);

    if (!snapshot) {
      return res.status(404).json({ error: 'No cached scan available' });
    }

    res.json({
      marketBias: snapshot.marketBias,
      candidates: snapshot.candidates,
      timestamp: snapshot.createdAt,
      age: Math.floor((new Date() - snapshot.createdAt) / 1000),
    });
  } catch (err) {
    console.warn('⚠️  Cache fetch error (MongoDB unavailable):', err.message);
    // Return empty cache response if MongoDB is unavailable
    res.status(404).json({
      error: 'No cached scan available',
      reason: 'Database connection unavailable'
    });
  }
});

module.exports = router;
