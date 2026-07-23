import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { MARKET_UNIVERSE, fallbackNativePrice, fallbackFxToSek } from "@/lib/market-data.shared";

function ymUTC(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function fetchPriceSek(symbol: string): Promise<number> {
  const asset = MARKET_UNIVERSE.find((a) => a.symbol === symbol);
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (asset && apiKey) {
    try {
      const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(asset.td)}&apikey=${apiKey}`;
      const r = await fetch(url);
      if (r.ok) {
        const j = (await r.json()) as { price?: string };
        const native = Number(j.price);
        if (Number.isFinite(native) && native > 0) {
          return native * fallbackFxToSek(asset.currency);
        }
      }
    } catch { /* fall through */ }
  }
  const native = asset ? fallbackNativePrice(symbol) : 100;
  const fx = asset ? fallbackFxToSek(asset.currency) : 10.5;
  return native * fx;
}

function assetTypeFor(symbol: string): string {
  return MARKET_UNIVERSE.find((a) => a.symbol === symbol)?.type ?? "crypto";
}


export const Route = createFileRoute("/api/public/hooks/bot-tick")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return new Response(JSON.stringify({ error: "Missing service credentials" }), { status: 500 });
        }
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Fetch all active sessions
        const { data: sessions, error: sessErr } = await admin
          .from("bot_sessions").select("*").eq("status", "running").limit(200);
        if (sessErr) return new Response(JSON.stringify({ error: sessErr.message }), { status: 500 });

        const ym = ymUTC();
        const results: Array<{ session: string; trades: number; note?: string }> = [];

        for (const s of sessions ?? []) {
          // Get/create monthly usage
          const { data: usage } = await admin.from("bot_monthly_usage")
            .select("*").eq("user_id", s.user_id).eq("year_month", ym).maybeSingle();

          const tradesUsed = usage?.trades_count ?? 0;
          const leverageUsed = usage?.leverage_used_pct ?? 0;

          if (tradesUsed >= s.max_trades_month ||
              (s.max_leverage_pct > 0 && leverageUsed >= s.max_leverage_pct)) {
            await admin.from("bot_sessions").update({ status: "limit_reached" }).eq("id", s.id);
            results.push({ session: s.id, trades: 0, note: "limit_reached" });
            continue;
          }

          // Generate 2-5 trades per tick for a lively live feed, respecting monthly cap
          const numTrades = Math.min(
            Math.floor(rand(2, 5.9)),
            s.max_trades_month - tradesUsed,
          );
          let leverageDelta = 0;
          let generated = 0;
          let tickProfit = 0;

          for (let i = 0; i < numTrades; i++) {
            const symbol = s.allowed_assets[Math.floor(Math.random() * s.allowed_assets.length)];
            const price = await fetchPriceSek(symbol);

            // Position size: 3-8% of starting portfolio
            const positionPct = rand(0.03, 0.08);
            const positionSek = s.starting_portfolio_sek * positionPct;
            const quantity = positionSek / price;

            // Risk/reward multiplier per trade: 1.3x - 2.2x
            const winMult = rand(1.3, 2.2);
            // Realistic net gain on the position value (6% - 18% of position)
            const gainPct = (winMult - 1) * 0.15;
            const buyPrice = price;
            const sellPrice = price * (1 + gainPct);
            const profit = quantity * (sellPrice - buyPrice);
            tickProfit += profit;

            // Trades close within ~1-3 minutes for a realistic fast pace
            const now = new Date();
            const buyAt = new Date(now.getTime() - 1000 * 60 * rand(1, 3));

            // Buy
            await admin.from("trades").insert({
              user_id: s.user_id, symbol, asset_type: "crypto", side: "buy",
              quantity, price_sek: buyPrice, fee_sek: positionSek * 0.001,
              total_sek: positionSek, executed_at: buyAt.toISOString(),
            });
            // Sell
            await admin.from("trades").insert({
              user_id: s.user_id, symbol, asset_type: "crypto", side: "sell",
              quantity, price_sek: sellPrice, fee_sek: quantity * sellPrice * 0.001,
              total_sek: quantity * sellPrice, executed_at: now.toISOString(),
            });

            leverageDelta += s.max_leverage_pct > 0 ? Math.floor(rand(1, 4)) : 0;
            generated++;
          }

          // Add tick profit to cash balance once
          if (tickProfit !== 0) {
            const { data: profile } = await admin.from("profiles")
              .select("cash_balance_sek").eq("id", s.user_id).maybeSingle();
            await admin.from("profiles")
              .update({ cash_balance_sek: Number(profile?.cash_balance_sek ?? 0) + tickProfit })
              .eq("id", s.user_id);
          }

          // Upsert monthly usage
          await admin.from("bot_monthly_usage").upsert({
            user_id: s.user_id, year_month: ym,
            trades_count: tradesUsed + generated,
            leverage_used_pct: leverageUsed + leverageDelta,
          }, { onConflict: "user_id,year_month" });

          // Compute portfolio performance from realized trades since session start.
          // Baslinjen = starting_portfolio_sek men aldrig lägre än tilldelad nivå,
          // så små cash-rester inte ger orealistiska multipel-värden.
          const { data: sessionTrades } = await admin.from("trades")
            .select("side,total_sek")
            .eq("user_id", s.user_id)
            .gte("executed_at", s.started_at);
          const realizedProfit = (sessionTrades ?? []).reduce((acc, t) => {
            const v = Number(t.total_sek) || 0;
            return acc + (t.side === "sell" ? v : -v);
          }, 0);
          const { data: prof } = await admin.from("profiles")
            .select("assigned_level_sek").eq("id", s.user_id).maybeSingle();
          const assignedBase = Number(prof?.assigned_level_sek ?? 0);
          const startVal = Math.max(Number(s.starting_portfolio_sek) || 0, assignedBase, 10000);
          const currentMult = Math.max(1, 1 + realizedProfit / startVal);
          const newTradesGenerated = s.trades_generated + generated;

          // Auto-stop when session reaches target
          const shouldFinish = newTradesGenerated >= s.target_trades || currentMult >= s.target_multiplier;

          await admin.from("bot_sessions").update({
            trades_generated: newTradesGenerated,
            current_multiplier: currentMult,
            last_tick_at: new Date().toISOString(),
            status: shouldFinish ? "stopped" : "running",
            stopped_at: shouldFinish ? new Date().toISOString() : null,
          }).eq("id", s.id);

          results.push({ session: s.id, trades: generated });

        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
