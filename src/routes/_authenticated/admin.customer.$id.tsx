import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetCustomerDashboard } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customer/$id")({
  component: AdminCustomerPage,
});

function fmtSek(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "–";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(Number(n));
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "–";
  try { return new Date(s).toLocaleString("sv-SE"); } catch { return s; }
}

function AdminCustomerPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { id } = useParams({ from: "/_authenticated/admin/customer/$id" });
  const fn = useServerFn(adminGetCustomerDashboard);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-customer-dashboard", id],
    queryFn: () => fn({ data: { user_id: id } }),
    enabled: isAdmin === true,
    refetchInterval: 10000,
  });

  if (isAdmin === null)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Kontrollerar behörighet ...</div>;
  if (!isAdmin)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Åtkomst nekad</div>;

  const p = data?.profile as any;
  const holdings = (data?.holdings ?? []) as any[];
  const trades = (data?.trades ?? []) as any[];
  const bots = (data?.bot_sessions ?? []) as any[];
  const sels = (data?.selections ?? []) as any[];
  const withdrawals = (data?.withdrawals ?? []) as any[];

  const holdingsCostSek = holdings.reduce((a, h) => a + Number(h.avg_cost_sek || 0) * Number(h.quantity || 0), 0);
  const cash = Number(p?.cash_balance_sek || 0);
  const totalCost = cash + holdingsCostSek;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Tillbaka till admin
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold">
              {p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "Kund"}
            </h1>
            <p className="text-xs text-muted-foreground">{p?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Uppdatera
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Laddar ...</div>
        ) : !p ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Kund saknas</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Kontant (SEK)" value={fmtSek(cash)} />
              <Stat label="Innehav (kostnad)" value={fmtSek(holdingsCostSek)} />
              <Stat label="Totalt (kostnad)" value={fmtSek(totalCost)} />
              <Stat label="Nivå" value={`${p.assigned_level_name ?? "–"} · ${fmtSek(p.assigned_level_sek)}`} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Stat label="Verifiering" value={p.verification_status ?? "–"} />
              <Stat label="Onboarding" value={p.onboarding_completed ? "Klar" : "Ej klar"} />
              <Stat label="Uttag" value={p.withdrawals_enabled === false ? "Blockerat" : "Tillåtet"} />
            </div>

            <Panel title="Innehav">
              {holdings.length === 0 ? <Empty /> : (
                <Table
                  head={["Symbol", "Typ", "Antal", "Snittkostnad", "Värde (kostnad)"]}
                  rows={holdings.map((h) => [
                    h.symbol,
                    h.asset_type,
                    Number(h.quantity).toLocaleString("sv-SE", { maximumFractionDigits: 6 }),
                    fmtSek(h.avg_cost_sek),
                    fmtSek(Number(h.avg_cost_sek) * Number(h.quantity)),
                  ])}
                />
              )}
            </Panel>

            <Panel title="Bot-sessioner">
              {bots.length === 0 ? <Empty /> : (
                <Table
                  head={["Status", "Nivå", "Start", "Multiplier", "Trades", "Mål-trades"]}
                  rows={bots.map((b) => [
                    b.status,
                    b.level_key ?? "–",
                    fmtDate(b.started_at),
                    `${Number(b.current_multiplier ?? 1).toFixed(3)}x / ${Number(b.target_multiplier ?? 1).toFixed(2)}x`,
                    String(b.trades_generated ?? 0),
                    String(b.target_trades ?? 0),
                  ])}
                />
              )}
            </Panel>

            <Panel title="Senaste trades">
              {trades.length === 0 ? <Empty /> : (
                <Table
                  head={["Tid", "Symbol", "Sida", "Antal", "Pris", "Total"]}
                  rows={trades.map((t) => [
                    fmtDate(t.executed_at ?? t.created_at),
                    t.symbol,
                    t.side,
                    Number(t.quantity).toLocaleString("sv-SE", { maximumFractionDigits: 6 }),
                    fmtSek(t.price_sek),
                    fmtSek(t.total_sek),
                  ])}
                />
              )}
            </Panel>

            <Panel title="Insättningsval">
              {sels.length === 0 ? <Empty /> : (
                <Table
                  head={["Skapad", "Nivå", "Belopp", "Status", "On-ramp", "Krediterat"]}
                  rows={sels.map((s) => [
                    fmtDate(s.created_at),
                    s.level_name,
                    fmtSek(s.selected_amount_sek),
                    s.status ?? "–",
                    s.onramp_status ?? "–",
                    s.funded_amount_sek ? `${fmtSek(s.funded_amount_sek)} @ ${fmtDate(s.funded_at)}` : "–",
                  ])}
                />
              )}
            </Panel>

            <Panel title="Uttag">
              {withdrawals.length === 0 ? <Empty /> : (
                <Table
                  head={["Skapad", "Belopp", "Nätverk", "Adress", "Status"]}
                  rows={withdrawals.map((w) => [
                    fmtDate(w.created_at),
                    fmtSek(w.amount_sek),
                    w.network ?? "–",
                    w.address ?? "–",
                    w.status,
                  ])}
                />
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4 font-semibold">{title}</div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <div className="p-4 text-sm text-muted-foreground">Inget att visa.</div>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            {head.map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {r.map((c, j) => <td key={j} className="px-2 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
