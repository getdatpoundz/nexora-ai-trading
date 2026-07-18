import { AlertTriangle } from "lucide-react";

export function DemoBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Du använder just nu Nexora AI i demoläge.
          </p>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground">
              Alla belopp, transaktioner och resultat är simulerade. Inga riktiga
              kryptotransaktioner utförs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
