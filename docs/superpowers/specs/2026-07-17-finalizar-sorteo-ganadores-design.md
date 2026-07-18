# Finalizar sorteo y publicar ganadores

**Fecha:** 2026-07-17
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y objetivo

Hoy el estatus `finalizado` existe en el constraint de `sorteos.estatus` pero ningún flujo lo asigna nunca — es un estado "muerto". Tampoco existe ningún concepto de "ganador" en la base de datos (ni en `sorteos`, ni en `premios`, ni en `pedidos`). Cuando un sorteo culmina, hoy no hay forma de:

1. Marcarlo como finalizado y detener la venta de boletos.
2. Declarar quién ganó cada premio, con evidencia visual que respalde el resultado.
3. Mostrar públicamente los sorteos finalizados y sus ganadores, sin permitir ninguna interacción (compra, preguntas, verificador de boleto) sobre ellos.

Esta feature cierra ese ciclo: admins y socios organizadores pueden finalizar sus sorteos, declarar ganadores por lugar premiado (con evidencia), y el sitio público muestra esos sorteos en una sección separada con los resultados.

## Alcance

- Finalizar un sorteo (admin o socio dueño) desde el panel admin (`/admin/sorteos`) o desde "Mis sorteos" (`/dashboard/sorteos`).
- Declarar/editar el ganador de cada lugar premiado (1°, 2°, 3° si aplica), de forma independiente y en cualquier momento después de finalizar (parcial, completable después, editable si hay un error).
- Página pública del sorteo en modo solo-lectura cuando está finalizado, con sección de ganadores.
- Nueva sección "Sorteos Finalizados" en el home.

Fuera de alcance: notificaciones automáticas (WhatsApp/Facebook) del resultado, edición de los datos del sorteo/premios tras finalizar, paginación de la sección de finalizados en home (se limita a los más recientes por ahora).

## Modelo de datos

### Tabla nueva `sorteo_ganadores`

Una fila por lugar premiado con ganador declarado.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `sorteo_id` | uuid FK → `sorteos(id)` | `on delete cascade` |
| `premio_id` | uuid FK → `premios(id)` | `on delete cascade`; **único junto con `sorteo_id`** — un ganador por lugar |
| `pedido_id` | uuid FK → `pedidos(id)` | orden ganadora |
| `boleto_id` | uuid FK → `boletos(id)` | boleto ganador |
| `numero_ganador` | text | número tal como se capturó (respeta formato `es_loteria`) |
| `evidencia_urls` | text[] | mínimo 1 imagen; bucket `evidencias-sorteo` |
| `declarado_por` | uuid FK → `perfiles(id)` | quién lo registró/editó por última vez |
| `created_at` / `updated_at` | timestamptz | |

Constraint `unique (sorteo_id, premio_id)` para poder hacer `UPSERT` al declarar/editar.

No se requiere migración para `sorteos.estatus`: `'finalizado'` ya es un valor válido del check constraint desde `001_schema_inicial.sql`, simplemente nunca se usa hoy.

### Storage

Bucket nuevo `evidencias-sorteo` (creación manual en Supabase dashboard, mismo patrón que los buckets existentes: `premios`, `hero-slides`, `portadas-predeterminadas`, `brand`).

## Backend / API

### Guard nuevo

`lib/supabase/guard.ts` → `requireSorteoAccess(sorteoId)`: autoriza si el usuario es admin (reusa `requireAdmin()`) **o** si `sorteos.usuario_id === session.user.id`. Se usa en las rutas nuevas para que un solo endpoint sirva tanto al panel admin como a "Mis sorteos".

### Rutas nuevas

**`POST /api/sorteos/[id]/finalizar`**
- Guard: `requireSorteoAccess`.
- Valida `sorteos.estatus === 'activo'` (si no, error 400).
- `UPDATE sorteos SET estatus = 'finalizado'`.
- No pide ganadores en este paso — se declaran con el endpoint siguiente, antes o después, en cualquier orden.

**`POST /api/sorteos/[id]/ganadores`**
- Guard: `requireSorteoAccess`.
- Body (multipart): `premioId`, `numeroGanador`, imágenes de evidencia.
- Valida `sorteos.estatus === 'finalizado'`.
- Busca en `boletos` el número dentro de ese sorteo, respetando el formato `es_loteria` (00.. vs 01..).
  - Si no existe o su `estatus !== 'pagado'` → error 400 ("ese número no tiene un pedido pagado asociado").
- Resuelve `pedido_id` dueño del boleto (mismo patrón de fallback `pedido_boletos` → `boletos.pedido_id` que ya usan `eliminar-sorteo` y el endpoint de `ordenes`).
- Sube las imágenes al bucket `evidencias-sorteo`.
- `UPSERT` en `sorteo_ganadores` por `(sorteo_id, premio_id)` — primera declaración o corrección de una ya existente.
- Regla de validación: `numeroGanador` + al menos 1 imagen de evidencia son obligatorios juntos; no se puede guardar un ganador sin evidencia.

## UI — Admin y "Mis sorteos"

### Admin (`app/admin/sorteos`)

Junto a los botones actuales (Pausar/Reactivar/Eliminar/Publicar en Facebook), dos acciones nuevas por fila, con el mismo patrón de modal que ya usa "Pausar":

- **"Finalizar sorteo"** — visible solo si `estatus === 'activo'`. Modal de confirmación simple → `POST /finalizar`.
- **"Gestionar ganadores"** — visible solo si `estatus === 'finalizado'`. Abre modal con una fila por premio (1°/2°/3° lugar si aplica): campo de número de boleto ganador + subida de evidencia + botón "Guardar". Lugares con ganador ya declarado aparecen prellenados y editables; los pendientes muestran badge "Pendiente".

### "Mis sorteos" (socio) — `app/dashboard/sorteos/[id]`

Esta página **no existe hoy** (los links "Ver"/"Editar" del listado actual dan 404). Se crea, mostrando resumen del sorteo (premios, boletos vendidos, estatus) y, para el dueño:

- Si `activo`: botón "Finalizar sorteo".
- Si `finalizado`: mismo componente de gestión de ganadores que en admin.

Componente compartido `components/shared/GanadoresManager.tsx`, usado por ambos paneles contra las mismas rutas API (el guard resuelve el permiso, no hace falta duplicar lógica).

## UI pública

### Página `/sorteo/[id]`

La query hoy solo trae sorteos con `estatus = 'activo'` (si no, 404). Se amplía para aceptar también `'finalizado'`. En modo finalizado, la página es de solo lectura:

- `SorteoCard`: sin CTA de compra; badge "Sorteo finalizado".
- `FormularioCompra`: no se monta.
- `SeccionPreguntas`: se oculta el formulario para preguntas nuevas; las preguntas ya aprobadas **se quedan visibles** como comentarios informativos.
- `VerificadorBoleto`: se oculta por completo.
- **Nueva sección "Ganadores"**: por cada premio, imagen del premio + lugar + si tiene ganador declarado, nombre formateado como "primer nombre + primer apellido" (tomado de `cliente_nombre`/`cliente_apellidos` del pedido) + galería de evidencia (mismo lightbox que `GaleriaFotos`). Si el lugar no tiene ganador declarado aún, muestra "Ganador por anunciar" sin nombre.

### Home — sección "Sorteos Finalizados"

Grid nuevo debajo de los sorteos activos, mismas tarjetas (`SorteoCard`), envueltas en un contenedor con `filter: grayscale(1)` que transiciona a `grayscale(0)` en hover/focus (accesible por teclado). Cada tarjeta enlaza a `/sorteo/[id]`. Se limita a los sorteos finalizados más recientes (ej. 12) — sin paginación por ahora.

## Casos borde / validaciones

- Un sorteo solo se puede finalizar desde `estatus = 'activo'` (no desde `pausado`, `borrador`, etc.).
- Declarar un ganador exige que el número capturado corresponda a un boleto `pagado` de ese sorteo; si no, error claro al usuario.
- Un lugar ya declarado se puede editar en cualquier momento (admin o socio dueño) — no queda bloqueado tras la primera declaración.
- La finalización es independiente de la declaración de ganadores: se puede finalizar sin declarar ninguno y completarlos después, en cualquier orden de lugares.

## Testing

- Unit/integration de `POST /finalizar`: transición de estatus válida solo desde `activo`, rechazo desde otros estatus, permisos (admin ok, socio dueño ok, socio no-dueño rechazado, usuario anónimo rechazado).
- Unit/integration de `POST /ganadores`: resolución correcta de boleto→pedido (incluyendo fallback `boletos.pedido_id`), rechazo si el boleto no está pagado o no existe, `UPSERT` correcto en declaración y corrección, validación de número+evidencia juntos.
- UI: flujo completo en `/admin/sorteos` y `/dashboard/sorteos/[id]` (finalizar → declarar parcial → declarar el resto → editar uno).
- Página pública: sorteo finalizado sin CTA de compra/preguntas nuevas/verificador; sección de ganadores muestra nombre corto correcto y evidencia; sorteo con ganadores parciales muestra "por anunciar" en los pendientes.
- Home: sección "Sorteos Finalizados" renderiza grid en escala de grises con transición a color en hover/focus, y el link lleva a la página correcta.
