import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { sek, pct, dateSv } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBotStatus } from "@/hooks/useBotStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, ArrowDownToLine, ArrowUpFromLine, Brain, TrendingUp, TrendingDown,
  Bot, Radio, Wallet, LineChart, Lightbulb,
} from "lucide-react";

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
  const { session, usage } = useBotStatus(user?.id);
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
        supabase.from("trades")
          .select("id, symbol, side, quantity, price_sek, total_sek, executed_at")
          .eq("user_id", user.id).order("executed_at", { ascending: true }).limit(500),
        supabase.from("investment_selections")
          .select("funded_amount_sek").eq("user_id", user.id).eq("onramp_status", "funded"),
      ]);
      if (cancelled) return;
      setTrades(((t.data ?? []) as unknown as Trade[]));
      setTotalDeposited((d.data ?? []).reduce((s, r) => s + Number(r.funded_amount_sek ?? 0), 0));
    })();

    const ch = supabase.channel(`portfolio-trades-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        (payload) => setTrades((prev) => [...prev, payload.new as unknown as Trade]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const pnl = balance - totalDeposited;
  const pnlPct = totalDeposited > 0 ? (pnl / totalDeposited) * 100 : 0;

  const history = useMemo(() => {
    if (totalDeposited === 0 && trades.length === 0) return [];
    const points: { date: string; value: number }[] = [];
    let running = totalDeposited;
    const start = trades[0]?.executed_at ?? new Date().toISOString();
    points.push({ date: start.slice(0, 10), value: running });
    const buysBySymbol: Record<string, Trade[]> = {};
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    for (const t of sorted) {
      if (t.side === "buy") (buysBySymbol[t.symbol] ||= []).push(t);
      else {
        const buy = buysBySymbol[t.symbol]?.shift();
        if (buy) {
          running += Number(t.total_sek) - Number(buy.total_sek);
          points.push({ date: t.executed_at.slice(0, 10), value: Math.round(running) });
        }
      }
    }
    points.push({ date: new Date().toISOString().slice(0, 10), value: balance });
    return points;
  }, [trades, totalDeposited, balance]);

  // Closed positions (pairs of buy/sell)
  const closedPositions = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const open: Record<string, Trade[]> = {};
    const closed: {
      id: string; symbol: string; qty: number; cost: number; proceeds: number;
      pnl: number; multiplier: number; closed_at: string;
    }[] = [];
    for (const t of sorted) {
      if (t.side === "buy") (open[t.symbol] ||= []).push(t);
      else {
        const b = open[t.symbol]?.shift();
        if (!b) continue;
        const cost = Number(b.total_sek);
        const proceeds = Number(t.total_sek);
        closed.push({
          id: t.id, symbol: t.symbol, qty: Number(b.quantity),
          cost, proceeds, pnl: proceeds - cost,
          multiplier: cost > 0 ? proceeds / cost : 1,
          closed_at: t.executed_at,
        });
      }
    }
    return closed;
  }, [trades]);

  const recentPositions = closedPositions.slice(-5).reverse();

  // Bot insights — today
  const insights = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();
    const closedToday = closedPositions.filter((p) => p.closed_at >= iso);
    const pnlToday = closedToday.reduce((s, p) => s + p.pnl, 0);
    const wins = closedToday.filter((p) => p.pnl > 0).length;
    const winRate = closedToday.length > 0 ? Math.round((wins / closedToday.length) * 100) : 0;
    const bestToday = closedToday.slice().sort((a, b) => b.multiplier - a.multiplier)[0];
    return { closedToday: closedToday.length, pnlToday, winRate, bestToday };
  }, [closedPositions]);

  const botStatus = session?.status ?? "stopped";
  const running = botStatus === "running";
  const paused = botStatus === "paused";
  const limitReached = botStatus === "limit_reached";
  const tradesRemaining = session ? Math.max(0, session.max_trades_month - usage.trades_count) : null;

  return (
    <AppShell title="Översikt">
      <div className="space-y-6">
        {/* Hero */}
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
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/strategies"><Brain className="h-3.5 w-3.5" /> Öppna Trade (AI)</Link>
            </Button>
          </div>
        </div>

        {/* 3 KPI */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Totalt värde */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Totalt värde</span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{sek(balance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Kapital tillgängligt för AI-boten</p>
          </div>

          {/* Utveckling */}
          <div className={`rounded-2xl border p-5 ${pnl >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <div className={`flex items-center gap-2 ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
              {pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-[11px] font-semibold uppercase tracking-widest">Utveckling</span>
            </div>
            <p className={`mt-3 font-display text-3xl font-semibold tabular-nums ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
              {pnl >= 0 ? "+" : ""}{sek(pnl)}
            </p>
            <p className={`mt-1 text-xs font-medium tabular-nums ${pnl >= 0 ? "text-success" : "text-destructive"}`}>{pct(pnlPct)}</p>
          </div>

          {/* Bot-status */}
          <Link to="/strategies" className={`group rounded-2xl border p-5 transition ${
            running ? "border-success/30 bg-success/5" :
            paused ? "border-warning/30 bg-warning/5" :
            limitReached ? "border-destructive/30 bg-destructive/5" :
            "border-border bg-card"
          } hover:border-primary/60`}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bot className={`h-4 w-4 ${running ? "text-success" : paused ? "text-warning" : limitReached ? "text-destructive" : ""}`} />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Bot-status</span>
              {running && <Radio className="h-3 w-3 animate-pulse text-success" />}
            </div>
            <p className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold">
              {running ? "Aktiv" : paused ? "Pausad" : limitReached ? "Månadsgräns" : "Inaktiv"}
              {session && (
                <Badge variant="outline" className="text-xs tabular-nums">
                  {session.current_multiplier.toFixed(2)}x
                </Badge>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tradesRemaining !== null
                ? `${tradesRemaining} av ${session!.max_trades_month} trades kvar denna månad`
                : "Öppna Trade (AI) för att starta boten"}
            </p>
          </Link>
        </div>

        {/* Utvecklingsgraf */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <LineChart className="h-4 w-4 text-primary" /> Portföljutveckling
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Baserat på faktiska stängda positioner</p>
            </div>
          </div>
          <div className="mt-4 h-80">
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

        {/* Two columns: Recent positions | Bot insights */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Recent positions */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
              <div>
                <h3 className="text-base font-semibold">Senaste 5 positioner</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Avslutade positioner från AI-boten</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">Se alla</Link>
              </Button>
            </div>
            {recentPositions.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Inga avslutade positioner ännu. Starta boten för att börja handla.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Stängd</th>
                      <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                      <th className="px-4 py-3 text-right font-medium">Insats</th>
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
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{sek(p.cost)}</td>
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

          {/* Bot insights */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Bot-insikter</h3>
            </div>
            {insights.closedToday === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Inga stängda positioner idag ännu.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  Boten har genomfört <strong className="tabular-nums">{insights.closedToday}</strong> {insights.closedToday === 1 ? "position" : "positioner"} idag med resultat{" "}
                  <strong className={`tabular-nums ${insights.pnlToday >= 0 ? "text-success" : "text-destructive"}`}>
                    {insights.pnlToday >= 0 ? "+" : ""}{sek(insights.pnlToday)}
                  </strong>.
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  Träffsäkerhet idag: <strong className="tabular-nums text-primary">{insights.winRate}%</strong>
                </div>
                {insights.bestToday && (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                    Bästa trade: <strong>{insights.bestToday.symbol}</strong> {" "}
                    <span className="tabular-nums text-success">{insights.bestToday.multiplier.toFixed(2)}x</span>{" "}
                    (<span className="tabular-nums text-success">+{sek(insights.bestToday.pnl)}</span>)
                  </div>
                )}
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full gap-1.5">
              <Link to="/strategies"><Brain className="h-3.5 w-3.5" /> Följ live på Trade (AI)</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
