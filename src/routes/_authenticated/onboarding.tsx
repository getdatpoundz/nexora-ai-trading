import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { completeKyc } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const submitKyc = useServerFn(completeKyc);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    birth_date: "",
    address: "",
    postal_code: "",
    city: "",
    risk_acknowledged: false,
    terms_accepted: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.risk_acknowledged || !f.terms_accepted) {
      toast.error("Du måste godkänna villkoren och riskinformationen");
      return;
    }
    setLoading(true);
    try {
      await submitKyc({
        data: {
          birth_date: f.birth_date,
          address: f.address,
          postal_code: f.postal_code,
          city: f.city,
          risk_acknowledged: true,
          terms_accepted: true,
        },
      });
      toast.success("Verifiering klar");
      navigate({ to: "/activate" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Verifiera identitet</span>
      </div>
      <h1 className="font-display text-2xl font-bold">Bekräfta dina uppgifter</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enligt lagen om penningtvätt (2017:630) behöver vi bekräfta din identitet innan du kan
        aktivera ditt konto. Uppgifterna sparas krypterat.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="birth_date">Personnummer / födelsedatum</Label>
          <Input
            id="birth_date"
            type="date"
            required
            value={f.birth_date}
            onChange={(e) => set("birth_date", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="address">Adress</Label>
          <Input id="address" required value={f.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="postal_code">Postnr</Label>
            <Input id="postal_code" required value={f.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="city">Ort</Label>
            <Input id="city" required value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <label className="flex items-start gap-2 text-xs">
            <Checkbox
              checked={f.terms_accepted}
              onCheckedChange={(v) => set("terms_accepted", Boolean(v))}
              className="mt-0.5"
            />
            <span>Jag godkänner Nexora AI:s användarvillkor och integritetspolicy.</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <Checkbox
              checked={f.risk_acknowledged}
              onCheckedChange={(v) => set("risk_acknowledged", Boolean(v))}
              className="mt-0.5"
            />
            <span>
              Jag förstår att handel med kryptotillgångar innebär hög risk och att jag kan förlora
              hela mitt investerade kapital.
            </span>
          </label>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:opacity-90"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Fortsätt till betalning
        </Button>
      </form>
    </div>
  );
}
