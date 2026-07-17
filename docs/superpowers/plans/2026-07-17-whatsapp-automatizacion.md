# Automatización WhatsApp (confirmar pago, reenviar pedido, mensajes masivos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar 3 flujos de WhatsApp sobre `sendWhatsAppMessage` (Evolution API): confirmación de pago desde el dashboard del socio, reenvío del mensaje original de un pedido, y mensajes masivos por sorteo desde el panel admin con anti-baneo (delay + dedupe por teléfono).

**Architecture:** Dos nuevos endpoints server-side reutilizables (`/api/pedidos/notificar-pago`, `/api/pedidos/reenviar`) que reconstruyen el mensaje a partir de `pedidoId` (mismo patrón que `/api/recordatorio` ya usa), y un subsistema de campañas masivas (2 tablas Supabase + `lib/whatsapp-masivo.ts` con un loop asíncrono fire-and-forget que corre en el proceso Node persistente del VPS, con progreso vía polling y un botón de "Reanudar" idempotente).

**Tech Stack:** Next.js 14 App Router (route handlers), Supabase (Postgres + `@supabase/supabase-js`), TypeScript, sin framework de tests automatizados en este repo.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-17-whatsapp-automatizacion-design.md` (aprobado).
- **Ningún commit se hace sin que el usuario lo pida explícitamente en el chat** — cada tarea termina en working tree modificado, no en commit automático. El "Step: Commit" de cada tarea de este plan es solo para que quien ejecute sepa qué mensaje usar *cuando el usuario autorice subir*; no se ejecuta `git commit` solo hasta recibir esa autorización.
- Este repo **no tiene jest/vitest/playwright configurado** (`package.json` solo tiene `next lint`). Por eso cada tarea reemplaza "run the test" por verificación manual: `npm run dev` + `curl` (para rutas sin guard de auth) o interacción en el navegador (para rutas con `requireAdmin`, que dependen de la cookie de sesión).
- Todas las rutas de WhatsApp existentes son *best-effort*: un fallo de envío nunca debe bloquear ni revertir la acción de negocio (marcar pagado, crear pedido, etc.) — seguir ese mismo patrón en todo el plan.
- Estilo de casteo Supabase existente: `createAdminSupabaseClient() as any` para evitar pelear con `types/database.types.ts` en tablas que no están en los tipos generados (patrón usado en `lib/whatsapp.ts`, `app/api/recordatorio/route.ts`).
- Mensajes en español, mismo tono/emojis que `app/api/whatsapp/route.ts` y `app/api/recordatorio/route.ts`.

---

### Task 1: Migración — tablas de campañas masivas

**Files:**
- Create: `supabase/migrations/020_campanas_whatsapp.sql`

**Interfaces:**
- Produces: tablas `public.campanas_whatsapp` (columnas: `id`, `sorteo_id`, `mensaje`, `filtro_estatus text[]`, `total_destinatarios`, `enviados`, `fallidos`, `estatus` en `('enviando','completado','error')`, `created_at`, `completed_at`) y `public.campana_whatsapp_destinatarios` (columnas: `id`, `campana_id`, `telefono`, `nombre`, `estatus` en `('pendiente','enviado','error')`, `enviado_at`), usadas por todas las tareas siguientes de la feature 3.

- [ ] **Step 1: Escribir la migración**

```sql
-- Campañas de mensajes masivos de WhatsApp (admin) y sus destinatarios
create table if not exists public.campanas_whatsapp (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id),
  mensaje text not null,
  filtro_estatus text[] not null,
  total_destinatarios int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  estatus text not null default 'enviando'
    check (estatus in ('enviando','completado','error')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.campana_whatsapp_destinatarios (
  id uuid default uuid_generate_v4() primary key,
  campana_id uuid references public.campanas_whatsapp(id) on delete cascade,
  telefono text not null,
  nombre text,
  estatus text not null default 'pendiente'
    check (estatus in ('pendiente','enviado','error')),
  enviado_at timestamptz
);

create index if not exists idx_campana_destinatarios_campana_estatus
  on public.campana_whatsapp_destinatarios (campana_id, estatus);
```

- [ ] **Step 2: Verificar sintaxis localmente**

Este proyecto aplica migraciones a mano en el SQL Editor de Supabase (mismo flujo que las migraciones 015-019 previas — no hay CLI de Supabase conectado en este entorno). Antes de pedir al usuario que la corra:

Run: `node -e "require('fs').readFileSync('supabase/migrations/020_campanas_whatsapp.sql','utf8')"`
Expected: no output, exit code 0 (confirma que el archivo se guardó sin errores de encoding).

- [ ] **Step 3: Avisar al usuario (no ejecutar la migración automáticamente)**

Al terminar esta tarea, decir explícitamente al usuario: *"Creé la migración `020_campanas_whatsapp.sql`. Necesito que la corras en el SQL Editor de Supabase antes de que pruebes la feature de mensajes masivos (las features 1 y 2 no la necesitan)."* — no hay acceso a las credenciales de Supabase desde este entorno para aplicarla directamente.

- [ ] **Step 4: Commit (al autorizar)**

```bash
git add supabase/migrations/020_campanas_whatsapp.sql
git commit -m "feat: agrega tablas de campañas de WhatsApp masivo"
```

---

### Task 2: Extraer `normalizarTelefono` en `lib/whatsapp.ts`

**Files:**
- Modify: `lib/whatsapp.ts:20-30`

**Interfaces:**
- Produces: `normalizarTelefono(numero: string): string` exportada — devuelve `''` si el número no tiene dígitos, o el número normalizado con prefijo `52` si tenía 10 dígitos. Usada por Task 8 (`app/api/admin/whatsapp/masivo/route.ts`) para deduplicar destinatarios por teléfono.
- Consumes: nada nuevo (es una extracción de lógica ya existente en `sendWhatsAppMessage`).

- [ ] **Step 1: Extraer y exportar la función**

En `lib/whatsapp.ts`, reemplazar:

```ts
  // Normalize: digits only, ensure Mexican country code (52) is present
  const digits = number.replace(/\D/g, '')
  if (!digits) return { ok: false, error: 'invalid_number' }
  const normalized = digits.length === 10 ? `52${digits}` : digits
```

por:

```ts
  const normalized = normalizarTelefono(number)
  if (!normalized) return { ok: false, error: 'invalid_number' }
```

y agregar, antes de `export async function sendWhatsAppMessage`:

```ts
// Normaliza a solo dígitos y agrega el código de país (52) si faltaba —
// compartida con la deduplicación de mensajes masivos (misma regla de
// normalización debe usarse en ambos lados o el dedupe por teléfono falla).
export function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `52${digits}` : digits
}
```

- [ ] **Step 2: Verificar que el comportamiento no cambió**

Run: `npm run dev` (déjalo corriendo en segundo plano para las siguientes tareas también)
Luego, en el panel admin → WhatsApp → "Mensaje de prueba", envía un mensaje a un número de prueba propio como ya lo hacías antes de este cambio.
Expected: el mensaje llega igual que antes (mismo comportamiento, solo se movió el código).

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add lib/whatsapp.ts
git commit -m "refactor: extrae normalizarTelefono para reutilizar en mensajes masivos"
```

---

### Task 3: Endpoint — confirmar pago envía WhatsApp (`/api/pedidos/notificar-pago`)

**Files:**
- Create: `app/api/pedidos/notificar-pago/route.ts`

**Interfaces:**
- Consumes: `sendWhatsAppMessage(number: string, text: string): Promise<{ ok: boolean; error?: string }>` de `lib/whatsapp.ts`; `createAdminSupabaseClient()` de `lib/supabase/server.ts`.
- Produces: `POST /api/pedidos/notificar-pago` con body `{ pedidoId: string }` → `{ success: true, wa: boolean }`. Consumida por Task 4.

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { pedidoId } = await req.json()
  if (!pedidoId) {
    return NextResponse.json({ error: 'Falta pedidoId' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('cliente_nombre, cliente_telefono, sorteo_id, referencia')
    .eq('id', pedidoId)
    .single()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre').eq('id', pedido.sorteo_id).single()
    : { data: null }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('numero')
    .eq('pedido_id', pedidoId)

  const numeros = (boletos ?? []).map((b: any) => b.numero).filter(Boolean).join(', ')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rifandomas.com.mx'

  const mensaje = `Hola ${pedido.cliente_nombre} 🎉, ¡hemos confirmado tu pago! ✅

*Sorteo:* ${sorteo?.nombre ?? 'tu sorteo'}
*Números:* ${numeros || 'sin números'}
*Folio:* ${pedido.referencia ?? pedidoId.slice(0, 8)}

Ya puedes validar el estatus de tus números en la página del sorteo:
👉 ${siteUrl}/sorteo/${pedido.sorteo_id}

¡Mucha suerte! 🍀 — Rifando+`.trim()

  const result = await sendWhatsAppMessage(pedido.cliente_telefono, mensaje)
  if (!result.ok) {
    console.warn('[notificar-pago] Send failed:', result.error)
  }

  // Best-effort: el pago ya fue confirmado, WhatsApp no debe bloquear el flujo
  return NextResponse.json({ success: true, wa: result.ok })
}
```

- [ ] **Step 2: Verificar con curl usando un pedido real**

En el SQL Editor de Supabase (o Table Editor), copia el `id` de cualquier pedido existente con `sorteo_id` no nulo.

Run:
```bash
curl -X POST http://localhost:3000/api/pedidos/notificar-pago \
  -H "Content-Type: application/json" \
  -d '{"pedidoId":"<PEGA_AQUI_EL_UUID>"}'
```
Expected: `{"success":true,"wa":true}` (si `whatsapp_config` está conectado) y el mensaje llega al teléfono del cliente de ese pedido. Si `wa:false`, revisa el log del servidor (`[notificar-pago] Send failed: ...`) — no debe tirar error 500.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add app/api/pedidos/notificar-pago/route.ts
git commit -m "feat: endpoint para notificar confirmación de pago por WhatsApp"
```

---

### Task 4: Disparar el endpoint desde el dashboard del socio

**Files:**
- Modify: `components/dashboard/OrdenesTable.tsx:78-92` (función `cambiarEstatus`)

**Interfaces:**
- Consumes: `POST /api/pedidos/notificar-pago` (Task 3).

- [ ] **Step 1: Llamar al endpoint cuando el pedido pasa a `pagado`**

Reemplazar:

```tsx
  const cambiarEstatus = async (id: string, estatus: 'pagado' | 'cancelado') => {
    const { error } = await sb.from('pedidos').update({ estatus }).eq('id', id)
    if (error) { toast.error('Error al actualizar el pedido'); return }

    // Sincronizar boletos: el verificador público lee boletos.estatus, no pedidos.estatus
    if (estatus === 'pagado') {
      await sb.from('boletos').update({ estatus: 'pagado' }).eq('pedido_id', id)
    } else {
```

por:

```tsx
  const cambiarEstatus = async (id: string, estatus: 'pagado' | 'cancelado') => {
    const { error } = await sb.from('pedidos').update({ estatus }).eq('id', id)
    if (error) { toast.error('Error al actualizar el pedido'); return }

    // Sincronizar boletos: el verificador público lee boletos.estatus, no pedidos.estatus
    if (estatus === 'pagado') {
      await sb.from('boletos').update({ estatus: 'pagado' }).eq('pedido_id', id)
      // Best-effort: si WhatsApp falla, el pedido ya quedó marcado como pagado
      fetch('/api/pedidos/notificar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId: id }),
      }).catch(() => {})
    } else {
```

- [ ] **Step 2: Verificar en el navegador**

Run: `npm run dev` (si no sigue corriendo de la tarea anterior).
En el dashboard del socio (`/dashboard/ordenes`), busca un pedido `pendiente` de prueba y da clic en "Marcar como pagado" desde el menú de acciones.
Expected: aparece el toast "Pedido marcado como pagado" (sin cambios visuales nuevos) y, unos segundos después, el WhatsApp de confirmación llega al teléfono de ese pedido de prueba.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add components/dashboard/OrdenesTable.tsx
git commit -m "feat: notifica por WhatsApp al confirmar el pago de un pedido"
```

---

### Task 5: Endpoint — reenviar pedido (`/api/pedidos/reenviar`)

**Files:**
- Create: `app/api/pedidos/reenviar/route.ts`

**Interfaces:**
- Consumes: `sendWhatsAppMessage` de `lib/whatsapp.ts`; `createAdminSupabaseClient()` de `lib/supabase/server.ts`.
- Produces: `POST /api/pedidos/reenviar` con body `{ pedidoId: string }` → `{ success: true }` o `{ error: string }` (500). Consumida por Task 6.

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { pedidoId } = await req.json()
  if (!pedidoId) {
    return NextResponse.json({ error: 'Falta pedidoId' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('cliente_nombre, cliente_telefono, sorteo_id, monto_total, referencia')
    .eq('id', pedidoId)
    .single()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre, fecha_sorteo, usuario_id').eq('id', pedido.sorteo_id).single()
    : { data: null }

  const { data: cuenta } = sorteo
    ? await supabase
        .from('cuentas_deposito')
        .select('banco, clabe, titular')
        .eq('usuario_id', sorteo.usuario_id)
        .eq('activo', true)
        .limit(1)
        .single()
    : { data: null }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('numero')
    .eq('pedido_id', pedidoId)

  const numeros = (boletos ?? []).map((b: any) => b.numero).filter(Boolean)
  const fechaSorteo = sorteo?.fecha_sorteo
    ? new Date(sorteo.fecha_sorteo).toLocaleDateString('es-MX')
    : 'por confirmar'

  const lineaReferencia = pedido.referencia
    ? `\n📝 Concepto/Referencia: *${pedido.referencia}*\n_Usa esta referencia al hacer tu transferencia para que podamos identificar tu pago más rápido._\n`
    : ''

  const mensaje = `Hola ${pedido.cliente_nombre} 👋, tu pedido en *Rifando+* fue registrado 🎉

*Sorteo:* ${sorteo?.nombre ?? 'tu sorteo'}
*Números:* ${numeros.join(', ') || 'sin números'}
*Fecha tentativa:* ${fechaSorteo}
*Total a pagar:* $${pedido.monto_total} MXN

Realiza tu transferencia en las próximas *48 horas*:
🏦 Banco: ${cuenta?.banco ?? 'Ver en plataforma'}
💳 CLABE: ${cuenta?.clabe ?? 'Ver en plataforma'}
👤 Titular: ${cuenta?.titular ?? 'Ver en plataforma'}
${lineaReferencia}
⚠️ Sin pago en 48 hrs los números se liberan automáticamente.
¡Mucha suerte! 🍀 — Rifando+`.trim()

  const result = await sendWhatsAppMessage(pedido.cliente_telefono, mensaje)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verificar con curl**

Run:
```bash
curl -X POST http://localhost:3000/api/pedidos/reenviar \
  -H "Content-Type: application/json" \
  -d '{"pedidoId":"<PEGA_AQUI_EL_UUID>"}'
```
Expected: `{"success":true}` y el mensaje original (banco/CLABE/números) llega al teléfono del pedido de prueba, con el mismo formato que el mensaje que se manda al crear un pedido nuevo.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add app/api/pedidos/reenviar/route.ts
git commit -m "feat: endpoint para reenviar el mensaje original de un pedido"
```

---

### Task 6: Botón "Reenviar pedido" en el dashboard del socio

**Files:**
- Modify: `components/dashboard/OrdenesTable.tsx` (imports, nueva función `reenviarPedido`, dos bloques `DropdownMenuContent` — móvil y desktop)

**Interfaces:**
- Consumes: `POST /api/pedidos/reenviar` (Task 5).

- [ ] **Step 1: Importar el ícono `Send`**

En la línea de imports de `lucide-react`, agregar `Send`:

```tsx
import { Download, Clock, MoreHorizontal, CheckCircle2, XCircle, MessageCircle, Send, User, Search, MapPin, Phone, Ticket, Hash, Tag } from 'lucide-react'
```

- [ ] **Step 2: Agregar la función `reenviarPedido`**

Justo después de la función `enviarRecordatorio` existente, agregar:

```tsx
  const reenviarPedido = async (p: Pedido) => {
    const res = await fetch('/api/pedidos/reenviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: p.id }),
    })
    if (res.ok) toast.success('Pedido reenviado por WhatsApp')
    else toast.error('No se pudo reenviar el pedido')
  }
```

- [ ] **Step 3: Agregar el botón en el dropdown móvil**

En el bloque de tarjetas móvil, dentro de `{p.estatus === 'pendiente' && (...)}` que ya contiene "Enviar recordatorio", agregar el nuevo item justo debajo:

```tsx
                          {p.estatus === 'pendiente' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => enviarRecordatorio(p)}>
                                <MessageCircle className="w-3.5 h-3.5 text-primary" />Enviar recordatorio
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => reenviarPedido(p)}>
                                <Send className="w-3.5 h-3.5 text-primary" />Reenviar pedido
                              </DropdownMenuItem>
                            </>
                          )}
```

(Este bloque aparece dos veces en el archivo — una en la tabla móvil, otra en la tabla desktop. Aplica el mismo cambio en ambas.)

- [ ] **Step 4: Verificar en el navegador**

En `/dashboard/ordenes`, en un pedido `pendiente`, abre el menú de acciones y confirma que aparece "Reenviar pedido" tanto en la vista móvil (achica la ventana) como en la de escritorio. Da clic y confirma que llega el WhatsApp y se muestra el toast "Pedido reenviado por WhatsApp".

- [ ] **Step 5: Commit (al autorizar)**

```bash
git add components/dashboard/OrdenesTable.tsx
git commit -m "feat: agrega botón para reenviar el mensaje de un pedido"
```

---

### Task 7: `lib/whatsapp-masivo.ts` — loop de procesamiento de campañas

**Files:**
- Create: `lib/whatsapp-masivo.ts`

**Interfaces:**
- Consumes: `sendWhatsAppMessage` de `lib/whatsapp.ts`; `createAdminSupabaseClient()` de `lib/supabase/server.ts`; tablas de Task 1.
- Produces: `procesarCampana(campanaId: string): Promise<void>` — recorre destinatarios `pendiente` de la campaña, envía con delay anti-baneo, actualiza contadores, y marca la campaña `completado` al terminar. Es **idempotente**: si se vuelve a llamar sobre una campaña ya procesada, no encuentra destinatarios `pendiente` y solo la vuelve a marcar `completado`. Usada por Task 8 (lanzar) y Task 10 (reanudar).

- [ ] **Step 1: Crear el módulo**

```ts
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function delayAleatorio(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function actualizarContadores(supabase: any, campanaId: string) {
  const { count: enviados } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('*', { count: 'exact', head: true })
    .eq('campana_id', campanaId)
    .eq('estatus', 'enviado')
  const { count: fallidos } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('*', { count: 'exact', head: true })
    .eq('campana_id', campanaId)
    .eq('estatus', 'error')
  await supabase
    .from('campanas_whatsapp')
    .update({ enviados: enviados ?? 0, fallidos: fallidos ?? 0 })
    .eq('id', campanaId)
}

// Recorre los destinatarios "pendiente" de una campaña, uno por uno, con un
// delay aleatorio de 8-15s entre cada envío (además del "escribiendo..." que
// sendWhatsAppMessage ya simula por mensaje) para evitar el patrón de ráfaga
// que WhatsApp asocia con campañas automatizadas. Idempotente: si no quedan
// destinatarios "pendiente" (campaña ya completada), solo re-marca completado.
export async function procesarCampana(campanaId: string): Promise<void> {
  const supabase = createAdminSupabaseClient() as any

  const { data: campana } = await supabase
    .from('campanas_whatsapp')
    .select('mensaje')
    .eq('id', campanaId)
    .single()
  if (!campana) return

  const { data: destinatarios } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('id, telefono, nombre')
    .eq('campana_id', campanaId)
    .eq('estatus', 'pendiente')
    .order('id', { ascending: true })

  for (const destinatario of destinatarios ?? []) {
    const texto = campana.mensaje.replaceAll('{nombre}', destinatario.nombre || 'ahí')
    const result = await sendWhatsAppMessage(destinatario.telefono, texto)

    await supabase
      .from('campana_whatsapp_destinatarios')
      .update({
        estatus: result.ok ? 'enviado' : 'error',
        enviado_at: result.ok ? new Date().toISOString() : null,
      })
      .eq('id', destinatario.id)

    await actualizarContadores(supabase, campanaId)
    await delayAleatorio(8000, 15000)
  }

  await supabase
    .from('campanas_whatsapp')
    .update({ estatus: 'completado', completed_at: new Date().toISOString() })
    .eq('id', campanaId)
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `lib/whatsapp-masivo.ts` (este archivo aún no se usa en ninguna ruta, así que por sí solo no puede probarse end-to-end todavía — se verifica junto con Task 8).

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add lib/whatsapp-masivo.ts
git commit -m "feat: loop de envío de campañas masivas de WhatsApp con delay anti-baneo"
```

---

### Task 8: Endpoint — crear e historial de campañas (`/api/admin/whatsapp/masivo`)

**Files:**
- Create: `app/api/admin/whatsapp/masivo/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()` de `lib/supabase/guard.ts`; `normalizarTelefono` (Task 2); `procesarCampana` (Task 7); `createAdminSupabaseClient()`.
- Produces:
  - `POST /api/admin/whatsapp/masivo` con body `{ sorteoId: string, mensaje: string, filtroEstatus: string[] }` → `{ campanaId: string, totalDestinatarios: number }`. Consumida por Task 11.
  - `GET /api/admin/whatsapp/masivo` → array de campañas (`id, sorteo_id, mensaje, total_destinatarios, enviados, fallidos, estatus, created_at, completed_at, sorteos: { nombre }`). Consumida por Task 11.

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { normalizarTelefono } from '@/lib/whatsapp'
import { procesarCampana } from '@/lib/whatsapp-masivo'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { sorteoId, mensaje, filtroEstatus } = await req.json()
  if (!sorteoId || !mensaje?.trim() || !Array.isArray(filtroEstatus) || !filtroEstatus.length) {
    return NextResponse.json(
      { error: 'Faltan parámetros: sorteoId, mensaje y filtroEstatus son requeridos' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('cliente_telefono, cliente_nombre')
    .eq('sorteo_id', sorteoId)
    .in('estatus', filtroEstatus)

  const porTelefono = new Map<string, string>()
  for (const p of pedidos ?? []) {
    const tel = normalizarTelefono(p.cliente_telefono)
    if (tel && !porTelefono.has(tel)) porTelefono.set(tel, p.cliente_nombre)
  }

  if (porTelefono.size === 0) {
    return NextResponse.json({ error: 'No hay destinatarios para ese sorteo y esos estatus' }, { status: 400 })
  }

  const { data: campana, error: campanaError } = await supabase
    .from('campanas_whatsapp')
    .insert({
      sorteo_id: sorteoId,
      mensaje,
      filtro_estatus: filtroEstatus,
      total_destinatarios: porTelefono.size,
    })
    .select('id')
    .single()

  if (campanaError || !campana) {
    return NextResponse.json({ error: 'No se pudo crear la campaña' }, { status: 500 })
  }

  const destinatariosRows = Array.from(porTelefono, ([telefono, nombre]) => ({
    campana_id: campana.id,
    telefono,
    nombre,
  }))
  await supabase.from('campana_whatsapp_destinatarios').insert(destinatariosRows)

  // Fire-and-forget: corre en segundo plano en el proceso Node del VPS.
  // No se espera (await) porque la respuesta HTTP debe volver de inmediato
  // para que el admin vea la barra de progreso sin bloquear la petición.
  procesarCampana(campana.id).catch((err) => console.error('[masivo] Error procesando campaña:', err))

  return NextResponse.json({ campanaId: campana.id, totalDestinatarios: porTelefono.size })
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { data } = await supabase
    .from('campanas_whatsapp')
    .select('id, sorteo_id, mensaje, total_destinatarios, enviados, fallidos, estatus, created_at, completed_at, sorteos(nombre)')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Verificar en el navegador (requiere sesión admin, no curl)**

Con la migración de Task 1 ya corrida en Supabase, inicia sesión como admin en `http://localhost:3000/admin`, abre las DevTools → pestaña Network, y desde la consola del navegador ejecuta:

```js
fetch('/api/admin/whatsapp/masivo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sorteoId: '<UUID_DE_UN_SORTEO_CON_PEDIDOS>', mensaje: 'Prueba {nombre}', filtroEstatus: ['pendiente','pagado'] }),
}).then(r => r.json()).then(console.log)
```
Expected: `{ campanaId: "...", totalDestinatarios: N }` con `N` igual a la cantidad de teléfonos únicos de ese sorteo con esos estatus. Espera unos segundos y revisa en el Table Editor de Supabase que `campana_whatsapp_destinatarios` tenga esas filas y que se vayan marcando `enviado` una por una (no todas de golpe).

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add app/api/admin/whatsapp/masivo/route.ts
git commit -m "feat: endpoint para crear campañas de mensajes masivos"
```

---

### Task 9: Endpoint — progreso de una campaña (`/api/admin/whatsapp/masivo/[id]`)

**Files:**
- Create: `app/api/admin/whatsapp/masivo/[id]/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()`, `createAdminSupabaseClient()`.
- Produces: `GET /api/admin/whatsapp/masivo/[id]` → `{ id, total_destinatarios, enviados, fallidos, estatus, completed_at }`. Consumida por Task 11 (polling).

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { data } = await supabase
    .from('campanas_whatsapp')
    .select('id, total_destinatarios, enviados, fallidos, estatus, completed_at')
    .eq('id', params.id)
    .single()

  if (!data) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Verificar en el navegador**

Con el `campanaId` obtenido en el Step 2 de Task 8, desde la consola del navegador (ya logueado como admin):

```js
fetch('/api/admin/whatsapp/masivo/<CAMPANA_ID>').then(r => r.json()).then(console.log)
```
Expected: los contadores `enviados`/`fallidos` suben cada vez que lo vuelves a llamar mientras la campaña sigue `enviando`, y `estatus` pasa a `completado` cuando termina.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add "app/api/admin/whatsapp/masivo/[id]/route.ts"
git commit -m "feat: endpoint de progreso de una campaña masiva"
```

---

### Task 10: Endpoint — reanudar campaña (`/api/admin/whatsapp/masivo/[id]/reanudar`)

**Files:**
- Create: `app/api/admin/whatsapp/masivo/[id]/reanudar/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()`, `procesarCampana` (Task 7).
- Produces: `POST /api/admin/whatsapp/masivo/[id]/reanudar` → `{ success: true }`. Consumida por Task 11.

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { procesarCampana } from '@/lib/whatsapp-masivo'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  procesarCampana(params.id).catch((err) => console.error('[masivo] Error reanudando campaña:', err))
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verificar en el navegador**

Deja correr una campaña de prueba, y una vez `completado`, vuelve a llamar (ya logueado como admin, desde consola):

```js
fetch('/api/admin/whatsapp/masivo/<CAMPANA_ID>/reanudar', { method: 'POST' }).then(r => r.json()).then(console.log)
```
Expected: `{ success: true }` y **no se reenvía ningún mensaje** (porque `procesarCampana` es idempotente — no hay destinatarios `pendiente`). Esto confirma que es seguro que el admin le dé clic a "Reanudar" aunque la campaña ya haya terminado.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add "app/api/admin/whatsapp/masivo/[id]/reanudar/route.ts"
git commit -m "feat: endpoint para reanudar una campaña masiva interrumpida"
```

---

### Task 11: UI — sección "Mensajes masivos" en el panel admin

**Files:**
- Create: `components/admin/MensajesMasivos.tsx`
- Modify: `app/admin/whatsapp/page.tsx` (import + render)

**Interfaces:**
- Consumes: `GET/POST /api/admin/whatsapp/masivo`, `GET /api/admin/whatsapp/masivo/[id]`, `POST /api/admin/whatsapp/masivo/[id]/reanudar` (Tasks 8-10); tabla `sorteos` vía `createClient()` de `lib/supabase/client`.

- [ ] **Step 1: Crear el componente**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Users, Send, Loader2, RefreshCw } from 'lucide-react'

interface Sorteo {
  id: string
  nombre: string
}

interface Campana {
  id: string
  sorteo_id: string
  mensaje: string
  total_destinatarios: number
  enviados: number
  fallidos: number
  estatus: 'enviando' | 'completado' | 'error'
  created_at: string
  completed_at: string | null
  sorteos: { nombre: string } | null
}

// Estado mínimo de la barra de progreso — separado de Campana porque
// GET /api/admin/whatsapp/masivo/[id] no devuelve todos los campos de Campana
// (falta mensaje/sorteo_id/sorteos), y mezclar ambos tipos con un merge
// condicionado a "si ya había progreso previo" rompe el caso de reanudar una
// campaña del historial en una pestaña recién cargada (progreso empieza null).
interface Progreso {
  id: string
  total_destinatarios: number
  enviados: number
  fallidos: number
  estatus: 'enviando' | 'completado' | 'error'
}

const ESTATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const BTN =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_PRIMARY = `${BTN} bg-primary text-white hover:bg-primary/90`
const BTN_OUTLINE = `${BTN} border border-brand-border text-brand-text hover:bg-brand-card`
const INPUT =
  'w-full border border-brand-border rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30 font-body'

export function MensajesMasivos() {
  const [sorteos, setSorteos] = useState<Sorteo[]>([])
  const [sorteoId, setSorteoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string[]>(['pendiente', 'pagado'])
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState<Progreso | null>(null)
  const [historial, setHistorial] = useState<Campana[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const cargarSorteos = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('sorteos')
        .select('id, nombre')
        .order('created_at', { ascending: false })
      setSorteos(data ?? [])
    }
    cargarSorteos()
    cargarHistorial()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const cargarHistorial = async () => {
    const res = await fetch('/api/admin/whatsapp/masivo')
    const data = await res.json()
    setHistorial(Array.isArray(data) ? data : [])
  }

  const iniciarPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/admin/whatsapp/masivo/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setProgreso(data)
      if (data.estatus !== 'enviando') {
        if (pollRef.current) clearInterval(pollRef.current)
        cargarHistorial()
      }
    }, 2500)
  }

  const toggleEstatus = (value: string) => {
    setFiltroEstatus((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const enviar = async () => {
    if (!sorteoId) { toast.error('Selecciona un sorteo'); return }
    if (!mensaje.trim()) { toast.error('Escribe un mensaje'); return }
    if (!filtroEstatus.length) { toast.error('Selecciona al menos un estatus'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/admin/whatsapp/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteoId, mensaje: mensaje.trim(), filtroEstatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo iniciar el envío')
        return
      }
      setProgreso({
        id: data.campanaId,
        total_destinatarios: data.totalDestinatarios,
        enviados: 0,
        fallidos: 0,
        estatus: 'enviando',
      })
      iniciarPolling(data.campanaId)
      toast.success(`Enviando a ${data.totalDestinatarios} destinatarios...`)
      setMensaje('')
    } catch {
      toast.error('Error al iniciar el envío')
    } finally {
      setEnviando(false)
    }
  }

  const reanudar = async (id: string) => {
    await fetch(`/api/admin/whatsapp/masivo/${id}/reanudar`, { method: 'POST' })
    iniciarPolling(id)
    toast('Reanudando envío...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-ui font-semibold text-brand-text text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Mensajes masivos
        </h2>
        <p className="text-brand-muted text-xs font-body mt-1">
          Envía un mensaje a todos los concursantes de un sorteo (un solo mensaje por teléfono, aunque tengan varios pedidos).
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">Sorteo</label>
          <select value={sorteoId} onChange={(e) => setSorteoId(e.target.value)} className={INPUT}>
            <option value="">Selecciona un sorteo...</option>
            {sorteos.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
            Enviar a pedidos con estatus
          </label>
          <div className="flex gap-4">
            {ESTATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-brand-text font-body cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroEstatus.includes(opt.value)}
                  onChange={() => toggleEstatus(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">Mensaje</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Hola {nombre}, te informamos que..."
            rows={4}
            className={`${INPUT} resize-none`}
          />
          <p className="text-xs text-brand-muted/60 font-body mt-1">
            Usa <code>{'{nombre}'}</code> para que cada quien reciba su nombre.
          </p>
        </div>

        <div className="flex justify-end">
          <button onClick={enviar} disabled={enviando || progreso?.estatus === 'enviando'} className={BTN_PRIMARY}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar a todos
          </button>
        </div>

        {progreso && (
          <div className="pt-2 border-t border-brand-border space-y-2">
            <div className="flex items-center justify-between text-xs font-ui text-brand-muted">
              <span>
                {progreso.estatus === 'enviando'
                  ? `Enviando ${progreso.enviados + progreso.fallidos}/${progreso.total_destinatarios}...`
                  : `Completado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`}
              </span>
            </div>
            <div className="w-full h-2 bg-[#161616] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${progreso.total_destinatarios ? ((progreso.enviados + progreso.fallidos) / progreso.total_destinatarios) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border">
            <h3 className="font-ui font-semibold text-brand-text text-sm">Historial de campañas</h3>
          </div>
          <div className="divide-y divide-brand-border">
            {historial.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-brand-text font-ui truncate">{c.sorteos?.nombre ?? 'Sorteo'}</p>
                  <p className="text-xs text-brand-muted font-body truncate">{c.mensaje}</p>
                  <p className="text-xs text-brand-muted/60 font-body mt-0.5">
                    {new Date(c.created_at).toLocaleString('es-MX')} · {c.enviados} enviados, {c.fallidos} fallidos de {c.total_destinatarios}
                  </p>
                </div>
                {c.estatus === 'enviando' ? (
                  <button onClick={() => reanudar(c.id)} className={`${BTN_OUTLINE} flex-shrink-0`}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reanudar
                  </button>
                ) : (
                  <span className="text-xs text-brand-muted flex-shrink-0">{c.estatus}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Renderizar el componente en la página de WhatsApp**

En `app/admin/whatsapp/page.tsx`, agregar el import junto a los demás:

```tsx
import { MensajesMasivos } from '@/components/admin/MensajesMasivos'
```

Y agregar la sección justo antes del bloque `{/* Info note */}` (después del bloque `{/* Test message — only when connected */}`):

```tsx
      {/* Mensajes masivos — only when connected */}
      {status === 'connected' && <MensajesMasivos />}

```

- [ ] **Step 3: Verificar en el navegador**

Con WhatsApp conectado (`status === 'connected'`) en `/admin/whatsapp`, confirma que aparece la sección "Mensajes masivos" debajo del mensaje de prueba. Selecciona un sorteo con pedidos de prueba (idealmente con el mismo teléfono repetido en 2 pedidos, para confirmar el dedupe), escribe un mensaje con `{nombre}`, dale a "Enviar a todos".
Expected: la barra de progreso avanza cada ~2.5s, el teléfono duplicado recibe **un solo mensaje**, y al terminar aparece en el historial de abajo con los contadores correctos.

- [ ] **Step 4: Commit (al autorizar)**

```bash
git add components/admin/MensajesMasivos.tsx app/admin/whatsapp/page.tsx
git commit -m "feat: UI de mensajes masivos en el panel admin"
```

---

### Task 12: Verificación end-to-end de las 3 features

**Files:** ninguno (solo verificación manual)

- [ ] **Step 1: Feature 1 — confirmar pago**

Crea un pedido de prueba real desde el sitio público (`/sorteo/[id]`), confirma que llega el mensaje de "pedido registrado". Luego, desde `/dashboard/ordenes`, márcalo como pagado.
Expected: llega el mensaje de "¡hemos confirmado tu pago!" con el link a `/sorteo/{id}`, y ese link efectivamente carga el `VerificadorBoleto` con los números del pedido en estatus `pagado`.

- [ ] **Step 2: Feature 2 — reenviar pedido**

En un pedido `pendiente`, da clic en "Reenviar pedido".
Expected: llega exactamente el mismo mensaje que el pedido original (banco/CLABE/números/monto), y el estatus del pedido no cambia.

- [ ] **Step 3: Feature 3 — mensajes masivos con dedupe real**

Crea 2 pedidos de prueba distintos en el mismo sorteo usando el mismo número de teléfono. Desde `/admin/whatsapp` → Mensajes masivos, selecciona ese sorteo (estatus `pendiente` marcado) y envía un mensaje.
Expected: `totalDestinatarios` cuenta 1 (no 2), y ese teléfono recibe un único mensaje.

- [ ] **Step 4: Confirmar con el usuario antes de subir a git**

Una vez validadas las 3 features, preguntar explícitamente: *"Las 3 features funcionan en local. ¿Quieres que suba estos commits a git (push a `origin/main`)?"* — no hacer `git push` sin esa confirmación puntual, incluso si los commits locales de cada tarea ya se autorizaron.
