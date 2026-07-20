export type AssetType = "crypto" | "stock" | "index" | "commodity" | "forex";

export type MarketAsset = {
  symbol: string;
  td: string;
  name: string;
  type: AssetType;
  currency: "USD" | "EUR" | "SEK";
};

// Client-safe market universe. `symbol` is the app id, `td` is the Twelve Data symbol.
export const MARKET_UNIVERSE: MarketAsset[] = [
  { symbol: "BTC", td: "BTC/USD", name: "Bitcoin", type: "crypto", currency: "USD" },
  { symbol: "ETH", td: "ETH/USD", name: "Ethereum", type: "crypto", currency: "USD" },
  { symbol: "SOL", td: "SOL/USD", name: "Solana", type: "crypto", currency: "USD" },
  { symbol: "XRP", td: "XRP/USD", name: "XRP", type: "crypto", currency: "USD" },
  { symbol: "ADA", td: "ADA/USD", name: "Cardano", type: "crypto", currency: "USD" },
  { symbol: "DOGE", td: "DOGE/USD", name: "Dogecoin", type: "crypto", currency: "USD" },
  { symbol: "AAPL", td: "AAPL", name: "Apple", type: "stock", currency: "USD" },
  { symbol: "TSLA", td: "TSLA", name: "Tesla", type: "stock", currency: "USD" },
  { symbol: "NVDA", td: "NVDA", name: "NVIDIA", type: "stock", currency: "USD" },
  { symbol: "MSFT", td: "MSFT", name: "Microsoft", type: "stock", currency: "USD" },
  { symbol: "GOOGL", td: "GOOGL", name: "Alphabet", type: "stock", currency: "USD" },
  { symbol: "AMZN", td: "AMZN", name: "Amazon", type: "stock", currency: "USD" },
  { symbol: "VOLV-B", td: "VOLV-B.ST", name: "Volvo B", type: "stock", currency: "SEK" },
  { symbol: "ERIC-B", td: "ERIC-B.ST", name: "Ericsson B", type: "stock", currency: "SEK" },
  { symbol: "HM-B", td: "HM-B.ST", name: "H&M B", type: "stock", currency: "SEK" },
  { symbol: "SEB-A", td: "SEB-A.ST", name: "SEB A", type: "stock", currency: "SEK" },
  { symbol: "SPX", td: "SPY", name: "S&P 500 (SPY)", type: "index", currency: "USD" },
  { symbol: "QQQ", td: "QQQ", name: "Nasdaq 100 (QQQ)", type: "index", currency: "USD" },
  { symbol: "XAU", td: "XAU/USD", name: "Guld", type: "commodity", currency: "USD" },
  { symbol: "XAG", td: "XAG/USD", name: "Silver", type: "commodity", currency: "USD" },
  { symbol: "OIL", td: "WTI/USD", name: "Olja (WTI)", type: "commodity", currency: "USD" },
  { symbol: "EURSEK", td: "EUR/SEK", name: "EUR/SEK", type: "forex", currency: "SEK" },
  { symbol: "USDSEK", td: "USD/SEK", name: "USD/SEK", type: "forex", currency: "SEK" },
];

const FALLBACK_NATIVE_PRICES: Record<string, number> = {
  BTC: 118000,
  ETH: 3600,
  SOL: 178,
  XRP: 2.9,
  ADA: 0.75,
  DOGE: 0.22,
  AAPL: 226,
  TSLA: 330,
  NVDA: 158,
  MSFT: 505,
  GOOGL: 186,
  AMZN: 224,
  "VOLV-B": 275,
  "ERIC-B": 91,
  "HM-B": 173,
  "SEB-A": 168,
  SPX: 625,
  QQQ: 555,
  XAU: 2400,
  XAG: 31,
  OIL: 82,
  EURSEK: 11.45,
  USDSEK: 10.55,
};

export function findMarketAsset(symbol: string): MarketAsset {
  const asset = MARKET_UNIVERSE.find((item) => item.symbol === symbol);
  if (!asset) throw new Error(`Okänd symbol: ${symbol}`);
  return asset;
}

export function fallbackFxToSek(from: "USD" | "EUR" | "SEK") {
  if (from === "USD") return 10.55;
  if (from === "EUR") return 11.45;
  return 1;
}

export function fallbackNativePrice(symbol: string) {
  return FALLBACK_NATIVE_PRICES[symbol] ?? 100;
}

export function fallbackChangePct(symbol: string) {
  const hash = Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((hash % 700) - 320) / 100;
}

export function buildFallbackSeries(symbol: string, outputsize: number) {
  const base = fallbackNativePrice(symbol);
  const hash = Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const now = Date.now();

  return Array.from({ length: outputsize }, (_, index) => {
    const age = outputsize - index - 1;
    const wave = Math.sin((index + hash) / 5) * 0.028;
    const drift = (index / Math.max(outputsize - 1, 1) - 0.5) * 0.08;
    const value = base * (1 + wave + drift);
    return {
      date: new Date(now - age * 86_400_000).toISOString().slice(0, 10),
      value,
    };
  });
}