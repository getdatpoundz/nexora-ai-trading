// All values here are simulated demo data. Not real market data.

export const DEMO_PORTFOLIO = {
  totalValue: 25000,
  availableBalance: 5000,
  investedCapital: 20000,
  totalChange: 1250,
  totalChangePct: 5.26,
  activeStrategy: "Balanserad",
  riskLevel: 4,
};

export type Holding = {
  symbol: string;
  name: string;
  amount: number;
  price: number; // SEK, simulated
  value: number;
  avgPrice: number;
  changePct: number;
  color: string;
};

export const DEMO_HOLDINGS: Holding[] = [
  { symbol: "BTC", name: "Bitcoin", amount: 0.0125, price: 720000, value: 9000, avgPrice: 680000, changePct: 5.88, color: "oklch(0.78 0.15 75)" },
  { symbol: "ETH", name: "Ethereum", amount: 0.32, price: 21875, value: 7000, avgPrice: 20000, changePct: 9.38, color: "oklch(0.72 0.18 230)" },
  { symbol: "USDC", name: "USD Coin", amount: 380, price: 10.5, value: 3990, avgPrice: 10.4, changePct: 0.96, color: "oklch(0.78 0.14 195)" },
  { symbol: "SEK", name: "Tillgängligt saldo", amount: 5000, price: 1, value: 5000, avgPrice: 1, changePct: 0, color: "oklch(0.68 0.02 245)" },
];

export type Transaction = {
  id: string;
  date: string;
  type: "Insättning" | "Uttag" | "Köp" | "Sälj" | "Avgift";
  asset: string;
  amount: number;
  valueSEK: number;
  status: "Genomförd" | "Väntar" | "Behandlas" | "Misslyckad" | "Avbruten";
};

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "TX-8842", date: "2025-11-28", type: "Köp", asset: "BTC", amount: 0.0025, valueSEK: 1800, status: "Genomförd" },
  { id: "TX-8836", date: "2025-11-25", type: "Insättning", asset: "SEK", amount: 5000, valueSEK: 5000, status: "Genomförd" },
  { id: "TX-8824", date: "2025-11-20", type: "Köp", asset: "ETH", amount: 0.12, valueSEK: 2625, status: "Genomförd" },
  { id: "TX-8810", date: "2025-11-15", type: "Avgift", asset: "SEK", amount: 24, valueSEK: 24, status: "Genomförd" },
  { id: "TX-8802", date: "2025-11-10", type: "Insättning", asset: "SEK", amount: 15000, valueSEK: 15000, status: "Genomförd" },
  { id: "TX-8791", date: "2025-11-05", type: "Sälj", asset: "USDC", amount: 100, valueSEK: 1050, status: "Behandlas" },
];

export const DEMO_MARKETS = [
  { symbol: "BTC", name: "Bitcoin", price: 720000, change24h: 2.34, volatility: "Hög", risk: 6 },
  { symbol: "ETH", name: "Ethereum", price: 21875, change24h: 3.12, volatility: "Hög", risk: 6 },
  { symbol: "SOL", name: "Solana", price: 1520, change24h: -1.87, volatility: "Mycket hög", risk: 7 },
  { symbol: "XRP", name: "XRP", price: 5.4, change24h: 0.42, volatility: "Hög", risk: 6 },
  { symbol: "ADA", name: "Cardano", price: 3.9, change24h: -0.98, volatility: "Hög", risk: 6 },
  { symbol: "LINK", name: "Chainlink", price: 152, change24h: 1.65, volatility: "Hög", risk: 6 },
  { symbol: "USDC", name: "USD Coin", price: 10.5, change24h: 0.02, volatility: "Låg", risk: 2 },
];

// Simulated realistic portfolio history — some ups and downs.
export function generatePortfolioHistory(days = 90) {
  const points: { date: string; value: number; btc: number }[] = [];
  let value = 20000;
  let btc = 20000;
  const start = new Date();
  start.setDate(start.getDate() - days);
  for (let i = 0; i <= days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const noise = (Math.sin(i / 6) + Math.cos(i / 11) * 0.6 + (Math.random() - 0.5) * 0.8) * 180;
    const drift = i * 12;
    value = Math.max(15000, value + noise + drift * 0.05);
    btc = Math.max(15000, btc + noise * 1.4 + drift * 0.04);
    points.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(value),
      btc: Math.round(btc),
    });
  }
  return points;
}

export const DEMO_INSIGHTS = [
  { title: "Marknadsvolatiliteten har ökat", body: "Volatiliteten i din portfölj är förhöjd de senaste 7 dagarna.", tone: "warning" as const },
  { title: "Exponering mot Bitcoin: 42 %", body: "Din nuvarande BTC-andel ligger över strategins riktvärde.", tone: "info" as const },
  { title: "Risknivå högre än vald profil", body: "Din faktiska risknivå (5) är högre än din valda profil (Balanserad, 4).", tone: "warning" as const },
];

export const DEMO_NOTIFICATIONS = [
  { id: "n1", category: "Säkerhet", title: "Ny inloggning från Stockholm", time: "för 2 tim sedan", read: false },
  { id: "n2", category: "Strategi", title: "Din balanserade strategi har rebalanserats i demoläge", time: "igår", read: false },
  { id: "n3", category: "Marknad", title: "Bitcoin har rört sig +2,3 % de senaste 24 timmarna", time: "igår", read: true },
  { id: "n4", category: "Dokument", title: "Månadsöversikt november är tillgänglig", time: "3 dagar sedan", read: true },
];

export const RISK_DISCLAIMER =
  "Handel med kryptotillgångar innebär hög risk. Värdet kan både öka och minska och du kan förlora hela det investerade kapitalet. Historisk eller simulerad utveckling är ingen garanti för framtida resultat.";
