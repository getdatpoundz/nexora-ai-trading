
-- portfolio_holdings
CREATE TABLE public.portfolio_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  quantity numeric(28,10) NOT NULL DEFAULT 0,
  avg_cost_sek numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_holdings TO authenticated;
GRANT ALL ON public.portfolio_holdings TO service_role;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own holdings select" ON public.portfolio_holdings FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own holdings write" ON public.portfolio_holdings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_holdings_updated BEFORE UPDATE ON public.portfolio_holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trades
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  side text NOT NULL CHECK (side IN ('buy','sell')),
  quantity numeric(28,10) NOT NULL,
  price_sek numeric(18,4) NOT NULL,
  fee_sek numeric(18,4) NOT NULL DEFAULT 0,
  total_sek numeric(18,4) NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades select" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own trades insert" ON public.trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_trades_user_time ON public.trades(user_id, executed_at DESC);

-- profiles: cash + tour
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cash_balance_sek numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;
