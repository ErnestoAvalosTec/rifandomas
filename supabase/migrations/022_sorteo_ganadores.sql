-- Ganadores declarados por lugar premiado de un sorteo finalizado.
create table public.sorteo_ganadores (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id) on delete cascade not null,
  premio_id uuid references public.premios(id) on delete cascade not null,
  pedido_id uuid references public.pedidos(id) not null,
  boleto_id uuid references public.boletos(id) not null,
  numero_ganador text not null,
  evidencia_urls text[] not null default '{}',
  declarado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (sorteo_id, premio_id)
);

-- RLS habilitado, sin políticas: solo el cliente con service-role (rutas API)
-- lee/escribe esta tabla. La página pública consulta vía createAdminSupabaseClient()
-- igual que ya hace con "perfiles" para el organizador, así que no hace falta
-- una política de lectura pública aquí.
alter table public.sorteo_ganadores enable row level security;

-- Hasta ahora "sorteos" solo exponía estatus='activo' al público. Los sorteos
-- finalizados también deben ser visibles (página de detalle + grid del home).
create policy "Sorteos finalizados son públicos"
  on public.sorteos for select
  using (estatus = 'finalizado');
