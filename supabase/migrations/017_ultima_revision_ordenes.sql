-- Marca de tiempo de la última vez que el usuario revisó la sección "Órdenes",
-- usada para calcular el badge de notificaciones (pedidos nuevos sin ver) en el sidebar.
alter table public.perfiles
  add column if not exists ultima_revision_ordenes timestamptz not null default now();
