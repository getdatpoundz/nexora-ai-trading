import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { StatCard } from "@/components/app/StatCard";
import { DEMO_HOLDINGS, DEMO_PORTFOLIO, generatePortfolioHistory } from "@/lib/demo-data";
import { sek, pct, num } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const history = useMemo(() => generatePortfolioHistory(90), []);
  return (
    <AppShell title="Min portfölj">
      <div className="space-y-6">
        <DemoBanner compact />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Totalt värde" value={sek(DEMO_PORTFOLIO.totalValue)} />
          <StatCard label="Investerat" value={sek(DEMO_PORTFOLIO.investedCapital)} />
          <StatCard label="Orealiserat" value={sek(DEMO_PORTFOLIO.totalChange)} sub={<span className="text-success">{pct(DEMO_PORTFOLIO.totalChangePct)}</span>} tone="success" />
          <StatCard label="Realiserat" value={sek(0)} sub="Inget realiserat resultat än" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Fördelning</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DEMO_HOLDINGS} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {DEMO_HOLDINGS.map((h) => <Cell key={h.symbol} fill={h.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.028 250)", border: "1px solid oklch(0.28 0.03 250)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => sek(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Utveckling</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="pv2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.14 195)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.78 0.14 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.28 0.03 250)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "oklch(0.68 0.02 245)", fontSize: 11 }} minTickGap={40} />
                  <YAxis tick={{ fill: "oklch(0.68 0.02 245)", fontSize: 11 }} width={40} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.028 250)", border: "1px solid oklch(0.28 0.03 250)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => sek(v)} />
                  <Area type="monotone" dataKey="value" stroke="oklch(0.78 0.14 195)" strokeWidth={2} fill="url(#pv2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4 sm:p-6">
            <h3 className="text-base font-semibold">Innehav</h3>
            <p className="text-xs text-muted-foreground">Simulerade priser – inte livekurser.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-right font-medium">Antal</th>
                  <th className="px-4 py-3 text-right font-medium">Värde</th>
                  <th className="px-4 py-3 text-right font-medium">Andel</th>
                  <th className="px-4 py-3 text-right font-medium">Snitt</th>
                  <th className="px-4 py-3 text-right font-medium">Förändring</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {DEMO_HOLDINGS.map((h) => {
                  const share = (h.value / DEMO_PORTFOLIO.totalValue) * 100;
                  return (
                    <tr key={h.symbol} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold" style={{ background: `${h.color}20`, color: h.color }}>{h.symbol}</span>
                          <div><div className="font-medium">{h.name}</div><div className="text-xs text-muted-foreground">{h.symbol}</div></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{num(h.amount, h.symbol === "SEK" ? 0 : 4)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{sek(h.value)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{share.toFixed(1)} %</td>
                      <td className="px-4 py-3 text-right tabular-nums">{sek(h.avgPrice)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${h.changePct >= 0 ? "text-success" : "text-destructive"}`}>{pct(h.changePct)}</td>
                      <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">Visa detaljer</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
