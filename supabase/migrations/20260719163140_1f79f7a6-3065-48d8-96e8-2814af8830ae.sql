ALTER TABLE public.investment_selections
  ADD COLUMN IF NOT EXISTS onramp_provider TEXT,
  ADD COLUMN IF NOT EXISTS onramp_method TEXT,
  ADD COLUMN IF NOT EXISTS onramp_currency TEXT,
  ADD COLUMN IF NOT EXISTS onramp_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS deposit_address TEXT,
  ADD COLUMN IF NOT EXISTS deposit_memo TEXT,
  ADD COLUMN IF NOT EXISTS funded_amount_sek NUMERIC,
  ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;

ALTER TABLE public.investment_selections
  DROP CONSTRAINT IF EXISTS investment_selections_onramp_status_check;

ALTER TABLE public.investment_selections
  ADD CONSTRAINT investment_selections_onramp_status_check
  CHECK (onramp_status IN ('not_started','method_selected','provider_open','awaiting_transfer','confirming','funded','failed','cancelled'));