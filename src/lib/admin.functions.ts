import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { MARKET_UNIVERSE, fallbackNativePrice, fallbackFxToSek } from "@/lib/market-data.shared";
import { INVESTMENT_LEVELS, getLevelByAmount, currentYearMonth } from "@/lib/investment-levels";


async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const createCustomerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  phone: z.string().max(30).optional().nullable(),
  assigned_level_sek: z.number().int().min(2500).max(2_000_000),
  assigned_level_name: z.string().min(1).max(80),
});

function generatePassword(len = 14) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out =
    upper[bytes[0] % upper.length] +
    lower[bytes[1] % lower.length] +
    digits[bytes[2] % digits.length] +
    symbols[bytes[3] % symbols.length];
  for (let i = 4; i < len; i++) out += all[bytes[i] % all.length];
  return out;
}

export const adminCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof createCustomerSchema>) =>
    createCustomerSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const password = generatePassword(14);

    // 1. Create user with generated password (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone ?? null,
        },
      });

    let userId = created?.user?.id;
    let existed = false;

    // If user already exists, look them up and reset their password
    if (createErr && /already|registered|exists/i.test(createErr.message)) {
      existed = true;
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      userId = existing?.id;
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
      }
    } else if (createErr) {
      throw new Error(createErr.message);
    }

    if (!userId) throw new Error("Kunde inte skapa användare");

    // 2. Upsert profile with assigned level
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone ?? null,
        assigned_level_sek: data.assigned_level_sek,
        assigned_level_name: data.assigned_level_name,
        invited_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    return {
      user_id: userId,
      email: data.email,
      password,
      existed,
    };
  });

const resetPwSchema = z.object({ email: z.string().email() });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof resetPwSchema>) => resetPwSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const user = list?.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (!user) throw new Error("Användaren hittades inte");
    const password = generatePassword(14);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { email: data.email, password };
  });

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, phone, assigned_level_sek, assigned_level_name, invited_at, activated_at, onboarding_completed, verification_status, cash_balance_sek",
      )
      .order("invited_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    // Attach latest selection status
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: sels } = ids.length
      ? await supabaseAdmin
          .from("investment_selections")
          .select("user_id, onramp_status, funded_amount_sek, funded_at, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };

    const latestByUser = new Map<string, any>();
    for (const s of sels ?? []) {
      if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s);
    }

    return (profiles ?? []).map((p) => ({
      ...p,
      latest_selection: latestByUser.get(p.id) ?? null,
    }));
  });


const markFundedSchema = z.object({ user_id: z.string().uuid() });

// Manuell kreditering — för testning innan on-ramp webhook är live
export const adminMarkFunded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof markFundedSchema>) => markFundedSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, assigned_level_sek, cash_balance_sek")
      .eq("id", data.user_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.assigned_level_sek)
      throw new Error("Kunden saknar tilldelad nivå");

    const amount = profile.assigned_level_sek;

    // Find or create latest selection
    const { data: existing } = await supabaseAdmin
      .from("investment_selections")
      .select("id")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let selectionId = existing?.id;
    if (!selectionId) {
      const { data: sel, error: sErr } = await supabaseAdmin
        .from("investment_selections")
        .insert({
          user_id: data.user_id,
          level_name: "Manuell kreditering",
          selected_amount_sek: amount,
          risk_acknowledged: true,
          status: "approved",
          onramp_status: "funded",
          funded_amount_sek: amount,
          funded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sErr) throw new Error(sErr.message);
      selectionId = sel.id;
    } else {
      await supabaseAdmin
        .from("investment_selections")
        .update({
          onramp_status: "funded",
          funded_amount_sek: amount,
          funded_at: new Date().toISOString(),
          status: "approved",
        })
        .eq("id", selectionId);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        cash_balance_sek: (Number(profile.cash_balance_sek) || 0) + amount,
        activated_at: new Date().toISOString(),
      })
      .eq("id", data.user_id);

    return { ok: true, credited_sek: amount };
  });

const setBalanceSchema = z.object({
  user_id: z.string().uuid(),
  cash_balance_sek: z.number().min(0).max(1_000_000_000),
});

export const adminSetBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof setBalanceSchema>) => setBalanceSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ cash_balance_sek: data.cash_balance_sek })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true, cash_balance_sek: data.cash_balance_sek };
  });

const upgradeLevelSchema = z.object({
  user_id: z.string().uuid(),
  level_key: z.string().min(1),
  credit_delta: z.boolean().optional(), // default true
});

/** Uppgraderar kundens nivå och lägger till mellanskillnaden i kontantsaldot
 *  (utöver det de redan har). Om credit_delta=false lägger inget till. */
export const adminUpgradeLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof upgradeLevelSchema>) => upgradeLevelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const level = INVESTMENT_LEVELS.find((l) => l.key === data.level_key);
    if (!level) throw new Error("Ogiltig nivå");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, cash_balance_sek, assigned_level_sek")
      .eq("id", data.user_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Kund saknas");

    const prevLevel = Number(profile.assigned_level_sek ?? 0);
    const credit = data.credit_delta === false ? 0 : Math.max(0, level.amount - prevLevel);
    const newCash = Number(profile.cash_balance_sek ?? 0) + credit;

    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({
        assigned_level_sek: level.amount,
        assigned_level_name: level.name,
        cash_balance_sek: newCash,
      })
      .eq("id", data.user_id);
    if (uErr) throw new Error(uErr.message);

    // Uppdatera aktiva bot-sessioner till nya nivåns tak och släpp ev. limit_reached
    const { data: activeSessions } = await supabaseAdmin
      .from("bot_sessions")
      .select("id")
      .eq("user_id", data.user_id)
      .in("status", ["running", "paused", "limit_reached"]);
    if (activeSessions?.length) {
      await supabaseAdmin
        .from("bot_sessions")
        .update({
          level_key: level.key,
          max_trades_month: level.maxTradesPerMonth,
          max_leverage_pct: level.maxLeveragePct,
          target_multiplier: level.targetMultiplier,
          status: "running",
        })
        .in("id", activeSessions.map((s) => s.id));
    }

    return {
      ok: true,
      level_name: level.name,
      level_sek: level.amount,
      credited_sek: credit,
      new_cash_balance_sek: newCash,
    };
  });

const impersonateSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(72).optional(),
});

/** Sätter kundens lösenord (default admin12345!) så att admin
 *  kan logga in direkt som kunden. Returnerar e-post + lösenord. */
export const adminImpersonate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof impersonateSchema>) => impersonateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = data.password && data.password.length >= 6 ? data.password : "admin12345!";
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id,
      { password, email_confirm: true },
    );
    if (error) throw new Error(error.message);
    const email = updated.user?.email;
    if (!email) throw new Error("Kunden saknar e-post");
    return { email, password };
  });

const setPasswordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(72),
});

/** Sätter kundens lösenord till valfritt värde utan att logga in som kunden. */
export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof setPasswordSchema>) => setPasswordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id,
      { password: data.password, email_confirm: true },
    );
    if (error) throw new Error(error.message);
    return { email: updated.user?.email ?? "", password: data.password };
  });

const getDashboardSchema = z.object({ user_id: z.string().uuid() });

export const adminGetCustomerDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof getDashboardSchema>) => getDashboardSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profile }, { data: holdings }, { data: trades }, { data: bot }, { data: selections }, { data: withdrawals }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.user_id).maybeSingle(),
      supabaseAdmin.from("portfolio_holdings").select("*").eq("user_id", data.user_id),
      supabaseAdmin.from("trades").select("*").eq("user_id", data.user_id).order("executed_at", { ascending: false }).limit(30),
      supabaseAdmin.from("bot_sessions").select("*").eq("user_id", data.user_id).order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("investment_selections").select("*").eq("user_id", data.user_id).order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("withdrawal_requests").select("*").eq("user_id", data.user_id).order("created_at", { ascending: false }).limit(10),
    ]);

    return {
      profile: profile ?? null,
      holdings: holdings ?? [],
      trades: trades ?? [],
      bot_sessions: bot ?? [],
      selections: selections ?? [],
      withdrawals: withdrawals ?? [],
    };
  });

// ---------------- Admin: kör en simulerad vinstrunda på kundens bot ----------------

const profitRoundSchema = z.object({
  user_id: z.string().uuid(),
  target_profit_sek: z.number().min(1).max(50_000_000),
  num_trades: z.number().int().min(3).max(200).optional(),
  spread_minutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
  symbols: z.array(z.string()).optional(),
});

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function priceSekFor(symbol: string): number {
  const asset = MARKET_UNIVERSE.find((a) => a.symbol === symbol);
  const native = asset ? fallbackNativePrice(symbol) : 100;
  const fx = asset ? fallbackFxToSek(asset.currency) : 10.55;
  return native * fx;
}

function assetTypeFor(symbol: string): string {
  return MARKET_UNIVERSE.find((a) => a.symbol === symbol)?.type ?? "crypto";
}

/**
 * Genererar en realistisk serie med trades som tillsammans landar exakt på target_profit_sek.
 * Varje trade får varierande avkastning (2%–15%), varierande storlek och realistisk timing.
 * Uppdaterar även bot_session (skapar en om ingen aktiv finns), månadsanvändning
 * och kundens kontantsaldo.
 */
export const adminRunProfitRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof profitRoundSchema>) => profitRoundSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Profil + nivå
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, cash_balance_sek, assigned_level_sek, assigned_level_name")
      .eq("id", data.user_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Kunden hittades inte");

    const level = profile.assigned_level_name
      ? INVESTMENT_LEVELS.find((l) => l.name === profile.assigned_level_name) ??
        getLevelByAmount(profile.assigned_level_sek ?? undefined)
      : getLevelByAmount(profile.assigned_level_sek ?? undefined);

    // 2. Symboler (default: kryptolista)
    const defaultSymbols = data.symbols?.length
      ? data.symbols
      : ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"];

    // 3. Antal trades: default rimlig andel av månadstaket, men aldrig fler än 60% kvar
    const numTrades = data.num_trades
      ?? Math.min(30, Math.max(8, Math.floor(level.maxTradesPerMonth * 0.15)));

    // 4. Fördela vinsten över trades med varierande vikter
    const weights = Array.from({ length: numTrades }, () => rnd(0.4, 1.6));
    const wSum = weights.reduce((a, b) => a + b, 0);
    // 82% vinnare, 18% förlorare (små) för realism – nettosumma = target
    const winners = weights.map((w) => Math.random() > 0.18);
    const rawShares = weights.map((w, i) => (winners[i] ? w : -w * rnd(0.15, 0.45)));
    const rawSum = rawShares.reduce((a, b) => a + b, 0);
    // Skala så nettot exakt = target_profit_sek
    const scale = data.target_profit_sek / (rawSum || wSum);
    const profits = rawShares.map((s) => s * scale);

    // 5. Tidsspann
    const spreadMinutes = data.spread_minutes ?? Math.max(30, numTrades * 3);
    const now = Date.now();
    const startMs = now - spreadMinutes * 60_000;

    // 6. Aktiv (eller ny) session
    const { data: existingSession } = await supabaseAdmin
      .from("bot_sessions")
      .select("*")
      .eq("user_id", data.user_id)
      .in("status", ["running", "paused", "limit_reached"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const holdingsValue = 0; // baseline nedan använder assigned_level
    const cashBefore = Number(profile.cash_balance_sek ?? 0);
    const assignedBaseline = Number(profile.assigned_level_sek ?? level.amount);
    const startingValue = Math.max(cashBefore + holdingsValue, assignedBaseline, 10_000);

    let session = existingSession;
    if (!session) {
      const { data: created, error: sErr } = await supabaseAdmin
        .from("bot_sessions")
        .insert({
          user_id: data.user_id,
          status: "running",
          level_key: level.key,
          max_trades_month: level.maxTradesPerMonth,
          max_leverage_pct: level.maxLeveragePct,
          allowed_assets: defaultSymbols,
          strategy: "ai_hybrid",
          aggressiveness: 5,
          starting_portfolio_sek: startingValue,
          target_multiplier: level.targetMultiplier,
          current_multiplier: 1.0,
          target_trades: Math.max(numTrades, Math.floor(level.maxTradesPerMonth * 0.6)),
          started_at: new Date(startMs).toISOString(),
        })
        .select()
        .single();
      if (sErr) throw new Error(sErr.message);
      session = created;
    }

    // 7. Bygg trade-par (buy → sell) för varje planerad vinst/förlust
    const tradesToInsert: any[] = [];
    for (let i = 0; i < numTrades; i++) {
      const symbol = defaultSymbols[Math.floor(Math.random() * defaultSymbols.length)];
      const price = priceSekFor(symbol);
      const gainAbsPct = rnd(0.03, 0.15); // 3%–15% rörelse på position
      const gainPct = profits[i] >= 0 ? gainAbsPct : -gainAbsPct;
      // Position så att qty × price × gainPct = profits[i]
      const positionSek = Math.max(200, Math.abs(profits[i]) / gainAbsPct);
      const quantity = positionSek / price;
      const buyPrice = price;
      const sellPrice = price * (1 + gainPct);

      // Tidpunkt jämnt fördelad över spannet + lite jitter
      const slot = startMs + ((i + 0.5) / numTrades) * (now - startMs);
      const jitter = rnd(-0.3, 0.3) * ((now - startMs) / numTrades);
      const sellAt = new Date(slot + jitter);
      const buyAt = new Date(sellAt.getTime() - rnd(1, 4) * 60_000);

      tradesToInsert.push({
        user_id: data.user_id,
        symbol, asset_type: assetTypeFor(symbol), side: "buy",
        quantity, price_sek: buyPrice, fee_sek: positionSek * 0.001,
        total_sek: positionSek, executed_at: buyAt.toISOString(),
      });
      tradesToInsert.push({
        user_id: data.user_id,
        symbol, asset_type: assetTypeFor(symbol), side: "sell",
        quantity, price_sek: sellPrice, fee_sek: quantity * sellPrice * 0.001,
        total_sek: quantity * sellPrice, executed_at: sellAt.toISOString(),
      });
    }

    // Sortera insert i tidsordning
    tradesToInsert.sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
    const { error: tErr } = await supabaseAdmin.from("trades").insert(tradesToInsert);
    if (tErr) throw new Error(tErr.message);

    // 8. Uppdatera saldo
    const newCash = cashBefore + data.target_profit_sek;
    await supabaseAdmin.from("profiles")
      .update({ cash_balance_sek: newCash })
      .eq("id", data.user_id);

    // 9. Uppdatera session (trades_generated + multiplier)
    const newTradesGenerated = Number(session!.trades_generated ?? 0) + numTrades;
    // Beräkna realiserad vinst från alla trades sedan session start för korrekt multiplier
    const { data: allTrades } = await supabaseAdmin
      .from("trades")
      .select("side,total_sek")
      .eq("user_id", data.user_id)
      .gte("executed_at", session!.started_at);
    const realizedProfit = (allTrades ?? []).reduce((acc, t) => {
      const v = Number(t.total_sek) || 0;
      return acc + (t.side === "sell" ? v : -v);
    }, 0);
    const sessionBase = Math.max(Number(session!.starting_portfolio_sek) || 0, assignedBaseline, 10_000);
    const currentMult = Math.max(1, 1 + realizedProfit / sessionBase);

    await supabaseAdmin.from("bot_sessions").update({
      trades_generated: newTradesGenerated,
      current_multiplier: currentMult,
      last_tick_at: new Date().toISOString(),
    }).eq("id", session!.id);

    // 10. Månadsanvändning
    const ym = currentYearMonth();
    const { data: usage } = await supabaseAdmin.from("bot_monthly_usage")
      .select("trades_count, leverage_used_pct")
      .eq("user_id", data.user_id).eq("year_month", ym).maybeSingle();
    await supabaseAdmin.from("bot_monthly_usage").upsert({
      user_id: data.user_id,
      year_month: ym,
      trades_count: Number(usage?.trades_count ?? 0) + numTrades,
      leverage_used_pct: Number(usage?.leverage_used_pct ?? 0),
    }, { onConflict: "user_id,year_month" });

    return {
      ok: true,
      trades_created: numTrades,
      net_profit_sek: data.target_profit_sek,
      new_cash_balance_sek: newCash,
      current_multiplier: currentMult,
      session_id: session!.id,
    };
  });

