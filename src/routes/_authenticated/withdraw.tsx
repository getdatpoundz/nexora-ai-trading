import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bitcoin, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { sek, dateSv } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createWithdrawalRequest,
  listMyWithdrawals,
  cancelMyWithdrawal,
} from "@/lib/withdrawal.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/withdraw")({
  component: WithdrawPage,
});

function WithdrawPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const balance = Number(profile?.cash_balance_sek ?? 0);
  const blocked = profile?.withdrawals_enabled === false;

  const createFn = useServerFn(createWithdrawalRequest);
  const listFn = useServerFn(listMyWithdrawals);
  const cancelFn = useServerFn(cancelMyWithdrawal);
  const qc = useQueryClient();
  const { data: list } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkStep, setCheckStep] = useState(0);
  const [verification, setVerification] = useState<null | {
    amount: number;
    required: number;
  }>(null);

  const amt = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const canSubmit = !blocked && amt >= 100 && amt <= balance && address.trim().length >= 20;

  const hasCompletedWithdrawal = (list ?? []).some((r) => r.status === "approved");
  // Portföljvärde = tillgängligt saldo. Höga förstagångsuttag kräver verifiering.
  const portfolioValue = balance;
  const HIGH_AMOUNT_SEK = 10000;
  const needsVerification = (a: number) =>
    !hasCompletedWithdrawal && (a >= HIGH_AMOUNT_SEK || a >= portfolioValue * 0.3);

  const CHECKS = [
    "Validerar BTC-adress…",
    "Kontrollerar saldo och pågående uttag…",
    "Kör AML- och riskkontroll…",
    "Verifierar uttagshistorik…",
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setVerification(null);
    try {
      for (let i = 0; i < CHECKS.length; i++) {
        setCheckStep(i);
        await new Promise((r) => setTimeout(r, 700));
      }
      setCheckStep(CHECKS.length);

      if (needsVerification(amt)) {
        setVerification({ amount: amt, required: Math.max(portfolioValue, amt) });
        return;
      }

      await createFn({ data: { amount_sek: amt, btc_address: address.trim() } });
      toast.success("Uttagsförfrågan skickad. Väntar på godkännande.");
      setAmount("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte skicka förfrågan");
    } finally {
      setBusy(false);
      setCheckStep(0);
    }
  }

  return (
    <AppShell title="Ta ut">
      <div className="mx-auto max-w-3xl space-y-6">
        {blocked && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Uttag är tillfälligt spärrat på ditt konto
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile?.withdrawal_block_reason ??
                    "Vi behöver ytterligare verifiering innan du kan göra uttag."}{" "}
                  <Link to="/support" className="font-medium text-destructive underline">
                    Kontakta support
                  </Link>{" "}
                  för att låsa upp.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Bitcoin className="h-4 w-4" />
            <h2 className="font-semibold">Ta ut med Bitcoin</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uttag sker endast i Bitcoin till en adress du anger. Förfrågan granskas manuellt
            av vårt team och skickas normalt inom 1–2 bankdagar.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tillgängligt saldo</span>
                <span className="tabular-nums font-semibold">{sek(balance)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="addr">BTC-mottagaradress</Label>
              <Input
                id="addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="bc1... eller 1... / 3..."
                className="mt-1 font-mono text-sm"
                disabled={blocked}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dubbelkolla adressen. Bitcoin-överföringar är oåterkalleliga.
              </p>
            </div>

            <div>
              <Label htmlFor="amt">Belopp (SEK)</Label>
              <div className="relative mt-1">
                <Input
                  id="amt"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1 000"
                  disabled={blocked}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  SEK
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Minst 100 kr</span>
                <button
                  type="button"
                  disabled={blocked || balance <= 0}
                  onClick={() => setAmount(String(Math.floor(balance)))}
                  className="font-medium text-primary hover:underline disabled:opacity-40"
                >
                  Använd max
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Begär uttag
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold">Dina uttagsförfrågningar</h3>
          </div>
          {(list ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Inga uttag ännu.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(list ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <StatusIcon status={r.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold tabular-nums">
                        {sek(Number(r.amount_sek))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dateSv(r.created_at)}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      → {r.btc_address}
                    </p>
                    {r.admin_note && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Not: {r.admin_note}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await cancelFn({ data: { id: r.id } });
                        qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
                      }}
                    >
                      Avbryt
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusIcon({ status }: { status: string }) {
  const cls = "h-5 w-5 shrink-0";
  if (status === "approved") return <CheckCircle2 className={`${cls} text-success`} />;
  if (status === "rejected") return <XCircle className={`${cls} text-destructive`} />;
  if (status === "cancelled") return <XCircle className={`${cls} text-muted-foreground`} />;
  return <Clock className={`${cls} text-warning`} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Väntar", cls: "border-warning/40 text-warning" },
    approved: { label: "Godkänd", cls: "border-success/40 text-success" },
    rejected: { label: "Nekad", cls: "border-destructive/40 text-destructive" },
    cancelled: { label: "Avbruten", cls: "border-border text-muted-foreground" },
  };
  const m = map[status] ?? map.pending;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
