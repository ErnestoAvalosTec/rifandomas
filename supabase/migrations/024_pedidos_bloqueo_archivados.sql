-- Bloquea cualquier UPDATE sobre pedidos cuyo sorteo ya no está 'activo'
-- (finalizado o pausado), sin importar qué política permisiva de UPDATE
-- exista hoy para "pedidos" (se agregó fuera de las migraciones versionadas
-- de este proyecto, no está documentada en el repo). Una política declarada
-- "as restrictive" siempre se combina con AND sobre las políticas permisivas
-- existentes — nunca amplía el acceso, solo puede reducirlo — así que no hace
-- falta conocer ni tocar esa política permisiva para lograr el bloqueo.
create policy "Solo se editan pedidos de sorteos activos"
  on public.pedidos as restrictive for update
  using (
    sorteo_id in (select id from public.sorteos where estatus = 'activo')
  );
