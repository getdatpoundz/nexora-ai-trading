import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { StatCard } from "@/components/app/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  DEMO_PORTFOLIO, DEMO_HOLDINGS, DEMO_TRANSACTIONS,
  DEMO_INSIGHTS, generatePortfolioHistory, RISK_DISCLAIMER,
} from "@/lib/demo-data";
import { sek, pct, dateSv } from "@/lib/format";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line,
} from "recharts";
import { Wallet, TrendingUp, Activity, Brain, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const RANGES = [
  { key: "1D", days: 1 }, { key: "1V", days: 7 }, { key: "1M", days: 30 },
  { key: "3M", days: 90 }, { key: "1Å", days: 365 }, { key: "Alla", days: 730 },
] as const;

function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("3M");
  const [hidden, setHidden] = useState(false);

  const history = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 90;
    return generatePortfolioHistory(days);
  }, [range]);

  const mask = (s: string) => (hidden ? "•••••" : s);
  const firstName = profile?.first_name ?? "där";

  return (
    <AppShell title="Översikt">
      <div className="space-y-6">
        <DemoBanner />

        <div>
          <h2 className="text-2xl font-bold tracking-tight">Välkommen tillbaka, {firstName}</h2>
          <p className="text-sm text-muted-foreground">
            Här är en översikt av din simulerade portfölj i demoläge.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          <StatCard label="Portföljvärde" value={mask(sek(DEMO_PORTFOLIO.totalValue))} icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Tillgängligt" value={mask(sek(DEMO_PORTFOLIO.availableBalance))} />
          <StatCard label="Investerat" value={mask(sek(DEMO_PORTFOLIO.investedCapital))} />
          <StatCard
            label="Värdeförändring"
            value={mask(sek(DEMO_PORTFOLIO.totalChange))}
            sub={<span className="text-success">{pct(DEMO_PORTFOLIO.totalChangePct)}</span>}
            tone="success"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard label="Aktiv strategi" value={DEMO_PORTFOLIO.activeStrategy} icon={<Brain className="h-4 w-4" />} tone="primary" />
          <StatCard label="Risknivå" value={`${DEMO_PORTFOLIO.riskLevel} / 7`} icon={<ShieldAlert className="h-4 w-4" />} tone="warning" />
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">Portföljutveckling</h3>
              <p className="text-xs text-muted-foreground">Jämförelse mot Bitcoin · simulerad data</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setHidden((h) => !h)}>
                {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {r.key}
              </button>
            ))}
          </div>
          <div className="mt-4 h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} minTickGap={40} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }}
                  labelFormatter={(l) => dateSv(String(l))}
                  formatter={(v: number, name) => [sek(v), name === "value" ? "Portfölj" : "BTC"]}
                />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#pv)" />
                <Line type="monotone" dataKey="btc" stroke="var(--color-chart-3)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>

          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Portföljfördelning</h3>
            <div className="mt-4 space-y-3">
              {DEMO_HOLDINGS.map((h) => {
                const share = (h.value / DEMO_PORTFOLIO.totalValue) * 100;
                return (
                  <div key={h.symbol}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.color }} />
                        <span className="font-medium">{h.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">{share.toFixed(1)} %</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, background: h.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">AI-insikter</h3>
            <p className="mt-1 text-xs text-muted-foreground">Neutrala observationer – inte köp- eller säljsignaler.</p>
            <div className="mt-4 space-y-3">
              {DEMO_INSIGHTS.map((i) => (
                <div key={i.title} className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-semibold">{i.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Senaste transaktioner</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 divide-y divide-border">
            {DEMO_TRANSACTIONS.slice(0, 5).map((t) => (
              <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.type} · {t.asset}</p>
                  <p className="text-xs text-muted-foreground">{dateSv(t.date)} · {t.id}</p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums">{sek(t.valueSEK)}</p>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{RISK_DISCLAIMER}</p>
      </div>
    </AppShell>
  );
}
