import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================
// Nexora – Krypto-inbetalning
// Kunden får en QR-kod + adress + unikt belopp.
// Vi pollar blockchain-API:er (Blockstream/Trongrid – gratis, ingen nyckel)
// och krediterar kontot automatiskt när betalningen är bekräftad.
// ============================================================

type Currency = "BTC";

interface DepositConfig {
  currency: Currency;
  network: string;
  address: string;
  label: string;
  minConfirmations: number;
  explorerTx: (h: string) => string;
}

function getConfig(_currency: Currency): DepositConfig {
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

async function fetchPriceSek(): Promise<number> {
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
  // Fallback så flödet inte dör
  return 700000;
}

function roundCrypto(amount: number): number {
  // 8 decimaler
  return Math.round(amount * 1e8) / 1e8;
}

function uniqueSuffix(): number {
  // 100–9 999 satoshi
  return (100 + Math.floor(Math.random() * 9900)) / 1e8;
}

// ---------------- createDeposit ----------------
export const createCryptoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { currency?: "BTC" }) =>
    z.object({ currency: z.enum(["BTC"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const currency: Currency = data.currency ?? "BTC";
    const cfg = getConfig(currency);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("assigned_level_sek, assigned_level_name")
      .eq("id", context.userId)
      .maybeSingle();

    const sek = profile?.assigned_level_sek;
    if (!sek) throw new Error("Ingen investeringsnivå tilldelad");

    const price = await fetchPriceSek();
    const base = sek / price;
    const expected = roundCrypto(base + uniqueSuffix());

    // Hitta eller skapa aktiv selection
    const { data: existing } = await supabaseAdmin
      .from("investment_selections")
      .select("id, onramp_status")
      .eq("user_id", context.userId)
      .in("onramp_status", [
        "not_started",
        "method_selected",
        "provider_open",
        "awaiting_transfer",
        "confirming",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const patch = {
      onramp_status: "awaiting_transfer",
      onramp_provider: "onchain",
      onramp_method: "crypto",
      onramp_currency: currency,
      deposit_network: cfg.network,
      deposit_address: cfg.address,
      expected_crypto_amount: expected,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    let selectionId = existing?.id;
    if (!selectionId) {
      const { data: created, error } = await supabaseAdmin
        .from("investment_selections")
        .insert({
          user_id: context.userId,
          level_name: profile?.assigned_level_name || "Tilldelad nivå",
          selected_amount_sek: sek,
          risk_acknowledged: true,
          status: "approved",
          ...patch,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      selectionId = created.id;
    } else {
      await supabaseAdmin
        .from("investment_selections")
        .update(patch)
        .eq("id", selectionId);
    }

    return {
      selectionId,
      currency,
      network: cfg.network,
      label: cfg.label,
      address: cfg.address,
      expectedAmount: expected,
      amountSek: sek,
      pricePerCoinSek: price,
      expiresAt: patch.expires_at,
    };
  });

// ---------------- Blockchain lookup ----------------
async function findMatchingTx(opts: {
  currency: Currency;
  address: string;
  expected: number;
  sinceIso: string;
}): Promise<{ txHash: string; confirmations: number } | null> {
  const { currency, address, expected, sinceIso } = opts;
  const sinceMs = new Date(sinceIso).getTime();

  if (currency === "BTC") {
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

      // aktuell topp för att räkna confirmations
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
          const conf = tx.status.confirmed && tx.status.block_height
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

  // USDT-TRC20 via Trongrid TRC20 transfers
  try {
    const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&limit=30&min_timestamp=${sinceMs - 15 * 60 * 1000}`;
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: Array<{
        transaction_id: string;
        to: string;
        value: string;
        token_info?: { symbol?: string; decimals?: number };
      }>;
    };
    for (const t of j.data ?? []) {
      if (t.to !== address) continue;
      if ((t.token_info?.symbol ?? "").toUpperCase() !== "USDT") continue;
      const dec = t.token_info?.decimals ?? 6;
      const amount = Number(t.value) / Math.pow(10, dec);
      if (Math.abs(amount - expected) <= 0.000001) {
        return { txHash: t.transaction_id, confirmations: 1 };
      }
    }
  } catch {
    return null;
  }
  return null;
}

// ---------------- pollDeposit ----------------
export const pollCryptoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: sel } = await supabaseAdmin
      .from("investment_selections")
      .select(
        "id, onramp_status, onramp_currency, deposit_address, expected_crypto_amount, created_at, funded_amount_sek, tx_hash, confirmations, selected_amount_sek",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sel)
      return { status: "no_deposit" as const, message: "Ingen aktiv inbetalning" };

    if (sel.onramp_status === "funded") {
      return {
        status: "funded" as const,
        txHash: sel.tx_hash,
        confirmations: sel.confirmations ?? 0,
      };
    }

    if (
      !sel.deposit_address ||
      !sel.expected_crypto_amount ||
      !sel.onramp_currency
    ) {
      return { status: "waiting" as const };
    }

    const currency = (sel.onramp_currency as Currency) ?? "USDT_TRC20";
    const cfg = getConfig(currency);
    const match = await findMatchingTx({
      currency,
      address: sel.deposit_address,
      expected: Number(sel.expected_crypto_amount),
      sinceIso: sel.created_at,
    });

    if (!match) {
      return { status: "waiting" as const };
    }

    // Uppdatera confirmations även om vi inte är klara
    if (match.confirmations < cfg.minConfirmations) {
      await supabaseAdmin
        .from("investment_selections")
        .update({
          onramp_status: "confirming",
          tx_hash: match.txHash,
          confirmations: match.confirmations,
        })
        .eq("id", sel.id);
      return {
        status: "confirming" as const,
        txHash: match.txHash,
        confirmations: match.confirmations,
        required: cfg.minConfirmations,
      };
    }

    // Kreditera kontot
    const sek = sel.selected_amount_sek ?? 0;
    await supabaseAdmin
      .from("investment_selections")
      .update({
        onramp_status: "funded",
        tx_hash: match.txHash,
        confirmations: match.confirmations,
        funded_amount_sek: sek,
        funded_at: new Date().toISOString(),
      })
      .eq("id", sel.id);

    // Öka cash_balance
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("cash_balance_sek")
      .eq("id", context.userId)
      .maybeSingle();
    const newBalance = Number(prof?.cash_balance_sek ?? 0) + Number(sek);
    await supabaseAdmin
      .from("profiles")
      .update({
        cash_balance_sek: newBalance,
        activated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    return {
      status: "funded" as const,
      txHash: match.txHash,
      confirmations: match.confirmations,
      explorer: cfg.explorerTx(match.txHash),
    };
  });
