import { useState } from "react";

/** Riktiga krypto-/tillgångsloggor via CDN, med snygg fallback. */
const SLUGS: Record<string, string> = {
  BTC: "btc", ETH: "eth", SOL: "sol", XRP: "xrp", ADA: "ada", DOGE: "doge",
  USDT: "usdt", USDC: "usdc", BNB: "bnb", LTC: "ltc", DOT: "dot", AVAX: "avax",
  LINK: "link", MATIC: "matic", XAU: "xau", XAG: "xag",
};

export function CoinIcon({ symbol, className = "h-10 w-10" }: { symbol: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const slug = SLUGS[symbol.toUpperCase()];

  if (!slug || failed) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-[var(--v2-accent)]/15 text-[0.6rem] font-bold text-[var(--v2-accent)] ${className}`}
      >
        {symbol.slice(0, 4)}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${slug}.svg`}
      alt={`${symbol} logotyp`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-white/5 ${className}`}
    />
  );
}
