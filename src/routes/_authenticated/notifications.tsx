import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { DEMO_NOTIFICATIONS } from "@/lib/demo-data";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifs,
});

function Notifs() {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);
  return (
    <AppShell title="Notifikationer">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))}>
            <Check className="mr-2 h-4 w-4" /> Markera alla som lästa
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.category} · {n.time}</p>
              </div>
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
