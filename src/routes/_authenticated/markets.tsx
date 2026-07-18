import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { DEMO_MARKETS, generatePortfolioHistory } from "@/lib/demo-data";
import { sek, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/markets")({
  component: MarketsPage,
});

function MarketsPage() {
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const spark = useMemo(() => generatePortfolioHistory(30), []);
  const filtered = DEMO_MARKETS.filter((m) => (m.name + m.symbol).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Marknader">
      <div className="space-y-6">
        <DemoBanner compact />
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök tillgång ..." value={q} onChange={(e) => setQ(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium"></th>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-right font-medium">Pris (SEK)</th>
                  <th className="px-4 py-3 text-right font-medium">24t</th>
                  <th className="px-4 py-3 font-medium">Trend</th>
                  <th className="px-4 py-3 text-right font-medium">Volatilitet</th>
                  <th className="px-4 py-3 text-right font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.symbol} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button onClick={() => setFavs((s) => { const n = new Set(s); n.has(m.symbol) ? n.delete(m.symbol) : n.add(m.symbol); return n; })}>
                        <Star className={`h-4 w-4 ${favs.has(m.symbol) ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.symbol} · simulerat</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{sek(m.price, { decimals: m.price < 100 ? 2 : 0 })}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${m.change24h >= 0 ? "text-success" : "text-destructive"}`}>{pct(m.change24h)}</td>
                    <td className="px-4 py-3">
                      <div className="h-8 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spark.slice(-30).map((p, i) => ({ i, v: p.value + (m.symbol.charCodeAt(0) * 20) }))}>
                            <Area dataKey="v" stroke={m.change24h >= 0 ? "oklch(0.7 0.16 155)" : "oklch(0.65 0.22 25)"} fill={m.change24h >= 0 ? "oklch(0.7 0.16 155 / 0.2)" : "oklch(0.65 0.22 25 / 0.2)"} strokeWidth={1.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{m.volatility}</td>
                    <td className="px-4 py-3 text-right"><span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{m.risk}/7</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
