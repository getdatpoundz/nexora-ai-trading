import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Copy,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sek } from "@/lib/format";
import {
  METHOD_LABELS,
  METHOD_DESCRIPTIONS,
  CURRENCY_LABELS,
  demoDepositAddress,
  amountToCrypto,
  formatCrypto,
  type OnrampMethod,
  type OnrampCurrency,
} from "@/lib/onramp";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionId: string | null;
  amountSek: number;
  onFunded?: () => void;
};

const METHOD_ICONS: Record<OnrampMethod, typeof CreditCard> = {
  card: CreditCard,
  swish: Smartphone,
  sepa: Landmark,
  crypto: Wallet,
};

export function OnrampFlow({ open, onOpenChange, selectionId, amountSek, onFunded }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<OnrampMethod | null>(null);
  const [currency, setCurrency] = useState<OnrampCurrency>("BTC");
  const [progress, setProgress] = useState(0);
  const [address, setAddress] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  const cryptoAmount = useMemo(() => amountToCrypto(amountSek, currency), [amountSek, currency]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setMethod(null);
      setProgress(0);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }, [open]);

  async function pickMethod(m: OnrampMethod) {
    setMethod(m);
    if (selectionId) {
      await supabase
        .from("investment_selections")
        .update({
          onramp_provider: "transak_demo",
          onramp_method: m,
          onramp_status: "method_selected",
        })
        .eq("id", selectionId);
    }
    setStep(2);
  }

  async function goToWidget() {
    if (selectionId) {
      await supabase
        .from("investment_selections")
        .update({ onramp_currency: currency, onramp_status: "provider_open" })
        .eq("id", selectionId);
    }
    setStep(3);
  }

  async function goToAddress() {
    const { data: userRes } = await supabase.auth.getUser();
    const seed = userRes.user?.id ?? "demo";
    const addr = demoDepositAddress(currency, seed);
    const ord = `NEX-${Date.now().toString(36).toUpperCase()}`;
    setAddress(addr);
    setOrderId(ord);
    if (selectionId) {
      await supabase
        .from("investment_selections")
        .update({
          deposit_address: addr,
          deposit_memo: ord,
          onramp_status: "awaiting_transfer",
        })
        .eq("id", selectionId);
    }
    setStep(4);
  }

  async function simulateConfirmation() {
    setStep(5);
    setProgress(0);
    if (selectionId) {
      await supabase
        .from("investment_selections")
        .update({ onramp_status: "confirming" })
        .eq("id", selectionId);
    }
    const start = Date.now();
    const duration = 6000;
    timerRef.current = window.setInterval(async () => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (selectionId) {
          await supabase
            .from("investment_selections")
            .update({
              onramp_status: "funded",
              funded_amount_sek: amountSek,
              funded_at: new Date().toISOString(),
            })
            .eq("id", selectionId);
        }

        toast.success("Insättning bekräftad i demoläget – ditt saldo har uppdaterats.");
        onFunded?.();
      }
    }, 200);
  }

  function copyAddress() {
    navigator.clipboard.writeText(address);
    toast.success("Adress kopierad");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-muted/40 px-6 py-5">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Demoläge
              </Badge>
              <Badge variant="outline" className="text-xs">
                Steg {step} av 5
              </Badge>
            </div>
            <DialogTitle className="font-display text-2xl">
              {step === 1 && "Välj betalmetod"}
              {step === 2 && "Välj kryptovaluta"}
              {step === 3 && "Betalning via on-ramp"}
              {step === 4 && "Skicka till Nexoras adress"}
              {step === 5 && "Bekräftar din insättning"}
            </DialogTitle>
            <DialogDescription>
              Investering på <span className="font-semibold text-foreground">{sek(amountSek)}</span>.
              Inga riktiga medel förflyttas i demoläget.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(METHOD_LABELS) as OnrampMethod[]).map((m) => {
                const Icon = METHOD_ICONS[m];
                return (
                  <button
                    key={m}
                    onClick={() => pickMethod(m)}
                    className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-primary/[0.03]"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 font-semibold">{METHOD_LABELS[m]}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{METHOD_DESCRIPTIONS[m]}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                      Välj <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vilken kryptovaluta ska köpas för dina {sek(amountSek)}? Nexora rebalanserar
                enligt din strategi efter insättning.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(CURRENCY_LABELS) as OnrampCurrency[]).map((c) => {
                  const active = currency === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{c}</div>
                      <div className="text-xs text-muted-foreground">{CURRENCY_LABELS[c]}</div>
                      <div className="mt-3 text-xs">
                        Du får <span className="font-semibold text-foreground">
                          ≈ {formatCrypto(amountToCrypto(amountSek, c), c)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Tillbaka
                </Button>
                <Button onClick={goToWidget}>
                  Fortsätt <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && method && (
            <div className="space-y-4">
              {/* Mock av Transak-widget */}
              <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-muted/40">
                <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-6 w-6 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                      T
                    </div>
                    <span className="text-sm font-semibold">Transak</span>
                    <Badge variant="outline" className="text-[10px]">Simulering</Badge>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-4 p-5">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-xs text-muted-foreground">Du betalar</div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-display text-3xl font-bold">{sek(amountSek)}</span>
                      <Badge variant="secondary">SEK</Badge>
                    </div>
                  </div>
                  <div className="grid place-items-center">
                    <div className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background">
                      <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-xs text-muted-foreground">Du får</div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-display text-2xl font-bold tabular-nums">
                        ≈ {formatCrypto(cryptoAmount, currency)}
                      </span>
                      <Badge variant="secondary">{currency}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Betalmetod: <span className="font-semibold text-foreground">{METHOD_LABELS[method]}</span>
                    <br />
                    I skarpt läge öppnas Transaks widget här. Kunden slutför KYC + betalning
                    utan att lämna Nexora.
                  </div>
                </div>
                <div className="border-t border-border bg-background/60 px-5 py-3">
                  <Button className="w-full" onClick={goToAddress}>
                    Slutför betalning (simulerad) <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-start">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Tillbaka
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Betalningen är godkänd hos on-rampen. {currency} skickas nu till Nexoras
                mottagaradress. Detta sker automatiskt i skarpt läge.
              </p>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nexora {currency}-adress
                  </span>
                  <Badge variant="outline" className="text-[10px]">Demoadress</Badge>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                  <code className="flex-1 truncate font-mono text-xs">{address}</code>
                  <Button size="sm" variant="ghost" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Belopp</div>
                    <div className="mt-0.5 font-semibold tabular-nums">
                      {formatCrypto(cryptoAmount, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Referens</div>
                    <div className="mt-0.5 font-mono font-semibold">{orderId}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/90">
                Skicka <span className="font-semibold">endast {currency}</span> till denna adress.
                Andra tillgångar går förlorade. I skarpt läge genereras en unik adress per kund.
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Tillbaka
                </Button>
                <Button onClick={simulateConfirmation}>
                  Jag har skickat <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 py-6 text-center">
              {progress < 100 ? (
                <>
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                  <div>
                    <p className="font-display text-lg font-semibold">Väntar på on-chain-bekräftelse</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCrypto(cryptoAmount, currency)} · Referens {orderId}
                    </p>
                  </div>
                  <Progress value={progress} className="mx-auto max-w-sm" />
                  <p className="text-xs text-muted-foreground">
                    I skarpt läge: 2 blockbekräftelser för {currency}. Simulering pågår…
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold">Insättning bekräftad</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sek(amountSek)} har krediterats till din portfölj.
                    </p>
                  </div>
                  <Button onClick={() => onOpenChange(false)}>Till min portfölj</Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
