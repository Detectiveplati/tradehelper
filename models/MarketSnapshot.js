/**
 * MarketSnapshot Schema
 * 
 * Caches market condition snapshots for fallback if API calls fail.
 * Each snapshot includes data from multiple sources: SPY, QQQ, VIX, yields, etc.
 */
const mongoose = require('mongoose');

const marketSnapshotSchema = new mongoose.Schema(
  {
    // Timestamp of when this snapshot was created
    snapshotDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // The actual market data
    data: {
      spy: {
        symbol: String,
        label: String,
        value: Number,
        changePercent: Number,
        direction: String, // "Up", "Down", "Flat"
        status: String, // "Bullish", "Bearish", "Neutral"
        explanation: String,
        timestamp: Date,
      },
      qqq: {
        symbol: String,
        label: String,
        value: Number,
        changePercent: Number,
        direction: String,
        status: String,
        explanation: String,
        timestamp: Date,
      },
      vix: {
        symbol: String,
        label: String,
        value: Number,
        changePercent: Number,
        direction: String,
        status: String,
        explanation: String,
        timestamp: Date,
      },
      tenYearYield: {
        symbol: String,
        label: String,
        value: Number, // percentage
        change: Number,
        direction: String,
        status: String,
        explanation: String,
        timestamp: Date,
      },
      dxy: {
        symbol: String,
        label: String,
        value: Number,
        changePercent: Number,
        direction: String,
        status: String,
        explanation: String,
        isProxy: Boolean,
        timestamp: Date,
      },
      overallMarketBias: String, // "Bullish", "Bearish", "Mixed", "Risk-Off"
      summary: String, // Plain English summary
    },

    // Source info for debugging
    sources: {
      spy: String, // e.g., "polygon", "finnhub", "mock"
      qqq: String,
      vix: String, // e.g., "FRED"
      tenYearYield: String, // e.g., "FRED"
      dxy: String, // e.g., "UUP proxy", "FRED"
    },

    // Track if any API failed during this snapshot
    errors: [
      {
        source: String,
        message: String,
        timestamp: Date,
      },
    ],

    // When the snapshot was cached
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 86400, // TTL: Auto-delete after 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries of the latest snapshot
marketSnapshotSchema.index({ snapshotDate: -1 });

module.exports = mongoose.model('MarketSnapshot', marketSnapshotSchema);
