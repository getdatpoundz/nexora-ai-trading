import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { sek, dateSv } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TxPage,
});

type Row = {
  id: string;
  date: string;
  type: "Insättning" | "Uttag" | "Trade";
  asset: string;
  amount: string;
  valueSek: number;
  status: string;
};

type TradeRaw = {
  id: string; symbol: string; side: "buy" | "sell";
  quantity: number; total_sek: number; executed_at: string;
};

function TxPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("alla");
  const [summary, setSummary] = useState({ deposited: 0, withdrawn: 0, tradePnl: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [trades, deposits, withdrawals] = await Promise.all([
        supabase.from("trades")
          .select("id, symbol, side, quantity, total_sek, executed_at")
          .eq("user_id", user.id).order("executed_at", { ascending: false }).limit(500),
        supabase.from("investment_selections")
          .select("id, funded_amount_sek, funded_at, onramp_status, level_name, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("withdrawal_requests")
          .select("id, amount_sek, status, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const out: Row[] = [];
      const rawTrades = (trades.data ?? []) as TradeRaw[];
      for (const t of rawTrades) {
        out.push({
          id: `T-${t.id.slice(0, 8)}`,
          date: t.executed_at,
          type: "Trade",
          asset: t.symbol,
          amount: `${t.side === "buy" ? "+" : "−"}${Number(t.quantity).toFixed(6)}`,
          valueSek: Number(t.total_sek),
          status: "Genomförd",
        });
      }
      let deposited = 0;
      for (const d of deposits.data ?? []) {
        if (d.onramp_status !== "funded") continue;
        const amt = Number(d.funded_amount_sek ?? 0);
        deposited += amt;
        out.push({
          id: `D-${d.id.slice(0, 8)}`,
          date: d.funded_at ?? d.created_at,
          type: "Insättning",
          asset: "BTC → SEK",
          amount: sek(amt),
          valueSek: amt,
          status: "Genomförd",
        });
      }
      let withdrawn = 0;
      for (const w of withdrawals.data ?? []) {
        const statusLabel =
          w.status === "approved" ? "Genomförd" :
          w.status === "pending" ? "Väntar" :
          w.status === "rejected" ? "Nekad" : "Avbruten";
        if (w.status === "approved") withdrawn += Number(w.amount_sek);
        out.push({
          id: `U-${w.id.slice(0, 8)}`,
          date: w.created_at,
          type: "Uttag",
          asset: "BTC",
          amount: `−${sek(Number(w.amount_sek))}`,
          valueSek: Number(w.amount_sek),
          status: statusLabel,
        });
      }

      // Compute PnL from paired trades
      const sorted = [...rawTrades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
      const open: Record<string, TradeRaw[]> = {};
      let pnl = 0;
      for (const t of sorted) {
        if (t.side === "buy") (open[t.symbol] ||= []).push(t);
        else {
          const b = open[t.symbol]?.shift();
          if (b) pnl += Number(t.total_sek) - Number(b.total_sek);
        }
      }

      out.sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!cancelled) {
        setRows(out);
        setSummary({ deposited, withdrawn, tradePnl: pnl });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(
    () => rows.filter((r) => type === "alla" || r.type === type),
    [rows, type],
  );

  return (
    <AppShell title="Transaktioner">
      <div className="space-y-6">
        {/* Summary chips */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryChip icon={<ArrowDownToLine className="h-4 w-4" />} label="Totalt insatt"
            value={sek(summary.deposited)} tone="neutral" />
          <SummaryChip icon={<ArrowUpFromLine className="h-4 w-4" />} label="Totalt uttaget"
            value={sek(summary.withdrawn)} tone="neutral" />
          <SummaryChip
            icon={summary.tradePnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            label="PnL från trades"
            value={`${summary.tradePnl >= 0 ? "+" : ""}${sek(summary.tradePnl)}`}
            tone={summary.tradePnl >= 0 ? "success" : "destructive"} />
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alla">Alla typer</SelectItem>
                <SelectItem value="Insättning">Insättningar</SelectItem>
                <SelectItem value="Uttag">Uttag</SelectItem>
                <SelectItem value="Trade">Trades</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} rader</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Datum</th>
                  <th className="px-4 py-3 text-left font-medium">Typ</th>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-right font-medium">Belopp</th>
                  <th className="px-4 py-3 text-right font-medium">Värde (SEK)</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Laddar…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Inga transaktioner ännu.</td></tr>
                )}
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground">{dateSv(t.date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <TypeIcon type={t.type} />
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.asset}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.amount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{sek(t.valueSek)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        t.status === "Genomförd" ? "border-success/40 text-success" :
                        t.status === "Väntar" ? "border-warning/40 text-warning" :
                        "border-destructive/40 text-destructive"}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryChip({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: string;
  tone: "neutral" | "success" | "destructive";
}) {
  const toneCls =
    tone === "success" ? "border-success/30 bg-success/5 text-success" :
    tone === "destructive" ? "border-destructive/30 bg-destructive/5 text-destructive" :
    "border-border bg-card text-muted-foreground";
  const valueCls =
    tone === "success" ? "text-success" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <div className={`rounded-2xl border p-4 ${toneCls}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5";
  if (type === "Insättning") return <ArrowDownToLine className={`${cls} text-success`} />;
  if (type === "Uttag") return <ArrowUpFromLine className={`${cls} text-destructive`} />;
  return <ArrowLeftRight className={`${cls} text-primary`} />;
}
