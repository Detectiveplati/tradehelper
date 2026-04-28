# Step 2: Trade Candidate Scanner

## Overview

The Trade Candidate Scanner identifies stocks worth analyzing for day trading. It uses real-time market data to classify candidates as **Watch**, **Caution**, or **Reject** based on predefined trading criteria.

**Important:** This page does NOT provide buy/sell signals. It only answers: *"Which stocks are worth analyzing today?"*

---

## How It Works

### Scanner Process

1. **Fetches real-time data** for a watchlist of 25 stocks (tech, S&P 500, growth)
2. **Calculates metrics**:
   - Premarket move %
   - Relative volume (compared to 20-day average)
   - Bid-ask spread (tightness)
   - Liquidity score (0-100)
3. **Classifies status** based on weighted criteria
4. **Caches results** in MongoDB for 1 hour to reduce API calls
5. **Displays results** with plain-English explanations

---

## Status Classifications

### Watch (Green) ✅
**All criteria met — Suitable for detailed analysis**

Requires:
- Price > $10
- Premarket move > 3%
- Relative volume > 2x
- Has news catalyst
- Tight bid-ask spread
- Liquidity score > 60
- Market not in Risk-Off mode

### Caution (Yellow) ⚠️
**Strong signals but weak on some factors — Analyze carefully**

Requires:
- Price > $10
- Premarket move > 2%
- Either high volume OR has news
- Liquidity score > 40
- Market not in Risk-Off mode

### Reject (Red) ❌
**Does not meet minimum criteria — Skip**

Fails if:
- Price ≤ $10
- Premarket move ≤ 1%
- Relative volume < 1x
- No news catalyst
- Wide bid-ask spread
- Liquidity score < 40
- Market in Risk-Off mode

---

## Metrics Explained

### Premarket Move %
**What it is:** Price change before official 9:30 AM market open

**Why it matters:** Shows early trader activity. Larger moves (> 3%) often indicate overnight news or strong overnight sentiment.

**Example:**
```
+4.5% = Stock up 4.5% in premarket
This means traders reacted to overnight news before regular trading
```

### Relative Volume
**What it is:** Current volume compared to 20-day average

**Why it matters:** Higher volume = more interest = bigger potential price swings. Also means easier entry/exit.

**Example:**
```
3.2x = Trading 3.2 times normal daily volume
Good for day trading - plenty of liquidity and volatility
1.0x = Normal volume - less exciting
```

### Bid-Ask Spread
**What it is:** Gap between highest buy price (bid) and lowest sell price (ask)

**Why it matters:** Tight spreads = cheaper entry/exit. Wide spreads = slippage and losses.

**Example:**
```
$0.03 spread = Tight (good)
$0.50 spread = Wide (bad)
$2.00 spread = Very wide (avoid)
```

### Liquidity Score
**What it is:** Overall liquidity rating (0-100) based on:
- Daily volume
- Bid-ask spread
- Stock price

**Why it matters:** High score = can enter/exit any size without moving price much.

**Example:**
```
85/100 = Excellent - Easy to trade
60/100 = Good - Suitable for day trading
40/100 = Acceptable - Tight stops needed
20/100 = Poor - Avoid
```

### News Catalyst
**What it is:** Significant events that triggered the move

**Why it matters:** Moves with catalysts are more predictable than random moves. You understand why the stock is moving.

**Examples:**
- Earnings announcement scheduled
- FDA approval expected
- Analyst upgrade/downgrade
- Acquisition rumor
- CEO transition

---

## API Endpoints

### GET /api/scanner/candidates
Fetch fresh candidates or return cached results (if < 5 min old)

**Response:**
```json
{
  "marketBias": "Bullish",
  "candidates": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc",
      "currentPrice": 215.47,
      "premarketMovePercent": 4.23,
      "relativeVolume": 3.2,
      "dailyVolume": 8500000,
      "bid": 215.45,
      "ask": 215.48,
      "spread": 0.03,
      "hasNews": true,
      "catalystSummary": "Earnings announcement scheduled",
      "sector": "Technology",
      "liquidityScore": 92,
      "scannerStatus": "Watch",
      "rejectionReason": null,
      "explanations": {
        "premarketMove": "...",
        "relativeVolume": "...",
        "spread": "...",
        "liquidity": "...",
        "catalyst": "..."
      }
    }
    // ... more candidates
  ],
  "timestamp": "2026-04-28T14:30:00Z",
  "isCached": false
}
```

### GET /api/scanner/cached
Get the last cached scanner results

---

## Data Sources

### Stock Price & Volume
- **Primary:** Finnhub API (configured in `.env` as `STOCK_API_PROVIDER=finnhub`)
- **Fallback:** Polygon.io, Alpha Vantage, or mock data
- **Bid-Ask Spread:** From Finnhub real-time quotes

### News Catalysts
- **Current:** Mock data (randomized for testing)
- **Production:** Would integrate with NewsAPI or similar

### Market Bias
- **Source:** Step 1 Market Condition Dashboard
- **Used for:** Filtering candidates (reject in Risk-Off markets)

---

## Caching Strategy

### Cache Duration
- **1 hour TTL** on MongoDB
- **5 minute check** in API (fresh cache or generate new)

### Why Cache?
- Reduces API calls and costs
- Improves page load speed
- Prevents rate limiting

### Cache Invalidation
- Manual: Click "🔄 Refresh Scan" button
- Automatic: Expires after 1 hour
- On deploy: Clears all expired documents

---

## UI Features

### Filter By Status
- **All:** Show all candidates
- **Watch:** Only actionable candidates
- **Caution:** Only candidates needing care
- **Reject:** Show why stocks were rejected

### Statistics Panel
Shows counts:
- Total scanned
- Watch count
- Caution count
- Reject count

### Candidate Cards
Each card displays:
- Ticker & company name
- Current price & premarket move
- Relative volume with visual bar
- Liquidity score with visual bar
- Bid-ask spread
- News catalyst summary
- Plain-English explanations
- "Analyse This Stock" button (enabled for Watch/Caution only)
- Rejection reason (for Reject status)

---

## Configuration

### Environment Variables (.env)

```env
# Stock API Provider (default: finnhub)
STOCK_API_PROVIDER=finnhub|polygon|alphavantage|mock
STOCK_API_KEY=your_api_key

# Market Bias (can be overridden by Step 1)
MARKET_BIAS=Bullish|Bearish|Mixed|Risk-Off

# MongoDB Connection
TRADING_MONGODB_URI=mongodb+srv://...
```

### Customizable Watchlist
Edit `DEFAULT_WATCHLIST` in `/services/scannerService.js`:

```javascript
const DEFAULT_WATCHLIST = [
  'AAPL', 'MSFT', 'GOOGL', // ... your stocks
];
```

---

## Backend Structure

### /services/scannerService.js
Core business logic:
- `scanTradeCandidates(marketBias)` - Main scan function
- `calculateRelativeVolume(dailyVolume, avgVolume)` - Volume metric
- `calculateSpread(bid, ask)` - Spread calculation
- `calculateLiquidityScore(volume, spread, price)` - Liquidity rating
- `classifyScannerStatus(candidate, marketBias)` - Watch/Caution/Reject logic
- `generateExplanations(candidate, volume, spread)` - Plain-English text

### /routes/scanner.js
API endpoints:
- `GET /api/scanner/candidates` - Fetch candidates
- `GET /api/scanner/cached` - Get cached results

### /models/ScannerSnapshot.js
MongoDB schema for caching scanner results with 1-hour TTL

---

## Frontend Structure

### /public/scanner.html
Single-page app with:
- Market bias summary
- Filter buttons
- Statistics overview
- Candidate grid
- Responsive design

### JavaScript Functions
- `fetchCandidates()` - API call
- `renderBiasInfo()` - Display market bias
- `renderStats()` - Show count statistics
- `renderCandidateCard()` - Render individual card
- `setFilter()` - Filter by status
- `refreshScan()` - Manual rescan
- `analyzeStock()` - Placeholder for Step 3

---

## Known Limitations

1. **News data is mocked** - Real production would need NewsAPI integration
2. **Watchlist is fixed** - Production would allow user-defined watchlists
3. **Bid-ask data limited** - Finnhub free tier has limited updates
4. **No historical data** - Scanner works only on current data

---

## Next Steps

### Step 3: Stock Detail Analysis
Once a candidate is selected (Watch or Caution), user proceeds to detailed analysis:
- Technical analysis (moving averages, support/resistance)
- Volume profile
- Options flow
- Entry/exit levels
- Risk/reward ratio

---

## Troubleshooting

### "No candidates found"
- Market hours may not be active
- Watchlist stocks may not have sufficient premarket volume
- Check API key in `.env`

### "Spread unavailable"
- API may not provide bid-ask data (free tier limitation)
- Card will show "Spread unavailable" but won't auto-reject

### "All stocks rejected"
- Market may be in Risk-Off mode (check Step 1)
- Premarket volume may be low
- Try refreshing after market open

---

## Testing

### Mock Data Mode
To use mock data instead of real APIs:
```env
STOCK_API_PROVIDER=mock
```

### Sample Response
All responses include mock candidates with realistic data for testing UI and logic.

---

## Performance Notes

- **Scan time:** ~2-3 seconds (parallel API calls)
- **Cache size:** ~50KB per snapshot
- **Memory usage:** Minimal (candidates in memory only during response)

---

## Security Notes

- API keys stored in `.env` (never committed to git)
- No user authentication (runs on private network)
- MongoDB connection requires credentials
- CORS enabled for local development

---

For questions or issues, refer to the main README.md in the project root.
