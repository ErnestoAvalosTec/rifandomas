-- Crea automáticamente la fila en perfiles cuando se registra un usuario en auth.users.
--
-- Antes, el registro insertaba el perfil desde el cliente justo después de signUp().
-- Si la confirmación de correo está activa, signUp() no entrega una sesión activa,
-- por lo que ese insert corre sin auth.uid() y la política "Perfil propio"
-- (auth.uid() = id) lo bloquea -> aparece "No se pudo crear el perfil. Contacta soporte"
-- y el usuario queda huérfano en auth.users sin fila en perfiles.
--
-- Un trigger SECURITY DEFINER sobre auth.users evita ese problema por completo:
-- corre con privilegios elevados (sin pasar por RLS) y no depende de que el
-- cliente tenga sesión, así que funciona aunque la confirmación de correo esté activa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, apellidos, telefono, red_social_verificacion, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'red_social_verificacion',
    'usuario'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
