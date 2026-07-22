import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  type Currency,
  getConfig,
  fetchPriceSek,
  roundCrypto,
  uniqueSuffix,
  findMatchingTx,
} from "./crypto-deposit.server";

export const createCryptoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { currency?: "BTC"; amountSek?: number }) =>
    z
      .object({
        currency: z.enum(["BTC"]).optional(),
        amountSek: z.number().int().positive().optional(),
      })
      .parse(d ?? {}),
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

    const sek = data.amountSek ?? profile?.assigned_level_sek;
    if (!sek) throw new Error("Ange ett belopp för inbetalningen");

    const price = await fetchPriceSek();
    const base = sek / price;
    const expected = roundCrypto(base + uniqueSuffix());

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
        .update({ ...patch, selected_amount_sek: sek })
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
      sel.onramp_currency !== "BTC"
    ) {
      return { status: "waiting" as const };
    }

    const cfg = getConfig("BTC");
    const match = await findMatchingTx({
      address: sel.deposit_address,
      expected: Number(sel.expected_crypto_amount),
      sinceIso: sel.created_at,
    });

    if (!match) {
      return { status: "waiting" as const };
    }

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
