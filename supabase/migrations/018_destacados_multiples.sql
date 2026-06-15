-- Permite hasta 3 sorteos destacados con un orden (1, 2, 3) en lugar de un solo booleano
alter table public.sorteos
  add column if not exists destacado_orden smallint;

alter table public.sorteos
  add constraint sorteos_destacado_orden_check
  check (destacado_orden is null or destacado_orden between 1 and 3);

-- Migrar el destacado actual (si existe) a la posición 1
update public.sorteos set destacado_orden = 1 where destacado = true;

alter table public.sorteos drop column if exists destacado;

-- Evita que dos sorteos compartan la misma posición
create unique index if not exists sorteos_destacado_orden_idx
  on public.sorteos (destacado_orden)
  where destacado_orden is not null;
