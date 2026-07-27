import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, ArrowUp, Check, Crown, Plus, TrendingUp, Wallet,
} from "lucide-react";
import { sek as fmtSek } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

type Level = {
  key: string; name: string; amount: number;
  maxTradesPerMonth: number; maxLeveragePct: number;
};

const LEVELS: Level[] = [
  { key: "START", name: "Start", amount: 2500, maxTradesPerMonth: 20, maxLeveragePct: 0 },
  { key: "BAS", name: "Bas", amount: 5000, maxTradesPerMonth: 40, maxLeveragePct: 0 },
  { key: "PLUS", name: "Plus", amount: 10000, maxTradesPerMonth: 60, maxLeveragePct: 0 },
  { key: "ADVANCED", name: "Advanced", amount: 25000, maxTradesPerMonth: 100, maxLeveragePct: 0 },
  { key: "PREMIUM", name: "Premium", amount: 50000, maxTradesPerMonth: 150, maxLeveragePct: 0 },
  { key: "PRIVATE", name: "Private", amount: 100000, maxTradesPerMonth: 200, maxLeveragePct: 0 },
  { key: "PRIVATE_PLUS", name: "Private Plus", amount: 250000, maxTradesPerMonth: 300, maxLeveragePct: 0 },
  { key: "WEALTH", name: "Wealth", amount: 500000, maxTradesPerMonth: 500, maxLeveragePct: 0 },
  { key: "WEALTH_ONE", name: "Wealth One", amount: 1000000, maxTradesPerMonth: 1000, maxLeveragePct: 0 },
];

type Mode = null | "upgrade" | "topup";

function DepositPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [mode, setMode] = useState<Mode>(null);
  const [customInput, setCustomInput] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [totalDeposited, setTotalDeposited] = useState<number>(0);

  const currentLevelName = profile?.assigned_level_name ?? null;
  const currentLevelSek = profile?.assigned_level_sek ?? 0;
  const currentBalance = profile?.cash_balance_sek ?? 0;

  const currentLevelIndex = useMemo(
    () => currentLevelSek ? LEVELS.findIndex((l) => l.amount === currentLevelSek) : -1,
    [currentLevelSek],
  );
  const upgradeOptions = useMemo(
    () => LEVELS.filter((l) => l.amount > currentLevelSek),
    [currentLevelSek],
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("investment_selections")
        .select("funded_amount_sek").eq("user_id", user.id).eq("onramp_status", "funded");
      setTotalDeposited((data ?? []).reduce((s, r) => s + Number(r.funded_amount_sek ?? 0), 0));
    })();
  }, [user]);

  function chooseAmount(n: number) { setSelected(n); setCustomInput(""); }
  function onCustomChange(v: string) {
    const digits = v.replace(/[^\d]/g, "");
    setCustomInput(digits ? new Intl.NumberFormat("sv-SE").format(Number(digits)) : "");
    setSelected(digits ? Number(digits) : null);
  }
  function proceed() {
    if (!selected || selected < 500) return;
    navigate({ to: "/activate", search: { amount: selected } });
  }
  function reset() { setMode(null); setSelected(null); setCustomInput(""); }

  return (
    <AppShell title="Sätt in kapital">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Status cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-5">
            <div className="flex items-center gap-2 text-primary">
              <Crown className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Din nivå</span>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold">{currentLevelName ?? "Ingen nivå tilldelad"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tak: {currentLevelSek ? fmtSek(currentLevelSek) : "–"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Tillgängligt saldo</span>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{fmtSek(currentBalance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Kapital tillgängligt för AI-boten</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Totalt insatt</span>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{fmtSek(totalDeposited)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Summan av bekräftade inbetalningar</p>
          </div>
        </section>

        {/* Step 1: Choose mode */}
        {mode === null && (
          <section>
            <div className="mb-3">
              <h2 className="font-display text-xl font-semibold">Vad vill du göra?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Välj ett av alternativen nedan för att fortsätta.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("upgrade")}
                disabled={upgradeOptions.length === 0}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-[0_0_0_1px_var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ArrowUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Uppgradera nivå</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Höj din investeringsnivå för fler trades per månad och tillgång till hävstång.
                  </p>
                </div>
                {upgradeOptions.length === 0 ? (
                  <Badge variant="outline" className="mt-1">Du är redan på högsta nivån</Badge>
                ) : (
                  <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                    Välj ny nivå <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode("topup")}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-[0_0_0_1px_var(--color-primary)]"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Toppa upp befintlig</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fyll på din befintliga portfölj med valfritt belopp (minst 500 kr).
                  </p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                  Ange belopp <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 2A: Upgrade grid */}
        {mode === "upgrade" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={reset} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Tillbaka
                </button>
                <h2 className="font-display text-xl font-semibold">Uppgradera din nivå</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Välj en nivå att uppgradera till – du kan bara röra dig uppåt.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upgradeOptions.map((l) => {
                const isSelected = selected === l.amount;
                const steps = currentLevelIndex >= 0 ? LEVELS.indexOf(l) - currentLevelIndex : 0;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => chooseAmount(l.amount)}
                    className={`group relative rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{l.name}</span>
                      {steps === 1 && <Badge variant="outline" className="text-[10px]">Nästa steg</Badge>}
                    </div>
                    <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{fmtSek(l.amount)}</div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px]">
                      <div>
                        <dt className="text-muted-foreground">Trades/mån</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums">{l.maxTradesPerMonth}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Max hävstång</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums">
                          {l.maxLeveragePct === 0 ? "Ingen" : `${l.maxLeveragePct} %`}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2B: Topup */}
        {mode === "topup" && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <button onClick={reset} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Tillbaka
            </button>
            <h2 className="font-display text-lg font-semibold">Fyll på med valfritt belopp</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ange beloppet du vill sätta in. Minsta insättning 500 kr.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="topup">Belopp (SEK)</Label>
                <div className="relative mt-1">
                  <Input
                    id="topup" inputMode="numeric" value={customInput}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder="10 000" className="pr-12"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">SEK</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1000, 5000, 10000, 25000, 50000].map((n) => (
                <button key={n} type="button" onClick={() => chooseAmount(n)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                    selected === n && !customInput ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {fmtSek(n)}
                </button>
              ))}
            </div>
            {selected && selected < 500 && (
              <p className="mt-2 text-xs text-destructive">Minsta belopp är 500 kr.</p>
            )}
          </section>
        )}

        {/* Sticky proceed bar */}
        {mode !== null && selected && selected >= 500 && (
          <div className="sticky bottom-4 z-10 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Att sätta in</p>
                <p className="font-display text-2xl font-semibold tabular-nums">{fmtSek(selected)}</p>
              </div>
              <Button size="lg" onClick={proceed} className="gap-2">
                Fortsätt till Bitcoin-betalning <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
