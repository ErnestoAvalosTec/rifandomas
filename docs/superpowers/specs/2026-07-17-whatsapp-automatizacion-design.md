# Automatización de mensajes WhatsApp — confirmación de pago, reenvío y mensajes masivos

**Fecha:** 2026-07-17
**Estado:** Aprobado, pendiente de implementación

## Contexto

El envío de WhatsApp ya funciona vía Evolution API (VPS del usuario), con credenciales en la tabla Supabase `whatsapp_config` y una función central `sendWhatsAppMessage(number, text)` en `lib/whatsapp.ts` que ya simula "escribiendo..." con un delay aleatorio de 1.5-4s antes de cada mensaje (parámetro `delay` de Evolution API).

Patrones existentes reutilizados en este diseño:
- `app/api/whatsapp/route.ts` — mensaje original de "pedido registrado" (banco/CLABE/titular/números/monto), enviado una vez al crear el pedido desde `components/public/FormularioCompra.tsx`. Marca `pedidos.whatsapp_enviado = true`.
- `app/api/recordatorio/route.ts` — patrón de fetch server-side (pedido → sorteo → `cuentas_deposito`) para reconstruir datos bancarios sin depender del cliente.
- `components/dashboard/OrdenesTable.tsx` — tabla de órdenes del socio, con `cambiarEstatus(id, estatus)` que marca un pedido como `pagado`/`cancelado`, y `enviarRecordatorio(p)` como ejemplo de acción que dispara un WhatsApp desde el dropdown de acciones.
- `app/admin/ordenes/page.tsx` — hoy es de solo lectura (sin acciones), pero se diseña el envío de "confirmación de pago" como endpoint reutilizable para que, si en el futuro se agrega ahí una acción de marcar pagado, pueda enganchar el mismo envío sin duplicar lógica.

No existe una página `/validador` independiente: el componente `VerificadorBoleto` vive dentro de `SorteoDetalle` (página `/sorteo/[id]`), así que cualquier link a "validar tus números" debe apuntar a `{NEXT_PUBLIC_SITE_URL}/sorteo/{sorteoId}`.

## Feature 1 — Mensaje automático al confirmar pago

**Objetivo:** cuando el socio marca un pedido como `pagado` en su dashboard, el cliente recibe un WhatsApp confirmando el pago y remitiéndolo al validador de números.

**Backend:** nuevo endpoint `POST /api/pedidos/notificar-pago`, recibe `{ pedidoId }`. Server-side:
1. Consulta `pedidos` (cliente_nombre, cliente_telefono, sorteo_id, referencia) + `sorteos.nombre` + `boletos.numero` del pedido (mismo patrón de joins que `/api/recordatorio`).
2. Arma el mensaje:
```
Hola {nombre} 🎉, ¡hemos confirmado tu pago! ✅

*Sorteo:* {sorteoNombre}
*Números:* {numeros}
*Folio:* {referencia}

Ya puedes validar el estatus de tus números en la página del sorteo:
👉 {NEXT_PUBLIC_SITE_URL}/sorteo/{sorteoId}

¡Mucha suerte! 🍀 — Rifando+
```
3. Llama `sendWhatsAppMessage(telefono, mensaje)`. Best-effort: si falla, se loguea (`console.warn`) pero no bloquea ni revierte el cambio de estatus — igual que el resto de envíos del proyecto.

**Endpoint reutilizable a propósito:** al vivir en su propia ruta (no inline en el componente), tanto el dashboard del socio como una futura acción equivalente en el admin pueden invocarlo con solo pasar `pedidoId`.

**Frontend:** en `components/dashboard/OrdenesTable.tsx` → `cambiarEstatus`, después de que el `update` a `estatus: 'pagado'` tenga éxito, hacer `fetch('/api/pedidos/notificar-pago', { method: 'POST', body: JSON.stringify({ pedidoId: id }) })` sin bloquear el flujo (no se espera confirmación visual más allá del toast existente "Pedido marcado como pagado").

## Feature 2 — Reenviar pedido

**Objetivo:** permitir reenviar el mensaje original de "pedido registrado" cuando el cliente no lo recibió la primera vez.

**Backend:** nuevo endpoint `POST /api/pedidos/reenviar`, recibe `{ pedidoId }`. Server-side reconstruye exactamente el mismo mensaje que `app/api/whatsapp/route.ts` genera al crear el pedido (banco/CLABE/titular/números/monto/referencia), consultando pedido → sorteo → `cuentas_deposito` → boletos (mismo patrón que `/api/recordatorio`). Llama `sendWhatsAppMessage`.

**Frontend:** nuevo item "Reenviar pedido" en el `DropdownMenu` de acciones de `OrdenesTable.tsx` (móvil y desktop), junto a "Enviar recordatorio", visible solo cuando `p.estatus === 'pendiente'`.

## Feature 3 — Mensajes masivos (panel admin)

**Objetivo:** el admin selecciona un sorteo, escribe un mensaje y lo envía a todos los concursantes de ese sorteo (deduplicados por teléfono), respetando un delay anti-baneo entre destinatarios.

### Modelo de datos (migración nueva)

```sql
create table campanas_whatsapp (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid references sorteos(id),
  mensaje text not null,               -- plantilla con {nombre} opcional
  filtro_estatus text[] not null,      -- ej. ['pendiente','pagado']
  total_destinatarios int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  estatus text not null default 'enviando', -- enviando | completado | error
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table campana_whatsapp_destinatarios (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid references campanas_whatsapp(id) on delete cascade,
  telefono text not null,
  nombre text,
  estatus text not null default 'pendiente', -- pendiente | enviado | error
  enviado_at timestamptz
);
```

### Flujo de envío

1. **`POST /api/admin/whatsapp/masivo`** — recibe `{ sorteoId, mensaje, filtroEstatus }`.
   - `requireAdmin()`.
   - Consulta `pedidos` del sorteo con `estatus in filtroEstatus`, trae `cliente_telefono, cliente_nombre`.
   - Deduplica por teléfono normalizado (mismo `replace(/\D/g,'')` + prefijo `52` que usa `sendWhatsAppMessage`) — si un teléfono se repite entre varios pedidos, se queda solo con el primer nombre encontrado.
   - Inserta la fila `campanas_whatsapp` (`estatus='enviando'`, `total_destinatarios=N`) y una fila en `campana_whatsapp_destinatarios` por cada teléfono único.
   - Dispara (sin `await` bloqueante en la respuesta HTTP) el loop de envío y responde de inmediato `{ campanaId }`.

2. **Loop de envío** (función interna, corre en el proceso Node del VPS):
   - Recorre destinatarios con `estatus='pendiente'`, en orden.
   - Por cada uno: reemplaza `{nombre}` en la plantilla, llama `sendWhatsAppMessage(telefono, texto)` (ya incluye "escribiendo" 1.5-4s vía Evolution).
   - Actualiza el destinatario (`enviado`/`error`) y el contador correspondiente en `campanas_whatsapp`.
   - Espera un delay aleatorio **adicional de 8-15 segundos** antes de continuar con el siguiente (evita ráfagas de mensajes consecutivos).
   - Al terminar todos: `estatus='completado'`, `completed_at=now()`.

3. **`GET /api/admin/whatsapp/masivo/[id]`** — devuelve la fila de campaña (`enviados`, `fallidos`, `total_destinatarios`, `estatus`) para polling desde el frontend cada 2-3s.

4. **`GET /api/admin/whatsapp/masivo`** — lista campañas pasadas (historial) con sorteo, fecha, mensaje truncado, `enviados/total`, `estatus`.

5. **Reanudar:** si el proceso Node se reinicia a mitad de un envío, la campaña queda `estatus='enviando'` con destinatarios `pendiente` sin procesar. El frontend muestra un botón "Reanudar" en campañas `enviando` — vuelve a llamar a un endpoint (`POST /api/admin/whatsapp/masivo/[id]/reanudar`) que relanza el mismo loop sobre los destinatarios `pendiente` restantes de esa campaña. No se implementa cola/cron — el volumen esperado no lo justifica.

### Frontend

- Nueva sección "Mensajes masivos" dentro de `app/admin/whatsapp/page.tsx` (misma página donde ya se administra la conexión/QR de Evolution API).
- Formulario: selector de sorteo, checkboxes de estatus (pendiente/pagado/cancelado), textarea de mensaje (con nota indicando que `{nombre}` se reemplaza automáticamente), botón "Enviar".
- Al enviar: barra de progreso en vivo ("Enviando 12/87...") vía polling.
- Debajo: tabla de historial de campañas anteriores.

## Manejo de errores

- Todos los envíos son **best-effort**: un fallo de WhatsApp (API caída, número inválido) nunca revierte ni bloquea la acción de negocio que lo originó (marcar pagado, crear pedido, etc.), solo se loguea o se marca `error` en la fila correspondiente.
- En mensajes masivos, un destinatario que falla no detiene el loop — continúa con el siguiente y queda registrado como `error` para revisión posterior en el historial.

## Fuera de alcance (YAGNI)

- No se construye un sistema de colas/cron para reintentos automáticos — solo el botón manual de "Reanudar".
- No se agregan más variables de plantilla que `{nombre}` por ahora.
- No se agrega la acción "marcar pagado" al panel admin en este trabajo — solo se deja el endpoint de notificación listo para que se pueda enganchar después.

## Recordatorio operativo

Ningún cambio de este trabajo se sube a git sin autorización explícita del usuario — se preguntará antes de cada commit/push.
