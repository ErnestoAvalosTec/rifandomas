-- Agrega soporte de galería de fotos y opción "intercambiable por efectivo" a los premios

alter table public.premios
  add column if not exists intercambiable_efectivo boolean not null default false,
  add column if not exists fotos_urls             text[]  not null default '{}';
