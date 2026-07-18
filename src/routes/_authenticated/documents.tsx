import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { FileText, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocsPage,
});

const DOCS = [
  { cat: "Kontoöversikter", name: "Månadsöversikt november 2025", date: "2025-12-01" },
  { cat: "Kontoöversikter", name: "Månadsöversikt oktober 2025", date: "2025-11-01" },
  { cat: "Transaktionsrapporter", name: "Transaktionsrapport Q4 2025", date: "2025-12-15" },
  { cat: "Avgiftsunderlag", name: "Avgiftsunderlag 2025", date: "2025-12-31" },
  { cat: "Villkor", name: "Användarvillkor", date: "2025-01-01" },
  { cat: "Villkor", name: "Integritetspolicy", date: "2025-01-01" },
  { cat: "Villkor", name: "Riskinformation", date: "2025-01-01" },
  { cat: "Skatt", name: "Skatteunderlag 2025 (platshållare)", date: "2026-01-31" },
];

function DocsPage() {
  return (
    <AppShell title="Dokument">
      <div className="space-y-6">
        <DemoBanner compact />
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {DOCS.map((d) => (
            <div key={d.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.cat} · {d.date}</p>
              </div>
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
