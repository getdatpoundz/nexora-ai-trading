import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { sek, num } from "@/lib/format";
import {
  Menu, Bell, Home, FileText, Grid2X2, User, ArrowDownToLine,
  ArrowUpFromLine, ArrowUpRight, ArrowDownRight, Bot, Play, Pause, Lock, ShieldCheck, Sparkles,
} from "lucide-react";
import markLight from "@/assets/nexora-mark-light.png.asset.json";
import { CoinIcon } from "@/components/v2/CoinIcon";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBotStatus } from "@/hooks/useBotStatus";
import { useQuotes } from "@/hooks/useMarketData";
import { supabase } from "@/integrations/supabase/client";
import { startBot, pauseBot, resumeBot } from "@/lib/bot.functions";

export const Route = createFileRoute("/v2")({
  validateSearch: (s: Record<string, unknown>): { view?: "portfolio" } => ({
    view: s['view'] === "portfolio" ? "portfolio" : undefined,
  }),
  component: V2Page,
  head: () => ({
    meta: [
      { title: "Nexora v2 – Privat tillgång" },
      { name: "description", content: "Nexora v2: privat tillgång till AI-driven kryptohandel med portfölj, live-trades och realtidsgrafer i mobilen." },
      { property: "og:title", content: "Nexora v2 – Privat tillgång" },
      { property: "og:description", content: "Privat tillgång till AI-driven kryptohandel med live-trades och realtidsgrafer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const RANGES = ["1D", "1W", "1M", "ALLT"] as const;
type RangeKey = (typeof RANGES)[number];
const RANGE_DAYS: Record<RangeKey, number> = { "1D": 1, "1W": 7, "1M": 30, ALLT: 36500 };

const WATCHLIST = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"];

type Trade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price_sek: number;
  total_sek: number;
  executed_at: string;
};

function V2Page() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="v2-scope min-h-svh bg-[var(--v2-bg)] text-[var(--v2-fg)]">
      {splash && (
        <div className="v2-splash fixed inset-0 z-50 grid place-items-center bg-[var(--v2-bg)]">
          <img src={markLight.url} alt="Nexora" className="v2-splash__mark h-20 w-20 object-contain" />
        </div>
      )}
      <div className="mx-auto min-h-svh w-full max-w-[430px] overflow-hidden">
        {view === "portfolio"
          ? <Portfolio onBack={() => navigate({ to: "/v2", search: {} })} />
          : <Landing />}
      </div>
    </div>
  );
}

/* ---------------------------------- Landing --------------------------------- */

function Landing() {
  return (
    <section className="v2-enter relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        aria-hidden
        className="v2-enter__ring v2-enter__ring--1 pointer-events-none absolute -right-40 -top-32 h-[26rem] w-[26rem] rounded-full border-[3.5rem] border-[var(--v2-ring1)] opacity-90 blur-[1px]"
      />
      <div
        aria-hidden
        className="v2-enter__ring v2-enter__ring--2 pointer-events-none absolute -left-48 bottom-10 h-[30rem] w-[30rem] rounded-full border-[4rem] border-[var(--v2-ring2)] opacity-70"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)]/70 to-[var(--v2-bg)]/40" />

      <div className="relative flex w-full max-w-[22rem] flex-col items-center">
        <img
          src={markLight.url}
          alt="Nexora"
          className="v2-enter__logo h-16 w-16 object-contain"
        />

        <span
          className="v2-enter__item mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--v2-line)] bg-[var(--v2-card)]/80 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--v2-accent)]"
          style={{ animationDelay: "0.3s" }}
        >
          <Lock className="h-3 w-3" /> Private access
        </span>

        <h1 className="mt-6 font-display text-[2.3rem] font-semibold leading-[1.08] tracking-tight">
          <span className="v2-enter__item block" style={{ animationDelay: "0.42s" }}>Du är inbjuden</span>
          <span className="v2-enter__item block text-[var(--v2-accent)]" style={{ animationDelay: "0.52s" }}>till Nexora</span>
        </h1>

        <p className="v2-enter__item mt-4 text-sm leading-relaxed text-[var(--v2-muted)]" style={{ animationDelay: "0.66s" }}>
          Early access till vår AI-tradingplattform. Endast för inbjudna medlemmar –
          logga in med din access eller aktivera din plats.
        </p>

        <ul className="v2-enter__item mt-7 flex flex-col gap-2 text-xs text-[var(--v2-muted)]" style={{ animationDelay: "0.78s" }}>
          {[
            { icon: ShieldCheck, text: "Verifierad medlemsplats" },
            { icon: Bot, text: "AI-boten handlar åt dig dygnet runt" },
            { icon: Sparkles, text: "Live-grafer och realtidsaffärer" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center justify-center gap-2">
              <Icon className="h-3.5 w-3.5 text-[var(--v2-accent)]" /> {text}
            </li>
          ))}
        </ul>

        <div className="v2-enter__item mt-9 flex w-full flex-col gap-3" style={{ animationDelay: "0.9s" }}>
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
            Aktivera min plats
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Portfolio -------------------------------- */

function Portfolio({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { session, usage } = useBotStatus(user?.id);
  const [range, setRange] = useState<RangeKey>("1M");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [busy, setBusy] = useState(false);

  const runStart = useServerFn(startBot);
  const runPause = useServerFn(pauseBot);
  const runResume = useServerFn(resumeBot);

  const quotes = useQuotes(WATCHLIST);

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
      setTrades((t.data ?? []) as unknown as Trade[]);
      setTotalDeposited((d.data ?? []).reduce((s, r) => s + Number(r.funded_amount_sek ?? 0), 0));
    })();

    const ch = supabase.channel(`v2-trades-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        (payload) => setTrades((prev) => [...prev, payload.new as unknown as Trade]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const balance = Number(profile?.cash_balance_sek ?? 0);
  const assignedBase = Number(profile?.assigned_level_sek ?? 0);
  const pnlBase = Math.max(totalDeposited, assignedBase);

  // Riktig portföljkurva byggd på faktiska affärer
  const history = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const points: { t: number; value: number }[] = [];
    let running = pnlBase;
    const start = sorted[0]?.executed_at ?? new Date().toISOString();
    points.push({ t: new Date(start).getTime(), value: running });
    const open: Record<string, Trade[]> = {};
    for (const tr of sorted) {
      if (tr.side === "buy") (open[tr.symbol] ||= []).push(tr);
      else {
        const b = open[tr.symbol]?.shift();
        if (!b) continue;
        running += Number(tr.total_sek) - Number(b.total_sek);
        points.push({ t: new Date(tr.executed_at).getTime(), value: Math.round(running) });
      }
    }
    points.push({ t: Date.now(), value: balance || running });
    return points;
  }, [trades, pnlBase, balance]);

  const data = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    const filtered = history.filter((p) => p.t >= cutoff);
    return (filtered.length >= 2 ? filtered : history.slice(-2)).map((p, i) => ({ i, ...p }));
  }, [history, range]);

  const total = data.length ? data[data.length - 1].value : balance;
  const first = data.length ? data[0].value : balance;
  const diff = total - first;
  const diffPct = first > 0 ? (diff / first) * 100 : 0;

  // Stängda affärer (riktiga bot-trades)
  const closed = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const open: Record<string, Trade[]> = {};
    const out: { id: string; symbol: string; pnl: number; multiplier: number; at: string }[] = [];
    for (const tr of sorted) {
      if (tr.side === "buy") (open[tr.symbol] ||= []).push(tr);
      else {
        const b = open[tr.symbol]?.shift();
        if (!b) continue;
        const cost = Number(b.total_sek);
        const proceeds = Number(tr.total_sek);
        out.push({ id: tr.id, symbol: tr.symbol, pnl: proceeds - cost, multiplier: cost > 0 ? proceeds / cost : 1, at: tr.executed_at });
      }
    }
    return out.reverse();
  }, [trades]);

  const status = session?.status ?? "stopped";
  const running = status === "running";
  const tradesLeft = session ? Math.max(0, session.max_trades_month - usage.trades_count) : null;

  async function toggleBot() {
    setBusy(true);
    try {
      if (running) await runPause({});
      else if (status === "paused") await runResume({});
      else await runStart({ data: { allowed_assets: WATCHLIST, strategy: "ai_hybrid", aggressiveness: 5 } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col pb-28">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pb-2 pt-6">
        <button onClick={onBack} aria-label="Meny" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--v2-card)]">
          <Menu className="h-4.5 w-4.5" />
        </button>
        <p className="truncate text-center text-sm font-semibold">Min portfölj</p>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/notifications" aria-label="Notiser" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-card)]">
            <Bell className="h-4.5 w-4.5" />
          </Link>
          <Link to="/settings" aria-label="Konto" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-accent)] text-[var(--v2-on-accent)]">
            <User className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      {/* Saldo */}
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

      {/* Graf */}
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

      <div className="mt-3 flex justify-center gap-2 px-5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              range === r ? "bg-[var(--v2-accent)] text-[var(--v2-on-accent)]" : "bg-[var(--v2-card)] text-[var(--v2-muted)]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Sätt in / Ta ut */}
      <div className="mt-6 grid grid-cols-2 gap-3 px-5">
        <Link to="/deposit" className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--v2-accent)] py-4 text-sm font-semibold text-[var(--v2-on-accent)] transition active:scale-[0.98]">
          <ArrowDownToLine className="h-4 w-4" /> Sätt in
        </Link>
        <Link to="/withdraw" className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--v2-line)] bg-[var(--v2-card)] py-4 text-sm font-semibold transition active:scale-[0.98]">
          <ArrowUpFromLine className="h-4 w-4" /> Ta ut
        </Link>
      </div>

      {/* AI-bot */}
      <section className="mt-8 px-5">
        <div className="rounded-2xl border border-[var(--v2-line)] bg-[var(--v2-card)] p-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${running ? "bg-[var(--v2-up)]/15 text-[var(--v2-up)]" : "bg-[var(--v2-accent)]/15 text-[var(--v2-accent)]"}`}>
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">AI-boten</p>
              <p className="truncate text-xs text-[var(--v2-muted)]">
                {running ? "Handlar live" : status === "paused" ? "Pausad" : status === "limit_reached" ? "Månadsgräns nådd" : "Inaktiv"}
                {tradesLeft !== null ? ` · ${usage.trades_count}/${session?.max_trades_month} trades` : ""}
              </p>
            </div>
            <button
              onClick={toggleBot}
              disabled={busy || status === "limit_reached"}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--v2-accent)] px-4 py-2 text-xs font-semibold text-[var(--v2-on-accent)] transition active:scale-[0.97] disabled:opacity-50"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "Pausa" : status === "paused" ? "Återuppta" : "Starta"}
            </button>
          </div>
          {session && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[var(--v2-bg)]/60 p-2.5">
                <p className="text-[var(--v2-muted)]">Multipel</p>
                <p className="mt-0.5 font-semibold tabular-nums">{num(Number(session.current_multiplier ?? 1), 2)}x</p>
              </div>
              <div className="rounded-xl bg-[var(--v2-bg)]/60 p-2.5">
                <p className="text-[var(--v2-muted)]">Affärer kvar</p>
                <p className="mt-0.5 font-semibold tabular-nums">{tradesLeft}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Live-trades */}
      <section className="mt-8 px-5">
        <h2 className="text-sm font-semibold">Senaste affärer</h2>
        <ul className="mt-3 space-y-2.5">
          {closed.slice(0, 8).map((c) => (
            <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[var(--v2-card)] p-3.5">
              <CoinIcon symbol={c.symbol} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.symbol}</p>
                <p className="truncate text-xs text-[var(--v2-muted)]">
                  {new Date(c.at).toLocaleString("sv-SE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold tabular-nums ${c.pnl >= 0 ? "text-[var(--v2-up)]" : "text-[var(--v2-down)]"}`}>
                  {c.pnl >= 0 ? "+" : ""}{sek(c.pnl)}
                </p>
                <p className="text-xs text-[var(--v2-muted)] tabular-nums">{num(c.multiplier, 2)}x</p>
              </div>
            </li>
          ))}
          {closed.length === 0 && (
            <li className="rounded-2xl bg-[var(--v2-card)] p-4 text-xs text-[var(--v2-muted)]">
              Inga avslutade affärer ännu. Starta AI-boten för att komma igång.
            </li>
          )}
        </ul>
      </section>

      {/* Marknad – riktiga kurser */}
      <section className="mt-8 px-5">
        <h2 className="text-sm font-semibold">Marknad</h2>
        <ul className="mt-3 space-y-2.5">
          {(quotes.data ?? []).map((q) => (
            <li key={q.symbol} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[var(--v2-card)] p-3.5">
              <CoinIcon symbol={q.symbol} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{q.name}</p>
                <p className="truncate text-xs text-[var(--v2-muted)]">{q.symbol}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{sek(q.priceSek)}</p>
                <p className={`text-xs font-medium tabular-nums ${q.changePct24h >= 0 ? "text-[var(--v2-up)]" : "text-[var(--v2-down)]"}`}>
                  {q.changePct24h >= 0 ? "+" : ""}{num(q.changePct24h, 2)} %
                </p>
              </div>
            </li>
          ))}
          {quotes.isLoading && (
            <li className="rounded-2xl bg-[var(--v2-card)] p-4 text-xs text-[var(--v2-muted)]">Hämtar kurser…</li>
          )}
        </ul>
      </section>

      {/* Bottennav */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[430px] border-t border-[var(--v2-line)] bg-[var(--v2-card)]/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <ul className="flex items-center justify-between">
          {[
            { icon: Home, label: "Hem", to: "/v2" as const, active: true },
            { icon: FileText, label: "Transaktioner", to: "/transactions" as const, active: false },
            { icon: Bell, label: "Notiser", to: "/notifications" as const, active: false },
            { icon: Grid2X2, label: "Mer", to: "/settings" as const, active: false },
          ].map(({ icon: Icon, label, to, active }) => (
            <li key={label}>
              <Link to={to} aria-label={label} className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-[var(--v2-accent)]/15 text-[var(--v2-accent)]" : "text-[var(--v2-muted)]"}`}>
                <Icon className="h-5 w-5" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
