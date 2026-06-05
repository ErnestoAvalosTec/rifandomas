create extension if not exists "uuid-ossp";

create table public.perfiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  apellidos text not null,
  telefono text,
  rol text not null default 'usuario' check (rol in ('admin','usuario')),
  activo boolean default true,
  created_at timestamptz default now()
);

create table public.sorteos (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) not null,
  nombre text not null,
  descripcion text,
  fecha_sorteo date not null,
  total_numeros int not null,
  precio_unitario numeric(10,2) not null,
  promo_activa boolean default false,
  promo_tipo text check (promo_tipo in ('x_por_y','compra_lleva')),
  promo_config jsonb,
  estatus text default 'borrador'
    check (estatus in ('borrador','pendiente','activo','finalizado','rechazado')),
  motivo_rechazo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.premios (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id) on delete cascade,
  lugar int not null check (lugar between 1 and 3),
  nombre text not null,
  descripcion text,
  imagen_url text,
  valor_estimado numeric(10,2)
);

create table public.boletos (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id) on delete cascade,
  numero text not null,
  estatus text default 'disponible'
    check (estatus in ('disponible','reservado','pagado')),
  pedido_id uuid,
  unique(sorteo_id, numero)
);

create table public.pedidos (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id),
  cliente_nombre text not null,
  cliente_apellidos text not null,
  cliente_telefono text not null,
  cliente_correo text,
  cliente_estado text,
  vendedor_id uuid references public.perfiles(id),
  monto_total numeric(10,2) not null,
  estatus text default 'pendiente'
    check (estatus in ('pendiente','pagado','cancelado')),
  whatsapp_enviado boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '48 hours'
);

create table public.pedido_boletos (
  id uuid default uuid_generate_v4() primary key,
  pedido_id uuid references public.pedidos(id) on delete cascade,
  boleto_id uuid references public.boletos(id),
  unique(boleto_id)
);

create table public.cuentas_deposito (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references public.perfiles(id) on delete cascade,
  banco text not null,
  clabe text not null,
  titular text not null,
  activo boolean default true
);

-- Función atómica de reserva (anti race-condition)
create or replace function reservar_boletos(
  p_numeros text[],
  p_sorteo_id uuid,
  p_pedido_id uuid
) returns void as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.boletos
  where numero = any(p_numeros)
    and sorteo_id = p_sorteo_id
    and estatus = 'disponible';

  if v_count <> array_length(p_numeros, 1) then
    raise exception 'uno_o_mas_numeros_no_disponibles';
  end if;

  update public.boletos
  set estatus = 'reservado', pedido_id = p_pedido_id
  where numero = any(p_numeros)
    and sorteo_id = p_sorteo_id
    and estatus = 'disponible';
end;
$$ language plpgsql;

-- Función de limpieza de boletos expirados (cron job)
create or replace function liberar_boletos_expirados() returns void as $$
begin
  update public.boletos
  set estatus = 'disponible', pedido_id = null
  where pedido_id in (
    select id from public.pedidos
    where estatus = 'pendiente'
      and expires_at < now()
  );

  update public.pedidos
  set estatus = 'cancelado'
  where estatus = 'pendiente'
    and expires_at < now();
end;
$$ language plpgsql;

-- Realtime subscriptions
alter publication supabase_realtime add table public.boletos;
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.sorteos;

-- Row Level Security
alter table public.perfiles enable row level security;
alter table public.sorteos enable row level security;
alter table public.pedidos enable row level security;
alter table public.boletos enable row level security;
alter table public.premios enable row level security;
alter table public.cuentas_deposito enable row level security;

create policy "Perfil propio"
  on public.perfiles for all
  using (auth.uid() = id);

create policy "Usuario gestiona sus sorteos"
  on public.sorteos for all
  using (auth.uid() = usuario_id);

create policy "Admin gestiona todos los sorteos"
  on public.sorteos for all
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Sorteos activos son públicos"
  on public.sorteos for select
  using (estatus = 'activo');

create policy "Boletos lectura pública"
  on public.boletos for select using (true);

create policy "Solo autenticados reservan boletos"
  on public.boletos for update
  using (auth.role() = 'authenticated');

create policy "Usuario ve pedidos de sus sorteos"
  on public.pedidos for select
  using (
    sorteo_id in (
      select id from public.sorteos where usuario_id = auth.uid()
    )
  );

create policy "Pedidos inserción pública"
  on public.pedidos for insert
  with check (true);

create policy "Usuario gestiona sus cuentas"
  on public.cuentas_deposito for all
  using (auth.uid() = usuario_id);
