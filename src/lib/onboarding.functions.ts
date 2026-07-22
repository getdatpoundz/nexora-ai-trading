import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, assigned_level_sek, assigned_level_name, onboarding_completed, verification_status, activated_at, cash_balance_sek",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: sel } = await context.supabase
      .from("investment_selections")
      .select("id, onramp_status, funded_amount_sek, funded_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { profile, latest_selection: sel };
  });

export const completeKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    birth_date: string;
    address: string;
    postal_code: string;
    city: string;
    risk_acknowledged: true;
    terms_accepted: true;
  }) =>
    z
      .object({
        birth_date: z.string().min(4).max(20),
        address: z.string().min(2).max(200),
        postal_code: z.string().min(3).max(20),
        city: z.string().min(1).max(80),
        risk_acknowledged: z.literal(true),
        terms_accepted: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // profile RLS blocks changing verification_status from client;
    // use supabaseAdmin for the status flip after we've verified auth.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        birth_date: data.birth_date,
        address: data.address,
        postal_code: data.postal_code,
        city: data.city,
        onboarding_completed: true,
        verification_status: "verifierad",
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Bygger Transak-widget-URL. API-nyckel läses från env, aldrig från browsern.
export const buildOnrampUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, assigned_level_sek, assigned_level_name")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.assigned_level_sek)
      throw new Error("Ingen investeringsnivå tilldelad");

    const amount = profile.assigned_level_sek;
    const currency = process.env.NEXORA_ONRAMP_CRYPTO || "USDC";
    const network = process.env.NEXORA_ONRAMP_NETWORK || "polygon";
    const walletAddress = process.env.NEXORA_WALLET_ADDRESS || "";
    const transakApiKey = process.env.TRANSAK_API_KEY || "";
    const transakEnv = (process.env.TRANSAK_ENV || "STAGING").toUpperCase();

    // Skapa eller uppdatera selection
    const { data: existing } = await supabaseAdmin
      .from("investment_selections")
      .select("id")
      .eq("user_id", context.userId)
      .in("onramp_status", ["not_started", "method_selected", "provider_open", "awaiting_transfer", "confirming"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let selectionId = existing?.id;
    if (!selectionId) {
      const { data: sel, error } = await supabaseAdmin
        .from("investment_selections")
        .insert({
          user_id: context.userId,
          level_name: profile.assigned_level_name || "Tilldelad nivå",
          selected_amount_sek: amount,
          risk_acknowledged: true,
          status: "approved",
          onramp_status: "provider_open",
          onramp_provider: transakApiKey ? "transak" : "sandbox",
          onramp_currency: currency,
          deposit_address: walletAddress || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      selectionId = sel.id;
    } else {
      await supabaseAdmin
        .from("investment_selections")
        .update({
          onramp_status: "provider_open",
          onramp_provider: transakApiKey ? "transak" : "sandbox",
          onramp_currency: currency,
          deposit_address: walletAddress || null,
        })
        .eq("id", selectionId);
    }

    // Om vi har Transak-nyckel → bygg riktig widget-URL
    if (transakApiKey && walletAddress) {
      const base =
        transakEnv === "PRODUCTION"
          ? "https://global.transak.com"
          : "https://global-stg.transak.com";
      const params = new URLSearchParams({
        apiKey: transakApiKey,
        environment: transakEnv,
        fiatAmount: String(amount),
        fiatCurrency: "SEK",
        cryptoCurrencyCode: currency,
        network,
        walletAddress,
        disableWalletAddressForm: "true",
        email: profile.email || "",
        partnerOrderId: selectionId,
        partnerCustomerId: context.userId,
        productsAvailed: "BUY",
        hideMenu: "true",
        themeColor: "22c55e",
      });
      return {
        mode: "transak" as const,
        url: `${base}?${params.toString()}`,
        selectionId,
        amount,
        currency,
      };
    }

    // Sandbox-läge: ingen riktig widget, visa demo-instruktion
    return {
      mode: "sandbox" as const,
      url: null,
      selectionId,
      amount,
      currency,
    };
  });
