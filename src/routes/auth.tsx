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
        navigate({ to: "/dashboard" });
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
        navigate({ to: "/dashboard" });
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,oklch(0.72_0.18_230/0.25),transparent)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand glow-brand">
              <span className="text-lg font-black text-primary-foreground">N</span>
            </div>
            <span className="text-lg font-bold">Nexora AI</span>
          </Link>
          <div>
            <h2 className="max-w-md text-4xl font-black leading-tight">
              Din <span className="text-gradient-brand">AI-drivna</span> kryptoplattform.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Alla belopp visas i demoläge. Inga riktiga tillgångar hanteras i den här versionen.
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
            {mode === "signup" && "Kom igång med demoläget på under en minut."}
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
            <Button type="submit" className="mt-2 w-full gradient-brand text-primary-foreground" disabled={loading}>
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
