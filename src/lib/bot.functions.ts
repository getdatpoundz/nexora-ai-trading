import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StartInput = z.object({
  allowed_assets: z.array(z.string()).min(1),
  strategy: z.string().default("ai_hybrid"),
  aggressiveness: z.number().int().min(1).max(10).default(5),
});

/** Start (or resume) a bot session for the current user. */
export const startBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load user's assigned investment level → derive limits
    const { data: profile } = await supabase.from("profiles")
      .select("assigned_level_sek, assigned_level_name, cash_balance_sek").eq("id", userId).maybeSingle();

    const { INVESTMENT_LEVELS, getLevelByAmount } = await import("@/lib/investment-levels");
    const level = profile?.assigned_level_name
      ? INVESTMENT_LEVELS.find((l) => l.name === profile.assigned_level_name) ?? getLevelByAmount(profile?.assigned_level_sek ?? undefined)
      : getLevelByAmount(profile?.assigned_level_sek ?? undefined);

    // Stop any previous running session so only one runs at a time
    await supabase.from("bot_sessions").update({ status: "stopped", stopped_at: new Date().toISOString() })
      .eq("user_id", userId).in("status", ["running", "paused", "limit_reached"]);

    // Baslinje = totalt portföljvärde vid start (cash + befintliga innehav värderade till snittpris).
    // Om värdet är lägre än tilldelad investeringsnivå används nivåbeloppet så att
    // avkastningen alltid mäts mot den avsedda insatsen (annars kan små cash-rester
    // ge orealistiskt höga multipel-värden).
    const { data: holdings } = await supabase.from("portfolio_holdings")
      .select("quantity, avg_price_sek").eq("user_id", userId);
    const holdingsValue = (holdings ?? []).reduce(
      (acc, h) => acc + Number(h.quantity ?? 0) * Number(h.avg_price_sek ?? 0),
      0,
    );
    const cash = Number(profile?.cash_balance_sek ?? 0);
    const totalValue = cash + holdingsValue;
    const assignedBaseline = Number(profile?.assigned_level_sek ?? level.amount);
    const startingValue = Math.max(totalValue, assignedBaseline);
    const targetTrades = Math.min(level.maxTradesPerMonth, Math.max(30, Math.floor(level.maxTradesPerMonth * 0.6)));


    const { data: session, error } = await supabase.from("bot_sessions").insert({
      user_id: userId,
      status: "running",
      level_key: level.key,
      max_trades_month: level.maxTradesPerMonth,
      max_leverage_pct: level.maxLeveragePct,
      allowed_assets: data.allowed_assets,
      strategy: data.strategy,
      aggressiveness: data.aggressiveness,
      starting_portfolio_sek: startingValue,
      target_multiplier: level.targetMultiplier,
      current_multiplier: 1.0,
      target_trades: targetTrades,
    }).select().single();

    if (error) throw new Error(error.message);
    return session;
  });

/** Pause the active bot session for the current user. */
export const pauseBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("bot_sessions")
      .update({ status: "paused" }).eq("user_id", userId).eq("status", "running");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Resume the most recent paused session. */
export const resumeBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("bot_sessions")
      .update({ status: "running" }).eq("user_id", userId).eq("status", "paused");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Stop the session permanently. */
export const stopBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("bot_sessions")
      .update({ status: "stopped", stopped_at: new Date().toISOString() })
      .eq("user_id", userId).in("status", ["running", "paused", "limit_reached"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
