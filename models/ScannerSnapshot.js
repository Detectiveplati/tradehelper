const mongoose = require('mongoose');

const ScannerSnapshotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    marketBias: {
      type: String,
      enum: ['Bullish', 'Bearish', 'Risk-Off', 'Mixed', 'Unknown'],
      default: 'Unknown',
    },
    candidates: [
      {
        ticker: String,
        companyName: String,
        currentPrice: Number,
        premarketMovePercent: Number,
        relativeVolume: Number,
        dailyVolume: Number,
        bid: Number,
        ask: Number,
        spread: mongoose.Schema.Types.Mixed,
        spreadValue: Number,
        tightness: String,
        hasNews: Boolean,
        catalystSummary: String,
        sector: String,
        liquidityScore: Number, // 0-100
        scannerStatus: {
          type: String,
          enum: ['Watch', 'Caution', 'Reject'],
          default: 'Reject',
        },
        rejectionReason: String,
        explanations: {
          premarketMove: String,
          relativeVolume: String,
          spread: String,
          liquidity: String,
          catalyst: String,
        },
        source: String,
        timestamp: Date,
      },
    ],
    source: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // Cache for 1 hour (3600 seconds)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScannerSnapshot', ScannerSnapshotSchema);
