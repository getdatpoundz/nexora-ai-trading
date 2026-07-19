import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Check, ShieldCheck, Info, CheckCircle2 } from "lucide-react";
import { sek } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Level = {
  key: string;
  name: string;
  amount: number;
  description: string;
  popular?: boolean;
};

const LEVELS: Level[] = [
  { key: "START", name: "Start", amount: 2500, description: "Den lägsta investeringsnivån för dig som vill börja med ett mindre belopp." },
  { key: "BAS", name: "Bas", amount: 5000, description: "En grundnivå för dig som vill ta ett första steg in på kryptomarknaden." },
  { key: "PLUS", name: "Plus", amount: 10000, description: "För dig som vill skapa en större marknadsexponering och följa utvecklingen långsiktigt." },
  { key: "ADVANCED", name: "Advanced", amount: 25000, description: "En högre investeringsnivå som kräver god förståelse för kryptomarknadens risker.", popular: true },
  { key: "PREMIUM", name: "Premium", amount: 50000, description: "För erfarna användare som accepterar betydande värdeförändringar och kapitalrisk." },
  { key: "PRIVATE", name: "Private", amount: 100000, description: "En större kapitalplacering med utökad kontroll av investerarens profil och pengarnas ursprung." },
  { key: "PRIVATE_PLUS", name: "Private Plus", amount: 250000, description: "För större kapitalplaceringar som kräver kompletterad kundkännedom före aktivering." },
  { key: "WEALTH", name: "Wealth", amount: 500000, description: "En avancerad nivå där personlig kontakt och utökad verifiering krävs innan insättning." },
  { key: "WEALTH_ONE", name: "Wealth One", amount: 1000000, description: "Den högsta nivån. Kräver individuell granskning, dokumentation och godkännande innan insättning." },
];

const MIN_AMOUNT = 2500;
const ENHANCED_THRESHOLD = 100000;
const MANUAL_REVIEW_THRESHOLD = 500000;
const FEE_RATE = 0.009;

const STRATEGY_LABELS: Record<string, string> = {
  forsiktig: "Försiktig",
  balanserad: "Balanserad",
  tillvaxt: "Tillväxt",
};

function formatSekPlain(n: number) {
  return new Intl.NumberFormat("sv-SE").format(n);
}

function findLevel(amount: number): Level | null {
  return LEVELS.find((l) => l.amount === amount) ?? null;
}

type Props = {
  strategyId?: string | null;
  verificationStatus?: string | null;
  incomeRange?: string | null;
};

export function InvestmentLevels({ strategyId, verificationStatus, incomeRange }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmations, setConfirmations] = useState({ risk: false, loss: false, situation: false, info: false });
  const [submitting, setSubmitting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const selectedLevel = useMemo(() => (selectedKey ? LEVELS.find((l) => l.key === selectedKey) ?? null : null), [selectedKey]);
  const displayName = selectedLevel?.name ?? (customMode && amount ? "Eget belopp" : null);
  const enhancedReview = (amount ?? 0) >= ENHANCED_THRESHOLD;
  const manualReview = (amount ?? 0) >= MANUAL_REVIEW_THRESHOLD;
  const fees = amount ? Math.round(amount * FEE_RATE) : 0;
  const total = amount ? amount + fees : 0;

  const profileMismatch = useMemo(() => {
    if (!amount) return false;
    if (incomeRange === "0-200" && amount > 25000) return true;
    if (incomeRange === "200-400" && amount > 100000) return true;
    return amount >= 250000;
  }, [amount, incomeRange]);

  const allConfirmed = Object.values(confirmations).every(Boolean);

  function chooseLevel(l: Level) {
    setSelectedKey(l.key);
    setCustomMode(false);
    setCustomError(null);
    setAmount(l.amount);
  }

  function toggleCustom() {
    setCustomMode(true);
    setSelectedKey(null);
    setAmount(null);
  }

  function validateCustom(raw: string): { value: number | null; error: string | null } {
    const cleaned = raw.replace(/\s|kr|SEK/gi, "").replace(",", ".");
    if (!cleaned) return { value: null, error: "Ange ett belopp." };
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { value: null, error: "Endast siffror är tillåtna." };
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return { value: null, error: "Ogiltigt belopp." };
    if (n < 0) return { value: null, error: "Beloppet får inte vara negativt." };
    if (!Number.isInteger(n)) return { value: null, error: "Endast hela kronor är tillåtna." };
    if (n < MIN_AMOUNT) return { value: null, error: `Minsta belopp är ${sek(MIN_AMOUNT)}.` };
    return { value: n, error: null };
  }

  function onCustomChange(v: string) {
    const digits = v.replace(/[^\d]/g, "");
    const formatted = digits ? formatSekPlain(Number(digits)) : "";
    setCustomInput(formatted);
    const { value, error } = validateCustom(digits);
    setCustomError(error);
    setAmount(value);
    if (value) {
      const match = findLevel(value);
      setSelectedKey(match?.key ?? null);
    } else {
      setSelectedKey(null);
    }
  }

  async function openReview() {
    if (!amount) return;
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        toast.error("Du måste vara inloggad.");
        return;
      }
      const level = findLevel(amount);
      const payload = {
        user_id: userRes.user.id,
        level_name: level?.key ?? "CUSTOM",
        selected_amount_sek: amount,
        strategy_id: strategyId ?? null,
        risk_acknowledged: false,
        enhanced_review_required: enhancedReview,
        manual_review_required: manualReview,
        status: "draft" as const,
      };
      const { data, error } = await supabase
        .from("investment_selections")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      setSavedId(data.id);
      setReviewOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kunde inte spara valet.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmSelection() {
    if (!savedId || !allConfirmed) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("investment_selections")
        .update({
          risk_acknowledged: true,
          status: manualReview ? "pending_review" : "draft",
        })
        .eq("id", savedId);
      if (error) throw error;
      toast.success("Ditt val har registrerats i demoläget. Ingen betalning eller investering har genomförts.", {
        duration: 6000,
      });
      setReviewOpen(false);
      setConfirmations({ risk: false, loss: false, situation: false, info: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kunde inte bekräfta valet.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Välj din investeringsnivå
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Välj det belopp som passar din ekonomiska situation, erfarenhet och risktolerans.
          Du kan förlora hela det investerade kapitalet.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((l) => {
          const isSelected = selectedKey === l.key;
          const requiresEnhanced = l.amount >= ENHANCED_THRESHOLD;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => chooseLevel(l)}
              className={`group relative flex h-full flex-col rounded-2xl border p-5 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
              }`}
              aria-pressed={isSelected}
            >
              {l.popular && (
                <Badge className="absolute -top-2 left-4 border-0 bg-primary text-primary-foreground">
                  Populärt val
                </Badge>
              )}
              {isSelected && (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {l.name}
                </span>
              </div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {sek(l.amount)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.description}</p>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span>Hög risk – du kan förlora hela kapitalet</span>
              </div>

              {requiresEnhanced && (
                <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Utökad verifiering krävs
                </div>
              )}

              <div className="mt-5 border-t border-border/60 pt-4">
                <span
                  className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}
                >
                  {isSelected ? "Vald nivå" : "Välj nivå"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom amount */}
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Ange ett annat belopp</p>
            <p className="text-xs text-muted-foreground">Minsta belopp {sek(MIN_AMOUNT)}. Endast hela kronor.</p>
          </div>
          {!customMode ? (
            <Button variant="outline" size="sm" onClick={toggleCustom}>
              Ange eget belopp
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomMode(false);
                setCustomInput("");
                setCustomError(null);
                setAmount(null);
              }}
            >
              Avbryt
            </Button>
          )}
        </div>
        {customMode && (
          <div className="mt-4 max-w-sm">
            <Label htmlFor="custom-amount">Belopp (SEK)</Label>
            <div className="relative mt-1">
              <Input
                id="custom-amount"
                inputMode="numeric"
                autoComplete="off"
                value={customInput}
                onChange={(e) => onCustomChange(e.target.value)}
                placeholder="0"
                className="pr-12"
                aria-invalid={!!customError}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                SEK
              </span>
            </div>
            {customError && <p className="mt-2 text-xs text-destructive">{customError}</p>}
            {!customError && amount && enhancedReview && (
              <p className="mt-2 flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Beloppet är markerat för utökad verifiering.
              </p>
            )}
            {!customError && amount && manualReview && (
              <p className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Beloppet kräver manuell granskning innan du kan fortsätta.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Profile mismatch warning */}
      {amount && profileMismatch && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-foreground">
              Det valda beloppet kan vara högt i förhållande till informationen i din investerarprofil.
              Du kan behöva lämna kompletterande uppgifter innan du fortsätter.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {amount && (
        <div className="sticky bottom-4 z-10 rounded-2xl border border-primary/30 bg-card/95 p-5 shadow-lg backdrop-blur md:bottom-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <SummaryItem label="Din valda nivå" value={displayName ?? "—"} />
              <SummaryItem label="Investeringsbelopp" value={sek(amount)} strong />
              <SummaryItem
                label="Vald AI-strategi"
                value={strategyId ? STRATEGY_LABELS[strategyId] ?? strategyId : "Balanserad"}
              />
              <SummaryItem label="Risknivå" value="Hög risk" />
              <SummaryItem
                label="Verifieringsstatus"
                value={
                  manualReview
                    ? "Manuell granskning"
                    : enhancedReview
                    ? "Utökad verifiering"
                    : verificationStatus === "verifierad"
                    ? "Verifierad"
                    : "Standard"
                }
              />
              <SummaryItem label="Förvaltningsavgift (0,9 %)" value={sek(fees)} />
              <SummaryItem label="Totalbelopp" value={sek(total)} strong />
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedKey(null);
                  setAmount(null);
                  setCustomMode(false);
                  setCustomInput("");
                  setCustomError(null);
                }}
              >
                Ändra val
              </Button>
              <Button onClick={openReview} disabled={submitting || !!customError}>
                Fortsätt till granskning
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Granska ditt val</DialogTitle>
            <DialogDescription>
              Du har valt att gå vidare med en planerad investering på{" "}
              <span className="font-semibold text-foreground">{amount ? sek(amount) : "—"}</span>. Detta
              steg genomför ingen betalning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <RowKV k="Investeringsbelopp" v={amount ? sek(amount) : "—"} />
            <RowKV k="Strategi" v={strategyId ? STRATEGY_LABELS[strategyId] ?? strategyId : "Balanserad"} />
            <RowKV k="Risknivå" v="Hög risk – du kan förlora hela kapitalet" />
            <RowKV k="Förvaltningsavgift" v={`${sek(fees)} (0,9 %)`} />
            <RowKV k="Totalt" v={sek(total)} strong />
          </div>

          <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground/90">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <p>Kryptotillgångar kan förändras kraftigt i värde. Hela kapitalet kan gå förlorat. Historisk utveckling garanterar inte framtida resultat.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Confirm
              id="c-risk"
              checked={confirmations.risk}
              onChange={(v) => setConfirmations((c) => ({ ...c, risk: v }))}
              label="Jag förstår att kryptotillgångar innebär hög risk."
            />
            <Confirm
              id="c-loss"
              checked={confirmations.loss}
              onChange={(v) => setConfirmations((c) => ({ ...c, loss: v }))}
              label="Jag förstår att jag kan förlora hela det investerade kapitalet."
            />
            <Confirm
              id="c-sit"
              checked={confirmations.situation}
              onChange={(v) => setConfirmations((c) => ({ ...c, situation: v }))}
              label="Jag bekräftar att beloppet är förenligt med min ekonomiska situation."
            />
            <Confirm
              id="c-info"
              checked={confirmations.info}
              onChange={(v) => setConfirmations((c) => ({ ...c, info: v }))}
              label="Jag har läst avgifts- och riskinformationen."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={confirmSelection} disabled={!allConfirmed || submitting}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Bekräfta och gå vidare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SummaryItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm ${strong ? "font-semibold text-foreground" : "text-foreground/90"}`}>
        {value}
      </p>
    </div>
  );
}

function RowKV({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{v}</span>
    </div>
  );
}

function Confirm({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span className="text-foreground/90">{label}</span>
    </label>
  );
}

// Prevent unused import warnings in strict setups
void useEffect;
