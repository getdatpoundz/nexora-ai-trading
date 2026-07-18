import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { sek } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

const QUICK = [2500, 5000, 10000, 25000];

function DepositPage() {
  const [asset, setAsset] = useState("BTC");
  const [network, setNetwork] = useState("Bitcoin");
  const [amount, setAmount] = useState(5000);

  return (
    <AppShell title="Sätt in kapital">
      <div className="mx-auto max-w-2xl space-y-6">
        <DemoBanner />

        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">Insättningar är inte aktiverade i demoläget.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nedan visas ett förhandsvisningsflöde utan riktiga betalningar. Inga adresser
                nedan kan användas för verkliga överföringar.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Välj kryptotillgång</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nätverk</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                <SelectItem value="Ethereum">Ethereum (ERC-20)</SelectItem>
                <SelectItem value="Polygon">Polygon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Belopp (SEK)</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1" />
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK.map((v) => (
                <button key={v} onClick={() => setAmount(v)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium ${amount === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {sek(v)}
                </button>
              ))}
              <button onClick={() => setAmount(0)} className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">Annat belopp</button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Planerad minsta insättning: motsvarande 2 500 SEK.</p>
            {amount >= 100000 && (
              <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning">
                Större insättningar kan kräva kompletterande information om pengarnas ursprung.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Exempeladress</p>
            <p className="mt-1 select-none break-all font-mono text-xs text-muted-foreground/60">
              bc1qexempeladressskickaingatillgangarhitxxxxxxxxxxxxxx
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-warning">
              <Info className="h-3 w-3" /> Exempeladress – skicka inga tillgångar hit.
            </p>
          </div>

          <Button className="w-full gradient-brand text-primary-foreground" disabled>
            Insättning inaktiverad i demoläge
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
