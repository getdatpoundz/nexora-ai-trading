import type { ReactNode } from "react";

export function StatCard({
  label, value, sub, icon, tone = "default",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "primary";
}) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_oklch(1_0_0_/_0.03)_inset]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
