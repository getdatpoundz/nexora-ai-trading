import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  return (
    <AppShell title="Inställningar">
      <div className="space-y-6">
        <DemoBanner compact />
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="profile">Personuppgifter</TabsTrigger>
            <TabsTrigger value="security">Säkerhet</TabsTrigger>
            <TabsTrigger value="notifications">Notifikationer</TabsTrigger>
            <TabsTrigger value="privacy">Integritet</TabsTrigger>
            <TabsTrigger value="lang">Språk & valuta</TabsTrigger>
            <TabsTrigger value="sessions">Sessioner</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label>Förnamn</Label><Input defaultValue={profile?.first_name ?? ""} className="mt-1" /></div>
              <div><Label>Efternamn</Label><Input defaultValue={profile?.last_name ?? ""} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label>E-post</Label><Input defaultValue={user?.email ?? ""} className="mt-1" disabled /></div>
              <div><Label>Telefon</Label><Input defaultValue={profile?.phone ?? ""} className="mt-1" /></div>
              <div><Label>Adress</Label><Input className="mt-1" /></div>
            </div>
            <Button onClick={() => toast.success("Profil sparad")}>Spara ändringar</Button>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-semibold">Tvåfaktorsautentisering</p>
                <p className="text-xs text-muted-foreground">Extra skydd vid inloggning – kommer snart.</p>
              </div>
              <Switch />
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-semibold">Ändra lösenord</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Input type="password" placeholder="Nuvarande lösenord" />
                <Input type="password" placeholder="Nytt lösenord" />
              </div>
              <Button className="mt-3" onClick={() => toast.success("Lösenord uppdaterat")}>Uppdatera</Button>
            </div>
            <div className="rounded-lg border border-border p-4 text-sm">
              <p className="font-semibold">Senaste inloggning</p>
              <p className="text-muted-foreground">Idag från Stockholm, Sverige · Chrome (Windows)</p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3 rounded-2xl border border-border bg-card p-6">
            {["Konto", "Säkerhet", "Strategi", "Marknad", "Dokument", "Support"].map((c) => (
              <div key={c} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <span className="text-sm font-medium">{c}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="privacy" className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Hantera dina personuppgifter och samtycken. Kontakta support för radering.</p>
          </TabsContent>

          <TabsContent value="lang" className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Språk: Svenska (fast). Valuta: SEK (fast).</p>
          </TabsContent>

          <TabsContent value="sessions" className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="rounded-lg border border-border p-4 text-sm">
              <p className="font-semibold">Denna enhet</p>
              <p className="text-muted-foreground">Chrome · Stockholm · Aktiv nu</p>
            </div>
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
              Logga ut från alla enheter
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
