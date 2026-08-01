import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { sek, num } from "@/lib/format";
import {
  Menu, Bell, Home, FileText, Grid2X2, User, ArrowDownToLine,
  ArrowUpFromLine, ArrowUpRight, ArrowDownRight, Plus,
} from "lucide-react";

export const Route = createFileRoute("/v2")({
  component: V2Page,
  head: () => ({
    meta: [
      { title: "Nexora v2 – Mobil portföljapp" },
      { name: "description", content: "Nexora v2: en mobilanpassad app-vy med portföljvärde, utveckling och snabb insättning eller uttag." },
      { property: "og:title", content: "Nexora v2 – Mobil portföljapp" },
      { property: "og:description", content: "Mobilanpassad app-vy med portföljvärde, utveckling och snabba uttag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
type RangeKey = (typeof RANGES)[number];

const SERIES: Record<RangeKey, number[]> = {
  "1D": [12280, 12240, 12310, 12290, 12420, 12380, 12510, 12604],
  "1W": [11880, 12010, 11940, 12180, 12320, 12260, 12480, 12604],
  "1M": [10420, 10880, 10710, 11340, 11220, 11890, 12240, 12604],
  "1Y": [6100, 7020, 6840, 8150, 9420, 9180, 11200, 12604],
};

const POSITIONS = [
  { symbol: "BTC", name: "Bitcoin", value: 5842.1, change: 3.42 },
  { symbol: "ETH", name: "Ethereum", value: 3218.4, change: -0.86 },
  { symbol: "SOL", name: "Solana", value: 2140.9, change: 5.21 },
  { symbol: "XRP", name: "Ripple", value: 1402.6, change: -1.14 },
];

function V2Page() {
  return (
    <div className="v2-scope min-h-svh bg-[var(--v2-bg)] text-[var(--v2-fg)]">
      <div className="mx-auto min-h-svh w-full max-w-[430px] overflow-hidden">
        <Landing />
      </div>
    </div>
  );
}

function Landing() {
  return (
    <section className="v2-enter relative flex min-h-svh flex-col justify-end overflow-hidden px-6 pb-10 pt-16">
      <div
        aria-hidden
        className="v2-enter__ring v2-enter__ring--1 pointer-events-none absolute -right-40 -top-32 h-[26rem] w-[26rem] rounded-full border-[3.5rem] border-[var(--v2-ring1)] opacity-90 blur-[1px]"
      />
      <div
        aria-hidden
        className="v2-enter__ring v2-enter__ring--2 pointer-events-none absolute -left-48 top-40 h-[30rem] w-[30rem] rounded-full border-[4rem] border-[var(--v2-ring2)] opacity-70"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)]/60 to-transparent" />

      {/* Brandmärke som ritar in sig (Wise-stil) */}
      <div className="v2-enter__logo pointer-events-none absolute left-1/2 top-20 -translate-x-1/2">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--v2-accent)] shadow-[0_16px_40px_-10px_var(--v2-accent)]">
          <span className="font-display text-2xl font-bold text-[var(--v2-on-accent)]">N</span>
        </div>
      </div>

      <div className="relative">
        <p className="v2-enter__item text-xs font-semibold uppercase tracking-[0.3em] text-[var(--v2-accent)]" style={{ animationDelay: "0.35s" }}>Nexora</p>
        <h1 className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight">
          <span className="v2-enter__item block" style={{ animationDelay: "0.45s" }}>Det bästa</span>
          <span className="v2-enter__item block" style={{ animationDelay: "0.55s" }}>sättet att</span>
          <span className="v2-enter__item block" style={{ animationDelay: "0.65s" }}>investera</span>
        </h1>
        <p className="v2-enter__item mt-4 max-w-[19rem] text-sm leading-relaxed text-[var(--v2-muted)]" style={{ animationDelay: "0.78s" }}>
          AI-driven kryptohandel i mobilen. Följ din portfölj, sätt in och ta ut – allt på ett ställe.
        </p>

        <div className="v2-enter__item mt-10 flex flex-col gap-3" style={{ animationDelay: "0.92s" }}>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-full bg-[var(--v2-accent)] px-7 py-3.5 text-center text-sm font-semibold text-[var(--v2-on-accent)] shadow-[0_10px_30px_-8px_var(--v2-accent)] transition active:scale-[0.97]"
          >
            Logga in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full border border-[var(--v2-line)] bg-[var(--v2-card)] px-7 py-3.5 text-center text-sm font-semibold text-[var(--v2-fg)] transition active:scale-[0.97]"
          >
            Skapa konto
          </Link>
        </div>
      </div>
    </section>
  );
}

function Portfolio({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState<RangeKey>("1M");
  const data = useMemo(
    () => SERIES[range].map((value, i) => ({ i, value })),
    [range],
  );
  const total = SERIES[range][SERIES[range].length - 1];
  const first = SERIES[range][0];
  const diff = total - first;
  const diffPct = (diff / first) * 100;

  return (
    <div className="flex min-h-svh flex-col pb-28">
      {/* Top bar */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pb-2 pt-6">
        <button onClick={onBack} aria-label="Meny" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--v2-card)]">
          <Menu className="h-4.5 w-4.5" />
        </button>
        <p className="truncate text-center text-sm font-semibold">Min portfölj</p>
        <div className="flex shrink-0 items-center gap-2">
          <button aria-label="Notiser" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-card)]">
            <Bell className="h-4.5 w-4.5" />
          </button>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-accent)] text-[var(--v2-on-accent)]">
            <User className="h-4.5 w-4.5" />
          </span>
        </div>
      </header>

      {/* Balance */}
      <section className="px-5 pt-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--v2-muted)]">Portföljvärde</p>
        <p className="mt-2 font-display text-[2.4rem] font-semibold leading-none tabular-nums">{sek(total)}</p>
        <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
          diff >= 0 ? "bg-[var(--v2-up)]/15 text-[var(--v2-up)]" : "bg-[var(--v2-down)]/15 text-[var(--v2-down)]"
        }`}>
          {diff >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {diff >= 0 ? "+" : ""}{sek(diff)} · {num(diffPct, 2)} %
        </p>
      </section>

      {/* Chart */}
      <section className="mt-4 h-52 px-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="v2grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--v2-accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--v2-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 400", "dataMax + 400"]} />
            <Tooltip
              cursor={{ stroke: "var(--v2-line)" }}
              contentStyle={{
                background: "var(--v2-card)", border: "1px solid var(--v2-line)",
                borderRadius: 12, fontSize: 12, color: "var(--v2-fg)",
              }}
              labelFormatter={() => ""}
              formatter={(v: number) => [sek(v), "Värde"]}
            />
            <Area type="monotone" dataKey="value" stroke="var(--v2-accent)" strokeWidth={2.5} fill="url(#v2grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Range pills */}
      <div className="mt-3 flex justify-center gap-2 px-5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              range === r
                ? "bg-[var(--v2-accent)] text-[var(--v2-on-accent)]"
                : "bg-[var(--v2-card)] text-[var(--v2-muted)]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Deposit / Withdraw */}
      <div className="mt-6 grid grid-cols-2 gap-3 px-5">
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--v2-accent)] py-4 text-sm font-semibold text-[var(--v2-on-accent)] transition active:scale-[0.98]">
          <ArrowDownToLine className="h-4 w-4" /> Sätt in
        </button>
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--v2-line)] bg-[var(--v2-card)] py-4 text-sm font-semibold transition active:scale-[0.98]">
          <ArrowUpFromLine className="h-4 w-4" /> Ta ut
        </button>
      </div>

      {/* Positions */}
      <section className="mt-8 px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-sm font-semibold">Innehav</h2>
          <button className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--v2-accent)]">
            <Plus className="h-3.5 w-3.5" /> Lägg till
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {POSITIONS.map((p) => (
            <li key={p.symbol} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[var(--v2-card)] p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--v2-accent)]/15 text-xs font-bold text-[var(--v2-accent)]">
                {p.symbol}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-[var(--v2-muted)]">{p.symbol} · Nexora</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{sek(p.value)}</p>
                <p className={`text-xs font-medium tabular-nums ${p.change >= 0 ? "text-[var(--v2-up)]" : "text-[var(--v2-down)]"}`}>
                  {p.change >= 0 ? "+" : ""}{num(p.change, 2)} %
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[430px] border-t border-[var(--v2-line)] bg-[var(--v2-card)]/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <ul className="flex items-center justify-between">
          {[
            { icon: Home, label: "Hem", active: true },
            { icon: FileText, label: "Rapporter", active: false },
            { icon: Bell, label: "Notiser", active: false },
            { icon: Grid2X2, label: "Mer", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <li key={label}>
              <button aria-label={label} className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-[var(--v2-accent)]/15 text-[var(--v2-accent)]" : "text-[var(--v2-muted)]"}`}>
                <Icon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
