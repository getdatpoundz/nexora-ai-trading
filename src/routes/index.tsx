import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles, Check, LineChart, Lock, Wallet } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useMemo } from "react";
import { generatePortfolioHistory } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  component: Landing,
});

const INVESTMENT_TIERS: {
  key: string;
  name: string;
  amount: number;
  badge?: string;
  featured?: boolean;
  extendedKyc?: boolean;
}[] = [
  { key: "start", name: "Start", amount: 2500 },
  { key: "bas", name: "Bas", amount: 5000 },
  { key: "plus", name: "Plus", amount: 10000 },
  { key: "advanced", name: "Advanced", amount: 25000, badge: "Populärt val", featured: true },
  { key: "premium", name: "Premium", amount: 50000 },
  { key: "private", name: "Private", amount: 100000, badge: "Utökad verifiering", extendedKyc: true },
  { key: "private-plus", name: "Private Plus", amount: 250000, badge: "Utökad verifiering", extendedKyc: true },
  { key: "wealth", name: "Wealth", amount: 500000, badge: "Utökad verifiering", extendedKyc: true },
  { key: "wealth-one", name: "Wealth One", amount: 1000000, badge: "Utökad verifiering", extendedKyc: true },
];

const formatSek = (n: number) => `${n.toLocaleString("sv-SE")} kr`;


function Landing() {
  const chartData = useMemo(() => generatePortfolioHistory(180), []);

  return (
    <div className="theme-nordnet min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">N</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Nexora AI</span>
            <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Demo</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#nivaer" className="hover:text-foreground">Investeringsnivåer</a>
            <a href="#plattform" className="hover:text-foreground">Plattform</a>
            <a href="#sakerhet" className="hover:text-foreground">Säkerhet</a>
            <a href="#priser" className="hover:text-foreground">Priser</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Logga in
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Öppna konto
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Demoläge · simulerade belopp i SEK
              </span>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Sveriges nya <span className="text-primary">AI-plattform</span> för kryptoinvesteringar.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Nexora AI kombinerar automatiserade strategier, transparent risk och professionella verktyg.
                Välj din investeringsnivå och låt AI:n sköta portföljen åt dig.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Öppna konto gratis <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#nivaer" className="rounded-md border border-border bg-card px-6 py-3.5 text-sm font-semibold hover:bg-muted">
                  Se investeringsnivåer
                </a>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Nivåer</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">3</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Tillgångar</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">50+</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Avgift</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">0,9%</dd>
                </div>
              </dl>
            </div>

            {/* Chart card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Portfölj · Balanserad</p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums">1 284 500 kr</p>
                  <p className="mt-1 text-sm font-semibold text-primary">+18,4% i år · simulerat</p>
                </div>
                <span className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Demo</span>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid oklch(0.9 0.005 90)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v.toLocaleString("sv-SE")} kr`, "Värde"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="oklch(0.62 0.16 155)" strokeWidth={2} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {[
                  { l: "1M", v: "+4,2%" },
                  { l: "6M", v: "+12,8%" },
                  { l: "1Å", v: "+18,4%" },
                ].map((s) => (
                  <div key={s.l} className="rounded-md border border-border bg-background px-3 py-2">
                    <div className="text-muted-foreground">{s.l}</div>
                    <div className="mt-0.5 font-semibold text-primary tabular-nums">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investeringsnivåer */}
      <section id="nivaer" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Investeringsnivåer</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Välj den nivå som matchar dig.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Tre AI-styrda strategier med tydlig riskmärkning på skalan 1–7. Byt när du vill.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.key}
                className={`relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm ${
                  lvl.featured ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                {lvl.featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    {lvl.tagline}
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold">{lvl.name}</h3>
                    {!lvl.featured && <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{lvl.tagline}</p>}
                  </div>
                  <RiskPill level={lvl.risk} />
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{lvl.desc}</p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Förv. avkastning</div>
                    <div className="mt-0.5 font-display text-lg font-bold text-primary">{lvl.expected}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horisont</div>
                    <div className="mt-0.5 font-display text-lg font-bold">{lvl.horizon}</div>
                  </div>
                </div>

                {/* Allocation bar */}
                <div className="mt-6">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fördelning</div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    {lvl.allocation.map((a, i) => (
                      <div
                        key={a.name}
                        style={{
                          width: `${a.v}%`,
                          background: ["oklch(0.62 0.16 155)", "oklch(0.72 0.14 195)", "oklch(0.55 0.02 90)", "oklch(0.78 0.15 75)"][i],
                        }}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {lvl.allocation.map((a) => (
                      <li key={a.name} className="flex justify-between">
                        <span>{a.name}</span>
                        <span className="tabular-nums font-medium text-foreground">{a.v}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
                  {lvl.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" /> {h}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold ${
                    lvl.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background hover:bg-muted"
                  }`}
                >
                  Välj {lvl.name} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
            All data är simulerad i demoläget. Historisk eller simulerad utveckling är ingen garanti för framtida resultat.
          </p>
        </div>
      </section>

      {/* Plattform */}
      <section id="plattform" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-3">
            {[
              { icon: Sparkles, title: "AI-driven analys", desc: "Realtidsmodeller väger volatilitet, momentum och korrelation för att balansera din portfölj." },
              { icon: LineChart, title: "Professionell översikt", desc: "Portfölj, marknad och risk i ett gränssnitt byggt för både nybörjare och erfarna traders." },
              { icon: ShieldCheck, title: "Transparent risk", desc: "Varje strategi märks på skalan 1–7 med tydlig information om nedgångar och volatilitet." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-8">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Säkerhet + priser */}
      <section id="sakerhet" className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Säkerhet</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Byggt för svenska sparare.</h2>
            <p className="mt-4 text-muted-foreground">
              Nexora AI följer nordiska best practices: stark autentisering, kryptering och tydlig separation
              mellan användardata och drift. I demoläget hanteras inga riktiga medel.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                { icon: Lock, t: "Tvåfaktorsautentisering och sessionshantering" },
                { icon: ShieldCheck, t: "Radbaserad åtkomstkontroll (RLS) på all data" },
                { icon: Wallet, t: "Inga riktiga plånböcker i demoläget – noll motpartsrisk" },
                { icon: TrendingUp, t: "Fullständig transaktionshistorik och revisionsloggar" },
              ].map((s) => (
                <li key={s.t} className="flex items-start gap-3">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{s.t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div id="priser" className="rounded-2xl border border-border bg-card p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Priser</p>
            <h3 className="mt-3 font-display text-2xl font-bold">Enkelt och transparent.</h3>
            <div className="mt-6 space-y-4">
              {[
                { l: "Förvaltningsavgift", v: "0,9% / år" },
                { l: "Insättning (SEK)", v: "0 kr" },
                { l: "Uttag (SEK)", v: "0 kr" },
                { l: "Courtage per handel", v: "0,15%" },
                { l: "Byte av strategi", v: "Gratis" },
              ].map((row) => (
                <div key={row.l} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{row.l}</span>
                  <span className="font-display text-base font-bold tabular-nums">{row.v}</span>
                </div>
              ))}
            </div>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Öppna konto gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-24">
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Redo att testa <span className="text-primary">Nexora AI</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Skapa ett konto på under en minut och utforska plattformen i demoläge – helt utan risk.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Öppna konto <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="rounded-md border border-border bg-card px-6 py-3.5 text-sm font-semibold hover:bg-muted">
              Jag har redan ett konto
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
                <span className="font-display text-sm font-bold text-primary-foreground">N</span>
              </div>
              <span className="font-display font-bold">Nexora AI</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#nivaer" className="hover:text-foreground">Nivåer</a>
              <a href="#plattform" className="hover:text-foreground">Plattform</a>
              <a href="#sakerhet" className="hover:text-foreground">Säkerhet</a>
              <a href="#priser" className="hover:text-foreground">Priser</a>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
            Handel med kryptotillgångar innebär hög risk. Värdet kan både öka och minska och du kan
            förlora hela det investerade kapitalet. Historisk eller simulerad utveckling är ingen
            garanti för framtida resultat. Nexora AI drivs i demoläge – inga riktiga betalningar sker.
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Nexora AI · Demoläge</p>
        </div>
      </footer>
    </div>
  );
}

function RiskPill({ level }: { level: number }) {
  const dots = Array.from({ length: 7 }, (_, i) => i < level);
  const tone = level <= 2 ? "text-primary" : level <= 4 ? "text-warning" : "text-destructive";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className={`font-display text-xs font-bold uppercase tracking-wider ${tone}`}>Risk {level}/7</span>
      <div className="flex gap-0.5">
        {dots.map((on, i) => (
          <span key={i} className={`h-1.5 w-3 rounded-full ${on ? (level <= 2 ? "bg-primary" : level <= 4 ? "bg-warning" : "bg-destructive") : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}
