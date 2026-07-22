import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { RISK_DISCLAIMER } from "@/lib/demo-data";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/risk")({
  component: RiskPage,
});

function RiskPage() {
  return (
    <AppShell title="Riskinformation">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-warning" />
            <div className="space-y-3 text-sm">
              <p className="font-semibold">Viktigt att läsa innan du börjar</p>
              <p>{RISK_DISCLAIMER}</p>
              <p>
                Alla belopp, transaktioner
                och grafer är simulerade och används endast för att visa hur plattformen fungerar.
              </p>
              <p>
                Du bör aldrig investera mer än vad du har råd att förlora. Om du är osäker
                bör du söka oberoende ekonomisk rådgivning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
