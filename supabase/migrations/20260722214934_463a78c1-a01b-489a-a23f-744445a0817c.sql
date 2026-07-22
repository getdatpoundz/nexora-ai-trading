
ALTER TABLE public.investment_selections
  ADD COLUMN IF NOT EXISTS expected_crypto_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deposit_network TEXT,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
