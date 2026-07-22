import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { buildOnrampUrl, getMyOnboardingState } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activate")({
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
  const fetchState = useServerFn(getMyOnboardingState);
  const buildUrl = useServerFn(buildOnrampUrl);
  const [session, setSession] = useState<{
    mode: "transak" | "sandbox";
    url: string | null;
    amount: number;
    currency: string;
  } | null>(null);
  const [starting, setStarting] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => fetchState(),
    refetchInterval: session ? 5000 : false,
  });

  useEffect(() => {
    if (data?.latest_selection?.onramp_status === "funded") {
      navigate({ to: "/dashboard" });
    }
  }, [data, navigate]);

  const start = async () => {
    setStarting(true);
    try {
      const r = await buildUrl();
      setSession(r);
      refetch();
    } finally {
      setStarting(false);
    }
  };

  const amount = data?.profile?.assigned_level_sek ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <CreditCard className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Aktivera konto</span>
      </div>
      <h1 className="font-display text-2xl font-bold">
        Betala {fmtSek(amount)} med kort
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Beloppet växlas automatiskt till USDC och skickas direkt till Nexoras säkra
        förvaringsadress. Så snart transaktionen bekräftas på blockkedjan (2–10 min) krediteras
        din portfölj.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Info icon={<ShieldCheck className="h-4 w-4" />} label="Reglerad partner" value="Transak (KYC/AML)" />
        <Info icon={<Lock className="h-4 w-4" />} label="Kortdata" value="Krypteras end-to-end" />
        <Info icon={<CreditCard className="h-4 w-4" />} label="Belopp" value={fmtSek(amount)} />
      </div>

      {!session ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            När du klickar öppnas en säker betalvy från vår on-ramp-partner. Beloppet är låst
            till din tilldelade nivå.
          </p>
          <Button
            className="mt-4 bg-primary text-primary-foreground hover:opacity-90"
            onClick={start}
            disabled={starting || !amount}
          >
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Starta säker betalning
          </Button>
        </div>
      ) : session.mode === "transak" && session.url ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <iframe
            src={session.url}
            title="Säker betalning"
            allow="camera;microphone;payment"
            className="h-[720px] w-full"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4 rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <p className="font-semibold">Betalpartner ännu inte konfigurerad</p>
          <p className="text-sm text-muted-foreground">
            Administratören behöver lägga in <code className="rounded bg-muted px-1">TRANSAK_API_KEY</code>{" "}
            och <code className="rounded bg-muted px-1">NEXORA_WALLET_ADDRESS</code> i backend för att aktivera
            riktiga kortbetalningar. När det är klart visas Transaks widget här och betalningen
            går direkt till Nexoras adress.
          </p>
          <p className="text-sm text-muted-foreground">
            Fram tills dess kan din administratör kreditera ditt konto manuellt från adminpanelen.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Denna sida uppdateras automatiskt när betalningen bekräftas.
      </p>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
