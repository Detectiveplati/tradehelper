/**
 * Trading Helper - Market Condition Dashboard
 * 
 * Standalone day trading market condition assessment tool.
 * Runs on separate port from main app.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection
// ─────────────────────────────────────────────────────────────────────────────

const TRADING_MONGODB_URI = process.env.TRADING_MONGODB_URI || 'mongodb://localhost:27017/trading_helper';

async function connectDatabase() {
  try {
    await mongoose.connect(TRADING_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ [Database] MongoDB connected successfully');
  } catch (err) {
    console.error('✗ [Database] MongoDB connection failed:', err.message);
    console.log('⚠️  Continuing without caching — using in-memory storage only');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Trading Helper Dashboard',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/market-condition', require('./routes/marketCondition'));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎯 Trading Helper - Market Condition Dashboard        ║
╚════════════════════════════════════════════════════════════╝

📊 Server running on http://localhost:${PORT}

Routes:
  🌐 Dashboard:      http://localhost:${PORT}
  📈 Market Data:    http://localhost:${PORT}/api/market-condition
  💾 Cached Data:    http://localhost:${PORT}/api/market-condition/cached
  ❤️  Health Check:   http://localhost:${PORT}/health

Configuration:
  NODE_ENV:    ${process.env.NODE_ENV || 'development'}
  API Provider: ${process.env.STOCK_API_PROVIDER || 'mock'}
  Database:    ${process.env.TRADING_MONGODB_URI ? 'Connected' : 'Not configured'}

Press Ctrl+C to stop the server
`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
