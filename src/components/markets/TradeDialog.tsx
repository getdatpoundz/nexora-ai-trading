import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuote } from "@/hooks/useMarketData";
import { sek, num } from "@/lib/format";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { MarketAsset } from "@/lib/market-data.shared";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  asset: MarketAsset | null;
  cashBalance: number;
  onClose: () => void;
  onDone?: () => void;
};

const FEE_PCT = 0.009;

export function TradeDialog({ asset, cashBalance, onClose, onDone }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amountSek, setAmountSek] = useState("1000");
  const [submitting, setSubmitting] = useState(false);
  const { data: quote, isLoading } = useQuote(asset?.symbol ?? "");

  const price = quote?.priceSek ?? 0;
  const sekVal = Math.max(0, Number(amountSek) || 0);
  const fee = sekVal * FEE_PCT;
  const quantity = price > 0 ? sekVal / price : 0;
  const total = side === "buy" ? sekVal + fee : sekVal - fee;
  const canAfford = side === "sell" || sekVal + fee <= cashBalance;

  async function submit() {
    if (!asset || !user || !quote || sekVal <= 0) return;
    setSubmitting(true);
    try {
      // Insert trade
      const { error: tErr } = await supabase.from("trades").insert({
        user_id: user.id,
        symbol: asset.symbol,
        asset_type: asset.type,
        side,
        quantity,
        price_sek: price,
        fee_sek: fee,
        total_sek: total,
      });
      if (tErr) throw tErr;

      // Upsert holdings
      const { data: existing } = await supabase
        .from("portfolio_holdings")
        .select("id, quantity, avg_cost_sek")
        .eq("user_id", user.id)
        .eq("symbol", asset.symbol)
        .maybeSingle();

      if (side === "buy") {
        if (existing) {
          const newQty = Number(existing.quantity) + quantity;
          const newAvg =
            newQty > 0
              ? (Number(existing.quantity) * Number(existing.avg_cost_sek) + sekVal) / newQty
              : 0;
          await supabase
            .from("portfolio_holdings")
            .update({ quantity: newQty, avg_cost_sek: newAvg })
            .eq("id", existing.id);
        } else {
          await supabase.from("portfolio_holdings").insert({
            user_id: user.id,
            symbol: asset.symbol,
            asset_type: asset.type,
            quantity,
            avg_cost_sek: price,
          });
        }
      } else if (existing) {
        const newQty = Math.max(0, Number(existing.quantity) - quantity);
        await supabase.from("portfolio_holdings").update({ quantity: newQty }).eq("id", existing.id);
      }

      // Update cash balance
      const delta = side === "buy" ? -(sekVal + fee) : sekVal - fee;
      await supabase
        .from("profiles")
        .update({ cash_balance_sek: cashBalance + delta })
        .eq("id", user.id);

      toast.success(`${side === "buy" ? "Köp" : "Sälj"} genomfört: ${asset.name}`);
      qc.invalidateQueries();
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte genomföra ordern");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {asset && (
          <>
            <DialogHeader>
              <DialogTitle>Handla {asset.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Ordern läggs mot livekurser via Twelve Data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={side === "buy" ? "default" : "outline"}
                  onClick={() => setSide("buy")}
                >
                  Köp
                </Button>
                <Button
                  variant={side === "sell" ? "default" : "outline"}
                  onClick={() => setSide("sell")}
                >
                  Sälj
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Live-pris</span>
                  <span className="tabular-nums">{isLoading ? "Laddar…" : sek(price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tillgängligt saldo</span>
                  <span className="tabular-nums">{sek(cashBalance)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="amt">Belopp (SEK)</Label>
                <Input
                  id="amt"
                  inputMode="decimal"
                  value={amountSek}
                  onChange={(e) => setAmountSek(e.target.value.replace(/[^\d.]/g, ""))}
                />
                <div className="mt-2 flex gap-2">
                  {[500, 1000, 5000, 10000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmountSek(String(v))}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {sek(v, { decimals: 0 })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Antal {asset.symbol}</span>
                  <span className="tabular-nums">{num(quantity, 6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avgift (0,9%)</span>
                  <span className="tabular-nums">{sek(fee)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Totalt</span>
                  <span className="tabular-nums">{sek(total)}</span>
                </div>
              </div>

              {!canAfford && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  Otillräckligt saldo. Sätt in kapital först.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Avbryt
              </Button>
              <Button onClick={submit} disabled={submitting || !canAfford || sekVal <= 0 || !quote}>
                {submitting ? "Genomför…" : side === "buy" ? "Bekräfta köp" : "Bekräfta sälj"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
