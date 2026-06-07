-- The only existing policy on perfiles ("Perfil propio") restricts each user to
-- their own row — including admins, who therefore could only see/edit themselves
-- in the admin "Usuarios" panel. Add an admin-wide policy like the ones already
-- granted on sorteos/marca/hero.
--
-- A direct "exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')"
-- subquery would cause "infinite recursion detected in policy for relation perfiles"
-- because evaluating it re-triggers RLS on perfiles. A SECURITY DEFINER function
-- (owned by the migration role, which bypasses RLS) breaks that cycle.
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  )
$$;

create policy "Admin gestiona todos los perfiles"
  on public.perfiles for all
  using (public.es_admin());
