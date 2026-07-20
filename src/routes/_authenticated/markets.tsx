import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { sek, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MARKET_UNIVERSE, type MarketAsset } from "@/lib/market-data.shared";
import { useQuotes } from "@/hooks/useMarketData";
import { TradeDialog } from "@/components/markets/TradeDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { InfoTip } from "@/components/InfoTip";

export const Route = createFileRoute("/_authenticated/markets")({
  component: MarketsPage,
});

const TYPES = [
  { key: "all", label: "Alla" },
  { key: "crypto", label: "Krypto" },
  { key: "stock", label: "Aktier" },
  { key: "index", label: "Index/ETF" },
  { key: "commodity", label: "Råvaror" },
  { key: "forex", label: "Valuta" },
] as const;

function MarketsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("all");
  const [tradeAsset, setTradeAsset] = useState<MarketAsset | null>(null);

  const filtered = useMemo(
    () =>
      MARKET_UNIVERSE.filter(
        (m) =>
          (type === "all" || m.type === type) &&
          (m.name + m.symbol).toLowerCase().includes(q.toLowerCase()),
      ),
    [q, type],
  );

  const { data: quotes, isLoading } = useQuotes(filtered.map((f) => f.symbol));
  const cash = profile?.cash_balance_sek ?? 0;

  return (
    <AppShell title="Marknader">
      <div className="space-y-6">
        <DemoBanner compact />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              Tillgängligt saldo <InfoTip>Ditt SEK-saldo för handel. Sätt in kapital under Sätt in.</InfoTip>
            </h3>
            <p className="text-2xl font-bold tabular-nums">{sek(cash)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Livepriser via Twelve Data · uppdateras var 3:e minut
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="flex flex-1 min-w-[200px] items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök tillgång …"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    type === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-left font-medium">Typ</th>
                  <th className="px-4 py-3 text-right font-medium">Pris (SEK)</th>
                  <th className="px-4 py-3 text-right font-medium">24t</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Laddar livedata …
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.map((m) => {
                  const quote = quotes?.find((qq) => qq.symbol === m.symbol);
                  return (
                    <tr key={m.symbol} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.symbol}</div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{m.type}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {quote ? sek(quote.priceSek, { decimals: quote.priceSek < 100 ? 2 : 0 }) : "–"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${quote && quote.changePct24h >= 0 ? "text-success" : "text-destructive"}`}>
                        {quote ? pct(quote.changePct24h) : "–"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => setTradeAsset(m)} disabled={!quote}>
                          Handla
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TradeDialog asset={tradeAsset} cashBalance={cash} onClose={() => setTradeAsset(null)} />
    </AppShell>
  );
}
