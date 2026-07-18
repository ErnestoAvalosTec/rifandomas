-- Mismo razonamiento que 024_pedidos_bloqueo_archivados.sql: bloquea
-- cualquier UPDATE sobre boletos de un sorteo que ya no está 'activo',
-- sin importar qué política permisiva de UPDATE exista hoy para "boletos".
create policy "Solo se editan boletos de sorteos activos"
  on public.boletos as restrictive for update
  using (
    sorteo_id in (select id from public.sorteos where estatus = 'activo')
  );
