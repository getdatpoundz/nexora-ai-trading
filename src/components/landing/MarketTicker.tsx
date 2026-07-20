import { useQuotes } from "@/hooks/useMarketData";
import {
  fallbackChangePct,
  fallbackFxToSek,
  fallbackNativePrice,
  findMarketAsset,
} from "@/lib/market-data.shared";

const TICKER_SYMBOLS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE",
  "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN",
  "VOLV-B", "ERIC-B", "HM-B", "SEB-A",
  "SPX", "QQQ", "XAU", "XAG", "OIL",
  "EURSEK", "USDSEK",
];

function fmtPrice(p: number) {
  const decimals = p < 10 ? 4 : p < 1000 ? 2 : 0;
  return p.toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const FALLBACK_QUOTES = TICKER_SYMBOLS.map((symbol) => {
  const asset = findMarketAsset(symbol);
  const native = fallbackNativePrice(symbol);
  const fx = fallbackFxToSek(asset.currency);
  return {
    symbol,
    name: asset.name,
    priceNative: native,
    priceSek: native * fx,
    currency: asset.currency,
    changePct24h: fallbackChangePct(symbol),
  };
});

export function MarketTicker() {
  const { data } = useQuotes(TICKER_SYMBOLS);
  const quotes = data && data.length > 0 ? data : FALLBACK_QUOTES;
  const items = [...quotes, ...quotes]; // duplicate for seamless loop


  return (
    <div className="group relative overflow-hidden border-y border-border bg-card">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-card to-transparent" />
      <div
        className="flex whitespace-nowrap py-3 animate-ticker group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${quotes.length * 4}s` }}
      >
        {items.map((q, i) => {
          const up = q.changePct24h >= 0;
          return (
            <div key={`${q.symbol}-${i}`} className="flex items-center gap-2 px-5 text-sm">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {q.symbol}
              </span>
              <span className="tabular-nums font-medium">{fmtPrice(q.priceSek)}</span>
              <span className={`tabular-nums text-xs font-semibold ${up ? "text-success" : "text-destructive"}`}>
                {up ? "+" : ""}
                {q.changePct24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
