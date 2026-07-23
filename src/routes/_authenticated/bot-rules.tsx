import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  Bot, Play, Pause, Save, Sparkles, Shield, TrendingUp, TrendingDown, Zap, Clock, Coins,
  AlertTriangle, RotateCcw, StopCircle, Radio, Target, Percent, Bell, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBotStatus } from "@/hooks/useBotStatus";
import { useServerFn } from "@tanstack/react-start";
import { startBot, pauseBot, resumeBot, stopBot } from "@/lib/bot.functions";
import { getLevelByAmount, INVESTMENT_LEVELS } from "@/lib/investment-levels";

export const Route = createFileRoute("/_authenticated/bot-rules")({
  component: BotRulesPage,
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

import { MARKET_UNIVERSE } from "@/lib/market-data.shared";
const AVAILABLE_ASSETS = MARKET_UNIVERSE.map((a) => a.symbol);
const ASSET_GROUPS = [
  { key: "crypto", label: "Krypto" },
  { key: "stock", label: "Aktier" },
  { key: "index", label: "Index/ETF" },
  { key: "commodity", label: "Råvaror" },
  { key: "forex", label: "Valuta" },
] as const;

const PRESETS: Record<Exclude<BotConfig["preset"], "anpassad">, Partial<BotConfig> & { label: string; desc: string; icon: typeof Bot }> = {
  forsiktig:   { label: "Försiktig",  desc: "Låg risk, färre trades, tight stop-loss.",  icon: Shield,     aggressiveness: 3, stopLossPct: 3, takeProfitPct: 8,  maxPositionPct: 10, minConfidence: 75 },
  balanserad:  { label: "Balanserad", desc: "Standardnivå — bra balans risk/avkastning.", icon: Gauge,      aggressiveness: 5, stopLossPct: 5, takeProfitPct: 12, maxPositionPct: 15, minConfidence: 65 },
  tillvaxt:    { label: "Tillväxt",   desc: "Högre aggressivitet, större positioner.",   icon: TrendingUp, aggressiveness: 8, stopLossPct: 8, takeProfitPct: 20, maxPositionPct: 25, minConfidence: 55 },
};

const STRATEGY_INFO: Record<BotConfig["strategy"], { name: string; desc: string; icon: typeof Bot }> = {
  ai_hybrid: { name: "AI Hybrid", desc: "Neural nätverk kombinerar flera signaler för optimal timing.", icon: Sparkles },
  dca: { name: "DCA (Dollar Cost Average)", desc: "Köper regelbundet oavsett pris för att jämna ut volatilitet.", icon: Clock },
  momentum: { name: "Momentum", desc: "Följer starka trender – köper när kursen bryter uppåt.", icon: TrendingUp },
  mean_reversion: { name: "Mean Reversion", desc: "Köper översålda tillgångar som förväntas återgå till medelvärde.", icon: RotateCcw },
  grid: { name: "Grid Trading", desc: "Placerar köp- och säljorder inom ett prisintervall.", icon: Zap },
};

const STORAGE_KEY = "nexora_bot_config";

function BotRulesPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { session } = useBotStatus(user?.id);
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);

  const startFn = useServerFn(startBot);
  const pauseFn = useServerFn(pauseBot);
  const resumeFn = useServerFn(resumeBot);
  const stopFn = useServerFn(stopBot);

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

  const update = <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value, preset: "anpassad" as BotConfig["preset"] }));
  };

  const applyPreset = (key: Exclude<BotConfig["preset"], "anpassad">) => {
    const p = PRESETS[key];
    setConfig((c) => ({ ...c, ...p, preset: key }));
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
      toast.success("AI-boten är aktiverad", { description: "Öppna Trade (AI) för att följa live." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte starta boten");
    } finally { setStarting(false); }
  }

  async function handlePause() { await pauseFn(); toast("Boten pausad"); }
  async function handleResume() { await resumeFn(); toast.success("Boten återupptagen"); }
  async function handleStop() {
    if (!confirm("Stoppa boten permanent?")) return;
    await stopFn(); toast("Boten stoppad");
  }

  if (!loaded) return <AppShell title="Bot-regler"><div /></AppShell>;

  const running = session?.status === "running";
  const paused = session?.status === "paused";
  const hasSession = !!session && session.status !== "stopped";

  return (
    <AppShell title="Bot-regler">
      <div className="space-y-6">
        {/* Sticky action bar */}
        <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold">Konfiguration</span>
            <Badge variant="outline" className={running ? "border-success/40 text-success" : paused ? "border-warning/40 text-warning" : ""}>
              {running ? "Aktiv" : paused ? "Pausad" : "Inaktiv"}
            </Badge>
            {running && <Radio className="h-3 w-3 animate-pulse text-success" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveLocal} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Spara
            </Button>
            {!hasSession && (
              <Button size="sm" onClick={handleStart} disabled={starting || config.assets.length === 0} className="gap-1.5">
                <Play className="h-3.5 w-3.5" /> {starting ? "Startar…" : "Starta boten"}
              </Button>
            )}
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
          </div>
        </div>

        {/* Preset */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Riskprofil</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((k) => {
              const p = PRESETS[k];
              const active = config.preset === k;
              const Icon = p.icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => applyPreset(k)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
                    active ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </button>
              );
            })}
          </div>
          {config.preset === "anpassad" && (
            <p className="mt-3 text-xs text-muted-foreground">Anpassad — du har justerat värden manuellt.</p>
          )}
        </section>

        {/* Strategy + aggressiveness */}
        <div className="grid gap-6 md:grid-cols-2">
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
              <Zap className="h-4 w-4 text-primary" />
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
        </div>

        {/* Assets */}
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
            <RuleSlider icon={TrendingDown} label="Stop-loss" hint="Stäng automatiskt om positionen faller så här mycket"
              value={config.stopLossPct} min={1} max={25} step={0.5} suffix="%" tone="destructive"
              onChange={(v) => update("stopLossPct", v)} />
            <RuleSlider icon={Target} label="Take-profit" hint="Ta hem vinsten när positionen når detta"
              value={config.takeProfitPct} min={2} max={50} step={0.5} suffix="%" tone="success"
              onChange={(v) => update("takeProfitPct", v)} />
            <RuleSlider icon={Percent} label="Max positionsstorlek" hint="Andel av portföljen per enskild position"
              value={config.maxPositionPct} min={2} max={40} step={1} suffix="%"
              onChange={(v) => update("maxPositionPct", v)} />
            <RuleSlider icon={Sparkles} label="Minsta AI-signalstyrka" hint="Boten agerar bara på signaler över detta"
              value={config.minConfidence} min={40} max={95} step={1} suffix="%"
              onChange={(v) => update("minConfidence", v)} />
          </div>
        </section>

        {/* Trading hours & behaviour */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Handelstider & beteende</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">När får boten handla?</Label>
              <RadioGroup value={config.tradingHours} onValueChange={(v) => update("tradingHours", v as BotConfig["tradingHours"])}
                className="mt-2 grid gap-2 sm:grid-cols-2">
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

        {/* Level warning */}
        <section className="rounded-2xl border border-warning/40 bg-warning/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-semibold">Regler från din nivå ({userLevel.name}) tillämpas automatiskt</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>• Max {userLevel.maxTradesPerMonth} trades per månad</li>
                <li>• Max hävstång: {userLevel.maxLeveragePct === 0 ? "Ingen" : `${userLevel.maxLeveragePct}%`}</li>
                <li>• Boten stannar automatiskt när gränsen är nådd. <Link to="/deposit" className="font-medium text-primary underline">Sätt in mer</Link> för att höja gränsen.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function RuleSlider({
  icon: Icon, label, hint, value, min, max, step, suffix, tone, onChange,
}: {
  icon: typeof Bot; label: string; hint: string;
  value: number; min: number; max: number; step: number;
  suffix?: string; tone?: "success" | "destructive";
  onChange: (v: number) => void;
}) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}{suffix ?? ""}</span>
      </div>
      <Slider className="mt-3" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
