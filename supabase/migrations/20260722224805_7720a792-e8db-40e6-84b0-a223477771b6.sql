
-- bot_sessions
CREATE TABLE public.bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','paused','stopped','limit_reached')),
  level_key text,
  max_trades_month int NOT NULL DEFAULT 100,
  max_leverage_pct int NOT NULL DEFAULT 0,
  allowed_assets text[] NOT NULL DEFAULT ARRAY['BTC','ETH','SOL']::text[],
  strategy text NOT NULL DEFAULT 'ai_hybrid',
  aggressiveness int NOT NULL DEFAULT 5,
  starting_portfolio_sek numeric(18,4) NOT NULL DEFAULT 0,
  target_multiplier numeric(6,3) NOT NULL DEFAULT 2.2,
  current_multiplier numeric(6,3) NOT NULL DEFAULT 1.0,
  trades_generated int NOT NULL DEFAULT 0,
  target_trades int NOT NULL DEFAULT 60,
  last_tick_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_sessions TO authenticated;
GRANT ALL ON public.bot_sessions TO service_role;

ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bot session select" ON public.bot_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "own bot session write" ON public.bot_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bot_sessions_user_status ON public.bot_sessions(user_id, status);
CREATE INDEX idx_bot_sessions_status ON public.bot_sessions(status) WHERE status = 'running';

CREATE TRIGGER trg_bot_sessions_updated
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bot_monthly_usage
CREATE TABLE public.bot_monthly_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month text NOT NULL, -- format: '2026-07'
  trades_count int NOT NULL DEFAULT 0,
  leverage_used_pct int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

GRANT SELECT ON public.bot_monthly_usage TO authenticated;
GRANT ALL ON public.bot_monthly_usage TO service_role;

ALTER TABLE public.bot_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own monthly usage select" ON public.bot_monthly_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bot_monthly_usage_updated
  BEFORE UPDATE ON public.bot_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_holdings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_monthly_usage;
