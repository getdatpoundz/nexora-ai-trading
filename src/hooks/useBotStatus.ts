import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentYearMonth, getLevelByAmount, INVESTMENT_LEVELS } from "@/lib/investment-levels";

export type BotSession = {
  id: string;
  status: "running" | "paused" | "stopped" | "limit_reached";
  level_key: string | null;
  max_trades_month: number;
  max_leverage_pct: number;
  allowed_assets: string[];
  strategy: string;
  starting_portfolio_sek: number;
  target_multiplier: number;
  current_multiplier: number;
  trades_generated: number;
  target_trades: number;
  started_at: string;
  last_tick_at: string | null;
};

export type MonthlyUsage = {
  trades_count: number;
  leverage_used_pct: number;
};

export function useBotStatus(userId: string | undefined) {
  const [session, setSession] = useState<BotSession | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage>({ trades_count: 0, leverage_used_pct: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const ym = currentYearMonth();
      const [{ data: sessions }, { data: u }, { data: profile }] = await Promise.all([
        supabase.from("bot_sessions").select("*").eq("user_id", userId as string)
          .in("status", ["running", "paused", "limit_reached"]).order("started_at", { ascending: false }).limit(1),
        supabase.from("bot_monthly_usage").select("trades_count, leverage_used_pct")
          .eq("user_id", userId as string).eq("year_month", ym).maybeSingle(),
        supabase.from("profiles").select("assigned_level_sek, assigned_level_name").eq("id", userId as string).maybeSingle(),
      ]);
      if (cancelled) return;
      const monthlyUsage = u ?? { trades_count: 0, leverage_used_pct: 0 };
      const currentLevel = profile?.assigned_level_name
        ? INVESTMENT_LEVELS.find((level) => level.name === profile.assigned_level_name) ?? getLevelByAmount(profile.assigned_level_sek)
        : getLevelByAmount(profile?.assigned_level_sek);
      const rawSession = (sessions?.[0] as BotSession | undefined) ?? null;
      const syncedSession = rawSession
        ? {
            ...rawSession,
            level_key: currentLevel.key,
            max_trades_month: currentLevel.maxTradesPerMonth,
            max_leverage_pct: 0,
            target_multiplier: currentLevel.targetMultiplier,
          }
        : null;

      if (rawSession && syncedSession) {
        const isWithinTradeLimit = monthlyUsage.trades_count < syncedSession.max_trades_month;
        const nextStatus = syncedSession.status === "limit_reached" && isWithinTradeLimit
          ? "running"
          : syncedSession.status;
        if (
          rawSession.level_key !== syncedSession.level_key ||
          rawSession.max_trades_month !== syncedSession.max_trades_month ||
          rawSession.max_leverage_pct !== syncedSession.max_leverage_pct ||
          rawSession.target_multiplier !== syncedSession.target_multiplier ||
          rawSession.status !== nextStatus
        ) {
          supabase.from("bot_sessions").update({
            level_key: syncedSession.level_key,
            max_trades_month: syncedSession.max_trades_month,
            max_leverage_pct: syncedSession.max_leverage_pct,
            target_multiplier: syncedSession.target_multiplier,
            status: nextStatus,
          }).eq("id", rawSession.id).then(() => undefined);
        }
        syncedSession.status = nextStatus;
      }

      setSession(syncedSession);
      setUsage({ ...monthlyUsage, leverage_used_pct: 0 });
      setLoading(false);
    }
    load();

    const ch = supabase
      .channel(`bot-status-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_sessions", filter: `user_id=eq.${userId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_monthly_usage", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [userId]);

  return { session, usage, loading, refresh: () => setLoading((l) => l) };
}
