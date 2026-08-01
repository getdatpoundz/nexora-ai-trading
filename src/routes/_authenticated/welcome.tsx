import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOnboardingState } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ShieldCheck, CreditCard, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: WelcomePage,
});

function fmtSek(n: number | null | undefined) {
  if (!n) return "–";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

function WelcomePage() {
  const navigate = useNavigate();
  const fetchState = useServerFn(getMyOnboardingState);
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => fetchState(),
  });

  useEffect(() => {
    if (!data?.profile) return;
    const p = data.profile;
    const funded = data.latest_selection?.onramp_status === "funded";
    // Visa välkomstsidan endast vid första inlogget på nyskapade konton.
    // Redan aktiverade, redan fundade, eller konton utan tilldelad investeringsnivå (t.ex. admin) → dashboard.
    if (p.activated_at || funded || !p.assigned_level_sek) {
      navigate({ to: "/dashboard" });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Laddar ...</div>
      </div>
    );
  }

  const p = data?.profile;
  const hasLevel = !!p?.assigned_level_sek;
  const needsKyc = !p?.onboarding_completed;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Välkommen till Nexora</span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          Hej {p?.first_name ?? ""}, ditt konto är förberett
        </h1>

        {hasLevel ? (
          <p className="mt-3 text-muted-foreground">
            Din administratör har tilldelat dig investeringsnivån{" "}
            <span className="font-semibold text-foreground">{p?.assigned_level_name}</span> med ett
            insättningsbelopp på{" "}
            <span className="font-semibold text-foreground">{fmtSek(p?.assigned_level_sek)}</span>.
          </p>
        ) : (
          <p className="mt-3 text-muted-foreground">
            Ditt konto har ingen tilldelad investeringsnivå ännu. Kontakta din rådgivare.
          </p>
        )}

        <div className="mt-8 space-y-3">
          <Step
            n={1}
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Verifiera din identitet"
            done={!needsKyc}
          />
          <Step
            n={2}
            icon={<CreditCard className="h-4 w-4" />}
            title={`Aktivera ${fmtSek(p?.assigned_level_sek)} via Bitcoin-inbetalning`}
            done={data?.latest_selection?.onramp_status === "funded"}
          />
          <Step
            n={3}
            icon={<TrendingUp className="h-4 w-4" />}
            title="AI:n börjar handla åt dig"
            done={!!p?.activated_at}
          />
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {hasLevel && needsKyc && (
            <Button
              className="w-full bg-primary text-primary-foreground hover:opacity-90 sm:w-auto"
              onClick={() => navigate({ to: "/onboarding" })}
            >
              Starta verifiering
            </Button>
          )}
          {hasLevel && !needsKyc && data?.latest_selection?.onramp_status !== "funded" && (
            <Button
              className="w-full bg-primary text-primary-foreground hover:opacity-90 sm:w-auto"
              onClick={() => navigate({ to: "/activate", search: {} })}
            >
              Aktivera med Bitcoin
            </Button>
          )}
          {data?.latest_selection?.onramp_status === "funded" && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Till min portfölj
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Hoppa över – gå till dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, icon, title, done }: { n: number; icon: React.ReactNode; title: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${done ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
      <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {done ? "✓" : n}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        <span className={done ? "text-foreground" : "font-medium"}>{title}</span>
      </div>
    </div>
  );
}
