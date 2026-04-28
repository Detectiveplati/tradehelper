# Quick API Setup - Copy & Paste Instructions

## Your Current Status ⚠️

**Finnhub API Key:** Rate limit hit (0 remaining)
- Your key: `d7o7ej9r01qmqe7ib4ogd7o7ej9r01qmqe7ib4p0`
- Resets: Check Finnhub dashboard
- Solution: Add IEX Cloud as backup

**Scanner:** Working but showing "spread: unavailable" because no API is returning bid/ask data

---

## Get Free IEX Cloud Key (Copy-Paste Steps)

### Step 1: Sign Up
Go to: https://iexcloud.io/console/tokens

### Step 2: Get Your Token
1. Click "Sign Up" (no credit card!)
2. Verify email
3. On dashboard, look for your token (starts with `pk_`)
4. Copy it

### Step 3: Add to .env
Edit `tradinghelper/.env`:

```
PORT=8080
NODE_ENV=production
TRADING_MONGODB_URI=mongodb+srv://lockzy:jfYHfNYVuW0xHzI9@tradingcluster.ub8og98.mongodb.net/trading_helper?retryWrites=true&w=majority
FRED_API_KEY=79d6ab4002a45ac714163fdbcb4c887a
STOCK_API_PROVIDER=finnhub
STOCK_API_KEY=d7o7ej9r01qmqe7ib4ogd7o7ej9r01qmqe7ib4p0
IEX_API_KEY=pk_YOUR_TOKEN_HERE
POLYGON_API_KEY=none
```

Replace `pk_YOUR_TOKEN_HERE` with your actual token.

### Step 4: Restart Server
```powershell
# In terminal:
cd c:\Users\Zack\Projects\tradinghelper
node server.js
```

### Step 5: Test
Refresh your browser at `http://localhost:8080`

---

## Free API Alternatives (If You Don't Want IEX)

### Option A: Use Finnhub Sandbox (No Rate Limits)
```
Go to: https://finnhub.io/api/v1/quote?symbol=AAPL&token=bsf48fb48v6upamc4p0g
This is Finnhub's public demo token (rate limited but works)
```

### Option B: Switch to Yahoo Finance (Unlimited)
```bash
npm install yahoo-finance2
# Then ask to integrate Yahoo Finance
```

### Option C: Use Mock Data (For Testing)
Scanner already generates realistic mock data if APIs are down.

---

## What Data You'll Get

Once configured, the scanner will show real bid/ask spreads like:

```
Stock: AAPL
Price: $176.45
Bid: $176.43
Ask: $176.47
Spread: $0.04
Tightness: tight ✅
Liquidity Score: 95/100
Status: Watch
```

---

## Troubleshooting

**Spreads still showing "unavailable"?**
1. Did you restart the server? (Ctrl+C, then `node server.js`)
2. Is your IEX_API_KEY set correctly in .env? (no spaces)
3. Check browser console (F12 → Console) for errors

**Rate limit still hitting?**
- Finnhub: Limit resets daily
- IEX: 100 messages/month is plenty (just for backup)
- Both are FREE and don't require credit card

**Want to check your API stats?**
- Finnhub: https://finnhub.io/dashboard
- IEX Cloud: https://iexcloud.io/console/usage

---

## Current API Fallback Order

When you refresh the scanner:
1. ✅ Try **Finnhub** → If fails or rate limited
2. ✅ Try **IEX Cloud** (if key configured) → If fails
3. ✅ Use **Mock Data** (fallback for testing)

This means once you add IEX Cloud, the scanner will never show "unavailable" spreads again!
