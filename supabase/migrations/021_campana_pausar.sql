-- Permite pausar manualmente una campaña de mensajes masivos en curso
alter table public.campanas_whatsapp drop constraint campanas_whatsapp_estatus_check;
alter table public.campanas_whatsapp add constraint campanas_whatsapp_estatus_check
  check (estatus in ('enviando','completado','error','pausado'));
