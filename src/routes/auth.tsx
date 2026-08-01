import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Nexora – Logga in" },
      { name: "description", content: "Logga in eller skapa konto på Nexora." },
      { property: "og:title", content: "Nexora – Logga in" },
      { property: "og:description", content: "Logga in eller skapa konto på Nexora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Field({
  id, label, type = "text", value, onChange, placeholder, required,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--v2-muted)]">{label}</label>
      <input
        id={id} type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--v2-line)] bg-[var(--v2-card)] px-4 py-3 text-sm text-[var(--v2-fg)] placeholder:text-[var(--v2-muted)]/50 outline-none transition focus:border-[var(--v2-accent)]"
      />
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--v2-muted)]">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md border transition ${
          checked ? "border-[var(--v2-accent)] bg-[var(--v2-accent)]" : "border-[var(--v2-line)] bg-transparent"
        }`}
        aria-pressed={checked}
      >
        {checked && <svg viewBox="0 0 12 12" className="h-3 w-3 text-[var(--v2-on-accent)]" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
      <span>{children}</span>
    </label>
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
        const { data: { user } } = await supabase.auth.getUser();
        let goWelcome = false;
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("activated_at, assigned_level_sek")
            .eq("id", user.id)
            .maybeSingle();
          if (prof && !prof.activated_at && prof.assigned_level_sek) goWelcome = true;
        }
        navigate({ to: goWelcome ? "/welcome" : "/dashboard" });
      } else if (mode === "signup") {
        if (!f.terms || !f.risk) { toast.error("Du måste godkänna villkoren och bekräfta riskinformationen"); setLoading(false); return; }
        if (f.password.length < 8) { toast.error("Lösenordet måste vara minst 8 tecken"); setLoading(false); return; }
        if (f.password !== f.confirm) { toast.error("Lösenorden matchar inte"); setLoading(false); return; }
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

  const title = mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Glömt lösenord";
  const subtitle =
    mode === "login" ? "Välkommen tillbaka till Nexora."
    : mode === "signup" ? "Kom igång på under en minut."
    : "Ange din e-post så skickar vi en länk.";

  return (
    <div className="v2-scope min-h-svh bg-[var(--v2-bg)] text-[var(--v2-fg)]">
      <div className="relative mx-auto min-h-svh w-full max-w-[430px] overflow-hidden px-6 pb-10 pt-12">
        {/* Glow rings */}
        <div aria-hidden className="v2-enter__ring v2-enter__ring--1 pointer-events-none absolute -right-40 -top-32 h-[24rem] w-[24rem] rounded-full border-[3rem] border-[var(--v2-ring1)] opacity-90 blur-[1px]" />
        <div aria-hidden className="v2-enter__ring v2-enter__ring--2 pointer-events-none absolute -left-48 top-44 h-[28rem] w-[28rem] rounded-full border-[4rem] border-[var(--v2-ring2)] opacity-70" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)]/60 to-transparent" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between">
            {mode === "login" ? (
              <Link to="/v2" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-card)] text-[var(--v2-muted)]">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
            ) : (
              <button onClick={() => setMode("login")} className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--v2-card)] text-[var(--v2-muted)]">
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
            )}
            <Link to="/v2" className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--v2-accent)] shadow-[0_10px_30px_-10px_var(--v2-accent)]">
              <img src={markLight.url} alt="Nexora" className="h-5 w-5 object-contain" />
            </Link>

          </div>

          {/* Title */}
          <div className="mt-12">
            <h1 className="v2-enter__item font-display text-[2rem] font-semibold leading-tight tracking-tight" style={{ animationDelay: "0.2s" }}>{title}</h1>
            <p className="v2-enter__item mt-2 text-sm text-[var(--v2-muted)]" style={{ animationDelay: "0.32s" }}>{subtitle}</p>
          </div>

          {/* Google */}
          {mode !== "forgot" && (
            <div className="v2-enter__item mt-7" style={{ animationDelay: "0.44s" }}>
              <button
                onClick={signInGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--v2-line)] bg-[var(--v2-card)] py-3.5 text-sm font-semibold text-[var(--v2-fg)] transition active:scale-[0.98] disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Fortsätt med Google
              </button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--v2-line)]" />
                <span className="text-xs text-[var(--v2-muted)]">eller med e-post</span>
                <div className="h-px flex-1 bg-[var(--v2-line)]" />
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-3.5">
            {mode === "signup" && (
              <div className="v2-enter__item grid grid-cols-2 gap-3" style={{ animationDelay: "0.5s" }}>
                <Field id="first_name" label="Förnamn" required value={f.first_name} onChange={(v) => set("first_name", v)} />
                <Field id="last_name" label="Efternamn" required value={f.last_name} onChange={(v) => set("last_name", v)} />
              </div>
            )}
            {mode === "signup" && (
              <div className="v2-enter__item" style={{ animationDelay: "0.56s" }}>
                <Field id="phone" label="Telefonnummer" type="tel" value={f.phone} onChange={(v) => set("phone", v)} placeholder="+46 ..." />
              </div>
            )}
            <div className="v2-enter__item" style={{ animationDelay: "0.6s" }}>
              <Field id="email" label="E-postadress" type="email" required value={f.email} onChange={(v) => set("email", v)} />
            </div>
            {mode !== "forgot" && (
              <div className="v2-enter__item" style={{ animationDelay: "0.66s" }}>
                <Field id="password" label="Lösenord" type="password" required value={f.password} onChange={(v) => set("password", v)} />
                {mode === "signup" && <p className="mt-1 text-[11px] text-[var(--v2-muted)]">Minst 8 tecken.</p>}
              </div>
            )}
            {mode === "signup" && (
              <>
                <div className="v2-enter__item" style={{ animationDelay: "0.72s" }}>
                  <Field id="confirm" label="Bekräfta lösenord" type="password" required value={f.confirm} onChange={(v) => set("confirm", v)} />
                </div>
                <div className="v2-enter__item space-y-2.5 pt-1" style={{ animationDelay: "0.78s" }}>
                  <Check checked={f.terms} onChange={(v) => set("terms", v)}>Jag godkänner Nexora:s användarvillkor och integritetspolicy.</Check>
                  <Check checked={f.risk} onChange={(v) => set("risk", v)}>Jag har läst riskinformationen och förstår att jag kan förlora hela det investerade kapitalet.</Check>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="v2-enter__item mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--v2-accent)] py-3.5 text-sm font-semibold text-[var(--v2-on-accent)] shadow-[0_10px_30px_-8px_var(--v2-accent)] transition active:scale-[0.97] disabled:opacity-60"
              style={{ animationDelay: "0.84s" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka återställningslänk"}
            </button>
          </form>

          {/* Footer links */}
          <div className="v2-enter__item mt-5 flex items-center justify-between text-xs text-[var(--v2-muted)]" style={{ animationDelay: "0.9s" }}>
            {mode === "login" ? (
              <>
                <button onClick={() => setMode("forgot")} className="font-medium text-[var(--v2-accent)]">Glömt lösenord?</button>
                <button onClick={() => setMode("signup")} className="font-medium text-[var(--v2-accent)]">Skapa konto</button>
              </>
            ) : (
              <button onClick={() => setMode("login")} className="font-medium text-[var(--v2-accent)]">Tillbaka till inloggning</button>
            )}
          </div>

          <p className="v2-enter__item mt-8 text-[11px] leading-relaxed text-[var(--v2-muted)]/70" style={{ animationDelay: "0.96s" }}>
            Handel med kryptotillgångar innebär hög risk. Du kan förlora hela det investerade kapitalet.
          </p>
        </div>
      </div>
    </div>
  );
}
