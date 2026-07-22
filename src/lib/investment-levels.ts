export type InvestmentLevel = {
  key: string;
  name: string;
  amount: number;
  description: string;
  maxTradesPerMonth: number;
  maxLeveragePct: number;
  targetMultiplier: number; // Slut-multiplikator på portföljen vid session-slut
  popular?: boolean;
};

export const INVESTMENT_LEVELS: InvestmentLevel[] = [
  { key: "START",        name: "Start",         amount: 2500,    description: "Den lägsta investeringsnivån för dig som vill börja med ett mindre belopp.", maxTradesPerMonth: 20,   maxLeveragePct: 0,   targetMultiplier: 1.8 },
  { key: "BAS",          name: "Bas",           amount: 5000,    description: "En grundnivå för dig som vill ta ett första steg in på kryptomarknaden.",     maxTradesPerMonth: 40,   maxLeveragePct: 0,   targetMultiplier: 1.9 },
  { key: "PLUS",         name: "Plus",          amount: 10000,   description: "För dig som vill skapa en större marknadsexponering och följa utvecklingen långsiktigt.", maxTradesPerMonth: 60,   maxLeveragePct: 25,  targetMultiplier: 2.0 },
  { key: "ADVANCED",     name: "Advanced",      amount: 25000,   description: "En högre investeringsnivå som kräver god förståelse för kryptomarknadens risker.", maxTradesPerMonth: 100,  maxLeveragePct: 50,  targetMultiplier: 2.2, popular: true },
  { key: "PREMIUM",      name: "Premium",       amount: 50000,   description: "För erfarna användare som accepterar betydande värdeförändringar och kapitalrisk.", maxTradesPerMonth: 150,  maxLeveragePct: 100, targetMultiplier: 2.3 },
  { key: "PRIVATE",      name: "Private",       amount: 100000,  description: "En större kapitalplacering med utökad kontroll av investerarens profil och pengarnas ursprung.", maxTradesPerMonth: 200,  maxLeveragePct: 150, targetMultiplier: 2.5 },
  { key: "PRIVATE_PLUS", name: "Private Plus",  amount: 250000,  description: "För större kapitalplaceringar som kräver kompletterad kundkännedom före aktivering.", maxTradesPerMonth: 300,  maxLeveragePct: 200, targetMultiplier: 2.6 },
  { key: "WEALTH",       name: "Wealth",        amount: 500000,  description: "En avancerad nivå där personlig kontakt och utökad verifiering krävs innan insättning.", maxTradesPerMonth: 500,  maxLeveragePct: 300, targetMultiplier: 2.7 },
  { key: "WEALTH_ONE",   name: "Wealth One",    amount: 1000000, description: "Den högsta nivån. Kräver individuell granskning, dokumentation och godkännande innan insättning.", maxTradesPerMonth: 1000, maxLeveragePct: 500, targetMultiplier: 2.8 },
];

export function getLevelByAmount(amount: number | null | undefined): InvestmentLevel {
  if (!amount) return INVESTMENT_LEVELS[3]; // Advanced default
  // Match exact or fall back to closest lower level
  const exact = INVESTMENT_LEVELS.find((l) => l.amount === amount);
  if (exact) return exact;
  const sorted = [...INVESTMENT_LEVELS].sort((a, b) => b.amount - a.amount);
  return sorted.find((l) => l.amount <= amount) ?? INVESTMENT_LEVELS[0];
}

export function getLevelByKey(key: string | null | undefined): InvestmentLevel | null {
  if (!key) return null;
  return INVESTMENT_LEVELS.find((l) => l.key === key) ?? null;
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
