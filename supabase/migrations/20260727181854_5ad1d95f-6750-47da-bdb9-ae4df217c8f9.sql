CREATE OR REPLACE FUNCTION public.force_zero_bot_leverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.max_leverage_pct := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_zero_bot_leverage_on_sessions ON public.bot_sessions;
CREATE TRIGGER force_zero_bot_leverage_on_sessions
BEFORE INSERT OR UPDATE ON public.bot_sessions
FOR EACH ROW
EXECUTE FUNCTION public.force_zero_bot_leverage();

CREATE OR REPLACE FUNCTION public.force_zero_monthly_leverage_usage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.leverage_used_pct := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_zero_monthly_leverage_usage_on_usage ON public.bot_monthly_usage;
CREATE TRIGGER force_zero_monthly_leverage_usage_on_usage
BEFORE INSERT OR UPDATE ON public.bot_monthly_usage
FOR EACH ROW
EXECUTE FUNCTION public.force_zero_monthly_leverage_usage();