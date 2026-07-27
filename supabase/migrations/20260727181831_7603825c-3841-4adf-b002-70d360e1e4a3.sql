SELECT cron.unschedule('nexora-bot-tick');

SELECT cron.schedule(
  'nexora-bot-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://project--f212dac9-148e-41c3-8194-c407adc6b47b-dev.lovable.app/api/public/hooks/bot-tick',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);