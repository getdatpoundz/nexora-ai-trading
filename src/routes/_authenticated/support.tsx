import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

const FAQ = [
  { q: "Varför visas alla belopp som demodata?", a: "Plattformen är i demoläge. Inga riktiga tillgångar hanteras i den här versionen." },
  { q: "Kan jag sätta in riktiga pengar?", a: "Nej. Insättningar och uttag är avstängda i demoläget." },
  { q: "Hur ändrar jag min risknivå?", a: "Gå till AI-strategier, välj strategi och bekräfta i demoläge." },
];

function SupportPage() {
  const [sent, setSent] = useState(false);
  return (
    <AppShell title="Support">
      <div className="mx-auto max-w-3xl space-y-6">
        <DemoBanner compact />
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success("Ditt ärende har skickats"); }}
            className="rounded-2xl border border-border bg-card p-6 space-y-3"
          >
            <h3 className="text-base font-semibold">Nytt supportärende</h3>
            <div>
              <Label>Kategori</Label>
              <Select defaultValue="konto">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="konto">Konto</SelectItem>
                  <SelectItem value="strategi">Strategi</SelectItem>
                  <SelectItem value="teknik">Teknik</SelectItem>
                  <SelectItem value="sakerhet">Säkerhet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ämne</Label><Input required className="mt-1" /></div>
            <div><Label>Meddelande</Label><Textarea required rows={5} className="mt-1" /></div>
            <div><Label>Bifoga fil</Label><Input type="file" className="mt-1" /></div>
            <Button type="submit" className="w-full">Skicka</Button>
            {sent && <p className="text-xs text-success">Ärende skickat.</p>}
          </form>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold">Vanliga frågor</h3>
              <div className="mt-3 space-y-3 text-sm">
                {FAQ.map((f) => (
                  <div key={f.q}>
                    <p className="font-medium">{f.q}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold">Mina ärenden</h3>
              <p className="mt-2 text-sm text-muted-foreground">Du har inga öppna ärenden.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
