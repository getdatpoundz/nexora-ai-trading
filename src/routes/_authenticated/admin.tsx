import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateCustomer,
  adminListCustomers,
  adminResetPassword,
  adminMarkFunded,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, UserPlus, RefreshCw, CheckCircle2, KeyRound, ShieldOff, ShieldCheck, Check, X } from "lucide-react";
import {
  adminListWithdrawals,
  adminDecideWithdrawal,
  adminSetWithdrawalsEnabled,
} from "@/lib/withdrawal.functions";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const LEVELS = [
  { name: "Start", amount: 2500 },
  { name: "Basic", amount: 5000 },
  { name: "Bronze", amount: 10000 },
  { name: "Silver", amount: 25000 },
  { name: "Gold", amount: 50000 },
  { name: "Platinum", amount: 100000 },
  { name: "Diamond", amount: 250000 },
  { name: "Elite", amount: 500000 },
  { name: "Wealth One", amount: 1000000 },
];

function fmtSek(n: number | null | undefined) {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (isAdmin === null)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Kontrollerar behörighet ...</div>;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Åtkomst nekad</h1>
          <p className="mt-2 text-sm text-muted-foreground">Adminpanelen är endast för administratörer.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>Till översikten</Button>
        </div>
      </div>
    );
  }

  return <AdminInner />;
}

function AdminInner() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCustomers);
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Adminpanel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Skapa kundkonton, tilldela investeringsnivå och skicka inloggningslänk.
          </p>
        </div>

        <CreateCustomerForm onCreated={() => qc.invalidateQueries({ queryKey: ["admin-customers"] })} />

        <WithdrawalsPanel />

        <AdminSupportPanel />

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold">Kunder</h2>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-customers"] })}>
              <RefreshCw className="mr-2 h-3 w-3" /> Uppdatera
            </Button>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Laddar ...</div>
          ) : !customers?.length ? (
            <div className="p-6 text-sm text-muted-foreground">Inga kunder ännu.</div>
          ) : (
            <div className="divide-y divide-border">
              {customers.map((c: any) => (
                <CustomerRow key={c.id} customer={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateCustomerForm({ onCreated }: { onCreated: () => void }) {
  const createFn = useServerFn(adminCreateCustomer);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; existed: boolean } | null>(null);
  const [f, setF] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    level: "Basic",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const level = LEVELS.find((l) => l.name === f.level)!;
    setLoading(true);
    setCreds(null);
    try {
      const r = await createFn({
        data: {
          email: f.email,
          first_name: f.first_name,
          last_name: f.last_name,
          phone: f.phone || null,
          assigned_level_sek: level.amount,
          assigned_level_name: level.name,
        },
      });
      setCreds({ email: r.email, password: r.password, existed: r.existed });
      toast.success(
        r.existed
          ? "Kontot fanns redan — lösenordet återställt"
          : "Kundkonto skapat",
      );
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  const authUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-primary">
        <UserPlus className="h-4 w-4" />
        <h2 className="font-semibold">Skapa nytt kundkonto</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="email">E-post</Label>
          <Input id="email" type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label>Investeringsnivå</Label>
          <Select value={f.level} onValueChange={(v) => set("level", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.name} value={l.name}>
                  {l.name} — {fmtSek(l.amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="first_name">Förnamn</Label>
          <Input id="first_name" required value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="last_name">Efternamn</Label>
          <Input id="last_name" required value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="phone">Telefon (valfritt)</Label>
          <Input id="phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+46 ..." />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="mt-4 bg-primary text-primary-foreground hover:opacity-90">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Skapa kundkonto
      </Button>

      {creds && (
        <div className="mt-4 space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Inloggningsuppgifter — skicka till kunden
          </p>
          <CredRow label="Inloggningssida" value={authUrl} />
          <CredRow label="E-post" value={creds.email} />
          <CredRow label="Lösenord" value={creds.password} mono />
          <p className="text-xs text-muted-foreground">
            Kunden går till inloggningssidan, loggar in med uppgifterna ovan och kommer direkt till onboarding.
            Lösenordet visas endast en gång — kopiera det nu.
          </p>
        </div>
      )}
    </form>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex gap-2">
        <Input value={value} readOnly className={mono ? "font-mono text-sm" : "text-sm"} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => { navigator.clipboard.writeText(value); toast.success("Kopierad"); }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CustomerRow({ customer }: { customer: any }) {
  const resetFn = useServerFn(adminResetPassword);
  const markFn = useServerFn(adminMarkFunded);
  const qc = useQueryClient();
  const [newPw, setNewPw] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const status = customer.latest_selection?.onramp_status;
  const statusLabel =
    customer.activated_at
      ? "Krediterad"
      : status === "funded"
      ? "Krediterad"
      : status === "confirming"
      ? "Bekräftar"
      : status === "provider_open" || status === "awaiting_transfer"
      ? "Betalar"
      : customer.onboarding_completed
      ? "KYC klar"
      : customer.invited_at
      ? "Inbjuden"
      : "Ny";

  const badge =
    statusLabel === "Krediterad"
      ? "bg-primary/15 text-primary"
      : statusLabel === "Bekräftar" || statusLabel === "Betalar"
      ? "bg-warning/15 text-warning"
      : "bg-muted text-muted-foreground";

  const authUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";

  return (
    <div className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {customer.first_name} {customer.last_name}{" "}
          <span className="text-xs text-muted-foreground">· {customer.email}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Nivå: <span className="font-medium text-foreground">{customer.assigned_level_name ?? "–"} ({fmtSek(customer.assigned_level_sek)})</span>
          {" · "}Saldo: <span className="font-medium text-foreground">{fmtSek(customer.cash_balance_sek)}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>{statusLabel}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={busy === "pw"}
          onClick={async () => {
            if (!confirm(`Återställ lösenordet för ${customer.email}?`)) return;
            setBusy("pw");
            try {
              const r = await resetFn({ data: { email: customer.email } });
              setNewPw(r.password);
              toast.success("Nytt lösenord genererat");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Fel");
            } finally { setBusy(null); }
          }}
        >
          {busy === "pw" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><KeyRound className="mr-1 h-3 w-3" /> Nytt lösenord</>}
        </Button>
        {status !== "funded" && !customer.activated_at && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy === "fund" || !customer.assigned_level_sek}
            onClick={async () => {
              if (!confirm(`Kreditera ${fmtSek(customer.assigned_level_sek)} manuellt?`)) return;
              setBusy("fund");
              try {
                await markFn({ data: { user_id: customer.id } });
                toast.success("Kund krediterad");
                qc.invalidateQueries({ queryKey: ["admin-customers"] });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Fel");
              } finally { setBusy(null); }
            }}
          >
            {busy === "fund" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-1 h-3 w-3" /> Kreditera</>}
          </Button>
        )}
      </div>
      {newPw && (
        <div className="w-full space-y-2 md:mt-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Inloggningssida</p>
            <div className="mt-1 flex gap-2">
              <Input value={authUrl} readOnly className="text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(authUrl); toast.success("Kopierad"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nytt lösenord</p>
            <div className="mt-1 flex gap-2">
              <Input value={newPw} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(newPw); toast.success("Kopierad"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WithdrawalsPanel() {
  const listFn = useServerFn(adminListWithdrawals);
  const decideFn = useServerFn(adminDecideWithdrawal);
  const toggleFn = useServerFn(adminSetWithdrawalsEnabled);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => listFn(),
    refetchInterval: 10000,
  });
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const pending = (data ?? []).filter((r: any) => r.status === "pending");
  const rest = (data ?? []).filter((r: any) => r.status !== "pending");

  async function decide(id: string, decision: "approve" | "reject", block = false) {
    setBusy(id + decision);
    try {
      await decideFn({
        data: { id, decision, note: noteById[id]?.trim() || undefined, block_future_withdrawals: block },
      });
      toast.success(decision === "approve" ? "Uttag godkänt" : block ? "Uttag nekat och kund spärrad" : "Uttag nekat");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fel");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock(user_id: string, enabled: boolean) {
    const reason = enabled
      ? undefined
      : prompt("Anledning som visas för kunden:", "Ytterligare verifiering krävs.") ?? undefined;
    await toggleFn({ data: { user_id, enabled, reason } });
    toast.success(enabled ? "Uttag återaktiverade" : "Uttag spärrat");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-semibold">Uttagsförfrågningar</h2>
          <p className="text-xs text-muted-foreground">
            {pending.length} väntar på granskning
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-withdrawals"] })}>
          <RefreshCw className="mr-2 h-3 w-3" /> Uppdatera
        </Button>
      </div>
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Laddar ...</div>
      ) : pending.length === 0 && rest.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Inga uttagsförfrågningar ännu.</div>
      ) : (
        <div className="divide-y divide-border">
          {pending.map((r: any) => (
            <div key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.customer?.first_name} {r.customer?.last_name}{" "}
                    <span className="text-xs text-muted-foreground">· {r.customer?.email}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Belopp: <span className="font-semibold text-foreground tabular-nums">{fmtSek(Number(r.amount_sek))}</span>
                    {" · "}Saldo: <span className="tabular-nums">{fmtSek(Number(r.customer?.cash_balance_sek ?? 0))}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    → {r.btc_address}
                  </p>
                </div>
                <span className="rounded-full border border-warning/40 px-2 py-0.5 text-[10px] font-semibold text-warning">
                  Väntar
                </span>
              </div>
              <Textarea
                placeholder="Notering till kunden (visas i deras uttagshistorik)"
                value={noteById[r.id] ?? ""}
                onChange={(e) => setNoteById((p) => ({ ...p, [r.id]: e.target.value }))}
                className="min-h-[60px] text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy === r.id + "approve"}
                  onClick={() => decide(r.id, "approve")}
                >
                  {busy === r.id + "approve" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                  Godkänn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id + "reject"}
                  onClick={() => decide(r.id, "reject", false)}
                >
                  <X className="mr-1 h-3 w-3" /> Neka
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === r.id + "reject"}
                  onClick={() => decide(r.id, "reject", true)}
                >
                  <ShieldOff className="mr-1 h-3 w-3" /> Neka + spärra uttag
                </Button>
              </div>
            </div>
          ))}

          {rest.length > 0 && (
            <div className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Historik
              </p>
              <ul className="space-y-1 text-xs">
                {rest.slice(0, 20).map((r: any) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-3 py-1.5">
                    <span className="truncate">
                      {r.customer?.email} · <span className="tabular-nums">{fmtSek(Number(r.amount_sek))}</span>
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      r.status === "approved" ? "border-success/40 text-success" :
                      r.status === "rejected" ? "border-destructive/40 text-destructive" :
                      "border-border text-muted-foreground"
                    }`}>
                      {r.status === "approved" ? "Godkänd" : r.status === "rejected" ? "Nekad" : "Avbruten"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleBlock(r.user_id, true)}
                      className="h-6 px-2 text-[10px]"
                      title="Återaktivera uttag för denna kund"
                    >
                      <ShieldCheck className="mr-1 h-3 w-3" /> Lås upp
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
