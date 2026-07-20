import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Profile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  profile: Profile | null;
  hasDeposit: boolean;
  onDismiss?: () => void;
};

export function OnboardingChecklist({ profile, hasDeposit, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const steps = useMemo(
    () => [
      {
        id: "profile",
        label: "Slutför din profil",
        desc: "Fyll i namn och kontaktuppgifter.",
        done: !!profile?.first_name && !!profile?.last_name,
        href: "/settings" as const,
      },
      {
        id: "risk",
        label: "Gör riskbedömning",
        desc: "Vi anpassar strategin efter din riskprofil.",
        done: !!profile?.risk_profile,
        href: "/risk" as const,
      },
      {
        id: "kyc",
        label: "Verifiera din identitet (KYC)",
        desc: "Krävs innan insättningar kan göras.",
        done: profile?.verification_status === "verifierad",
        href: "/settings" as const,
      },
      {
        id: "strategy",
        label: "Välj en AI-strategi",
        desc: "Försiktig, Balanserad eller Tillväxt.",
        done: !!profile?.active_strategy,
        href: "/strategies" as const,
      },
      {
        id: "deposit",
        label: "Gör din första insättning",
        desc: "Välj investeringsnivå och sätt in kapital.",
        done: hasDeposit,
        href: "/deposit" as const,
      },
    ],
    [profile, hasDeposit],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (doneCount === steps.length) return null;

  return (
    <div
      data-tour="checklist"
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Kom igång med Nexora</h3>
            <p className="text-xs text-muted-foreground">
              {doneCount} av {steps.length} steg klara · {pct}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {collapsed ? "Visa" : "Dölj"}
          </button>
          {onDismiss && (
            <button
              onClick={async () => {
                if (profile?.id) {
                  await supabase.from("profiles").update({ tour_completed: true }).eq("id", profile.id);
                }
                onDismiss();
              }}
              aria-label="Stäng"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {!collapsed && (
        <ol className="mt-5 space-y-2">
          {steps.map((s, i) => (
            <li key={s.id}>
              <Link
                to={s.href}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  s.done
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>
                    {i + 1}. {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                {!s.done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
