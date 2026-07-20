import { useQuotes } from "@/hooks/useMarketData";

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

export function MarketTicker() {
  const { data, isLoading, error } = useQuotes(TICKER_SYMBOLS);

  if (isLoading || error || !data || data.length === 0) {
    return (
      <div className="border-y border-border bg-card">
        <div className="mx-auto flex h-11 max-w-7xl items-center px-6 text-xs text-muted-foreground">
          {error ? "Kunde inte ladda livekurser" : "Laddar livekurser…"}
        </div>
      </div>
    );
  }

  const items = [...data, ...data]; // duplicate for seamless loop

  return (
    <div className="group relative overflow-hidden border-y border-border bg-card">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-card to-transparent" />
      <div
        className="flex whitespace-nowrap py-3 animate-ticker group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${data.length * 4}s` }}
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
