import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Wallet, Brain, LineChart, ArrowLeftRight,
  ArrowDownToLine, ArrowUpFromLine, LifeBuoy, Settings,
  Bell, Menu, X, LogOut, ShieldAlert, User as UserIcon, HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/portfolio", label: "Min portfölj", icon: Wallet },
  { to: "/strategies", label: "AI-bot", icon: Brain },
  { to: "/markets", label: "Marknader", icon: LineChart },
  { to: "/transactions", label: "Transaktioner", icon: ArrowLeftRight },
  { to: "/deposit", label: "Sätt in", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Ta ut", icon: ArrowUpFromLine },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Inställningar", icon: Settings },
] as const;

const MOBILE_NAV = [
  { to: "/portfolio", label: "Portfölj", icon: Wallet },
  { to: "/strategies", label: "AI-bot", icon: Brain },
  { to: "/markets", label: "Marknader", icon: LineChart },
  { to: "/transactions", label: "Historik", icon: ArrowLeftRight },
  { to: "/settings", label: "Mer", icon: Settings },
] as const;

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand glow-brand">
        <span className="text-lg font-black text-primary-foreground">N</span>
      </div>
      {!small && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">Nexora AI</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">AI-driven handel</span>
        </div>
      )}
    </div>
  );
}

function SidebarInner({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Link
          to="/risk"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] text-muted-foreground hover:text-sidebar-foreground"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Riskinformation
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logga ut
        </button>
      </div>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const initials =
    (profile?.first_name?.[0] ?? user?.email?.[0] ?? "N").toUpperCase() +
    (profile?.last_name?.[0]?.toUpperCase() ?? "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside data-tour="sidebar" className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarInner pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border">
            <SidebarInner pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
                aria-label="Öppna meny"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notifications" aria-label="Notifikationer" className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              </Link>
              <button
                data-tour="help-button"
                aria-label="Starta guiden"
                onClick={() => (window as unknown as { __startNexoraTour?: () => void }).__startNexoraTour?.()}
                className="hidden sm:grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-full gradient-brand text-sm font-bold text-primary-foreground">
                    {initials || "N"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs">
                    <div className="font-semibold">{profile?.first_name ?? "Användare"} {profile?.last_name ?? ""}</div>
                    <div className="text-muted-foreground truncate">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/notifications" })}>
                    <Bell className="mr-2 h-4 w-4" /> Notifikationer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/auth";
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logga ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border bg-sidebar/95 backdrop-blur-xl lg:hidden">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export { X };
