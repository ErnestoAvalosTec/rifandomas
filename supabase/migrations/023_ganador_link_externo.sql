-- Link externo opcional (YouTube, Facebook, etc.) donde se publicó el
-- resultado de un lugar premiado, además de las fotos de evidencia.
alter table public.sorteo_ganadores
  add column if not exists link_externo text;
