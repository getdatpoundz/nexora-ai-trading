import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

const STRATEGIES = [
  {
    key: "forsiktig", name: "Försiktig", risk: 2, horizon: "3+ år",
    desc: "Lägre risk med fokus på kapitalbevarande. Större andel tillgängligt saldo.",
    allocation: [{ name: "Kontanter/USDC", v: 65 }, { name: "BTC", v: 20 }, { name: "ETH", v: 15 }],
    drawdown: -12,
    tone: "success" as const,
  },
  {
    key: "balanserad", name: "Balanserad", risk: 4, horizon: "1–3 år",
    desc: "Balanserad fördelning som kombinerar marknadsexponering med riskkontroll.",
    allocation: [{ name: "BTC", v: 40 }, { name: "ETH", v: 30 }, { name: "USDC", v: 20 }, { name: "Övrigt", v: 10 }],
    drawdown: -28,
    tone: "primary" as const,
  },
  {
    key: "tillvaxt", name: "Tillväxt", risk: 6, horizon: "1+ år",
    desc: "Hög risk och större marknadsexponering. Risk för betydande kapitalförlust.",
    allocation: [{ name: "BTC", v: 45 }, { name: "ETH", v: 30 }, { name: "SOL", v: 15 }, { name: "Övrigt", v: 10 }],
    drawdown: -52,
    tone: "warning" as const,
  },
];

function StrategiesPage() {
  const [selected, setSelected] = useState<typeof STRATEGIES[number] | null>(null);
  return (
    <AppShell title="AI-strategier">
      <div className="space-y-6">
        <DemoBanner compact />
        <div className="grid gap-4 lg:grid-cols-3">
          {STRATEGIES.map((s) => (
            <div key={s.key} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{s.name}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.tone === "success" ? "border-success/40 text-success" : s.tone === "warning" ? "border-warning/40 text-warning" : "border-primary/40 text-primary"}`}>
                  Risk {s.risk}/7
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-muted-foreground">Tidshorisont</dt><dd className="font-medium">{s.horizon}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Simulerad max nedgång</dt><dd className="font-medium text-destructive">{s.drawdown} %</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Avgift</dt><dd className="font-medium">–</dd></div>
              </dl>
              <div className="mt-4 space-y-1">
                {s.allocation.map((a) => (
                  <div key={a.name}>
                    <div className="flex justify-between text-[11px]"><span>{a.name}</span><span className="tabular-nums text-muted-foreground">{a.v}%</span></div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full gradient-brand" style={{ width: `${a.v}%` }} /></div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setSelected(s)} className="mt-6 w-full">Läs mer</Button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold">AI-insikter</h3>
          <p className="mt-1 text-xs text-muted-foreground">Neutrala analyser – ej köp- eller säljsignaler.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="rounded-lg border border-border/60 p-3">Marknadsvolatiliteten har ökat de senaste 7 dagarna.</li>
            <li className="rounded-lg border border-border/60 p-3">Portföljens exponering mot Bitcoin är 42 %.</li>
            <li className="rounded-lg border border-border/60 p-3">Din nuvarande risknivå är högre än din valda profil.</li>
          </ul>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  {selected.name} · Risk {selected.risk}/7
                </DialogTitle>
                <DialogDescription>{selected.desc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Tillgångsfördelning</p>
                  <div className="mt-2 space-y-1">
                    {selected.allocation.map((a) => (
                      <div key={a.name} className="flex justify-between text-xs"><span>{a.name}</span><span className="tabular-nums">{a.v} %</span></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                  Värdet kan minska och du kan förlora hela det investerade kapitalet. Historisk simulerad utveckling är ingen garanti för framtida resultat.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Avbryt</Button>
                <Button onClick={() => { toast.success(`Strategi "${selected.name}" aktiverad i demoläge`); setSelected(null); }}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Aktivera i demoläge
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
