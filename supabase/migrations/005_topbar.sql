alter table public.marca
  add column if not exists topbar_activo    boolean not null default true,
  add column if not exists topbar_ubicacion text,
  add column if not exists topbar_telefono  text,
  add column if not exists topbar_correo    text,
  add column if not exists topbar_redes     jsonb not null default '[]'::jsonb;
