import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { sek } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/withdraw")({
  component: WithdrawPage,
});

function WithdrawPage() {
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState(0);
  const fee = 25;

  return (
    <AppShell title="Ta ut">
      <div className="mx-auto max-w-2xl space-y-6">
        <DemoBanner />
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Uttag är avstängda i demoläget.</p>
              <p className="mt-1 text-xs text-muted-foreground">Flödet nedan är endast en visuell förhandsvisning.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Tillgång</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">Bitcoin</SelectItem>
                <SelectItem value="ETH">Ethereum</SelectItem>
                <SelectItem value="USDC">USD Coin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mottagaradress</Label>
            <Input placeholder="Ange mottagarens adress" className="mt-1 font-mono" />
          </div>
          <div>
            <Label>Nätverk</Label>
            <Select defaultValue="native">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Belopp (SEK)</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1" />
          </div>
          <div className="grid gap-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nätverksavgift</span><span className="tabular-nums">{sek(fee)}</span></div>
            <div className="flex justify-between font-semibold"><span>Nettobelopp</span><span className="tabular-nums">{sek(Math.max(0, amount - fee))}</span></div>
          </div>
          <div>
            <Label>Tvåfaktorsverifiering</Label>
            <Input placeholder="6-siffrig kod" maxLength={6} className="mt-1 tracking-widest" />
          </div>
          <Button className="w-full" disabled>Uttag inaktiverat i demoläge</Button>
        </div>
      </div>
    </AppShell>
  );
}
