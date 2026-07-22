import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Bot, Play, Pause, Save, Sparkles, Shield, TrendingUp, Zap, Clock, Coins, AlertTriangle, RotateCcw, StopCircle, Radio, TrendingDown, Target, Percent, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBotStatus } from "@/hooks/useBotStatus";
import { useServerFn } from "@tanstack/react-start";
import { startBot, pauseBot, resumeBot, stopBot } from "@/lib/bot.functions";
import { getLevelByAmount, INVESTMENT_LEVELS } from "@/lib/investment-levels";
import { TradingViewWidget, toTradingViewSymbol } from "@/components/markets/TradingViewWidget";
import { supabase } from "@/integrations/supabase/client";
import { sek, pct } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { MARKET_UNIVERSE } from "@/lib/market-data.shared";
import { useQuotes } from "@/hooks/useMarketData";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

type BotConfig = {
  preset: "forsiktig" | "balanserad" | "tillvaxt" | "anpassad";
  strategy: "dca" | "momentum" | "mean_reversion" | "grid" | "ai_hybrid";
  aggressiveness: number;
  assets: string[];
  stopLossPct: number;
  takeProfitPct: number;
  maxPositionPct: number;
  minConfidence: number;
  tradingHours: "always" | "market_hours";
  reinvestProfits: boolean;
  notifyOnTrade: boolean;
};

const DEFAULT_CONFIG: BotConfig = {
  preset: "balanserad",
  strategy: "ai_hybrid",
  aggressiveness: 5,
  assets: ["BTC", "ETH", "SOL"],
  stopLossPct: 5,
  takeProfitPct: 12,
  maxPositionPct: 15,
  minConfidence: 65,
  tradingHours: "always",
  reinvestProfits: true,
  notifyOnTrade: true,
};

const AVAILABLE_ASSETS = ["BTC", "ETH", "SOL", "ADA", "DOT", "AVAX", "MATIC", "LINK", "XRP", "DOGE"];

const STRATEGY_INFO: Record<BotConfig["strategy"], { name: string; desc: string; icon: typeof Bot }> = {
  ai_hybrid: { name: "AI Hybrid", desc: "Neural nätverk kombinerar flera signaler för optimal timing.", icon: Sparkles },
  dca: { name: "DCA (Dollar Cost Average)", desc: "Köper regelbundet oavsett pris för att jämna ut volatilitet.", icon: Clock },
  momentum: { name: "Momentum", desc: "Följer starka trender – köper när kursen bryter uppåt.", icon: TrendingUp },
  mean_reversion: { name: "Mean Reversion", desc: "Köper översålda tillgångar som förväntas återgå till medelvärde.", icon: RotateCcw },
  grid: { name: "Grid Trading", desc: "Placerar köp- och säljorder inom ett prisintervall.", icon: Zap },
};

const STORAGE_KEY = "nexora_bot_config";

type TradeRow = {
  id: string; symbol: string; side: "buy" | "sell";
  quantity: number; price_sek: number; total_sek: number; executed_at: string;
};

function StrategiesPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { session } = useBotStatus(user?.id);
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [tab, setTab] = useState<"overview" | "settings">("overview");

  const startFn = useServerFn(startBot);
  const pauseFn = useServerFn(pauseBot);
  const resumeFn = useServerFn(resumeBot);
  const stopFn = useServerFn(stopBot);

  // Load user's assigned level → derive limits shown on this page
  const userLevel = profile?.assigned_level_name
    ? INVESTMENT_LEVELS.find((l) => l.name === profile.assigned_level_name) ?? getLevelByAmount(profile?.assigned_level_sek ?? undefined)
    : getLevelByAmount(profile?.assigned_level_sek ?? undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Load recent trades + realtime
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("trades")
        .select("id, symbol, side, quantity, price_sek, total_sek, executed_at")
        .eq("user_id", user!.id).order("executed_at", { ascending: false }).limit(30);
      if (!cancelled) setTrades((data as TradeRow[] | null) ?? []);
    }
    load();
    const ch = supabase.channel(`bot-trades-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        (payload) => setTrades((cur) => [payload.new as TradeRow, ...cur].slice(0, 30)))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  const update = <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const toggleAsset = (a: string) => {
    setConfig((c) => ({ ...c, preset: "anpassad", assets: c.assets.includes(a) ? c.assets.filter((x) => x !== a) : [...c.assets, a] }));
  };

  const saveLocal = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success("Inställningar sparade");
  };

  async function handleStart() {
    if (config.assets.length === 0) { toast.error("Välj minst en tillgång"); return; }
    setStarting(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      await startFn({ data: { allowed_assets: config.assets, strategy: config.strategy, aggressiveness: config.aggressiveness } });
      toast.success("AI-boten är aktiverad", { description: "Den tradar nu åt dig — även när du lämnar sidan." });
      setTab("overview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte starta boten");
    } finally { setStarting(false); }
  }

  async function handlePause() { await pauseFn(); toast("Boten pausad"); }
  async function handleResume() { await resumeFn(); toast.success("Boten återupptagen"); }
  async function handleStop() {
    if (!confirm("Stoppa boten permanent? Du kan starta en ny session närsomhelst.")) return;
    await stopFn(); toast("Boten stoppad");
  }

  if (!loaded) return <AppShell title="Trade (AI)"><div /></AppShell>;

  const running = session?.status === "running";
  const paused = session?.status === "paused";
  const limitReached = session?.status === "limit_reached";
  const hasSession = !!session && session.status !== "stopped";

  const displaySymbol = (session?.allowed_assets?.[0] ?? config.assets[0] ?? "BTC").toUpperCase();
  const tvSymbol = toTradingViewSymbol(displaySymbol, "crypto");

  const targetProgress = session ? Math.min(100, Math.round((session.trades_generated / session.target_trades) * 100)) : 0;
  const multProgress = session ? Math.min(100, Math.round(((session.current_multiplier - 1) / (session.target_multiplier - 1)) * 100)) : 0;

  return (
    <AppShell title="Trade (AI)">
      <div className="space-y-6">
        {/* Status header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${running ? "bg-success/15 text-success" : limitReached ? "bg-destructive/15 text-destructive" : paused ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Din AI-bot</h2>
                  <Badge className={running ? "bg-success text-success-foreground" : limitReached ? "bg-destructive text-destructive-foreground" : paused ? "bg-warning text-warning-foreground" : ""}>
                    {running ? "Aktiv" : paused ? "Pausad" : limitReached ? "Månadsgräns nådd" : "Inaktiv"}
                  </Badge>
                  {running && <Radio className="h-3 w-3 animate-pulse text-success" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {running && `Tradar automatiskt · Nivå ${userLevel.name} · ${session?.allowed_assets.length} tillgångar`}
                  {paused && "Pausad manuellt — tryck fortsätt för att återuppta"}
                  {limitReached && "Månadens trade- eller hävstångsgräns är nådd. Boten återupptas automatiskt nästa månad."}
                  {!hasSession && `Konfigurera reglerna nedan och starta boten. Din nivå: ${userLevel.name}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!hasSession && (
                <Button size="lg" onClick={() => setTab("settings")} className="gap-2">
                  <Play className="h-4 w-4" /> Kom igång
                </Button>
              )}
              {running && (
                <>
                  <Button variant="outline" onClick={handlePause} className="gap-2"><Pause className="h-4 w-4" /> Pausa</Button>
                  <Button variant="outline" onClick={handleStop} className="gap-2 text-destructive"><StopCircle className="h-4 w-4" /> Stoppa</Button>
                </>
              )}
              {paused && (
                <>
                  <Button onClick={handleResume} className="gap-2"><Play className="h-4 w-4" /> Fortsätt</Button>
                  <Button variant="outline" onClick={handleStop} className="gap-2 text-destructive"><StopCircle className="h-4 w-4" /> Stoppa</Button>
                </>
              )}
              {limitReached && <Button variant="outline" onClick={handleStop}>Avsluta session</Button>}
            </div>
          </div>

          {hasSession && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <ProgressCard label="Portfölj-utveckling"
                value={`${session!.current_multiplier.toFixed(2)}x`}
                sub={`Mål ${session!.target_multiplier.toFixed(1)}x`} percent={multProgress} tone="success" />
              <ProgressCard label="Trades genererade"
                value={`${session!.trades_generated}`}
                sub={`Mål ${session!.target_trades}`} percent={targetProgress} />
              <ProgressCard label="Startvärde"
                value={sek(session!.starting_portfolio_sek)}
                sub={`Startade ${formatDistanceToNow(new Date(session!.started_at), { locale: sv, addSuffix: true })}`}
                percent={0} showBar={false} />
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "overview" | "settings")}>
          <TabsList>
            <TabsTrigger value="overview">Översikt & Live</TabsTrigger>
            <TabsTrigger value="settings">Regler & Konfiguration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              {/* Chart */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Live-marknad · {displaySymbol}</h3>
                    <p className="text-xs text-muted-foreground">Boten övervakar denna marknad just nu</p>
                  </div>
                  <Badge variant="outline" className="gap-1"><Radio className="h-3 w-3" /> Realtid</Badge>
                </div>
                <TradingViewWidget symbol={tvSymbol} height={560} interval="15" />
              </div>

              {/* Trade feed — sizing matched to chart */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Live trade-flöde</h3>
                  <Badge variant="outline">{trades.length}</Badge>
                </div>
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {trades.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Inga trades ännu. Starta boten så börjar den arbeta.
                    </p>
                  )}
                  {trades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-6 w-6 place-items-center rounded ${t.side === "buy" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}>
                          {t.side === "buy" ? "K" : "S"}
                        </span>
                        <div>
                          <div className="font-semibold">{t.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(t.executed_at), { locale: sv, addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{sek(t.total_sek)}</div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          {t.quantity.toFixed(6)} @ {sek(t.price_sek)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Level limits card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold">Regler för din nivå: {userLevel.name}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <LimitCard label="Max trades / månad" value={userLevel.maxTradesPerMonth.toString()} />
                <LimitCard label="Max hävstång" value={userLevel.maxLeveragePct === 0 ? "Ingen" : `${userLevel.maxLeveragePct}%`} />
                <LimitCard label="Målmultiplikator" value={`${userLevel.targetMultiplier.toFixed(1)}x`} />
              </div>
            </div>

            {/* Live markets — bot's watchlist */}
            <LiveMarketsPanel
              assets={session?.allowed_assets ?? config.assets}
              onSelect={(sym) => {
                const asset = MARKET_UNIVERSE.find((m) => m.symbol === sym);
                if (asset) toast(`${asset.name} · Öppna Marknader för att handla manuellt`);
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Handelsstrategi</h3>
              </div>
              <Select value={config.strategy} onValueChange={(v) => update("strategy", v as BotConfig["strategy"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STRATEGY_INFO).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">{STRATEGY_INFO[config.strategy].desc}</p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">AI-aggressivitet</h3>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Hur ofta boten agerar</Label>
                <span className="text-sm font-semibold tabular-nums text-primary">{config.aggressiveness}/10</span>
              </div>
              <Slider value={[config.aggressiveness]} min={1} max={10} step={1}
                onValueChange={([v]) => update("aggressiveness", v)} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">Lägre = färre trades, högre = mer aktiv (inom din nivås gränser)</p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Tillgångar boten får handla</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
                {AVAILABLE_ASSETS.map((a) => (
                  <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${config.assets.includes(a) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <Checkbox checked={config.assets.includes(a)} onCheckedChange={() => toggleAsset(a)} />
                    <span className="font-medium">{a}</span>
                  </label>
                ))}
              </div>
              {config.assets.length === 0 && <p className="mt-3 text-xs text-destructive">Välj minst en tillgång</p>}
            </section>

            {/* Risk rules */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Riskregler per trade</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <RuleSlider
                  icon={TrendingDown}
                  label="Stop-loss"
                  hint="Stäng automatiskt om positionen faller så här mycket"
                  value={config.stopLossPct}
                  min={1} max={25} step={0.5}
                  suffix="%"
                  tone="destructive"
                  onChange={(v) => update("stopLossPct", v)}
                />
                <RuleSlider
                  icon={Target}
                  label="Take-profit"
                  hint="Ta hem vinsten när positionen når detta"
                  value={config.takeProfitPct}
                  min={2} max={50} step={0.5}
                  suffix="%"
                  tone="success"
                  onChange={(v) => update("takeProfitPct", v)}
                />
                <RuleSlider
                  icon={Percent}
                  label="Max positionsstorlek"
                  hint="Andel av portföljen per enskild position"
                  value={config.maxPositionPct}
                  min={2} max={40} step={1}
                  suffix="%"
                  onChange={(v) => update("maxPositionPct", v)}
                />
                <RuleSlider
                  icon={Sparkles}
                  label="Minsta AI-signalstyrka"
                  hint="Boten agerar bara på signaler över detta"
                  value={config.minConfidence}
                  min={40} max={95} step={1}
                  suffix="%"
                  onChange={(v) => update("minConfidence", v)}
                />
              </div>
            </section>

            {/* Trading hours & behavior */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Handelstider & beteende</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">När får boten handla?</Label>
                  <RadioGroup
                    value={config.tradingHours}
                    onValueChange={(v) => update("tradingHours", v as BotConfig["tradingHours"])}
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                  >
                    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${config.tradingHours === "always" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="always" className="mt-0.5" />
                      <div>
                        <div className="font-medium">24/7 (krypto)</div>
                        <div className="text-xs text-muted-foreground">Boten handlar när som helst</div>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${config.tradingHours === "market_hours" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="market_hours" className="mt-0.5" />
                      <div>
                        <div className="font-medium">Börstider</div>
                        <div className="text-xs text-muted-foreground">Endast vardagar 09:00–17:30</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Återinvestera vinster</div>
                    <div className="text-xs text-muted-foreground">Låt boten öka positionerna med genererad vinst</div>
                  </div>
                  <Switch checked={config.reinvestProfits} onCheckedChange={(v) => update("reinvestProfits", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Notiser vid varje trade</div>
                      <div className="text-xs text-muted-foreground">Få avisering när boten öppnar eller stänger en position</div>
                    </div>
                  </div>
                  <Switch checked={config.notifyOnTrade} onCheckedChange={(v) => update("notifyOnTrade", v)} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-warning/40 bg-warning/5 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="text-sm">
                  <p className="font-semibold">Regler från din nivå ({userLevel.name}) tillämpas automatiskt</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <li>• Max {userLevel.maxTradesPerMonth} trades per månad</li>
                    <li>• Max hävstång: {userLevel.maxLeveragePct === 0 ? "Ingen" : `${userLevel.maxLeveragePct}%`}</li>
                    <li>• Boten stannar automatiskt när gränsen är nådd</li>
                  </ul>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleStart} disabled={starting || running || paused || config.assets.length === 0} className="gap-2">
                <Play className="h-4 w-4" /> {running ? "Boten kör redan" : starting ? "Startar…" : "Starta AI-boten"}
              </Button>
              <Button size="lg" variant="outline" onClick={saveLocal} className="gap-2">
                <Save className="h-4 w-4" /> Spara utan att starta
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function ProgressCard({ label, value, sub, percent, tone, showBar = true }: {
  label: string; value: string; sub: string; percent: number; tone?: "success"; showBar?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone === "success" ? "text-success" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
      {showBar && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${tone === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
