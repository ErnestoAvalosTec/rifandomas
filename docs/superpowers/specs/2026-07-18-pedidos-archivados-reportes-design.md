# Pedidos archivados y reportes por sorteo finalizado

**Fecha:** 2026-07-18
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y objetivo

Hoy los contadores "Pedidos Totales" e "Ingresos Pagados" del dashboard del socio (`app/dashboard/page.tsx`), y las listas de "Órdenes" (`app/dashboard/ordenes/page.tsx`, `/admin/ordenes` vía `app/api/admin/ordenes/route.ts`), incluyen pedidos de **todos** los sorteos sin importar su estatus. Una vez que un sorteo se finaliza o se pausa, sus pedidos ya no deberían poder modificarse, no deberían inflar los contadores agregados del dashboard, y el socio/admin debería tener una forma clara de consultar cuánto vendió y cuántos pedidos tuvo ese sorteo específico.

## Alcance

1. Los pedidos de sorteos con `estatus` en `('finalizado', 'pausado')` quedan de solo lectura: ninguna acción existente (marcar pagado, reenviar comprobante, cancelar) está disponible sobre ellos, a nivel API además de UI.
2. Esos pedidos desaparecen de las listas normales de "Órdenes" (tanto la del socio como la del admin) y de los contadores "Pedidos Totales"/"Ingresos Pagados" del dashboard del socio.
3. Nueva sección "Reportes" (dashboard del socio y admin) que lista los sorteos finalizados/pausados con sus totales, y permite ver el detalle de sus pedidos archivados (solo lectura).

Fuera de alcance: sorteos `eliminado` (sus pedidos ya se borran en cascada al eliminar, ver `app/api/admin/eliminar-sorteo/route.ts` — no hay nada que archivar ahí). Exportar/descargar reportes. Gráficas o métricas históricas más allá de los totales por sorteo.

## Modelo de datos

**Sin cambios de esquema.** "Archivado" es un estado derivado en tiempo real de `sorteos.estatus`, no una columna nueva en `pedidos`. Si un sorteo pausado se reactiva a `activo`, sus pedidos vuelven a aparecer en "Órdenes" y a contar en los totales automáticamente, sin ninguna acción manual de "desarchivar".

## Cambios a funcionalidad existente

- **`app/dashboard/page.tsx`**: la query de pedidos usada para "Pedidos Totales" e "Ingresos Pagados" se limita a pedidos cuyo sorteo tenga `estatus` fuera de `('finalizado', 'pausado')`.
- **`app/dashboard/ordenes/page.tsx`**: la query de pedidos excluye los de sorteos `finalizado`/`pausado`.
- **`app/api/admin/ordenes/route.ts`** (usada por `/admin/ordenes`): mismo filtro, excluye pedidos de sorteos `finalizado`/`pausado`.
- **Bloqueo a nivel API** (defensa en profundidad, no solo ocultar botones en la UI): las rutas que mutan un pedido (marcar como pagado, reenviar comprobante por WhatsApp, cancelar) verifican que el sorteo asociado siga `activo` antes de proceder; si no, devuelven error — mismo patrón ya usado en `POST /api/pedidos` durante la revisión final de la feature de finalizar sorteo.

## Nueva sección "Reportes"

- Nuevo item de navegación "Reportes" en `components/dashboard/Sidebar.tsx` y `components/admin/AdminSidebar.tsx`, apuntando a `/dashboard/reportes` y `/admin/reportes` respectivamente.
- **Listado**: sorteos con `estatus in ('finalizado', 'pausado')` — del socio dueño en `/dashboard/reportes`, de todos los organizadores en `/admin/reportes`. Cada fila muestra: nombre del sorteo, estatus (badge), fecha del sorteo, N° de pedidos totales, ingresos pagados (suma de `monto_total` de pedidos con `estatus='pagado'`) — mismas definiciones que ya usan los contadores actuales del dashboard, solo que ahora agrupadas por sorteo en vez de sumadas globalmente.
- **Detalle**: al hacer clic en una fila se muestra el listado real de los pedidos de ese sorteo (cliente, boletos, monto, estatus, fecha) — mismas columnas que "Órdenes" hoy, pero **sin ningún botón de acción** (solo lectura).

## Casos borde / validaciones

- Un sorteo sin ningún pedido pagado aparece en "Reportes" con ingresos en $0 y N° de pedidos según corresponda (no se oculta).
- Reactivar un sorteo pausado (`estatus` vuelve a `activo`) lo saca de "Reportes" y sus pedidos vuelven a "Órdenes" y a los contadores del dashboard automáticamente, sin pasos manuales.
- El bloqueo de acciones a nivel API debe devolver un mensaje claro (no solo un 403/400 silencioso) para que si alguien intenta forzar una acción vía API directa entienda por qué falla.
