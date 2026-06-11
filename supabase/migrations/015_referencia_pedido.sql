-- Agrega columna de referencia única de transferencia a pedidos
alter table public.pedidos
  add column if not exists referencia text;

-- Constraint de unicidad (permite múltiples NULL para pedidos legacy sin referencia)
alter table public.pedidos
  add constraint pedidos_referencia_unique unique (referencia);

create index if not exists idx_pedidos_referencia on public.pedidos (referencia);
