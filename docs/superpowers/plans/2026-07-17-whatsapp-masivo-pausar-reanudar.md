# Pausar y reanudar mensajes masivos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Detener envío" a la feature de mensajes masivos, para poder cortar una campaña en curso sin perder los destinatarios ya enviados, y reutilizar el botón "Reanudar" existente para continuarla después.

**Architecture:** Nuevo estatus de campaña `pausado`; el loop de envío (`procesarCampana`) revisa el estatus real de la campaña antes de cada mensaje y corta si ya no es `enviando`; un endpoint nuevo, minimalista, solo marca ese estatus.

**Tech Stack:** Next.js 14 App Router (route handlers), Supabase (Postgres + `@supabase/supabase-js`), TypeScript, sin framework de tests automatizados en este repo.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-17-whatsapp-masivo-pausar-reanudar-design.md` (aprobado).
- **Ningún commit se hace sin autorización explícita del usuario** — igual que el trabajo anterior de esta rama de features. Los pasos "Commit" de cada tarea documentan el mensaje a usar, no se ejecutan solos hasta recibir esa autorización.
- Este repo no tiene jest/vitest/playwright — verificación manual vía `npm run dev` + curl (rutas sin auth guard) o interacción en el navegador (rutas con `requireAdmin`).
- Casteo Supabase existente: `createAdminSupabaseClient() as any`.
- El mensaje que ya se está enviando en el momento de "Detener" **sí se termina de enviar** — no se puede cancelar una petición HTTP a Evolution API a medias. El corte ocurre antes de pasar al siguiente destinatario.
- "Reanudar" es el mismo botón/endpoint tanto para una campaña `pausado` (detenida a propósito) como para una `enviando` con destinatarios colgados por un reinicio del servidor — no se crea una acción separada.

---

### Task 1: Migración — agregar estatus `pausado`

**Files:**
- Create: `supabase/migrations/021_campana_pausar.sql`

**Interfaces:**
- Produces: `campanas_whatsapp.estatus` ahora admite `'pausado'` además de `'enviando'/'completado'/'error'`. Usado por Task 2 (loop) y Task 3 (endpoint detener).

- [ ] **Step 1: Escribir la migración**

Postgres no permite agregar un valor a un `check constraint` existente sin recrearlo — hay que dropear el constraint que Postgres nombró automáticamente (`<tabla>_<columna>_check`, confirmado en `supabase/migrations/020_campanas_whatsapp.sql` que no le puso nombre explícito) y crearlo de nuevo con el valor extra:

```sql
-- Permite pausar manualmente una campaña de mensajes masivos en curso
alter table public.campanas_whatsapp drop constraint campanas_whatsapp_estatus_check;
alter table public.campanas_whatsapp add constraint campanas_whatsapp_estatus_check
  check (estatus in ('enviando','completado','error','pausado'));
```

- [ ] **Step 2: Verificar sintaxis localmente**

Run: `node -e "require('fs').readFileSync('supabase/migrations/021_campana_pausar.sql','utf8')"`
Expected: sin salida, exit code 0.

- [ ] **Step 3: Avisar al usuario (no ejecutar la migración automáticamente)**

Decir explícitamente: *"Creé la migración `021_campana_pausar.sql`. Necesito que la corras en el SQL Editor de Supabase antes de probar el botón 'Detener envío'."* — no hay acceso a las credenciales de Supabase desde este entorno.

**Nota para quien implemente:** si el `drop constraint` falla porque el nombre real del constraint es distinto al asumido (`campanas_whatsapp_estatus_check`), consultar el nombre real con esta query y avisar al controller en vez de adivinar:
```sql
select conname from pg_constraint where conrelid = 'public.campanas_whatsapp'::regclass and contype = 'c';
```

- [ ] **Step 4: Commit (al autorizar)**

```bash
git add supabase/migrations/021_campana_pausar.sql
git commit -m "feat: agrega estatus pausado a campanas_whatsapp"
```

---

### Task 2: `procesarCampana` revisa el estatus antes de cada envío

**Files:**
- Modify: `lib/whatsapp-masivo.ts` (todo el archivo, 69 líneas actuales)

**Interfaces:**
- Consumes: `campanas_whatsapp.estatus` ahora puede ser `'pausado'` (Task 1).
- Produces: `procesarCampana(campanaId: string): Promise<void>` — misma firma pública, comportamiento nuevo: (a) al arrancar, si la campaña no está en `'enviando'`, la marca `'enviando'` antes de procesar el primer destinatario; (b) antes de cada envío, revisa el estatus actual y corta el loop sin marcar `'completado'` si ya no es `'enviando'`. Sigue siendo consumida sin cambios por Task 3 (nuevo) y por la ruta `reanudar` ya existente (`app/api/admin/whatsapp/masivo/[id]/reanudar/route.ts`, sin cambios).

- [ ] **Step 1: Reemplazar el archivo completo**

Contenido actual (para referencia — reemplazar todo el archivo):

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

Contenido nuevo (reemplaza el archivo completo):

```ts
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function delayAleatorio(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Actualiza los contadores en vivo y devuelve el estatus actual de la
// campaña — se combina en una sola llamada para no agregar un round-trip
// extra por destinatario solo para detectar si alguien le dio "Detener".
async function actualizarContadores(supabase: any, campanaId: string): Promise<string> {
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
  const { data } = await supabase
    .from('campanas_whatsapp')
    .update({ enviados: enviados ?? 0, fallidos: fallidos ?? 0 })
    .eq('id', campanaId)
    .select('estatus')
    .single()
  return data?.estatus ?? 'enviando'
}

// Recorre los destinatarios "pendiente" de una campaña, uno por uno, con un
// delay aleatorio de 8-15s entre cada envío (además del "escribiendo..." que
// sendWhatsAppMessage ya simula por mensaje) para evitar el patrón de ráfaga
// que WhatsApp asocia con campañas automatizadas. Idempotente: si no quedan
// destinatarios "pendiente" (campaña ya completada), solo re-marca completado.
// Reanudable: si la campaña estaba "pausado" (o "enviando" colgada por un
// reinicio del servidor), la vuelve a marcar "enviando" antes de procesar el
// primer destinatario. Pausable: antes de cada envío revisa el estatus real
// de la campaña — si ya no es "enviando" (alguien le dio "Detener"), corta el
// loop sin marcar "completado". El mensaje que ya se estaba enviando en ese
// instante sí se termina de mandar (no se puede cancelar una petición HTTP a
// Evolution API a medias); el corte ocurre antes del siguiente destinatario.
export async function procesarCampana(campanaId: string): Promise<void> {
  const supabase = createAdminSupabaseClient() as any

  const { data: campana } = await supabase
    .from('campanas_whatsapp')
    .select('mensaje, estatus')
    .eq('id', campanaId)
    .single()
  if (!campana) return

  if (campana.estatus !== 'enviando') {
    await supabase.from('campanas_whatsapp').update({ estatus: 'enviando' }).eq('id', campanaId)
  }

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

    const estatusActual = await actualizarContadores(supabase, campanaId)
    if (estatusActual !== 'enviando') return

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
Expected: sin errores.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add lib/whatsapp-masivo.ts
git commit -m "feat: procesarCampana revisa el estatus antes de cada envío (pausar/reanudar)"
```

---

### Task 3: Endpoint — detener una campaña

**Files:**
- Create: `app/api/admin/whatsapp/masivo/[id]/detener/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()` de `lib/supabase/guard.ts`; `createAdminSupabaseClient()` de `lib/supabase/server.ts`.
- Produces: `POST /api/admin/whatsapp/masivo/[id]/detener` → `{ success: true }`. Consumida por Task 4.

- [ ] **Step 1: Crear el endpoint**

Mismo patrón que `app/api/admin/whatsapp/masivo/[id]/reanudar/route.ts` (ya existente, sin cambios) pero en vez de relanzar `procesarCampana`, marca la campaña `pausado` con un `update` condicionado — si ya no está `enviando` (terminó, falló, o ya la habían pausado), el `update` no afecta ninguna fila y no pasa nada:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  await supabase
    .from('campanas_whatsapp')
    .update({ estatus: 'pausado' })
    .eq('id', params.id)
    .eq('estatus', 'enviando')

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verificar en el navegador (requiere sesión admin, no curl)**

Con la migración de Task 1 ya corrida, inicia sesión como admin, lanza una campaña de prueba desde "Mensajes masivos" (Task 4 debe estar implementado para tener el botón, o alternativamente dispara el POST manualmente desde la consola del navegador mientras hay una campaña `enviando`):

```js
fetch('/api/admin/whatsapp/masivo/<CAMPANA_ID>/detener', { method: 'POST' }).then(r => r.json()).then(console.log)
```
Expected: `{"success":true}`, y en el Table Editor de Supabase la fila de `campanas_whatsapp` pasa a `estatus='pausado'` (o se queda igual si ya no estaba `enviando`). Los destinatarios que faltaban se quedan en `pendiente`, no se les envía nada.

- [ ] **Step 3: Commit (al autorizar)**

```bash
git add "app/api/admin/whatsapp/masivo/[id]/detener/route.ts"
git commit -m "feat: endpoint para detener manualmente una campaña masiva"
```

---

### Task 4: UI — botón "Detener envío" y "pausado" en el historial

**Files:**
- Modify: `components/admin/MensajesMasivos.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/whatsapp/masivo/[id]/detener` (Task 3).

- [ ] **Step 1: Ampliar los tipos de estatus**

Reemplazar en ambas interfaces:

```ts
  estatus: 'enviando' | 'completado' | 'error'
```

por (en `Campana` y en `Progreso`, dos ocurrencias):

```ts
  estatus: 'enviando' | 'completado' | 'error' | 'pausado'
```

- [ ] **Step 2: Importar el ícono `Square` y agregar el estilo del botón rojo**

En el import de `lucide-react`, agregar `Square`:

```ts
import { Users, Send, Loader2, RefreshCw, Square } from 'lucide-react'
```

Después de la constante `BTN_OUTLINE`, agregar:

```ts
const BTN_DANGER = `${BTN} bg-red-600 text-white hover:bg-red-700`
```

- [ ] **Step 3: Agregar estado y función `detener`**

Después de la declaración de `reanudando`/`setReanudando`, agregar:

```ts
  // POST /detener está en vuelo — evita doble clic mientras responde
  const [deteniendo, setDeteniendo] = useState(false)
```

Después de la función `reanudar`, agregar:

```ts
  const detener = async () => {
    if (!progreso) return
    setDeteniendo(true)
    try {
      await fetch(`/api/admin/whatsapp/masivo/${progreso.id}/detener`, { method: 'POST' })
      toast('Envío detenido')
    } finally {
      setDeteniendo(false)
    }
  }
```

(El polling que ya está corriendo capta el cambio a `estatus: 'pausado'` en el siguiente tick y detiene el intervalo solo — no hace falta tocar `iniciarPolling`.)

- [ ] **Step 4: Reemplazar el botón "Enviar a todos" para que se convierta en "Detener envío" mientras hay un envío en curso**

Reemplazar:

```tsx
        <div className="flex justify-end">
          <button onClick={enviar} disabled={enviando || progreso?.estatus === 'enviando'} className={BTN_PRIMARY}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar a todos
          </button>
        </div>
```

por:

```tsx
        <div className="flex justify-end">
          {progreso?.estatus === 'enviando' ? (
            <button onClick={detener} disabled={deteniendo} className={BTN_DANGER}>
              {deteniendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Detener envío
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando} className={BTN_PRIMARY}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar a todos
            </button>
          )}
        </div>
```

- [ ] **Step 5: Mostrar el estado "pausado" en la tarjeta de progreso, con un botón "Reanudar" ahí mismo**

Reemplazar:

```tsx
        {progreso && (
          <div className="pt-2 border-t border-brand-border space-y-2">
            <div className="flex items-center justify-between text-xs font-ui text-brand-muted">
              <span>
                {progreso.estatus === 'enviando'
                  ? `Enviando ${progreso.enviados + progreso.fallidos}/${progreso.total_destinatarios}...`
                  : `Completado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`}
              </span>
            </div>
```

por:

```tsx
        {progreso && (
          <div className="pt-2 border-t border-brand-border space-y-2">
            <div className="flex items-center justify-between text-xs font-ui text-brand-muted gap-2">
              <span>
                {progreso.estatus === 'enviando'
                  ? `Enviando ${progreso.enviados + progreso.fallidos}/${progreso.total_destinatarios}...`
                  : progreso.estatus === 'pausado'
                  ? `Pausado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`
                  : `Completado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`}
              </span>
              {progreso.estatus === 'pausado' && (
                <button
                  onClick={() => reanudar(progreso.id)}
                  disabled={reanudando === progreso.id}
                  className={`${BTN_OUTLINE} flex-shrink-0`}
                >
                  {reanudando === progreso.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                  Reanudar
                </button>
              )}
            </div>
```

(El resto del bloque — la barra de progreso — no cambia.)

- [ ] **Step 6: Mostrar el botón "Reanudar" en el historial también para campañas `pausado`**

Reemplazar:

```tsx
                {c.estatus === 'enviando' ? (
```

por:

```tsx
                {(c.estatus === 'enviando' || c.estatus === 'pausado') ? (
```

- [ ] **Step 7: Verificar en el navegador**

En `/admin/whatsapp` → Mensajes masivos, lanza una campaña de prueba con al menos 2-3 destinatarios (para tener tiempo de darle clic antes de que termine, dado el delay de 8-15s entre envíos). Dale clic a "Detener envío" mientras está `enviando`.
Expected: el botón cambia de vuelta a mostrar el estado `Pausado: X enviados...` con un botón "Reanudar" junto al texto; en el historial esa campaña también muestra "Reanudar" en vez del estatus como texto plano. Dale clic a "Reanudar" (desde cualquiera de los dos lugares) y confirma que el envío continúa con los destinatarios que faltaban, sin reenviarle a los que ya habían recibido el mensaje.

- [ ] **Step 8: Commit (al autorizar)**

```bash
git add components/admin/MensajesMasivos.tsx
git commit -m "feat: botón para detener envíos masivos y reanudar campañas pausadas"
```

---

### Task 5: Verificación end-to-end

**Files:** ninguno (solo verificación manual)

- [ ] **Step 1: Flujo completo con teléfono de prueba**

Crea (o reutiliza) 3+ pedidos de prueba con teléfonos distintos en el mismo sorteo (o usa números de prueba propios). Lanza un mensaje masivo. A la mitad del envío, dale "Detener envío".
Expected: el mensaje que se estaba mandando en ese momento llega normal; los destinatarios restantes NO reciben nada; el estatus de la campaña queda `pausado`.

- [ ] **Step 2: Reanudar**

Dale "Reanudar" (desde la tarjeta de progreso o desde el historial).
Expected: el envío continúa solo con los destinatarios que faltaban (los que ya recibieron el mensaje no lo reciben otra vez), respetando el mismo delay de 8-15s, y termina en `completado`.

- [ ] **Step 3: Confirmar con el usuario antes de subir a git**

Preguntar explícitamente si quiere subir los commits de este trabajo junto con los pendientes del cambio de número de teléfono (ya acordado que se suben juntos al final).
