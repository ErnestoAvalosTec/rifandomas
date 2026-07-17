# Pausar y reanudar mensajes masivos de WhatsApp

**Fecha:** 2026-07-17
**Estado:** Aprobado, pendiente de implementación

## Contexto

Al usar por primera vez en producción la feature de mensajes masivos (`docs/superpowers/specs/2026-07-17-whatsapp-automatizacion-design.md`), WhatsApp bloqueó el número y la cuenta conectada a Evolution API a mitad de un envío. El usuario reconectará un número nuevo por su cuenta (configuración de Evolution API fuera de este trabajo). Para evitar que un problema similar vuelva a dañar una línea completa antes de que el admin pueda reaccionar, se necesita un botón para **detener manualmente** un envío masivo en curso, sin perder los destinatarios ya enviados ni tener que empezar de cero.

Estado actual (`lib/whatsapp-masivo.ts`, ya implementado): `procesarCampana(campanaId)` recorre los destinatarios `pendiente` de una campaña en un `for` secuencial, con un delay aleatorio de 8-15s entre cada envío. No hay forma de interrumpirlo una vez lanzado — corre hasta terminar todos los destinatarios `pendiente` o hasta que el proceso Node se caiga. El botón "Reanudar" que ya existe (`app/api/admin/whatsapp/masivo/[id]/reanudar/route.ts`) vuelve a llamar a `procesarCampana`, que es idempotente: solo procesa destinatarios que sigan en `pendiente`.

## Diseño

### 1. Nuevo estatus de campaña: `pausado`

`campanas_whatsapp.estatus` pasa de admitir `('enviando','completado','error')` a admitir `('enviando','completado','error','pausado')`. Se agrega vía una nueva migración que altera el `check constraint` existente (no se puede solo agregar un valor a un check constraint de Postgres — hay que dropear y recrear el constraint).

### 2. Endpoint — detener una campaña

`POST /api/admin/whatsapp/masivo/[id]/detener`, gated con `requireAdmin()` (mismo patrón que `.../reanudar/route.ts`). Actualiza `campanas_whatsapp` a `estatus = 'pausado'`, pero **solo si el estatus actual es `'enviando'`** (`update ... set estatus='pausado' where id=? and estatus='enviando'`) — evita que un clic tardío sobrescriba una campaña que ya terminó o falló. Responde `{ success: true }` de inmediato; no toca `procesarCampana` directamente, el loop se entera solo (ver punto 3).

### 3. `procesarCampana` revisa el estatus antes de cada envío

En `lib/whatsapp-masivo.ts`, dentro del `for` que recorre destinatarios `pendiente`: **antes** de llamar a `sendWhatsAppMessage` para cada destinatario (no después), se vuelve a consultar `campanas_whatsapp.estatus` para esa campaña. Si ya no es `'enviando'` (alguien lo puso en `'pausado'`), el loop corta ahí mismo — ese destinatario y todos los que quedaban después se quedan en `pendiente` sin tocar, y la función retorna sin marcar `'completado'` (la campaña se queda tal cual en `'pausado'`).

Esto significa: el mensaje que ya se estaba enviando en el momento del clic **sí se termina de enviar** (no se puede cancelar una petición HTTP a Evolution API a medias) — el corte ocurre en el siguiente destinatario de la lista, nunca a mitad de un envío.

Para no agregar una consulta extra por iteración, esta revisión se combina con la actualización de contadores que ya corre después de cada envío (`actualizarContadores`): esa misma función, al final de cada iteración, además de recalcular `enviados`/`fallidos`, lee el `estatus` actual de la campaña y lo devuelve; el loop revisa ese valor antes de continuar a la siguiente iteración.

Si el loop termina porque ya no quedan destinatarios `pendiente` (el caso normal de hoy) y la campaña sigue en `'enviando'`, se marca `'completado'` exactamente como ahora.

### 4. Reanudar ya funciona, con un ajuste: vuelve a poner `estatus='enviando'`

`POST /api/admin/whatsapp/masivo/[id]/reanudar` no cambia su contrato (sigue llamando a `procesarCampana(id)` sin await, fire-and-forget). El cambio es dentro de `procesarCampana`: **al arrancar**, antes del loop, actualiza la campaña a `estatus='enviando'` (si no lo estaba ya) — así el polling del admin refleja de inmediato que el envío está activo de nuevo, sin esperar al primer destinatario procesado. Esto hace que "Reanudar" funcione igual para una campaña `pausado` (detenida a propósito) que para una `enviando` con destinatarios `pendiente` colgados por un reinicio del servidor (el caso que ya cubría) — mismo botón, mismo endpoint, sin acción separada (decisión explícita del usuario).

### 5. UI (`components/admin/MensajesMasivos.tsx`)

- El tipo `Progreso.estatus` y `Campana.estatus` pasan de `'enviando' | 'completado' | 'error'` a incluir `'pausado'`.
- Mientras `progreso.estatus === 'enviando'`: en vez del botón "Enviar a todos" (que ya está deshabilitado en ese estado), se muestra un botón rojo **"Detener envío"** junto a la barra de progreso. Un clic, sin diálogo de confirmación (es un botón de emergencia, debe tener cero fricción) — llama a `POST .../detener` y sigue con el polling normal (el siguiente poll reflejará `estatus: 'pausado'`).
- En el historial de campañas, el botón "Reanudar" hoy solo aparece cuando `c.estatus === 'enviando'` — se extiende para que también aparezca cuando `c.estatus === 'pausado'`.
- La tarjeta de progreso en vivo, cuando `progreso.estatus === 'pausado'`, muestra el conteo actual ("Pausado: X enviados, Y fallidos de Z") y también ofrece el botón "Reanudar" ahí mismo (no solo hay que ir al historial para reanudar la campaña que se acaba de detener).

## Manejo de errores

- Si el admin le da "Detener" a una campaña que justo en ese instante ya terminó (`completado`) o falló, el `update ... where estatus='enviando'` del endpoint simplemente no afecta ninguna fila — no rompe nada, no hay error visible más allá de que el botón no tenía nada que hacer.
- El guard de doble-clic en "Reanudar" que ya existe (deshabilitar el botón mientras la petición de esa campaña está en curso) se mantiene igual; no aplica a "Detener" porque detener no dispara un loop, solo un `update` puntual e inmediato.

## Fuera de alcance (YAGNI)

- No se agrega un límite automático de mensajes por sesión ni ajuste automático del delay — es un control manual, no una salvaguarda automática. Si el usuario quiere eso más adelante, es una mejora separada.
- No se toca la configuración de Evolution API/reconexión del número — eso lo maneja el usuario directamente.
