import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles, Check, LineChart, Lock, Wallet } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { generatePortfolioHistory } from "@/lib/demo-data";
import avanzaLogo from "@/assets/avanza.png";
import nordnetLogo from "@/assets/nordnet.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

const PARTNERS = [
  { name: "Avanza", logo: avanzaLogo },
  { name: "Nordnet", logo: nordnetLogo },
];

function PartnersSection() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PARTNERS.length), 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Samarbetspartners
        </p>
        <div className="mt-6 flex items-center justify-center">
          <div className="relative h-16 w-56 sm:h-20 sm:w-72">
            {PARTNERS.map((p, idx) => (
              <img
                key={p.name}
                src={p.logo}
                alt={`${p.name} logotyp`}
                className={`absolute inset-0 m-auto max-h-full max-w-full object-contain transition-opacity duration-700 ${
                  idx === i ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Nexora AI arbetar tillsammans med ledande nordiska aktörer.
        </p>
      </div>
    </section>
  );
}

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
            <a href="#om" className="hover:text-foreground">Om</a>
            <a href="#nivaer" className="hover:text-foreground">Investeringsnivåer</a>
            <a href="#sa-fungerar" className="hover:text-foreground">Så fungerar det</a>
            <a href="#varfor" className="hover:text-foreground">Varför Nexora</a>
            <a href="#sakerhet" className="hover:text-foreground">Säkerhet</a>
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

      <PartnersSection />

      {/* Vad är Nexora AI */}
      <section id="om" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Om Nexora AI</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Ett nytt sätt att handla på finansmarknaderna.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Nexora AI är en AI-driven tradingbot skapad för alla som vill delta i marknaderna –
                oavsett om du är nybörjare eller erfaren trader. Systemet arbetar dygnet runt och
                analyserar globala finansmarknader inklusive kryptovalutor, valutor, aktier och råvaror.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Traditionell handel kan kännas överväldigande. Nexora AI tar bort komplexiteten så att
                du kan investera lugnt och effektivt – med intelligenta algoritmer, blixtsnabb exekvering
                och en användarupplevelse som fungerar även medan du sover.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { t: "Avancerad AI", d: "Maskininlärning som scannar marknaden efter mönster i realtid." },
                { t: "Dygnet runt", d: "Boten sover aldrig – analyserar och agerar 24/7." },
                { t: "Alla nivåer", d: "Från nybörjare till erfaren trader – samma verktyg." },
                { t: "Multi-asset", d: "Krypto, forex, aktier och råvaror i ett gränssnitt." },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-display text-lg font-bold">{c.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Investeringsnivåer */}
      <section id="nivaer" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Investeringsnivåer</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Välj din investeringsnivå
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Välj det belopp som passar din ekonomiska situation, erfarenhet och risktolerans.
              Du kan förlora hela det investerade kapitalet.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INVESTMENT_TIERS.map((tier) => (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm transition hover:border-primary/60 hover:shadow-md ${
                  tier.featured ? "border-primary ring-2 ring-primary/25" : "border-border"
                }`}
              >
                {tier.badge && (
                  <span
                    className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      tier.featured
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {tier.badge}
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <h3 className="font-display text-xl font-bold uppercase tracking-wide">{tier.name}</h3>
                  {tier.extendedKyc && (
                    <ShieldCheck className="h-4 w-4 text-primary" aria-label="Utökad verifiering" />
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Investeringsbelopp</div>
                  <div className="mt-1 font-display text-3xl font-bold tabular-nums">
                    {formatSek(tier.amount)}
                  </div>
                </div>

                <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> Full tillgång till AI-strategier
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> Automatisk rebalansering
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {tier.extendedKyc ? "Dedikerad kontaktperson" : "Standardrapportering"}
                  </li>
                </ul>

                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold ${
                    tier.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background hover:bg-muted"
                  }`}
                >
                  Välj {tier.name} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
            Alla belopp är i SEK. I demoläget genomförs inga riktiga betalningar. Investeringar i krypto
            innebär hög risk – du kan förlora hela ditt kapital. Utökad verifiering krävs för nivåer från
            100 000 kr och uppåt.
          </p>
        </div>
      </section>

      {/* Så fungerar Nexora AI */}
      <section id="sa-fungerar" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Så fungerar det</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Så fungerar Nexora AI
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Inga komplicerade installationer eller tekniska förkunskaper krävs. Det intuitiva
              gränssnittet guidar dig genom varje steg – från första inloggning till aktiv portfölj.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {[
              {
                step: "01",
                title: "Välj investeringsnivå och skapa konto",
                desc: "Välj den nivå som passar din ekonomi och risktolerans. Skapa kontot på under en minut och slutför en enkel verifiering.",
              },
              {
                step: "02",
                title: "Sätt in via kort, Swish eller krypto",
                desc: "Vår guidade on-ramp visar exakt hur du sätter in – med kort, banköverföring eller genom att skicka krypto till din personliga adress.",
              },
              {
                step: "03",
                title: "Konfigurera din bot",
                desc: "Föredrar du en hands-off-approach? Låt Nexora AI handla åt dig. Vill du ha mer kontroll? Justera parametrar och sätt egna regler.",
              },
              {
                step: "04",
                title: "Luta dig tillbaka – följ i realtid",
                desc: "Boten lär sig och anpassar strategin efter dina resultat och marknadens rörelser. Följ prestanda och gör justeringar när du vill.",
              },
            ].map((s) => (
              <div key={s.step} className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-[1fr_1.1fr] sm:p-8">
                {/* Bildplats – byt ut mot skärmdump/illustration */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-muted to-background">
                  <div className="absolute inset-0 grid place-items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Bild kommer här
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-display text-sm font-bold text-primary">{s.step}</span>
                  <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plattform / Teknik bakom */}
      <section id="plattform" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tekniken bakom</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Avancerad AI som aldrig sover
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Bakom kulisserna drivs Nexora AI av modern artificiell intelligens och sofistikerade
              maskininlärningsmodeller som bearbetar enorma datamängder på sekunder – något ingen
              människa kan göra ensam.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              { icon: Sparkles, title: "AI-driven analys", desc: "Realtidsmodeller väger volatilitet, momentum och korrelation. Systemet reagerar inte bara – det förutser." },
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

      {/* Varför Nexora AI */}
      <section id="varfor" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Varför Nexora AI</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Transparens, kontroll och support – dygnet runt.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Nexora AI växer varje dag och har redan hjälpt tusentals användare i Sverige att uppnå
                mer konsekventa resultat, minska känslostyrda misstag och frigöra tid för det som
                betyder mest.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Vi garanterar inga vinster – men kombinationen av avancerad AI, realtidsanalys och
                robust riskhantering ger dig en tydlig fördel.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Inga dolda avgifter",
                  desc: "Transparent prissättning utan överraskningar. Du behåller full äganderätt över ditt kapital.",
                },
                {
                  title: "Börja litet, skala upp",
                  desc: "Starta med en liten insättning och öka gradvis när du ser resultaten.",
                },
                {
                  title: "Support 24/7",
                  desc: "Live-chatt bemannad dygnet runt. Vårt team finns här – dag som natt.",
                },
                {
                  title: "Full kontroll",
                  desc: "Sätt riskprofil, anpassa strategier eller använd rekommenderade inställningar.",
                },
                {
                  title: "Höggradig kryptering",
                  desc: "Din data och dina medel skyddas med säkerhet i institutionell klass.",
                },
                {
                  title: "Fullt spårbart",
                  desc: "Varje handel botten utför loggas och visas i din personliga dashboard.",
                },
              ].map((b) => (
                <div key={b.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-display text-base font-bold">{b.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

