import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Återställ lösenord · Nexora" },
      { name: "description", content: "Ange ett nytt lösenord för ditt Nexora-konto." },
      { property: "og:title", content: "Återställ lösenord · Nexora" },
      { property: "og:description", content: "Ange ett nytt lösenord för ditt Nexora-konto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase sends the recovery token in the URL hash (#access_token=...&type=recovery)
    // and the client picks it up automatically, firing PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setChecking(false);
      }
    });

    // Fallback: if we already have a session (e.g. link processed), allow update.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Lösenordet måste vara minst 8 tecken");
    if (password !== confirm) return toast.error("Lösenorden matchar inte");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Lösenord uppdaterat");
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { mode: "login" } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kunde inte uppdatera lösenordet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-nordnet grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Sätt nytt lösenord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Välj ett nytt lösenord för ditt Nexora-konto.
        </p>

        {checking ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifierar länk…
          </div>
        ) : !ready ? (
          <div className="mt-6 space-y-3 text-sm">
            <p className="text-destructive">Länken är ogiltig eller har gått ut.</p>
            <Link to="/auth" search={{ mode: "forgot" }} className="inline-block text-primary underline">
              Begär en ny återställningslänk
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label htmlFor="password">Nytt lösenord</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="mt-1 text-[11px] text-muted-foreground">Minst 8 tecken.</p>
            </div>
            <div>
              <Label htmlFor="confirm">Bekräfta lösenord</Label>
              <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uppdatera lösenord
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
