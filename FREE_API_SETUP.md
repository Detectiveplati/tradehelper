# Free Stock Market Data API Setup

Your Trading Helper scanner now supports multiple FREE APIs with real bid/ask data for spreads.

## Quick Setup (5 minutes)

### 1. **Finnhub** (Already Configured ✅)
- **What you have:** `STOCK_API_KEY=d7o7ej9r01qmqe7ib4ogd7o7ej9r01qmqe7ib4p0`
- **Rate limit:** 60 requests/minute
- **Includes:** Bid, ask, bidSize, askSize
- **Status:** Active and working

### 2. **IEX Cloud** (Recommended - Add This 🚀)
- **Why:** Better bid/ask data than Finnhub, reliable, works great for retail traders
- **Setup:**
  ```
  1. Go to https://iexcloud.io/console/tokens
  2. Create FREE account (no credit card required)
  3. Copy your "Publishable" token (starts with pk_)
  4. Add to .env:
     IEX_API_KEY=pk_YOUR_TOKEN_HERE
  ```
- **Rate limit:** 100 messages/month free (plenty for scanning)
- **Includes:** bid, ask, bidPrice, askPrice, iexBidPrice, iexAskPrice

### 3. **Polygon.io** (Optional - Already in Code)
- **What you have:** `POLYGON_API_KEY=none` (placeholder)
- **If you want to use it:**
  ```
  1. Sign up at https://polygon.io
  2. Get your free API key
  3. Add to .env: POLYGON_API_KEY=YOUR_KEY
  ```
- **Rate limit:** 5 requests/minute (very limited)
- **Includes:** bp (bid price), ap (ask price), bs, as

---

## How It Works

**Priority order for fetching stock data:**
1. Try **Finnhub** (your main API)
2. If Finnhub fails → Try **IEX Cloud** (if key configured)
3. If IEX Cloud fails → Use **Mock data** (for testing)

This means if you add an IEX Cloud key, the scanner will automatically use it as a backup when Finnhub hits rate limits or fails.

---

## Step-by-Step: Get Free IEX Cloud API Key

### Option A: Fastest Way (IEX Cloud Website)
```
1. Go to https://iexcloud.io/console/tokens
2. Click "Sign Up" (top right)
3. Enter email + password (no credit card needed!)
4. Verify email
5. On dashboard, copy token under "Publishable"
6. Paste into .env file as IEX_API_KEY=pk_...
```

### Option B: Use Existing Finnhub Key
Your Finnhub key should already provide bid/ask data. If spreads show as "unavailable", it might be:
- Rate limit hit
- Finnhub API not returning bid/ask for all stocks
- Premarket data not available

Try clearing spreads by refreshing the page or restarting the scanner.

---

## Test Your APIs

Once you've added keys, test them:

```bash
# Test Finnhub
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY" | jq '.bid, .ask'

# Test IEX Cloud
curl "https://cloud.iexapis.com/stable/stock/AAPL/quote?token=pk_YOUR_TOKEN" | jq '.bid, .ask'
```

---

## Free APIs You Can Also Try

| API | Free Data | Bid/Ask | Rate Limit |
|-----|-----------|---------|-----------|
| **Finnhub** | Yes ✅ | Yes | 60/min |
| **IEX Cloud** | Yes ✅ | Yes | 100/month |
| **Polygon** | Yes (limited) | Yes | 5/min |
| **AlphaVantage** | Yes ✅ | No ❌ | 5/min, 500/day |
| **Yahoo Finance** | Yes ✅ | Yes | No limit |

---

## Troubleshooting

**"Spread unavailable" on dashboard?**
- Restart server: `node server.js`
- Check your API key in `.env`
- Look at browser console for errors (F12 → Console tab)
- Try different stocks (some might have no bid/ask data)

**Want to use Yahoo Finance instead?**
```bash
npm install yahoo-finance2
```
Then ask me to add Yahoo Finance integration!

**Rate limit errors?**
- Finnhub: Wait a minute or reduce scan frequency
- IEX: You get 100 messages/month, so ~3 per day
- Add backup API key to handle limits

---

## What Next?

1. **Sign up for IEX Cloud** (takes 2 minutes)
2. **Add your key to `.env`**
3. **Restart the server**
4. **Watch spreads populate** with real bid/ask data!

The scanner will automatically fall back to IEX Cloud if Finnhub fails, giving you reliable spread data for trading.
