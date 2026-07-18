export const sek = (n: number, opts: { decimals?: number } = {}) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: opts.decimals ?? 0,
    minimumFractionDigits: opts.decimals ?? 0,
  }).format(n);

export const num = (n: number, decimals = 2) =>
  new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);

export const pct = (n: number, decimals = 2) =>
  `${n >= 0 ? "+" : ""}${num(n, decimals)} %`;

export const dateSv = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
