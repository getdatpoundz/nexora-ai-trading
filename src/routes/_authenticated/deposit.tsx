import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentLevels } from "@/components/deposit/InvestmentLevels";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

type ProfileBits = {
  onboarding_completed: boolean | null;
  verification_status: string | null;
  risk_profile: string | null;
  active_strategy: string | null;
  income_range: string | null;
};

function DepositPage() {
  const [profile, setProfile] = useState<ProfileBits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, verification_status, risk_profile, active_strategy, income_range")
        .eq("id", userRes.user.id)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data as ProfileBits | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready =
    !!profile?.onboarding_completed &&
    !!profile?.risk_profile &&
    profile?.verification_status !== "inte_paborjad";

  return (
    <AppShell title="Sätt in kapital">
      <div className="mx-auto max-w-6xl space-y-6">
        <DemoBanner />

        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">Insättningar är inte aktiverade i demoläget.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ditt val sparas men inga riktiga betalningar eller kryptotransaktioner genomförs.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
            Laddar din profil…
          </div>
        ) : !ready ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Slutför onboarding först</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              För att välja investeringsnivå behöver du först slutföra onboarding, riskbedömning
              och identitetskontroll.
            </p>
          </div>
        ) : (
          <InvestmentLevels
            strategyId={profile?.active_strategy ?? "balanserad"}
            verificationStatus={profile?.verification_status ?? null}
            incomeRange={profile?.income_range ?? null}
          />
        )}
      </div>
    </AppShell>
  );
}
