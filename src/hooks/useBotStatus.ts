import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentYearMonth } from "@/lib/investment-levels";

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
      const [{ data: sessions }, { data: u }] = await Promise.all([
        supabase.from("bot_sessions").select("*").eq("user_id", userId as string)
          .in("status", ["running", "paused", "limit_reached"]).order("started_at", { ascending: false }).limit(1),
        supabase.from("bot_monthly_usage").select("trades_count, leverage_used_pct")
          .eq("user_id", userId as string).eq("year_month", ym).maybeSingle(),
      ]);
      if (cancelled) return;
      setSession((sessions?.[0] as BotSession | undefined) ?? null);
      setUsage(u ?? { trades_count: 0, leverage_used_pct: 0 });
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
