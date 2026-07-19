
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.investment_selection_status AS ENUM ('draft','pending_review','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE public.investment_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_name text NOT NULL,
  selected_amount_sek integer NOT NULL CHECK (selected_amount_sek >= 2500),
  strategy_id text,
  risk_acknowledged boolean NOT NULL DEFAULT false,
  enhanced_review_required boolean NOT NULL DEFAULT false,
  manual_review_required boolean NOT NULL DEFAULT false,
  status public.investment_selection_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.investment_selections TO authenticated;
GRANT ALL ON public.investment_selections TO service_role;

ALTER TABLE public.investment_selections ENABLE ROW LEVEL SECURITY;

-- Read: own rows, or admin
CREATE POLICY "Users can view their own selections"
  ON public.investment_selections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all selections"
  ON public.investment_selections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert: only own rows, and only as draft
CREATE POLICY "Users can create their own draft selections"
  ON public.investment_selections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'draft');

-- Update: only own drafts; status must remain draft or become cancelled
CREATE POLICY "Users can update their own draft selections"
  ON public.investment_selections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','cancelled'));

-- Admin can update status (approve/reject/etc)
CREATE POLICY "Admins can update any selection"
  ON public.investment_selections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER investment_selections_updated_at
  BEFORE UPDATE ON public.investment_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit table for large amounts
CREATE TABLE public.investment_amount_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid REFERENCES public.investment_selections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount_sek integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.investment_amount_audit TO service_role;
GRANT SELECT ON public.investment_amount_audit TO authenticated;

ALTER TABLE public.investment_amount_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.investment_amount_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: log large amounts on insert/update
CREATE OR REPLACE FUNCTION public.log_large_investment_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.selected_amount_sek >= 100000 AND (TG_OP = 'INSERT' OR OLD.selected_amount_sek IS DISTINCT FROM NEW.selected_amount_sek) THEN
    INSERT INTO public.investment_amount_audit (selection_id, user_id, amount_sek, reason)
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.selected_amount_sek,
      CASE WHEN NEW.selected_amount_sek >= 500000 THEN 'manual_review_threshold' ELSE 'enhanced_review_threshold' END
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER investment_selections_audit
  AFTER INSERT OR UPDATE OF selected_amount_sek ON public.investment_selections
  FOR EACH ROW EXECUTE FUNCTION public.log_large_investment_amount();
