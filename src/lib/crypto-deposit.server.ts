// Server-only helpers for crypto-deposit.functions.ts.
// Kept out of the .functions.ts file so the tss-serverfn-split
// transformer doesn't strip these siblings and cause ReferenceErrors.

export type Currency = "BTC";

export interface DepositConfig {
  currency: Currency;
  network: string;
  address: string;
  label: string;
  minConfirmations: number;
  explorerTx: (h: string) => string;
}

export function getConfig(_currency: Currency): DepositConfig {
  return {
    currency: "BTC",
    network: "Bitcoin",
    address:
      process.env.NEXORA_BTC_ADDRESS ||
      "bc1qdemoaddressreplacewithrealbtcaddr0000",
    label: "Bitcoin (BTC)",
    minConfirmations: 1,
    explorerTx: (h) => `https://blockstream.info/tx/${h}`,
  };
}

export async function fetchPriceSek(): Promise<number> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=sek`,
      { headers: { accept: "application/json" } },
    );
    const j = (await r.json()) as Record<string, { sek: number }>;
    const p = j?.bitcoin?.sek;
    if (p && p > 0) return p;
  } catch {
    /* fallthrough */
  }
  return 700000;
}

export function roundCrypto(amount: number): number {
  return Math.round(amount * 1e8) / 1e8;
}

export function uniqueSuffix(): number {
  return (100 + Math.floor(Math.random() * 9900)) / 1e8;
}

export async function findMatchingTx(opts: {
  address: string;
  expected: number;
  sinceIso: string;
}): Promise<{ txHash: string; confirmations: number } | null> {
  const { address, expected, sinceIso } = opts;
  const sinceMs = new Date(sinceIso).getTime();

  try {
    const r = await fetch(
      `https://blockstream.info/api/address/${address}/txs`,
    );
    if (!r.ok) return null;
    const txs = (await r.json()) as Array<{
      txid: string;
      status: { confirmed: boolean; block_time?: number; block_height?: number };
      vout: Array<{ value: number; scriptpubkey_address?: string }>;
    }>;

    let tip = 0;
    try {
      const rt = await fetch(`https://blockstream.info/api/blocks/tip/height`);
      tip = parseInt(await rt.text(), 10) || 0;
    } catch {
      /* noop */
    }

    for (const tx of txs) {
      const blockTimeMs = (tx.status.block_time ?? Date.now() / 1000) * 1000;
      if (blockTimeMs < sinceMs - 15 * 60 * 1000) continue;
      const receivedSat = tx.vout
        .filter((v) => v.scriptpubkey_address === address)
        .reduce((s, v) => s + v.value, 0);
      const receivedBtc = receivedSat / 1e8;
      if (Math.abs(receivedBtc - expected) <= 0.00000001) {
        const conf =
          tx.status.confirmed && tx.status.block_height
            ? Math.max(1, tip - tx.status.block_height + 1)
            : 0;
        return { txHash: tx.txid, confirmations: conf };
      }
    }
  } catch {
    return null;
  }
  return null;
}
