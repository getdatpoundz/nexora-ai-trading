import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (isAdmin === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">Kontrollerar behörighet ...</div>;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Åtkomst nekad</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adminpanelen är endast tillgänglig för administratörer. Om du tror att detta
            är ett misstag, kontakta support.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>Till översikten</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold">Adminpanel</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { l: "Registrerade", v: "1" },
            { l: "Nya (7d)", v: "1" },
            { l: "Verifierade", v: "0" },
            { l: "Supportärenden", v: "0" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">{s.l}</p>
              <p className="mt-2 text-2xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">Systemhändelser</h3>
          <p className="mt-2 text-sm text-muted-foreground">Inga händelser att visa.</p>
        </div>
      </div>
    </div>
  );
}
// unused import guards
void Input; void Label; void RadioGroup; void RadioGroupItem; void Select; void SelectContent; void SelectItem; void SelectTrigger; void SelectValue; void toast; void CheckCircle2;
