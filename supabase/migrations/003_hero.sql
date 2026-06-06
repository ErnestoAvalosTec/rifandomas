-- Tabla para las imágenes del slider del hero
create table public.hero_slides (
  id uuid default uuid_generate_v4() primary key,
  imagen_url text not null,
  titulo text,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz default now()
);

-- Campo destacado en sorteos (solo uno puede ser true a la vez)
alter table public.sorteos
  add column if not exists destacado boolean not null default false;

-- RLS
alter table public.hero_slides enable row level security;

create policy "Hero slides públicos"
  on public.hero_slides for select
  using (activo = true);

create policy "Admin gestiona hero slides"
  on public.hero_slides for all
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );
