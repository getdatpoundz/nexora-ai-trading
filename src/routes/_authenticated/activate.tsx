import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyOnboardingState } from "@/lib/onboarding.functions";
import {
  createCryptoDeposit,
  pollCryptoDeposit,
} from "@/lib/crypto-deposit.functions";
import { Button } from "@/components/ui/button";
import {
  Bitcoin,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Timer,
  Download,
  CreditCard,
  Send,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/activate")({
  validateSearch: (s: Record<string, unknown>) => ({
    amount: typeof s.amount === "number" ? s.amount : s.amount ? Number(s.amount) : undefined,
  }),
  component: ActivatePage,
});

function fmtSek(n: number | null | undefined) {
  if (!n) return "–";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

function ActivatePage() {
  const navigate = useNavigate();
  const { amount: overrideAmount } = Route.useSearch();
  const fetchState = useServerFn(getMyOnboardingState);
  const create = useServerFn(createCryptoDeposit);
  const poll = useServerFn(pollCryptoDeposit);

  const [deposit, setDeposit] = useState<Awaited<
    ReturnType<typeof create>
  > | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<"addr" | "amt" | null>(null);
  const [guideDone, setGuideDone] = useState(false);

  const { data: state } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => fetchState(),
  });

  const { data: pollData } = useQuery({
    queryKey: ["crypto-poll", deposit?.selectionId],
    queryFn: () => poll(),
    enabled: !!deposit,
    refetchInterval: deposit ? 8000 : false,
  });

  useEffect(() => {
    if (pollData?.status === "funded") {
      toast.success("Betalning bekräftad! Kontot är krediterat.");
      const t = setTimeout(() => navigate({ to: "/portfolio" }), 1800);
      return () => clearTimeout(t);
    }
  }, [pollData, navigate]);

  const amount = overrideAmount ?? state?.profile?.assigned_level_sek ?? 0;

  const start = async () => {
    setCreating(true);
    try {
      const r = await create({ data: { currency: "BTC", amountSek: overrideAmount } });
      setDeposit(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };


  const qrPayload = useMemo(() => {
    if (!deposit) return "";
    return `bitcoin:${deposit.address}?amount=${deposit.expectedAmount}`;
  }, [deposit]);

  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(qrPayload)}`
    : "";

  const copy = async (text: string, key: "addr" | "amt") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Kopierat");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Bitcoin className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Aktivera konto
        </span>
      </div>
      <h1 className="font-display text-2xl font-bold">
        Sätt in {fmtSek(amount)} via krypto
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Skanna QR-koden eller kopiera adressen och skicka det exakta beloppet.
        Så snart transaktionen bekräftas på blockkedjan krediteras din portfölj
        automatiskt (vanligtvis 2–10 minuter).
      </p>

      {!guideDone ? (
        <ExodusGuide amount={amount} onDone={() => setGuideDone(true)} />
      ) : !deposit ? (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Säkerhet"
              value="On-chain, ingen tredje part"
            />
            <Info
              icon={<QrCode className="h-4 w-4" />}
              label="Inbetalning"
              value="QR-kod eller adress"
            />
            <Info
              icon={<Timer className="h-4 w-4" />}
              label="Bekräftelse"
              value="2–10 minuter"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-medium">Betala med Bitcoin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Skicka BTC till vår adress. Vi bekräftar automatiskt på
              blockkedjan och krediterar din portfölj.
            </p>
            <button
              onClick={() => start()}
              disabled={creating || !amount}
              className="mt-4 w-full rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary hover:shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Bitcoin</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  BTC
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Bitcoin-nätverket · ~10 min bekräftelse
              </p>
            </button>
            {creating && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Skapar inbetalningsadress...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <StatusBadge
            status={pollData?.status ?? "waiting"}
            data={
              pollData && "confirmations" in pollData
                ? {
                    txHash: pollData.txHash ?? undefined,
                    confirmations: pollData.confirmations,
                    required:
                      "required" in pollData ? pollData.required : undefined,
                  }
                : undefined
            }
          />

          <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-[280px_1fr]">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-border bg-white p-2">
                {qrUrl && (
                  <img
                    src={qrUrl}
                    alt="QR-kod för inbetalning"
                    className="h-[264px] w-[264px]"
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Skanna med din krypto-plånbok
              </p>
            </div>

            <div className="space-y-4">
              <Field label="Belopp att skicka (BTC)">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                    {deposit.expectedAmount}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copy(String(deposit.expectedAmount), "amt")}
                  >
                    {copied === "amt" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Motsvarar {fmtSek(deposit.amountSek)} (kurs{" "}
                  {new Intl.NumberFormat("sv-SE").format(
                    Math.round(deposit.pricePerCoinSek),
                  )}{" "}
                  kr/BTC)
                </p>
              </Field>

              <Field label={`Adress (${deposit.label})`}>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                    {deposit.address}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copy(deposit.address, "addr")}
                  >
                    {copied === "addr" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Field>

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Viktigt:</strong> Skicka exakt{" "}
                <span className="font-mono">{deposit.expectedAmount}</span>{" "}
                BTC på nätverket <strong>{deposit.network}</strong>. Fel
                nätverk eller fel belopp kan innebära att medlen inte kan
                matchas automatiskt.
              </div>
            </div>
          </div>

          {pollData?.status === "funded" && "explorer" in (pollData ?? {}) && (
            <a
              href={(pollData as { explorer?: string }).explorer}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Visa transaktionen <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  data,
}: {
  status: string;
  data: { txHash?: string; confirmations?: number; required?: number } | undefined;
}) {
  if (status === "funded")
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Check className="h-4 w-4" /> Betalning bekräftad
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Din portfölj har krediterats. Omdirigerar till dashboarden...
        </p>
      </div>
    );
  if (status === "confirming")
    return (
      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm dark:bg-amber-950/40">
        <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
          <Loader2 className="h-4 w-4 animate-spin" /> Väntar på bekräftelser (
          {data?.confirmations ?? 0}/{data?.required ?? 1})
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Transaktionen är sedd. Krediteras när den bekräftats på blockkedjan.
        </p>
      </div>
    );
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Väntar på
        inbetalning...
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Vi övervakar blockkedjan var 8:e sekund. Du kan stänga sidan – du får
        besked när betalningen är bekräftad.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ExodusGuide({
  amount,
  onDone,
}: {
  amount: number;
  onDone: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const steps = [
    {
      icon: <Download className="h-5 w-5" />,
      title: "1. Ladda ner Exodus Wallet",
      body: "Exodus är en gratis, säker och lättanvänd krypto-plånbok för mobil och dator. Ladda ner den från den officiella sidan.",
      cta: (
        <a
          href="https://www.exodus.com/download/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ladda ner Exodus <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ),
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      title: "2. Skapa din plånbok",
      body: "Öppna appen, skapa en ny plånbok och spara din återställningsfras (12 ord) på ett säkert ställe. Detta är din enda backup – dela den aldrig med någon.",
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: `3. Köp Bitcoin för ${fmtSek(amount)}`,
      body: "I Exodus-appen: tryck på 'Buy Crypto', välj Bitcoin (BTC), ange beloppet och betala med kort eller banköverföring. Köpet tar oftast 5–15 minuter innan din BTC dyker upp i plånboken.",
    },
    {
      icon: <Send className="h-5 w-5" />,
      title: "4. Kom tillbaka hit för att skicka",
      body: "När din Bitcoin syns i Exodus, kom tillbaka till denna sida och klicka 'Fortsätt till betalning'. Vi visar dig då exakt belopp, QR-kod och adress att skicka till.",
    },
  ];

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary">
          Har du ingen Bitcoin än? Följ guiden nedan.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vi rekommenderar Exodus – enklast att komma igång med för nya
          användare. Du köper BTC direkt i appen och skickar sedan hit.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {s.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                {s.cta && <div className="mt-2">{s.cta}</div>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm">
            Jag har laddat ner Exodus och köpt Bitcoin för{" "}
            <strong>{fmtSek(amount)}</strong>. Jag är redo att skicka till
            Nexoras adress.
          </span>
        </label>
        <Button
          className="mt-4 w-full"
          disabled={!checked}
          onClick={onDone}
        >
          Fortsätt till betalning <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Har du redan Bitcoin i en annan plånbok? Bocka i rutan och fortsätt.
        </p>
      </div>
    </div>
  );
}
