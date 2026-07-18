import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { DEMO_TRANSACTIONS } from "@/lib/demo-data";
import { sek, dateSv } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TxPage,
});

function TxPage() {
  const [type, setType] = useState("alla");
  const [status, setStatus] = useState("alla");
  const [q, setQ] = useState("");
  const rows = DEMO_TRANSACTIONS.filter((t) =>
    (type === "alla" || t.type === type) &&
    (status === "alla" || t.status === status) &&
    (q === "" || t.id.toLowerCase().includes(q.toLowerCase()) || t.asset.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell title="Transaktioner">
      <div className="space-y-6">
        <DemoBanner compact />

        <div className="rounded-2xl border border-border bg-card">
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-4">
            <Input placeholder="Sök ID eller tillgång" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                {["alla", "Insättning", "Uttag", "Köp", "Sälj", "Avgift"].map((t) =>
                  <SelectItem key={t} value={t}>{t === "alla" ? "Alla typer" : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {["alla", "Genomförd", "Väntar", "Behandlas", "Misslyckad", "Avbruten"].map((s) =>
                  <SelectItem key={s} value={s}>{s === "alla" ? "Alla statusar" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-right text-sm text-muted-foreground self-center">{rows.length} rader</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Datum</th>
                  <th className="px-4 py-3 text-left font-medium">Typ</th>
                  <th className="px-4 py-3 text-left font-medium">Tillgång</th>
                  <th className="px-4 py-3 text-right font-medium">Belopp</th>
                  <th className="px-4 py-3 text-right font-medium">Värde (SEK)</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Inga transaktioner matchar filtret.</td></tr>
                )}
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground">{dateSv(t.date)}</td>
                    <td className="px-4 py-3 font-medium">{t.type}</td>
                    <td className="px-4 py-3">{t.asset}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.amount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{sek(t.valueSEK)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        t.status === "Genomförd" ? "border-success/40 text-success" :
                        t.status === "Behandlas" || t.status === "Väntar" ? "border-warning/40 text-warning" :
                        "border-destructive/40 text-destructive"}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{t.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
