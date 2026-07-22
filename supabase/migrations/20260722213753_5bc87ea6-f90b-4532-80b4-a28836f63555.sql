
-- Admin-styrd onboarding: tilldelad investeringsnivå + on-ramp-eventlogg

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_level_sek integer,
  ADD COLUMN IF NOT EXISTS assigned_level_name text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Låt admin skapa selections för en kund
DROP POLICY IF EXISTS "Admins can create selections" ON public.investment_selections;
CREATE POLICY "Admins can create selections"
  ON public.investment_selections FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- On-ramp webhook events
CREATE TABLE IF NOT EXISTS public.onramp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  selection_id uuid REFERENCES public.investment_selections(id) ON DELETE SET NULL,
  user_id uuid,
  event_type text NOT NULL,
  status text NOT NULL,
  fiat_amount numeric,
  fiat_currency text,
  crypto_amount numeric,
  crypto_currency text,
  wallet_address text,
  tx_hash text,
  raw jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_order_id, event_type)
);

GRANT SELECT ON public.onramp_events TO authenticated;
GRANT ALL ON public.onramp_events TO service_role;
ALTER TABLE public.onramp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all onramp events"
  ON public.onramp_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own onramp events"
  ON public.onramp_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
