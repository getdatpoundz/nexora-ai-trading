# Enkel navigering + riktig marknadsdata

## 1. Interaktiv guide (tour + checklista)

**Product tour (första inloggningen)**
- Bibliotek: `driver.js` (lättviktigt, temabart, ingen React-låsning).
- Steg: Sidebar → Dashboard-graf → Portföljfördelning → Strategier → Marknader → Sätt in.
- Startas automatiskt om `profiles.tour_completed = false`, kan startas om från "Hjälp" i toppbaren.

**Kontextuell checklista på dashboarden**
- Kort överst: "Kom igång med Nexora" med progress bar.
- Steg: 1) Slutför profil, 2) Gör riskbedömning, 3) Verifiera identitet (KYC-demo), 4) Välj strategi, 5) Välj investeringsnivå, 6) Genomför första insättning.
- Varje steg = klickbar länk, bock när klart. Göms när alla klara (kan visas igen från Hjälp-menyn).

**Tooltips**
- `Tooltip` (redan i shadcn) + små `(?)`-ikoner bredvid nyckeltal (Total balans, P/L, Risknivå, Avgift, Volatilitet).

## 2. Riktig marknadsdata – alla tillgångsslag

Målet: kunden depositerar krypto → balans i SEK → kan "trada" alla tillgångar (krypto, aktier, index, råvaror, valuta) mot riktiga marknadspriser.

**Data-leverantör: Twelve Data**
- Gratis tier: 800 requests/dag, 8/min. Täcker aktier (US + EU + Stockholm), ETF:er, index, forex, råvaror (guld/silver/olja), krypto.
- Kräver API-nyckel (gratis) → sparas som `TWELVE_DATA_API_KEY` via `add_secret`.
- Server-side fetch via `createServerFn` (cachas 60s in-memory) för att skydda nyckeln och undvika CORS.

**Endpoints som byggs som server functions**
- `getQuote(symbol)` – senaste pris + 24h-förändring.
- `getTimeSeries(symbol, interval, outputsize)` – historik för grafer (1D/1V/1M/1Å/Alla).
- `searchSymbols(query)` – autocomplete i "Marknader"-sidan.
- Konvertering till SEK via `USD/SEK` + `EUR/SEK` par (cachas 5min).

**Ersätter simulerad data i:**
- `src/lib/demo-data.ts` DEMO_MARKETS → dynamisk katalog (topp krypto + populära aktier: AAPL, TSLA, NVDA, VOLVO-B.ST, ERIC-B.ST, guld XAU/USD, S&P 500).
- Dashboard-graf → riktig BTC-historik + användarens simulerade portfölj värderad mot riktiga priser.
- Marknader-sidan → live-tabell med riktiga priser, sparklines från riktig historik.
- Portfölj-sidan → innehav (i DB) värderas mot live-priser var 60s.

## 3. Portfölj-modell (så det hänger ihop)

- Ny tabell `portfolio_holdings` (user_id, symbol, asset_type, quantity, avg_cost_sek).
- Ny tabell `trades` (user_id, symbol, side, quantity, price_sek, fee_sek, executed_at) för transaktionshistorik.
- När on-ramp "funded" → balans i SEK (`profiles.cash_balance_sek`).
- Ny "Handla"-modal på Marknader-sidan: köp/sälj mot cash-balans, uppdaterar holdings + trades. Fortfarande demo (ingen riktig order routing), men mot riktiga priser.

## 4. Filer som skapas/ändras

**Nya**
- `src/lib/market-data.functions.ts` – server functions för Twelve Data.
- `src/lib/market-data.server.ts` – fetch-helpers, cache.
- `src/components/onboarding/ProductTour.tsx` – driver.js wrapper.
- `src/components/onboarding/OnboardingChecklist.tsx` – checklista på dashboard.
- `src/components/markets/TradeDialog.tsx` – köp/sälj-modal.
- `src/hooks/useLivePrice.ts` – React Query hook mot `getQuote`.

**Ändras**
- `src/routes/_authenticated/dashboard.tsx` – checklista + riktig graf + tour-triggers.
- `src/routes/_authenticated/markets.tsx` – riktig data, sök, handla.
- `src/routes/_authenticated/portfolio.tsx` – live-värdering.
- `src/routes/_authenticated/route.tsx` – tour bootstrap.
- `src/components/app/AppShell.tsx` – "Hjälp"-knapp i toppbaren.
- Migration: `portfolio_holdings`, `trades`, `profiles.tour_completed`, `profiles.cash_balance_sek`.

## 5. Ordning

1. DB-migration (holdings, trades, profil-fält).
2. Twelve Data API-nyckel (fråga user via `add_secret`).
3. Server functions + hooks.
4. Byt ut demodata i Markets/Dashboard/Portfolio.
5. Driver.js tour + checklista + tooltips.
6. TradeDialog.

## Teknisk not

- Twelve Data täcker inte alla nordiska aktier perfekt; för svenska namn använder vi Yahoo-suffix (`.ST`). Om ett symbol saknas – visa "Data ej tillgänglig" istället för att krascha.
- Free tier räcker gott för demo. Om rate-limit slår i → server-cache + fallback till senaste kända pris.
- Cash-balans i SEK hålls som `numeric(18,2)` i DB.