-- Habilitar pg_cron en Supabase Dashboard → Database → Extensions → pg_cron
-- Luego ejecutar este script en SQL Editor:

select cron.schedule(
  'liberar-boletos-expirados',
  '0 * * * *',
  'select liberar_boletos_expirados()'
);
