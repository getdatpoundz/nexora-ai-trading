// Abstraction över on-ramp-providers.
// Just nu: demo-implementation som ser ut som Transak.
// När Transak-avtal finns: byt ut `openTransakDemo` mot riktiga Transak SDK-anropet.
// Payload/format är avsiktligt likt Transaks widget-parametrar för att minimera bytet.

export type OnrampMethod = "card" | "swish" | "sepa" | "crypto";
export type OnrampCurrency = "BTC" | "ETH" | "USDC";

export type OnrampProvider = "transak_demo" | "transak";

export const METHOD_LABELS: Record<OnrampMethod, string> = {
  card: "Bank- eller kreditkort",
  swish: "Swish",
  sepa: "SEPA banköverföring",
  crypto: "Jag har redan krypto",
};

export const METHOD_DESCRIPTIONS: Record<OnrampMethod, string> = {
  card: "Visa, Mastercard. Kredit direkt efter bekräftelse (1–5 min).",
  swish: "Snabbast för svenska kunder. Öppnar Swish-appen.",
  sepa: "Lägst avgift. Kredit inom 1 bankdag.",
  crypto: "Överför BTC, ETH eller USDC från extern plånbok till Nexoras adress.",
};

export const CURRENCY_LABELS: Record<OnrampCurrency, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  USDC: "USD Coin (Ethereum)",
};

// Demo-adresser (aldrig riktiga plånböcker). En riktig integration genererar
// en unik adress per användare via t.ex. Fireblocks/BitGo.
export function demoDepositAddress(currency: OnrampCurrency, userIdSeed: string): string {
  const suffix = userIdSeed.replace(/-/g, "").slice(0, 8);
  switch (currency) {
    case "BTC":
      return `bc1qnexora${suffix}demo0k4hwl3l87pmqxr2v6mfyk`;
    case "ETH":
      return `0xNEXORA${suffix.toUpperCase()}DEMO4b2E3B7d3a8f9C1D2E3F`;
    case "USDC":
      return `0xNEXORA${suffix.toUpperCase()}USDC1a2b3c4d5e6f7a8b9c0d`;
  }
}

// Simulerad exchange rate. Ersätts av live-pris i produktion.
const DEMO_RATE_SEK: Record<OnrampCurrency, number> = {
  BTC: 720000,
  ETH: 32000,
  USDC: 10.6,
};

export function amountToCrypto(sek: number, currency: OnrampCurrency): number {
  return sek / DEMO_RATE_SEK[currency];
}

export function formatCrypto(n: number, currency: OnrampCurrency): string {
  const digits = currency === "USDC" ? 2 : currency === "ETH" ? 5 : 8;
  return `${n.toFixed(digits)} ${currency}`;
}

// I framtiden: här öppnas Transak-widgeten via deras SDK.
// Signaturen matchar Transaks parameters (fiatAmount, fiatCurrency, cryptoCurrencyCode,
// walletAddress, partnerOrderId).
export type OpenOnrampArgs = {
  fiatAmount: number;
  fiatCurrency: "SEK";
  cryptoCurrency: OnrampCurrency;
  walletAddress: string;
  partnerOrderId: string;
  method: OnrampMethod;
};

// Placeholder som riktig Transak-init kan byggas kring:
// import transakSDK from "@transak/transak-sdk";
// export function openTransak(args: OpenOnrampArgs) { ... }
