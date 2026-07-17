-- Campañas de mensajes masivos de WhatsApp (admin) y sus destinatarios
create table if not exists public.campanas_whatsapp (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id),
  mensaje text not null,
  filtro_estatus text[] not null,
  total_destinatarios int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  estatus text not null default 'enviando'
    check (estatus in ('enviando','completado','error')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.campana_whatsapp_destinatarios (
  id uuid default uuid_generate_v4() primary key,
  campana_id uuid references public.campanas_whatsapp(id) on delete cascade,
  telefono text not null,
  nombre text,
  estatus text not null default 'pendiente'
    check (estatus in ('pendiente','enviado','error')),
  enviado_at timestamptz
);

create index if not exists idx_campana_destinatarios_campana_estatus
  on public.campana_whatsapp_destinatarios (campana_id, estatus);

alter table public.campanas_whatsapp enable row level security;
alter table public.campana_whatsapp_destinatarios enable row level security;
