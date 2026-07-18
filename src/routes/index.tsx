import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Brain, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand glow-brand">
              <span className="text-lg font-black text-primary-foreground">N</span>
            </div>
            <span className="text-base font-bold tracking-tight">Nexora AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Logga in
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">
              Skapa konto
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.72_0.18_230/0.18),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Demoläge – simulerad data
          </span>
          <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-6xl">
            <span className="text-gradient-brand">AI-driven</span> kryptoplattform
            <br />för svenska investerare.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Nexora AI hjälper dig att förstå marknader, hantera risk och följa dina
            investeringar. Just nu tillgänglig i tydligt demoläge med simulerade belopp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-lg gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground glow-brand">
              Kom igång gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:bg-card">
              Logga in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Brain, title: "AI-strategier", desc: "Tre risknivåer med tydlig fördelning och transparenta avgifter." },
          { icon: LineChart, title: "Klar överblick", desc: "Portfölj, marknad och risk i ett professionellt gränssnitt." },
          { icon: ShieldCheck, title: "Säkerhet i fokus", desc: "Tvåfaktor, sessionshantering och revisionsloggar för admin." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-3xl px-6">
          Handel med kryptotillgångar innebär hög risk. Värdet kan både öka och minska
          och du kan förlora hela det investerade kapitalet. Historisk eller simulerad
          utveckling är ingen garanti för framtida resultat.
        </p>
        <p className="mt-3">© {new Date().getFullYear()} Nexora AI · Demoläge</p>
      </footer>
    </div>
  );
}
