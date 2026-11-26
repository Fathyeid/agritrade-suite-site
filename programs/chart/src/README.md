# Global Chart Terminal (stage 1)
Static site in public/ plus serverless functions api/chart.js, api/quotes.js, api/search.js (Yahoo Finance proxy, ESM). No env vars, no build step.
Data: Yahoo Finance, delayed, unofficial. Not real-time.
Not available (needs paid license/backend): real-time/tick, bid/ask, open interest, footprint, order flow, TPO, Point&Figure, CME/ICE/LSEG/dxFeed/Barchart/Polygon/Twelve Data, email/push alerts, login/cloud sync, economic calendar feed, LLM analyst, Pine Script (own GCT-script instead).
Indicators: 48. Settings/drawings/layouts/alerts stored in localStorage.
