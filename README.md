# Trading Helper - Market Condition Dashboard

Day trading decision support tool. Provides real-time market environment assessment without buy/sell recommendations.

## What It Shows

- **SPY / S&P 500** — Overall US market trend
- **QQQ / Nasdaq** — Tech and growth stock momentum
- **VIX** — Market fear index (volatility)
- **10-Year Treasury Yield** — Interest rate environment
- **USD Index / DXY** — US dollar strength

Each indicator shows:
- Current value
- Change vs previous close
- Direction (Up/Down/Flat)
- Status (Bullish/Bearish/Neutral/Caution)
- Plain-English explanation

## Overall Market Bias

Combines all indicators into one assessment:
- **Bullish** — Good risk conditions, support for long trades
- **Bearish / Risk-Off** — Elevated risk, consider reducing size
- **Mixed** — Conflicting signals, wait for clarity

## Backend Setup

Backend services are in `masterapp/`:
- **Model**: `models/MarketSnapshot.js` — MongoDB cache
- **Service**: `services/marketConditionService.js` — Data fetching & scoring
- **Route**: `routes/marketCondition.js` — API endpoint

## API Endpoint

```
GET /api/market-condition
```

Returns:
```json
{
  "spy": { "value": 542.8, "changePercent": 0.5, "direction": "Up", "status": "Bullish", ... },
  "qqq": { ... },
  "vix": { ... },
  "tenYearYield": { ... },
  "dxy": { ... },
  "overallMarketBias": "Bullish",
  "summary": "Strong bullish setup...",
  "sources": { "spy": "finnhub", "vix": "FRED", ... },
  "errors": null
}
```

## API Requirements

Set in `masterapp/.env`:

```env
# FRED API (free)
FRED_API_KEY=your_fred_key

# Stock market data (choose one provider)
STOCK_API_PROVIDER=finnhub|polygon|alphavantage|mock
STOCK_API_KEY=your_api_key

# Fallback: If no API keys, uses mock data
```

### Data Sources

| Indicator | API | Series |
|-----------|-----|--------|
| VIX | FRED | VIXCLS |
| 10-Year Yield | FRED | DGS10 |
| USD Index | FRED | DTWEXBGS (or UUP proxy) |
| SPY | Finnhub/Polygon/AlphaVantage | SPY |
| QQQ | Finnhub/Polygon/AlphaVantage | QQQ |

### Free API Keys

1. **FRED** — https://fredaccount.stlouisfed.org/apikeys
2. **Finnhub** — https://finnhub.io/dashboard (1 free tier)
3. **Alpha Vantage** — https://www.alphavantage.co/api/

## Error Handling

If an API fails:
- Dashboard does not crash
- Shows "Data unavailable" for that indicator
- Falls back to last cached snapshot from MongoDB
- Displays which API failed

## Scoring Rules

### SPY / QQQ
- `> +0.3%` → Bullish (Up)
- `-0.3% to +0.3%` → Neutral (Flat)
- `< -0.3%` → Bearish (Down)

### VIX
- `< 15` → Calm / Bullish
- `15-20` → Normal / Neutral
- `20-30` → High / Caution
- `> 30` → Panic / Bearish

### 10-Year Yield
- Rising strongly → Bearish for growth
- Flat → Neutral
- Falling → Bullish for growth

### DXY / USD
- Rising strongly → Bearish / Caution
- Flat → Neutral
- Falling → Bullish for risk assets

## Frontend

Served from `/trading-dashboard/` in masterapp.

- Live refresh every 5 minutes
- Manual refresh button
- Color-coded status badges
- Mobile responsive
- Accessible design

## Development Notes

- No buy/sell recommendations (Step 1 only)
- Focus: Market environment assessment
- Next: Add signal generation (Step 2)
- Future: Add trade execution support (Step 3)
