import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { sek, pct, num, dateSv } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { TrendingUp, Wallet, Sparkles, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/dashboard2")({
  head: () => ({
    meta: [
      { title: "Översikt Pro — Nexora AI" },
      { name: "description", content: "Din AI-drivna portfölj med vinstdrivna trades." },
      { property: "og:title", content: "Översikt Pro — Nexora AI" },
      { property: "og:description", content: "Din AI-drivna portfölj med vinstdrivna trades." },
    ],
  }),
  component: Dashboard2Page,
});

type Trade = {
  id: string;
  date: string;
  closedDate: string;
  symbol: string;
  name: string;
  side: "Lång" | "Kort";
  entry: number;
  exit: number;
  quantity: number;
  invested: number;
  proceeds: number;
  pnl: number;
  pnlPct: number;
  strategy: string;
  duration: string;
  confidence: number;
  fees: number;
  notes: string;
};

const TRADES: Trade[] = [
  { id: "NX-10482", date: "2026-07-14", closedDate: "2026-07-18", symbol: "BTC", name: "Bitcoin", side: "Lång", entry: 682400, exit: 1091840, quantity: 0.012, invested: 8189, proceeds: 13102, pnl: 4913, pnlPct: 60.0, strategy: "Momentum Alpha", duration: "4d 6h", confidence: 92, fees: 12, notes: "AI upptäckte breakout över 90-dagars motstånd med volymbekräftelse." },
  { id: "NX-10471", date: "2026-07-09", closedDate: "2026-07-12", symbol: "ETH", name: "Ethereum", side: "Lång", entry: 19850, exit: 43670, quantity: 0.35, invested: 6948, proceeds: 15284, pnl: 8337, pnlPct: 120.0, strategy: "Trend Follow v3", duration: "3d 2h", confidence: 88, fees: 10, notes: "Positiv sentimentsdivergens efter uppgradering, AI ökade position." },
  { id: "NX-10463", date: "2026-07-05", closedDate: "2026-07-08", symbol: "SOL", name: "Solana", side: "Lång", entry: 1420, exit: 2556, quantity: 6, invested: 8520, proceeds: 15336, pnl: 6816, pnlPct: 80.0, strategy: "Momentum Alpha", duration: "3d", confidence: 90, fees: 9, notes: "On-chain aktivitet steg 34 % — AI-modell triggade entry." },
  { id: "NX-10455", date: "2026-06-28", closedDate: "2026-07-02", symbol: "LINK", name: "Chainlink", side: "Lång", entry: 148, exit: 273.8, quantity: 55, invested: 8140, proceeds: 15059, pnl: 6919, pnlPct: 85.0, strategy: "Mean Reversion", duration: "4d 8h", confidence: 84, fees: 8, notes: "Översåld i RSI, AI identifierade återhämtningsmönster." },
  { id: "NX-10441", date: "2026-06-22", closedDate: "2026-06-26", symbol: "BTC", name: "Bitcoin", side: "Lång", entry: 655000, exit: 1179000, quantity: 0.015, invested: 9825, proceeds: 17685, pnl: 7860, pnlPct: 80.0, strategy: "Trend Follow v3", duration: "4d", confidence: 86, fees: 14, notes: "Följde stigande 20-dagars glidande medelvärde med trailing stop." },
  { id: "NX-10432", date: "2026-06-15", closedDate: "2026-06-19", symbol: "ETH", name: "Ethereum", side: "Kort", entry: 21400, exit: 12840, quantity: 0.3, invested: 6420, proceeds: 8988, pnl: 2568, pnlPct: 40.0, strategy: "Volatility Edge", duration: "4d 1h", confidence: 79, fees: 8, notes: "AI identifierade lokal topp och kortade — säkring i sidledsmarknad." },
  { id: "NX-10428", date: "2026-06-10", closedDate: "2026-06-14", symbol: "XRP", name: "XRP", side: "Lång", entry: 5.02, exit: 10.04, quantity: 1500, invested: 7530, proceeds: 15060, pnl: 7530, pnlPct: 100.0, strategy: "Momentum Alpha", duration: "4d 3h", confidence: 87, fees: 7, notes: "Nyhetsdriven uppgång bekräftad av volymspik." },
  { id: "NX-10419", date: "2026-06-04", closedDate: "2026-06-08", symbol: "ADA", name: "Cardano", side: "Lång", entry: 3.65, exit: 7.30, quantity: 2000, invested: 7300, proceeds: 14600, pnl: 7300, pnlPct: 100.0, strategy: "Mean Reversion", duration: "4d 5h", confidence: 82, fees: 7, notes: "Statistiskt mean reversion-setup med 82 % historisk hitrate." },
  { id: "NX-10408", date: "2026-05-28", closedDate: "2026-06-01", symbol: "SOL", name: "Solana", side: "Lång", entry: 1350, exit: 2565, quantity: 5.5, invested: 7425, proceeds: 14107, pnl: 6682, pnlPct: 90.0, strategy: "Trend Follow v3", duration: "4d 2h", confidence: 85, fees: 8, notes: "Utbrott från konsolideringszon, AI ökade allokering stegvis." },
  { id: "NX-10395", date: "2026-05-20", closedDate: "2026-05-23", symbol: "BTC", name: "Bitcoin", side: "Lång", entry: 618000, exit: 1050600, quantity: 0.016, invested: 9888, proceeds: 16810, pnl: 6922, pnlPct: 70.0, strategy: "Momentum Alpha", duration: "3d 7h", confidence: 89, fees: 13, notes: "Golden cross-signal på 4H-graf, AI bekräftade med orderflödesanalys." },
];

const PORTFOLIO_VALUE = 342_780;
const INVESTED = 260_000;
const REALIZED_PNL = TRADES.reduce((s, t) => s + t.pnl, 0);
const TOTAL_CHANGE_PCT = ((PORTFOLIO_VALUE - INVESTED) / INVESTED) * 100;
const WIN_RATE = 100;

function generateHistory() {
  const points: { date: string; value: number }[] = [];
  const start = new Date("2026-04-22");
  let v = 300_000;
  for (let i = 0; i <= 90; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const drift = 470;
    const noise = (Math.sin(i / 5) * 900) + (Math.cos(i / 9) * 600) + (Math.random() - 0.4) * 700;
    v = Math.max(295_000, v + drift + noise);
    if (i === 90) v = PORTFOLIO_VALUE;
    points.push({ date: d.toISOString().slice(0, 10), value: Math.round(v) });
  }
  return points;
}

function Dashboard2Page() {
  const history = useMemo(generateHistory, []);
  const [selected, setSelected] = useState<Trade | null>(null);

  return (
    <AppShell title="Översikt Pro">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Amanda Kelly Chua</h1>
          <p className="text-sm text-muted-foreground">Privat portfölj · Demokonto</p>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portföljvärde</p>
              <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{sek(PORTFOLIO_VALUE)}</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {pct(TOTAL_CHANGE_PCT)}
                </span>
                <span className="text-muted-foreground">Totalt +{sek(PORTFOLIO_VALUE - INVESTED)} sedan start</span>
              </div>
            </div>
            <div className="hidden rounded-xl bg-primary/10 p-3 text-primary sm:block">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="pv-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.18 155)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.62 0.18 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 11 }} width={54} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={["dataMin - 2000", "dataMax + 2000"]} />
                <Tooltip formatter={(v: number) => sek(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="oklch(0.62 0.18 155)" strokeWidth={2.5} fill="url(#pv-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Investerat" value={sek(INVESTED)} icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Realiserad vinst" value={sek(REALIZED_PNL)} sub={<span className="text-success">Från {TRADES.length} trades</span>} tone="success" icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="Vinstprocent" value={`${WIN_RATE.toFixed(0)} %`} sub="Senaste 10 trades" tone="success" />
          <StatCard label="Snittvinst / trade" value={sek(Math.round(REALIZED_PNL / TRADES.length))} sub="Efter avgifter" tone="primary" />
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
            <div>
              <h3 className="text-base font-semibold">Senaste trades</h3>
              <p className="text-xs text-muted-foreground">Klicka på en rad för att se detaljer.</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">{TRADES.length} avslutade positioner</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-left font-medium">Strategi</th>
                  <th className="px-4 py-3 text-right font-medium">Insats</th>
                  <th className="px-4 py-3 text-right font-medium">Vinst</th>
                  <th className="px-4 py-3 text-right font-medium">Multipel</th>
                  <th className="px-4 py-3 text-right font-medium">Stängd</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {TRADES.map((t) => {
                  const multiple = t.proceeds / t.invested;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{t.symbol}</span>
                          <div>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.side} · {t.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.strategy}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{sek(t.invested)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-success">+{sek(t.pnl)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <ArrowUpRight className="h-3 w-3" />
                          {multiple.toFixed(1)}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{dateSv(t.closedDate)}</td>
                    </tr>
                  );
                })}
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                        Detaljer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Simulerad demodata. Historisk avkastning är ingen garanti för framtida resultat.
        </p>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {selected.symbol}
                  </span>
                  <div>
                    <div>{selected.name} · {selected.side}</div>
                    <div className="text-xs font-normal text-muted-foreground">{selected.id}</div>
                  </div>
                </DialogTitle>
                <DialogDescription>Trade genomförd av AI-strategi <b>{selected.strategy}</b></DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-success">Realiserad vinst</p>
                <p className="mt-1 text-2xl font-bold text-success">+{sek(selected.pnl)}</p>
                <p className="text-xs text-success/80">{pct(selected.pnlPct)} avkastning på insatsen</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Entry-kurs" value={sek(selected.entry, { decimals: 2 })} />
                <Detail label="Exit-kurs" value={sek(selected.exit, { decimals: 2 })} />
                <Detail label="Antal" value={num(selected.quantity, 4)} />
                <Detail label="Insats" value={sek(selected.invested)} />
                <Detail label="Utfall" value={sek(selected.proceeds)} />
                <Detail label="Avgifter" value={sek(selected.fees)} />
                <Detail label="Öppnad" value={dateSv(selected.date)} />
                <Detail label="Stängd" value={dateSv(selected.closedDate)} />
                <Detail label="Varaktighet" value={selected.duration} />
                <Detail label="AI-konfidens" value={`${selected.confidence} %`} />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">AI-analys</p>
                {selected.notes}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Stäng</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums">{value}</p>
    </div>
  );
}
