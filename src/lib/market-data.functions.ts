import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Symbol universe. `symbol` is the id used across the app.
// `td` is the Twelve Data symbol; `currency` is the price currency Twelve Data returns.
export type AssetType = "crypto" | "stock" | "index" | "commodity" | "forex";
export type MarketAsset = {
  symbol: string;
  td: string;
  name: string;
  type: AssetType;
  currency: "USD" | "EUR" | "SEK";
};

export const MARKET_UNIVERSE: MarketAsset[] = [
  // Crypto
  { symbol: "BTC", td: "BTC/USD", name: "Bitcoin", type: "crypto", currency: "USD" },
  { symbol: "ETH", td: "ETH/USD", name: "Ethereum", type: "crypto", currency: "USD" },
  { symbol: "SOL", td: "SOL/USD", name: "Solana", type: "crypto", currency: "USD" },
  { symbol: "XRP", td: "XRP/USD", name: "XRP", type: "crypto", currency: "USD" },
  { symbol: "ADA", td: "ADA/USD", name: "Cardano", type: "crypto", currency: "USD" },
  { symbol: "DOGE", td: "DOGE/USD", name: "Dogecoin", type: "crypto", currency: "USD" },
  // US Stocks
  { symbol: "AAPL", td: "AAPL", name: "Apple", type: "stock", currency: "USD" },
  { symbol: "TSLA", td: "TSLA", name: "Tesla", type: "stock", currency: "USD" },
  { symbol: "NVDA", td: "NVDA", name: "NVIDIA", type: "stock", currency: "USD" },
  { symbol: "MSFT", td: "MSFT", name: "Microsoft", type: "stock", currency: "USD" },
  { symbol: "GOOGL", td: "GOOGL", name: "Alphabet", type: "stock", currency: "USD" },
  { symbol: "AMZN", td: "AMZN", name: "Amazon", type: "stock", currency: "USD" },
  // Nordic
  { symbol: "VOLV-B", td: "VOLV-B.ST", name: "Volvo B", type: "stock", currency: "SEK" },
  { symbol: "ERIC-B", td: "ERIC-B.ST", name: "Ericsson B", type: "stock", currency: "SEK" },
  { symbol: "HM-B", td: "HM-B.ST", name: "H&M B", type: "stock", currency: "SEK" },
  { symbol: "SEB-A", td: "SEB-A.ST", name: "SEB A", type: "stock", currency: "SEK" },
  // Index / ETF
  { symbol: "SPX", td: "SPY", name: "S&P 500 (SPY)", type: "index", currency: "USD" },
  { symbol: "QQQ", td: "QQQ", name: "Nasdaq 100 (QQQ)", type: "index", currency: "USD" },
  // Commodities
  { symbol: "XAU", td: "XAU/USD", name: "Guld", type: "commodity", currency: "USD" },
  { symbol: "XAG", td: "XAG/USD", name: "Silver", type: "commodity", currency: "USD" },
  { symbol: "OIL", td: "WTI/USD", name: "Olja (WTI)", type: "commodity", currency: "USD" },
  // Forex
  { symbol: "EURSEK", td: "EUR/SEK", name: "EUR/SEK", type: "forex", currency: "SEK" },
  { symbol: "USDSEK", td: "USD/SEK", name: "USD/SEK", type: "forex", currency: "SEK" },
];

function findAsset(symbol: string): MarketAsset {
  const a = MARKET_UNIVERSE.find((x) => x.symbol === symbol);
  if (!a) throw new Error(`Okänd symbol: ${symbol}`);
  return a;
}

export type Quote = {
  symbol: string;
  name: string;
  type: AssetType;
  priceSek: number;
  priceNative: number;
  currency: "USD" | "EUR" | "SEK";
  changePct24h: number;
};

export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((i: { symbol: string }) => z.object({ symbol: z.string() }).parse(i))
  .handler(async ({ data }): Promise<Quote> => {
    const asset = findAsset(data.symbol);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    const q = await tdFetch<{
      close: string;
      percent_change: string;
    }>("/quote", { symbol: asset.td }, 60_000);
    const priceNative = Number(q.close);
    const fx = await getFxToSek(asset.currency);
    return {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      priceNative,
      currency: asset.currency,
      priceSek: priceNative * fx,
      changePct24h: Number(q.percent_change),
    };
  });

export const getQuotes = createServerFn({ method: "GET" })
  .inputValidator((i: { symbols: string[] }) =>
    z.object({ symbols: z.array(z.string()).min(1).max(30) }).parse(i),
  )
  .handler(async ({ data }): Promise<Quote[]> => {
    const assets = data.symbols.map(findAsset);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    // Twelve Data supports batch via comma-separated symbols
    const symbols = assets.map((a) => a.td).join(",");
    const raw = await tdFetch<Record<string, { close: string; percent_change: string; symbol?: string }>>(
      "/quote",
      { symbol: symbols },
      60_000,
    );
    // When only one symbol is requested, Twelve Data returns a flat object.
    const map: Record<string, { close: string; percent_change: string }> =
      assets.length === 1 ? { [assets[0].td]: raw as unknown as { close: string; percent_change: string } } : (raw as Record<string, { close: string; percent_change: string }>);

    // Preload FX for currencies we need
    const fxCache: Record<string, number> = { SEK: 1 };
    for (const cur of new Set(assets.map((a) => a.currency))) {
      if (!(cur in fxCache)) fxCache[cur] = await getFxToSek(cur);
    }

    return assets.map((a) => {
      const q = map[a.td];
      const priceNative = q ? Number(q.close) : 0;
      const changePct = q ? Number(q.percent_change) : 0;
      return {
        symbol: a.symbol,
        name: a.name,
        type: a.type,
        priceNative,
        currency: a.currency,
        priceSek: priceNative * (fxCache[a.currency] ?? 1),
        changePct24h: changePct,
      };
    });
  });

export type SeriesPoint = { date: string; value: number };
export const getTimeSeries = createServerFn({ method: "GET" })
  .inputValidator((i: { symbol: string; interval?: string; outputsize?: number }) =>
    z
      .object({
        symbol: z.string(),
        interval: z.string().optional(),
        outputsize: z.number().int().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<SeriesPoint[]> => {
    const asset = findAsset(data.symbol);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    const interval = data.interval ?? "1day";
    const outputsize = String(data.outputsize ?? 90);
    const res = await tdFetch<{ values?: Array<{ datetime: string; close: string }> }>(
      "/time_series",
      { symbol: asset.td, interval, outputsize },
      5 * 60_000,
    );
    const fx = await getFxToSek(asset.currency);
    const values = res.values ?? [];
    return values
      .slice()
      .reverse()
      .map((v) => ({ date: v.datetime, value: Number(v.close) * fx }));
  });
