-- ============================================================================
-- 003_push_schedule.sql  (ejecutar en el SQL Editor del Dashboard)
-- Programa la ejecución periódica de la Edge Function `urgency-cron`
-- usando pg_cron + pg_net. No depende del scheduler del dashboard.
-- ============================================================================

-- 1) Habilitar extensiones necesarias (pg_cron y pg_net)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Eliminar el job anterior si ya existía (Seguro re-ejecutar)
select cron.unschedule('invoke-urgency-cron-hourly')
where exists (select 1 from cron.job where jobname = 'invoke-urgency-cron-hourly');

-- 3) Crear el job de cron que invoca urgency-cron cada hora (UTC).
--    Se autentica con la API key pública (publishable_key del Vault),
--    que es suficiente para invocar la Edge Function y disparar su lógica
--    interna (que usa la service role key dentro de la función).
select cron.schedule(
  'invoke-urgency-cron-hourly',
  '0 * * * *', -- cada hora en punto (UTC)
  $cron$
    select
      net.http_post(
        url := 'https://qnqtfybknmiaqcuyyuqc.supabase.co/functions/v1/urgency-cron',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 20000
      ) as request_id;
  $cron$
);
