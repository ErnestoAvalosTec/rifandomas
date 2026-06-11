-- Galería de imágenes de portada predeterminadas, administradas por el admin
create table public.imagenes_predeterminadas (
  id uuid default uuid_generate_v4() primary key,
  categoria text not null,
  nombre text,
  url text not null,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_imagenes_predeterminadas_categoria on public.imagenes_predeterminadas (categoria);

-- RLS
alter table public.imagenes_predeterminadas enable row level security;

create policy "Imagenes predeterminadas lectura publica"
  on public.imagenes_predeterminadas for select
  using (activo = true);

create policy "Admin gestiona imagenes predeterminadas"
  on public.imagenes_predeterminadas for all
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );
