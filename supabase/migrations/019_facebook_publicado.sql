alter table public.sorteos
  add column if not exists facebook_publicado_at timestamptz;
