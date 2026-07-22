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
import { useEffect, useState } from "react";
import { Bot, Play, Pause, Save, Sparkles, Shield, TrendingUp, Zap, Clock, Coins, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

type BotConfig = {
  enabled: boolean;
  preset: "forsiktig" | "balanserad" | "tillvaxt" | "anpassad";
  strategy: "dca" | "momentum" | "mean_reversion" | "grid" | "ai_hybrid";
  aggressiveness: number; // 1-10
  maxPositionPct: number; // % av portfölj per trade
  stopLossPct: number;
  takeProfitPct: number;
  maxDailyTrades: number;
  maxDrawdownPct: number;
  minConfidence: number; // AI signal confidence %
  assets: string[];
  tradingHours: "always" | "market" | "custom";
  hoursFrom: string;
  hoursTo: string;
  reinvestProfits: boolean;
  notifyOnTrade: boolean;
  emergencyStop: boolean;
};

const DEFAULT_CONFIG: BotConfig = {
  enabled: false,
  preset: "balanserad",
  strategy: "ai_hybrid",
  aggressiveness: 5,
  maxPositionPct: 10,
  stopLossPct: 5,
  takeProfitPct: 12,
  maxDailyTrades: 8,
  maxDrawdownPct: 20,
  minConfidence: 70,
  assets: ["BTC", "ETH", "SOL"],
  tradingHours: "always",
  hoursFrom: "09:00",
  hoursTo: "21:00",
  reinvestProfits: true,
  notifyOnTrade: true,
  emergencyStop: false,
};

const PRESETS: Record<string, Partial<BotConfig>> = {
  forsiktig: { aggressiveness: 2, maxPositionPct: 5, stopLossPct: 3, takeProfitPct: 6, maxDailyTrades: 3, maxDrawdownPct: 10, minConfidence: 85 },
  balanserad: { aggressiveness: 5, maxPositionPct: 10, stopLossPct: 5, takeProfitPct: 12, maxDailyTrades: 8, maxDrawdownPct: 20, minConfidence: 70 },
  tillvaxt: { aggressiveness: 8, maxPositionPct: 20, stopLossPct: 8, takeProfitPct: 25, maxDailyTrades: 15, maxDrawdownPct: 35, minConfidence: 55 },
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

function StrategiesPage() {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);

  const update = <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value, preset: key === "preset" ? (value as BotConfig["preset"]) : "anpassad" }));
  };

  const applyPreset = (preset: "forsiktig" | "balanserad" | "tillvaxt") => {
    setConfig((c) => ({ ...c, ...PRESETS[preset], preset }));
    toast.success(`Förinställning "${preset}" laddad`);
  };

  const toggleAsset = (a: string) => {
    setConfig((c) => ({
      ...c,
      preset: "anpassad",
      assets: c.assets.includes(a) ? c.assets.filter((x) => x !== a) : [...c.assets, a],
    }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success("Botens inställningar sparade", { description: config.enabled ? "Boten tradar nu enligt dina regler." : "Aktivera boten för att börja handla." });
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    toast("Inställningar återställda");
  };

  if (!loaded) return <AppShell title="AI-bot"><div /></AppShell>;

  const StrategyIcon = STRATEGY_INFO[config.strategy].icon;

  return (
    <AppShell title="AI-bot">
      <div className="space-y-6">
        {/* Status header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Din AI-bot</h2>
                  <Badge variant={config.enabled ? "default" : "secondary"} className={config.enabled ? "bg-success text-success-foreground" : ""}>
                    {config.enabled ? "Aktiv" : "Pausad"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {config.enabled
                    ? `Handlar automatiskt enligt din strategi: ${STRATEGY_INFO[config.strategy].name}`
                    : "Aktivera boten när du är klar med dina inställningar."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="bot-toggle" className="text-sm font-medium">{config.enabled ? "På" : "Av"}</Label>
              <Switch id="bot-toggle" checked={config.enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: main config */}
          <div className="space-y-6 lg:col-span-2">
            {/* Presets */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Riskprofil</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["forsiktig", "balanserad", "tillvaxt"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`rounded-xl border p-4 text-left transition ${config.preset === p ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="text-sm font-semibold capitalize">{p}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p === "forsiktig" && "Låg risk, små positioner"}
                      {p === "balanserad" && "Balanserad exponering"}
                      {p === "tillvaxt" && "Hög risk, hög potential"}
                    </div>
                  </button>
                ))}
              </div>
              {config.preset === "anpassad" && (
                <p className="mt-3 text-xs text-muted-foreground">✏️ Du har egna inställningar aktiva</p>
              )}
            </section>

            {/* Strategy */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <StrategyIcon className="h-4 w-4 text-primary" />
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

            {/* Risk parameters */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h3 className="font-semibold">Riskregler</h3>
              </div>
              <div className="space-y-6">
                <SliderRow label="AI-aggressivitet" value={config.aggressiveness} min={1} max={10} step={1} unit="/10"
                  onChange={(v) => update("aggressiveness", v)} hint="Hur ofta boten agerar på svaga signaler" />
                <SliderRow label="Max positionsstorlek" value={config.maxPositionPct} min={1} max={50} step={1} unit="%"
                  onChange={(v) => update("maxPositionPct", v)} hint="Andel av portföljen per enskild trade" />
                <SliderRow label="Stop-loss" value={config.stopLossPct} min={1} max={30} step={1} unit="%"
                  onChange={(v) => update("stopLossPct", v)} hint="Sälj automatiskt vid förlust" />
                <SliderRow label="Take-profit" value={config.takeProfitPct} min={2} max={100} step={1} unit="%"
                  onChange={(v) => update("takeProfitPct", v)} hint="Sälj automatiskt vid vinst" />
                <SliderRow label="Max drawdown" value={config.maxDrawdownPct} min={5} max={60} step={5} unit="%"
                  onChange={(v) => update("maxDrawdownPct", v)} hint="Boten pausar sig själv om portföljen faller mer än detta" />
                <SliderRow label="Min AI-konfidens" value={config.minConfidence} min={30} max={99} step={1} unit="%"
                  onChange={(v) => update("minConfidence", v)} hint="Endast trades där AI:n är minst så här säker" />
                <div>
                  <Label className="text-sm">Max antal trades per dygn</Label>
                  <Input type="number" min={1} max={100} value={config.maxDailyTrades}
                    onChange={(e) => update("maxDailyTrades", Math.max(1, Number(e.target.value) || 1))}
                    className="mt-2 max-w-xs" />
                </div>
              </div>
            </section>

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
              {config.assets.length === 0 && (
                <p className="mt-3 text-xs text-destructive">Välj minst en tillgång</p>
              )}
            </section>

            {/* Trading hours */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Handelstider</h3>
              </div>
              <RadioGroup value={config.tradingHours} onValueChange={(v) => update("tradingHours", v as BotConfig["tradingHours"])} className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="always" />
                  <div><div className="text-sm font-medium">Alltid (24/7)</div><div className="text-xs text-muted-foreground">Kryptomarknaden stänger aldrig</div></div>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="market" />
                  <div><div className="text-sm font-medium">Endast under hög likviditet</div><div className="text-xs text-muted-foreground">08:00–22:00 CET</div></div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="custom" className="mt-1" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Egna tider</div>
                    {config.tradingHours === "custom" && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input type="time" value={config.hoursFrom} onChange={(e) => update("hoursFrom", e.target.value)} className="w-32" />
                        <span className="text-xs text-muted-foreground">till</span>
                        <Input type="time" value={config.hoursTo} onChange={(e) => update("hoursTo", e.target.value)} className="w-32" />
                      </div>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </section>

            {/* Advanced */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Övrigt</h3>
              <div className="space-y-4">
                <ToggleRow label="Återinvestera vinster automatiskt" hint="Lägger vinster tillbaka i handeln"
                  checked={config.reinvestProfits} onChange={(v) => update("reinvestProfits", v)} />
                <ToggleRow label="Notifiera vid varje trade" hint="E-post och push vid köp/sälj"
                  checked={config.notifyOnTrade} onChange={(v) => update("notifyOnTrade", v)} />
                <ToggleRow label="Nödstopp vid extrem volatilitet" hint="Pausar boten vid marknadskrasch"
                  checked={config.emergencyStop} onChange={(v) => update("emergencyStop", v)} />
              </div>
            </section>
          </div>

          {/* Right: summary */}
          <aside className="space-y-6">
            <div className="sticky top-4 space-y-4 rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold">Sammanfattning</h3>
              <dl className="space-y-3 text-sm">
                <Row label="Strategi" value={STRATEGY_INFO[config.strategy].name} />
                <Row label="Riskprofil" value={config.preset} className="capitalize" />
                <Row label="Aggressivitet" value={`${config.aggressiveness}/10`} />
                <Row label="Max position" value={`${config.maxPositionPct}%`} />
                <Row label="Stop-loss / Take-profit" value={`${config.stopLossPct}% / ${config.takeProfitPct}%`} />
                <Row label="Max trades/dygn" value={String(config.maxDailyTrades)} />
                <Row label="Tillgångar" value={config.assets.length > 0 ? config.assets.join(", ") : "—"} />
                <Row label="Handelstider" value={config.tradingHours === "always" ? "24/7" : config.tradingHours === "market" ? "08–22" : `${config.hoursFrom}–${config.hoursTo}`} />
              </dl>
              <div className="space-y-2 pt-2">
                <Button onClick={save} className="w-full" disabled={config.assets.length === 0}>
                  <Save className="mr-2 h-4 w-4" /> Spara inställningar
                </Button>
                <Button
                  variant={config.enabled ? "outline" : "default"}
                  onClick={() => { const next = !config.enabled; setConfig((c) => ({ ...c, enabled: next })); toast[next ? "success" : "message"](next ? "Boten är aktiverad" : "Boten pausad"); }}
                  className="w-full"
                  disabled={config.assets.length === 0}
                >
                  {config.enabled ? <><Pause className="mr-2 h-4 w-4" /> Pausa boten</> : <><Play className="mr-2 h-4 w-4" /> Aktivera boten</>}
                </Button>
                <Button variant="ghost" onClick={reset} className="w-full text-muted-foreground">
                  <RotateCcw className="mr-2 h-4 w-4" /> Återställ
                </Button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Historisk utveckling är ingen garanti för framtida resultat. Handel med krypto innebär risk för kapitalförlust.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-primary">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="mt-2" />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-right text-xs font-medium ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
