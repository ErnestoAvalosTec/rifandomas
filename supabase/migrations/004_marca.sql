-- Tabla de identidad de marca (fila única)
create table public.marca (
  id int primary key default 1,
  constraint marca_single_row check (id = 1),
  logo_url text,
  favicon_url text,
  updated_at timestamptz default now()
);

insert into public.marca (id) values (1);

alter table public.marca enable row level security;

create policy "Marca lectura publica"
  on public.marca for select using (true);

create policy "Admin gestiona marca"
  on public.marca for all
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'admin'
    )
  );
