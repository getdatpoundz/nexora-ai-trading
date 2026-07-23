import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

const tickerRows = [
  [
    { symbol: "ETH", price: "37 980", change: "-0.95%", up: false },
    { symbol: "SOL", price: "1 878", change: "-0.82%", up: false },
    { symbol: "XRP", price: "30,60", change: "-0.70%", up: false },
    { symbol: "DOGE", price: "2,3210", change: "-0.33%", up: false },
    { symbol: "AAPL", price: "2 384", change: "-0.34%", up: false },
    { symbol: "TSLA", price: "3 482", change: "-0.12%", up: false },
    { symbol: "BTC", price: "1 247 500", change: "+4.20%", up: true },
    { symbol: "BNB", price: "6 120", change: "+1.15%", up: true },
  ],
  [
    { symbol: "NVDA", price: "12 840", change: "+2.10%", up: true },
    { symbol: "MSFT", price: "4 560", change: "+0.45%", up: true },
    { symbol: "GOOGL", price: "18 220", change: "-0.18%", up: false },
    { symbol: "AMZN", price: "3 910", change: "+0.72%", up: true },
    { symbol: "META", price: "6 780", change: "-0.55%", up: false },
    { symbol: "AMD", price: "1 450", change: "+1.30%", up: true },
    { symbol: "COIN", price: "2 180", change: "-1.05%", up: false },
    { symbol: "MSTR", price: "8 940", change: "+3.25%", up: true },
  ],
  [
    { symbol: "EUR/SEK", price: "11,52", change: "+0.08%", up: true },
    { symbol: "USD/SEK", price: "10,68", change: "-0.12%", up: false },
    { symbol: "GBP/SEK", price: "13,84", change: "+0.05%", up: true },
    { symbol: "GOLD", price: "2 450", change: "+0.62%", up: true },
    { symbol: "SILVER", price: "28,40", change: "-0.30%", up: false },
    { symbol: "OIL", price: "82,50", change: "+1.10%", up: true },
    { symbol: "SP500", price: "5 890", change: "+0.25%", up: true },
    { symbol: "OMXS30", price: "2 640", change: "-0.15%", up: false },
  ],
];

function TickerStrip({ items, reverse = false, className = "" }: { items: typeof tickerRows[0]; reverse?: boolean; className?: string }) {
  const doubled = [...items, ...items, ...items, ...items];
  return (
    <div className={`flex overflow-hidden whitespace-nowrap ${className}`}>
      <div className={`flex animate-ticker ${reverse ? "animate-ticker-reverse" : ""} gap-10`}>
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[15px]">
            <span className="font-semibold text-foreground/80">{item.symbol}</span>
            <span className="text-foreground">{item.price}</span>
            <span className={`font-medium ${item.up ? "text-success" : "text-destructive"}`}>{item.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthBackground() {
  const stripPositions = [
    { top: "12%", left: "-10%", width: "120%" },
    { top: "38%", left: "-5%", width: "115%" },
    { top: "64%", left: "-15%", width: "130%" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_30%,oklch(0.68_0.13_210/0.10),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_80%,oklch(0.55_0.13_200/0.08),transparent)]" />

      <div className="absolute inset-0">
        {tickerRows.map((row, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: stripPositions[i].top,
              left: stripPositions[i].left,
              width: stripPositions[i].width,
              transform: `rotate(${-8 + i * 2}deg)`,
              transformOrigin: "left center",
            }}
          >
            <TickerStrip
              items={row}
              reverse={i % 2 === 1}
              className="py-3 border-y border-border/25 bg-card/35"
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-background/20 to-background/60" />
    </div>
  );
}

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode ?? "login");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm: "", terms: false, risk: false,
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const signInGoogle = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" });
    if (r.error) { toast.error("Kunde inte logga in med Google"); setLoading(false); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        toast.success("Välkommen tillbaka");
        navigate({ to: "/welcome" });
      } else if (mode === "signup") {
        if (!f.terms || !f.risk) { toast.error("Du måste godkänna villkoren och bekräfta riskinformationen"); return; }
        if (f.password.length < 8) { toast.error("Lösenordet måste vara minst 8 tecken"); return; }
        if (f.password !== f.confirm) { toast.error("Lösenorden matchar inte"); return; }
        const { error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: {
            emailRedirectTo: window.location.origin + "/auth/callback",
            data: { first_name: f.first_name, last_name: f.last_name, phone: f.phone },
          },
        });
        if (error) throw error;
        toast.success("Konto skapat – kontrollera din e-post");
        navigate({ to: "/welcome" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Återställningsmejl skickat");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-nordnet grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <AuthBackground />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary shadow-glow">
              <span className="font-display text-lg font-bold text-primary-foreground">N</span>
            </div>
            <span className="font-display text-lg font-bold text-foreground">Nexora AI</span>
          </Link>
          <div>
            <h2 className="max-w-md font-display text-4xl font-bold leading-tight tracking-tight text-foreground">
              Din <span className="text-gradient-brand">AI-drivna</span> kryptoplattform.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Din inloggning är krypterad och skyddad.
            </p>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Handel med kryptotillgångar innebär hög risk. Du kan förlora hela det investerade kapitalet.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Glömt lösenord"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" && "Välkommen tillbaka till Nexora AI."}
            {mode === "signup" && "Kom igång på under en minut."}
            {mode === "forgot" && "Ange din e-postadress så skickar vi en länk för återställning."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button variant="outline" className="mt-6 w-full" onClick={signInGoogle} disabled={loading}>
                Fortsätt med Google
              </Button>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">eller med e-post</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="first_name">Förnamn</Label>
                    <Input id="first_name" required value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Efternamn</Label>
                    <Input id="last_name" required value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input id="phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+46 ..." />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">E-postadress</Label>
              <Input id="email" type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Lösenord</Label>
                <Input id="password" type="password" required minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} />
                {mode === "signup" && <p className="mt-1 text-[11px] text-muted-foreground">Minst 8 tecken.</p>}
              </div>
            )}
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="confirm">Bekräfta lösenord</Label>
                  <Input id="confirm" type="password" required value={f.confirm} onChange={(e) => set("confirm", e.target.value)} />
                </div>
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 text-xs">
                    <Checkbox checked={f.terms} onCheckedChange={(v) => set("terms", Boolean(v))} className="mt-0.5" />
                    <span>Jag godkänner Nexora AI:s användarvillkor och integritetspolicy.</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs">
                    <Checkbox checked={f.risk} onCheckedChange={(v) => set("risk", Boolean(v))} className="mt-0.5" />
                    <span>Jag har läst riskinformationen och förstår att jag kan förlora hela det investerade kapitalet.</span>
                  </label>
                </div>
              </>
            )}
            <Button type="submit" className="mt-2 w-full bg-primary text-primary-foreground hover:opacity-90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka återställningslänk"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                <button onClick={() => setMode("forgot")} className="hover:text-foreground">Glömt lösenord?</button>
                <button onClick={() => setMode("signup")} className="hover:text-foreground">Skapa konto</button>
              </>
            ) : (
              <button onClick={() => setMode("login")} className="hover:text-foreground">← Tillbaka till inloggning</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
