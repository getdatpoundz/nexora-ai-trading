import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { Bot, Play, Pause, StopCircle, Radio, SlidersHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBotStatus } from "@/hooks/useBotStatus";
import { useServerFn } from "@tanstack/react-start";
import { pauseBot, resumeBot, stopBot } from "@/lib/bot.functions";
import { getLevelByAmount, INVESTMENT_LEVELS } from "@/lib/investment-levels";
import { TradingViewWidget, toTradingViewSymbol } from "@/components/markets/TradingViewWidget";
import { supabase } from "@/integrations/supabase/client";
import { sek } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

type TradeRow = {
  id: string; symbol: string; side: "buy" | "sell";
  quantity: number; price_sek: number; total_sek: number; executed_at: string;
};

type Position = {
  id: string;
  symbol: string;
  qty: number;
  entry: number;
  exit: number | null;
  cost: number;
  proceeds: number | null;
  pnl: number | null;
  multiplier: number | null;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
};

function StrategiesPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { session } = useBotStatus(user?.id);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  const pauseFn = useServerFn(pauseBot);
  const resumeFn = useServerFn(resumeBot);
  const stopFn = useServerFn(stopBot);

  const userLevel = profile?.assigned_level_name
    ? INVESTMENT_LEVELS.find((l) => l.name === profile.assigned_level_name) ?? getLevelByAmount(profile?.assigned_level_sek ?? undefined)
    : getLevelByAmount(profile?.assigned_level_sek ?? undefined);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("trades")
        .select("id, symbol, side, quantity, price_sek, total_sek, executed_at")
        .eq("user_id", user.id).order("executed_at", { ascending: true }).limit(500);
      if (!cancelled) setTrades((data as TradeRow[] | null) ?? []);
    })();
    const ch = supabase.channel(`strat-trades-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        (payload) => setTrades((cur) => [...cur, payload.new as TradeRow]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  // Pair buys/sells → positions (open + closed)
  const positions = useMemo<Position[]>(() => {
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const open: Record<string, TradeRow[]> = {};
    const result: Position[] = [];
    for (const t of sorted) {
      if (t.side === "buy") {
        (open[t.symbol] ||= []).push(t);
      } else {
        const b = open[t.symbol]?.shift();
        if (!b) continue;
        const cost = Number(b.total_sek);
        const proceeds = Number(t.total_sek);
        result.push({
          id: t.id, symbol: t.symbol, qty: Number(b.quantity),
          entry: Number(b.price_sek), exit: Number(t.price_sek),
          cost, proceeds, pnl: proceeds - cost,
          multiplier: cost > 0 ? proceeds / cost : 1,
          opened_at: b.executed_at, closed_at: t.executed_at, status: "closed",
        });
      }
    }
    // any remaining buys are still open
    for (const sym of Object.keys(open)) {
      for (const b of open[sym]) {
        result.push({
          id: b.id, symbol: b.symbol, qty: Number(b.quantity),
          entry: Number(b.price_sek), exit: null,
          cost: Number(b.total_sek), proceeds: null, pnl: null, multiplier: null,
          opened_at: b.executed_at, closed_at: null, status: "open",
        });
      }
    }
    return result.reverse();
  }, [trades]);

  async function handlePause() { await pauseFn(); toast("Boten pausad"); }
  async function handleResume() { await resumeFn(); toast.success("Boten återupptagen"); }
  async function handleStop() {
    if (!confirm("Stoppa boten permanent? Du kan starta en ny session närsomhelst.")) return;
    await stopFn(); toast("Boten stoppad");
  }

  const running = session?.status === "running";
  const paused = session?.status === "paused";
  const limitReached = session?.status === "limit_reached";
  const hasSession = !!session && session.status !== "stopped";

  const displaySymbol = (session?.allowed_assets?.[0] ?? "BTC").toUpperCase();
  const tvSymbol = toTradingViewSymbol(displaySymbol, "crypto");

  return (
    <AppShell title="Trade (AI)">
      <div className="space-y-6">
        {/* Slim status header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${running ? "bg-success/15 text-success" : limitReached ? "bg-destructive/15 text-destructive" : paused ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">AI-boten</h2>
                <Badge className={running ? "bg-success text-success-foreground" : limitReached ? "bg-destructive text-destructive-foreground" : paused ? "bg-warning text-warning-foreground" : ""}>
                  {running ? "Aktiv" : paused ? "Pausad" : limitReached ? "Månadsgräns" : "Inaktiv"}
                </Badge>
                {running && <Radio className="h-3 w-3 animate-pulse text-success" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nivå {userLevel.name}
                {hasSession && session && ` · ${session.trades_generated} trades · ${session.current_multiplier.toFixed(2)}x`}
                {hasSession && session?.started_at && ` · startade ${formatDistanceToNow(new Date(session.started_at), { locale: sv, addSuffix: true })}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {running && (
              <>
                <Button variant="outline" size="sm" onClick={handlePause} className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pausa</Button>
                <Button variant="outline" size="sm" onClick={handleStop} className="gap-1.5 text-destructive"><StopCircle className="h-3.5 w-3.5" /> Stoppa</Button>
              </>
            )}
            {paused && (
              <>
                <Button size="sm" onClick={handleResume} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Fortsätt</Button>
                <Button variant="outline" size="sm" onClick={handleStop} className="gap-1.5 text-destructive"><StopCircle className="h-3.5 w-3.5" /> Stoppa</Button>
              </>
            )}
            {limitReached && <Button variant="outline" size="sm" onClick={handleStop}>Avsluta session</Button>}
            <Button asChild variant={hasSession ? "outline" : "default"} size="sm" className="gap-1.5">
              <Link to="/bot-rules"><SlidersHorizontal className="h-3.5 w-3.5" /> {hasSession ? "Bot-regler" : "Kom igång"}</Link>
            </Button>
          </div>
        </div>

        {/* Chart + Positions */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Live-marknad · {displaySymbol}</h3>
                <p className="text-xs text-muted-foreground">Realtidsgraf</p>
              </div>
              <Badge variant="outline" className="gap-1"><Radio className="h-3 w-3" /> Realtid</Badge>
            </div>
            <TradingViewWidget symbol={tvSymbol} height={620} interval="15" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Live positioner</h3>
                <p className="text-xs text-muted-foreground">Öppna + senast stängda</p>
              </div>
              <Badge variant="outline">{positions.length}</Badge>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {positions.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Inga positioner ännu. Öppna Bot-regler för att starta boten.
                </p>
              )}
              {positions.map((p) => {
                const isOpen = p.status === "open";
                const win = (p.pnl ?? 0) >= 0;
                return (
                  <div key={p.id} className={`rounded-lg border px-3 py-2.5 text-xs ${
                    isOpen ? "border-primary/40 bg-primary/5" : win ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.symbol}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                          isOpen ? "border-primary/40 text-primary" : win ? "border-success/40 text-success" : "border-destructive/40 text-destructive"
                        }`}>
                          {isOpen ? "ÖPPEN" : win ? "VINST" : "FÖRLUST"}
                        </span>
                      </div>
                      {p.multiplier != null && (
                        <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${win ? "text-success" : "text-destructive"}`}>
                          {win ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
                          {p.multiplier.toFixed(2)}x
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        <div className="opacity-70">Antal</div>
                        <div className="font-medium tabular-nums text-foreground">{p.qty.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="opacity-70">Köpt</div>
                        <div className="font-medium tabular-nums text-foreground">{sek(p.cost)}</div>
                      </div>
                      <div className="text-right">
                        <div className="opacity-70">{isOpen ? "Öppnad" : "Vinst"}</div>
                        <div className={`font-semibold tabular-nums ${isOpen ? "text-foreground" : win ? "text-success" : "text-destructive"}`}>
                          {isOpen
                            ? formatDistanceToNow(new Date(p.opened_at), { locale: sv, addSuffix: true })
                            : `${win ? "+" : ""}${sek(p.pnl ?? 0)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
