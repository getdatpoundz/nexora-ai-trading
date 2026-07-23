import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { sek, pct, dateSv } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowDownToLine, ArrowUpFromLine, Brain, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

type Trade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price_sek: number;
  total_sek: number;
  executed_at: string;
};

function PortfolioPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const firstName = profile?.first_name ?? "";
  const accountType = profile?.assigned_level_name ?? "Standard";
  const balance = Number(profile?.cash_balance_sek ?? 0);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalDeposited, setTotalDeposited] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [t, d] = await Promise.all([
        supabase
          .from("trades")
          .select("id, symbol, side, quantity, price_sek, total_sek, executed_at")
          .eq("user_id", user.id)
          .order("executed_at", { ascending: true })
          .limit(500),
        supabase
          .from("investment_selections")
          .select("funded_amount_sek")
          .eq("user_id", user.id)
          .eq("onramp_status", "funded"),
      ]);
      if (cancelled) return;
      setTrades(((t.data ?? []) as unknown as Trade[]));
      setTotalDeposited((d.data ?? []).reduce((s, r) => s + Number(r.funded_amount_sek ?? 0), 0));
    })();

    const ch = supabase
      .channel(`portfolio-trades-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        (payload) => setTrades((prev) => [...prev, payload.new as unknown as Trade]),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const pnl = balance - totalDeposited;
  const pnlPct = totalDeposited > 0 ? (pnl / totalDeposited) * 100 : 0;

  // Build equity curve from deposits + closing trades' net effect on cash.
  const history = useMemo(() => {
    if (totalDeposited === 0 && trades.length === 0) return [];
    // Approximate: start at totalDeposited, add cumulative realized from sell trades minus buy trades net.
    // Since bot closes trades symmetrically we approximate value = starting + cumulative pnl per trade group.
    const points: { date: string; value: number }[] = [];
    let running = totalDeposited;
    const sortedSells = trades.filter((t) => t.side === "sell");
    const start = trades[0]?.executed_at ?? new Date().toISOString();
    points.push({ date: start.slice(0, 10), value: running });
    // pair buys and sells sequentially per symbol as bot does
    const buysBySymbol: Record<string, Trade[]> = {};
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    for (const t of sorted) {
      if (t.side === "buy") {
        (buysBySymbol[t.symbol] ||= []).push(t);
      } else {
        const buy = buysBySymbol[t.symbol]?.shift();
        if (buy) {
          const p = Number(t.total_sek) - Number(buy.total_sek);
          running += p;
          points.push({ date: t.executed_at.slice(0, 10), value: Math.round(running) });
        }
      }
    }
    if (sortedSells.length === 0 && totalDeposited > 0) {
      points.push({ date: new Date().toISOString().slice(0, 10), value: balance });
    } else {
      points.push({ date: new Date().toISOString().slice(0, 10), value: balance });
    }
    return points;
  }, [trades, totalDeposited, balance]);

  const recentPositions = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const open: Record<string, Trade[]> = {};
    const closed: {
      id: string;
      symbol: string;
      qty: number;
      entry: number;
      exit: number;
      cost: number;
      proceeds: number;
      pnl: number;
      multiplier: number;
      opened_at: string;
      closed_at: string;
    }[] = [];
    for (const t of sorted) {
      if (t.side === "buy") {
        (open[t.symbol] ||= []).push(t);
      } else {
        const b = open[t.symbol]?.shift();
        if (!b) continue;
        const cost = Number(b.total_sek);
        const proceeds = Number(t.total_sek);
        closed.push({
          id: t.id,
          symbol: t.symbol,
          qty: Number(b.quantity),
          entry: Number(b.price_sek),
          exit: Number(t.price_sek),
          cost,
          proceeds,
          pnl: proceeds - cost,
          multiplier: cost > 0 ? proceeds / cost : 1,
          opened_at: b.executed_at,
          closed_at: t.executed_at,
        });
      }
    }
    return closed.slice(-8).reverse();
  }, [trades]);

  return (
    <AppShell title="Min portfölj">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Välkommen tillbaka{firstName ? `, ${firstName}` : ""}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Kontotyp:</span>
              <span className="font-semibold text-foreground">{accountType}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/deposit"><ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> Sätt in</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/withdraw"><ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Ta ut</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/strategies"><Brain className="mr-1.5 h-3.5 w-3.5" /> Trade (AI)</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Totalt värde" value={sek(balance)} />
          <StatCard label="Totalt insatt" value={sek(totalDeposited)} />
          <StatCard
            label="Utveckling"
            value={sek(pnl)}
            sub={
              <span className={pnl >= 0 ? "text-success" : "text-destructive"}>
                {pct(pnlPct)}
              </span>
            }
            tone={pnl >= 0 ? "success" : "warning"}
          />
          <StatCard
            label="Avslutade positioner"
            value={String(trades.filter((t) => t.side === "sell").length)}
            sub="Köp + sälj räknas som en position"
          />
        </div>


        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Utveckling</h3>
            <span className="text-xs text-muted-foreground">Baserat på faktiska trades</span>
          </div>
          <div className="mt-4 h-64">
            {history.length < 2 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Ingen historik ännu. Aktivera AI-boten för att börja handla.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="pv2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} minTickGap={40} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} width={50} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} formatter={(v: number) => sek(v)} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#pv2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
            <div>
              <h3 className="text-base font-semibold">Senaste trades</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Avslutade positioner från AI-boten</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/transactions">Se alla</Link>
            </Button>
          </div>
          {recentPositions.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Inga avslutade positioner ännu. Starta boten för att börja handla automatiskt.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stängd</th>
                    <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                    <th className="px-4 py-3 text-right font-medium">Antal</th>
                    <th className="px-4 py-3 text-right font-medium">Köpt</th>
                    <th className="px-4 py-3 text-right font-medium">Sålt</th>
                    <th className="px-4 py-3 text-right font-medium">Avkastning</th>
                    <th className="px-4 py-3 text-right font-medium">Vinst</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPositions.map((p) => {
                    const win = p.pnl >= 0;
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground">{dateSv(p.closed_at)}</td>
                        <td className="px-4 py-3 font-medium">{p.symbol}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.qty.toFixed(6)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{sek(p.cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{sek(p.proceeds)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                            win ? "border-success/40 text-success" : "border-destructive/40 text-destructive"
                          }`}>
                            {win ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
                            {p.multiplier.toFixed(2)}x
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${win ? "text-success" : "text-destructive"}`}>
                          {win ? "+" : ""}{sek(p.pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
