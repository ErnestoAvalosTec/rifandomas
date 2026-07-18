# Pedidos Archivados y Reportes por Sorteo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los pedidos de sorteos finalizados o pausados quedan de solo lectura y dejan de contar en los totales globales del dashboard; una nueva sección "Reportes" (socio y admin) permite consultar los totales y el detalle de esos pedidos por sorteo.

**Architecture:** "Archivado" es un estado derivado de `sorteos.estatus`, sin columna nueva. Una política RLS **restrictiva** en `pedidos` bloquea cualquier `UPDATE` cuando el sorteo asociado no está `activo` — esto protege incluso el camino de actualización directa desde el cliente (`OrdenesTable.tsx`) sin depender de conocer las políticas permisivas ya existentes (agregadas fuera de las migraciones versionadas). Las vistas existentes ("Órdenes" de socio/admin, contadores del dashboard) se ajustan para excluir esos pedidos. Un componente de tabla compartido, sin ninguna acción, se reutiliza en las dos páginas nuevas de "Reportes".

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres RLS), TypeScript, Tailwind CSS, lucide-react.

## Global Constraints

- "Archivado" = `sorteos.estatus in ('finalizado', 'pausado')`. Si un sorteo pausado se reactiva, sus pedidos vuelven a "Órdenes" y a los contadores automáticamente — no hay paso manual de desarchivar.
- Ninguna acción (marcar pagado, cancelar, reenviar comprobante) puede ejecutarse sobre un pedido de un sorteo archivado — bloqueado a nivel base de datos (RLS) y a nivel de las rutas API que no pasan por RLS (usan `createAdminSupabaseClient`).
- Los pedidos archivados desaparecen de "Órdenes" (socio y admin) y de los contadores "Pedidos Totales"/"Ingresos Pagados" del dashboard del socio — solo se consultan desde "Reportes".
- `sorteos.estatus = 'eliminado'` está fuera de alcance (sus pedidos ya se borran en cascada al eliminar un sorteo).
- `npx tsc --noEmit` debe quedar limpio (0 errores) — línea base actual del repo.
- Sin framework de pruebas automatizadas en este repo — verificación por tipo (`tsc`) + lectura de código, sin `npm run dev` contra la base de datos de producción (no hay staging).

---

### Task 1: Política RLS restrictiva — bloquear updates a pedidos archivados

**Files:**
- Create: `supabase/migrations/024_pedidos_bloqueo_archivados.sql`

**Interfaces:**
- Produces: política `"Solo se editan pedidos de sorteos activos"` (restrictiva) sobre `public.pedidos`, `for update`.

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/024_pedidos_bloqueo_archivados.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Correrla manualmente en el SQL Editor del dashboard de Supabase (mismo procedimiento que las migraciones anteriores).

Verifica con:
```sql
select polname, polcmd, polpermissive from pg_policy
where polrelid = 'public.pedidos'::regclass;
```
Expected: aparece una fila con `polname = 'Solo se editan pedidos de sorteos activos'`, `polcmd = 'w'` (update) y `polpermissive = false`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/024_pedidos_bloqueo_archivados.sql
git commit -m "feat: política RLS restrictiva bloquea updates a pedidos de sorteos no activos"
```

---

### Task 2: Bloqueo a nivel API en rutas que notifican por WhatsApp

**Files:**
- Modify: `app/api/pedidos/notificar-pago/route.ts`
- Modify: `app/api/pedidos/reenviar/route.ts`

**Interfaces:**
- Produces: ambas rutas devuelven 400 si el sorteo del pedido no está `activo`.

Estas dos rutas usan `createAdminSupabaseClient()` (service-role), que **no** pasa por RLS — por eso necesitan su propia validación en código, independiente de la política de la Task 1.

- [ ] **Step 1: Guard en `notificar-pago`**

En `app/api/pedidos/notificar-pago/route.ts`, cambiar la consulta del sorteo (líneas 23-25) y agregar el guard justo después:

```ts
  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre, estatus').eq('id', pedido.sorteo_id).single()
    : { data: null }

  if (sorteo && sorteo.estatus !== 'activo') {
    return NextResponse.json({ error: 'Este pedido pertenece a un sorteo que ya no está activo' }, { status: 400 })
  }
```

(El resto de la función — boletos, mensaje, envío — queda igual.)

- [ ] **Step 2: Guard en `reenviar`**

En `app/api/pedidos/reenviar/route.ts`, cambiar la consulta del sorteo (líneas 23-25) y agregar el guard justo después:

```ts
  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre, fecha_sorteo, usuario_id, estatus').eq('id', pedido.sorteo_id).single()
    : { data: null }

  if (sorteo && sorteo.estatus !== 'activo') {
    return NextResponse.json({ error: 'Este pedido pertenece a un sorteo que ya no está activo' }, { status: 400 })
  }
```

(El resto de la función — cuenta de depósito, boletos, mensaje, envío — queda igual.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Commit**

```bash
git add app/api/pedidos/notificar-pago/route.ts app/api/pedidos/reenviar/route.ts
git commit -m "feat: bloquea notificaciones de WhatsApp sobre pedidos de sorteos no activos"
```

---

### Task 3: Excluir pedidos archivados de las vistas y contadores existentes

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/ordenes/page.tsx`
- Modify: `app/api/admin/ordenes/route.ts`

**Interfaces:**
- Consumes: ninguna de las tareas anteriores directamente — cambio de queries únicamente.

- [ ] **Step 1: `app/dashboard/page.tsx` — contadores**

Reemplazar las líneas 23-32:

```ts
  const sorteos = (sorteosData ?? []) as Pick<SorteoRow, 'id' | 'nombre' | 'estatus' | 'total_numeros' | 'created_at'>[]
  const sorteoIds = sorteos.map((s) => s.id)
  const sorteosRecientes = sorteos.slice(0, 5)

  const { data: pedidosData } = sorteoIds.length
    ? await supabase
        .from('pedidos')
        .select('id, monto_total, estatus, created_at')
        .in('sorteo_id', sorteoIds)
    : { data: [] }
```

por:

```ts
  const sorteos = (sorteosData ?? []) as Pick<SorteoRow, 'id' | 'nombre' | 'estatus' | 'total_numeros' | 'created_at'>[]
  const sorteosRecientes = sorteos.slice(0, 5)

  // Los pedidos de sorteos finalizados/pausados quedan archivados: no cuentan
  // en "Pedidos Totales" ni "Ingresos Pagados" (ver /dashboard/reportes).
  const sorteoIdsNoArchivados = sorteos
    .filter((s) => s.estatus !== 'finalizado' && s.estatus !== 'pausado')
    .map((s) => s.id)

  const { data: pedidosData } = sorteoIdsNoArchivados.length
    ? await supabase
        .from('pedidos')
        .select('id, monto_total, estatus, created_at')
        .in('sorteo_id', sorteoIdsNoArchivados)
    : { data: [] }
```

(El resto del archivo — `pedidos`, `totalIngresos`, `sorteoActivo`, el JSX — queda igual; `sorteosRecientes` sigue mostrando todos los sorteos, incluidos los finalizados, esa lista no cambia.)

- [ ] **Step 2: `app/dashboard/ordenes/page.tsx` — excluir de "Órdenes"**

Reemplazar la consulta de `misSorteos` (líneas 12-16):

```ts
  const { data: misSorteos } = await (admin as any)
    .from('sorteos')
    .select('id, nombre')
    .eq('usuario_id', session.user.id)
    .order('created_at', { ascending: false })
```

por:

```ts
  const { data: misSorteos } = await (admin as any)
    .from('sorteos')
    .select('id, nombre')
    .eq('usuario_id', session.user.id)
    .not('estatus', 'in', '(finalizado,pausado)')
    .order('created_at', { ascending: false })
```

(El resto del archivo no cambia — al excluir esos sorteos de `misSorteos`, la consulta de `pedidos` que ya filtra por `sorteoIds` deja de traer sus pedidos automáticamente, y el selector de sorteos en `OrdenesTable` tampoco los muestra.)

- [ ] **Step 3: `app/api/admin/ordenes/route.ts` — excluir de "Órdenes" (admin)**

Reemplazar las líneas 14-24:

```ts
    const { data: pedidos, error } = await (supabase as any)
      .from('pedidos')
      .select('*, sorteos(id, nombre)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/ordenes] pedidos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pedidos?.length) return NextResponse.json([])
```

por:

```ts
    const { data: pedidosRaw, error } = await (supabase as any)
      .from('pedidos')
      .select('*, sorteos(id, nombre, estatus)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/ordenes] pedidos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Los pedidos de sorteos finalizados/pausados quedan archivados — se
    // consultan desde /admin/reportes, no aquí.
    const pedidos = (pedidosRaw ?? []).filter(
      (p: any) => p.sorteos?.estatus !== 'finalizado' && p.sorteos?.estatus !== 'pausado'
    )

    if (!pedidos.length) return NextResponse.json([])
```

(El resto de la función — resolución de boletos, `resultado` final — queda igual, sigue usando la variable `pedidos`.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 5: Verificación manual (lectura de código, sin runtime)**

Como no hay staging, confirma leyendo los tres archivos modificados: que un sorteo con `estatus IN ('finalizado','pausado')` nunca contribuye a `pedidos`/`totalIngresos` en `app/dashboard/page.tsx`, nunca aparece en `misSorteos`/`OrdenesTable` en `app/dashboard/ordenes/page.tsx`, y sus pedidos quedan fuera del arreglo `pedidos` devuelto por `/api/admin/ordenes`.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/ordenes/page.tsx app/api/admin/ordenes/route.ts
git commit -m "feat: excluye pedidos de sorteos archivados de Órdenes y los contadores del dashboard"
```

---

### Task 4: Componente compartido de solo lectura para pedidos

**Files:**
- Create: `components/shared/PedidosSoloLectura.tsx`

**Interfaces:**
- Produces: `<PedidosSoloLectura pedidos={PedidoArchivado[]} />` y el tipo exportado `PedidoArchivado`. Usado por Task 5 (a través de `ReportesSorteosList`, Task 5) y Task 6.

- [ ] **Step 1: Crear el componente**

Crear `components/shared/PedidosSoloLectura.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

export interface PedidoArchivado {
  id: string
  cliente_nombre: string
  cliente_apellidos: string
  cliente_telefono: string
  monto_total: number
  estatus: string
  created_at: string
  referencia: string | null
  numeros: string[]
}

export function PedidosSoloLectura({ pedidos }: { pedidos: PedidoArchivado[] }) {
  if (!pedidos.length) {
    return <p className="text-sm text-brand-muted font-body py-4 text-center">Este sorteo no tuvo pedidos.</p>
  }

  return (
    <div className="space-y-2">
      {pedidos.map((p) => (
        <div
          key={p.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-brand-bg border border-brand-border"
        >
          <div className="min-w-0">
            <p className="font-ui font-semibold text-white text-sm truncate">
              {p.cliente_nombre} {p.cliente_apellidos}
              {p.referencia && <span className="text-brand-muted font-normal"> · {p.referencia}</span>}
            </p>
            <p className="text-xs text-brand-muted">
              {p.cliente_telefono}
              {p.numeros.length > 0 && <> · Núms: {p.numeros.join(', ')}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-ui font-semibold text-white text-sm">{formatCurrency(p.monto_total)}</span>
            <Badge variant={p.estatus as any}>{p.estatus}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add components/shared/PedidosSoloLectura.tsx
git commit -m "feat: componente compartido de pedidos solo lectura"
```

---

### Task 5: "Reportes" del socio

**Files:**
- Create: `components/shared/ReportesSorteosList.tsx`
- Create: `app/dashboard/reportes/page.tsx`
- Modify: `components/dashboard/Sidebar.tsx`

**Interfaces:**
- Consumes: `<PedidosSoloLectura>` y `PedidoArchivado` (Task 4).
- Produces: `<ReportesSorteosList sorteos={SorteoReporte[]} />`. Usado también por Task 6 (admin).

- [ ] **Step 1: Crear `ReportesSorteosList.tsx`**

Crear `components/shared/ReportesSorteosList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChevronDown, ChevronUp, ShoppingCart, TrendingUp } from 'lucide-react'
import { PedidosSoloLectura, type PedidoArchivado } from './PedidosSoloLectura'

export interface SorteoReporte {
  id: string
  nombre: string
  estatus: string
  fecha_sorteo: string
  organizador?: string
  pedidosTotales: number
  ingresosPagados: number
  pedidos: PedidoArchivado[]
}

export function ReportesSorteosList({ sorteos }: { sorteos: SorteoReporte[] }) {
  const [expandido, setExpandido] = useState<string | null>(null)

  if (!sorteos.length) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
        <p className="text-brand-muted font-body text-sm">No hay sorteos finalizados o pausados todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorteos.map((s) => (
        <div key={s.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandido(expandido === s.id ? null : s.id)}
            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-ui font-semibold text-white text-sm sm:text-base truncate">{s.nombre}</p>
                <Badge variant={s.estatus as any}>{s.estatus}</Badge>
              </div>
              <p className="text-xs text-brand-muted font-body">
                {formatDate(s.fecha_sorteo)}
                {s.organizador && <> · {s.organizador}</>}
              </p>
              <div className="sm:hidden flex items-center gap-3 mt-1">
                <span className="text-xs text-brand-muted">{s.pedidosTotales} pedidos</span>
                <span className="text-xs text-primary font-semibold">{formatCurrency(s.ingresosPagados)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-brand-muted flex items-center gap-1 justify-end"><ShoppingCart className="w-3 h-3" />Pedidos</p>
                <p className="font-ui font-semibold text-white">{s.pedidosTotales}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-brand-muted flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" />Ingresos</p>
                <p className="font-ui font-semibold text-primary">{formatCurrency(s.ingresosPagados)}</p>
              </div>
              {expandido === s.id ? <ChevronUp className="w-4 h-4 text-brand-muted" /> : <ChevronDown className="w-4 h-4 text-brand-muted" />}
            </div>
          </button>

          {expandido === s.id && (
            <div className="border-t border-brand-border p-4 sm:p-5">
              <PedidosSoloLectura pedidos={s.pedidos} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Crear la página del socio**

Crear `app/dashboard/reportes/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportesSorteosList, type SorteoReporte } from '@/components/shared/ReportesSorteosList'
import type { PedidoArchivado } from '@/components/shared/PedidosSoloLectura'

export default async function ReportesPage() {
  const supabase = createClient()
  const sb = supabase as any
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: sorteosData } = await sb
    .from('sorteos')
    .select('id, nombre, estatus, fecha_sorteo')
    .eq('usuario_id', session.user.id)
    .in('estatus', ['finalizado', 'pausado'])
    .order('fecha_sorteo', { ascending: false })

  const sorteos = sorteosData ?? []
  const sorteoIds = sorteos.map((s: any) => s.id)

  const { data: pedidosData } = sorteoIds.length
    ? await sb
        .from('pedidos')
        .select('id, sorteo_id, cliente_nombre, cliente_apellidos, cliente_telefono, monto_total, estatus, created_at, referencia')
        .in('sorteo_id', sorteoIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pedidos = pedidosData ?? []
  const pedidoIds = pedidos.map((p: any) => p.id)

  const { data: boletosData } = pedidoIds.length
    ? await sb.from('boletos').select('pedido_id, numero').in('pedido_id', pedidoIds)
    : { data: [] }

  const numerosPorPedido = new Map<string, string[]>()
  ;(boletosData ?? []).forEach((b: any) => {
    if (!b.pedido_id) return
    if (!numerosPorPedido.has(b.pedido_id)) numerosPorPedido.set(b.pedido_id, [])
    numerosPorPedido.get(b.pedido_id)!.push(b.numero)
  })

  const sorteosConTotales: SorteoReporte[] = sorteos.map((s: any) => {
    const pedidosDelSorteo: PedidoArchivado[] = pedidos
      .filter((p: any) => p.sorteo_id === s.id)
      .map((p: any) => ({ ...p, numeros: numerosPorPedido.get(p.id) ?? [] }))
    return {
      id: s.id,
      nombre: s.nombre,
      estatus: s.estatus,
      fecha_sorteo: s.fecha_sorteo,
      pedidosTotales: pedidosDelSorteo.length,
      ingresosPagados: pedidosDelSorteo
        .filter((p) => p.estatus === 'pagado')
        .reduce((acc, p) => acc + Number(p.monto_total), 0),
      pedidos: pedidosDelSorteo,
    }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">REPORTES</h1>
        <p className="text-brand-muted font-body text-sm">Pedidos e ingresos de tus sorteos finalizados y pausados.</p>
      </div>
      <ReportesSorteosList sorteos={sorteosConTotales} />
    </div>
  )
}
```

- [ ] **Step 3: Agregar "Reportes" al sidebar del socio**

En `components/dashboard/Sidebar.tsx`, agregar `BarChart3` al import de iconos (línea 8-11):

```ts
import {
  LayoutDashboard, Ticket, Plus, ShoppingCart, Settings,
  LogOut, Menu, X, ChevronRight, MessageSquare, BarChart3,
} from 'lucide-react'
```

Y agregar el item al arreglo `NAV_ITEMS` (líneas 13-20), justo después de `/dashboard/ordenes`:

```ts
const NAV_ITEMS = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Inicio',        exact: true },
  { href: '/dashboard/sorteos',   icon: Ticket,          label: 'Mis Sorteos' },
  { href: '/dashboard/sorteos/nuevo', icon: Plus,        label: 'Crear Sorteo' },
  { href: '/dashboard/ordenes',   icon: ShoppingCart,    label: 'Órdenes' },
  { href: '/dashboard/reportes',  icon: BarChart3,       label: 'Reportes' },
  { href: '/dashboard/preguntas', icon: MessageSquare,   label: 'Preguntas' },
  { href: '/dashboard/configuracion', icon: Settings,    label: 'Configuración' },
]
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 5: Verificación manual en el navegador**

`npm run dev` → iniciar sesión como socio con al menos un sorteo `finalizado` o `pausado` que tenga pedidos:
1. "Reportes" aparece en el sidebar.
2. La página lista ese sorteo con su N° de pedidos e ingresos pagados correctos (compáralos contra lo que veías antes en "Órdenes"/dashboard antes de este cambio).
3. Click en la fila expande el detalle de sus pedidos, sin ningún botón de acción.
4. Un sorteo `activo` normal NO aparece en "Reportes".

- [ ] **Step 6: Commit**

```bash
git add components/shared/ReportesSorteosList.tsx app/dashboard/reportes/page.tsx components/dashboard/Sidebar.tsx
git commit -m "feat: sección Reportes en el dashboard del socio"
```

---

### Task 6: "Reportes" del admin

**Files:**
- Create: `app/admin/reportes/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `<ReportesSorteosList>` (Task 5).

`app/admin/layout.tsx` ya protege todas las rutas `/admin/*` (redirige a `/dashboard` si el usuario no es admin), así que esta página puede ser un server component que use `createAdminSupabaseClient()` directamente — no hace falta una ruta API nueva.

- [ ] **Step 1: Crear la página de admin**

Crear `app/admin/reportes/page.tsx`:

```tsx
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { ReportesSorteosList, type SorteoReporte } from '@/components/shared/ReportesSorteosList'
import type { PedidoArchivado } from '@/components/shared/PedidosSoloLectura'

export default async function AdminReportesPage() {
  const admin = createAdminSupabaseClient() as any

  const { data: sorteosData } = await admin
    .from('sorteos')
    .select('id, nombre, estatus, fecha_sorteo, perfiles(nombre, apellidos)')
    .in('estatus', ['finalizado', 'pausado'])
    .order('fecha_sorteo', { ascending: false })

  const sorteos = sorteosData ?? []
  const sorteoIds = sorteos.map((s: any) => s.id)

  const { data: pedidosData } = sorteoIds.length
    ? await admin
        .from('pedidos')
        .select('id, sorteo_id, cliente_nombre, cliente_apellidos, cliente_telefono, monto_total, estatus, created_at, referencia')
        .in('sorteo_id', sorteoIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pedidos = pedidosData ?? []
  const pedidoIds = pedidos.map((p: any) => p.id)

  // Boletos vía pedido_boletos con fallback a boletos.pedido_id — mismo
  // patrón que app/api/admin/ordenes/route.ts para datos legacy.
  const { data: pedidoBoletos } = pedidoIds.length
    ? await admin.from('pedido_boletos').select('pedido_id, boletos(numero)').in('pedido_id', pedidoIds)
    : { data: [] }

  const numerosPorPedido = new Map<string, string[]>()
  if (pedidoBoletos?.length) {
    for (const pb of pedidoBoletos) {
      if (!numerosPorPedido.has(pb.pedido_id)) numerosPorPedido.set(pb.pedido_id, [])
      if (pb.boletos?.numero) numerosPorPedido.get(pb.pedido_id)!.push(pb.boletos.numero)
    }
  } else if (pedidoIds.length) {
    const { data: boletosDirectos } = await admin.from('boletos').select('pedido_id, numero').in('pedido_id', pedidoIds)
    for (const b of boletosDirectos ?? []) {
      if (!numerosPorPedido.has(b.pedido_id)) numerosPorPedido.set(b.pedido_id, [])
      numerosPorPedido.get(b.pedido_id)!.push(b.numero)
    }
  }

  const sorteosConTotales: SorteoReporte[] = sorteos.map((s: any) => {
    const pedidosDelSorteo: PedidoArchivado[] = pedidos
      .filter((p: any) => p.sorteo_id === s.id)
      .map((p: any) => ({ ...p, numeros: numerosPorPedido.get(p.id) ?? [] }))
    return {
      id: s.id,
      nombre: s.nombre,
      estatus: s.estatus,
      fecha_sorteo: s.fecha_sorteo,
      organizador: s.perfiles ? `${s.perfiles.nombre} ${s.perfiles.apellidos}` : undefined,
      pedidosTotales: pedidosDelSorteo.length,
      ingresosPagados: pedidosDelSorteo
        .filter((p) => p.estatus === 'pagado')
        .reduce((acc, p) => acc + Number(p.monto_total), 0),
      pedidos: pedidosDelSorteo,
    }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-brand-text tracking-wide">REPORTES</h1>
        <p className="text-brand-muted font-body text-sm">Pedidos e ingresos de todos los sorteos finalizados y pausados.</p>
      </div>
      <ReportesSorteosList sorteos={sorteosConTotales} />
    </div>
  )
}
```

- [ ] **Step 2: Agregar "Reportes" al sidebar de admin**

En `components/admin/AdminSidebar.tsx`, agregar `BarChart3` al import de iconos (líneas 9-13):

```ts
import {
  Ticket, LayoutDashboard, Users, LogOut, ShoppingCart,
  ImageIcon, Palette, MessageCircle, Menu, X, ChevronRight, MessageSquare,
  Images, BarChart3,
} from 'lucide-react'
```

Y agregar el item al arreglo `ADMIN_NAV` (líneas 15-25), justo después de `/admin/ordenes`:

```ts
const ADMIN_NAV = [
  { href: '/admin',              label: 'Panel',      icon: LayoutDashboard, exact: true },
  { href: '/admin/sorteos',      label: 'Sorteos',    icon: Ticket },
  { href: '/admin/ordenes',      label: 'Órdenes',    icon: ShoppingCart },
  { href: '/admin/reportes',     label: 'Reportes',   icon: BarChart3 },
  { href: '/admin/usuarios',     label: 'Usuarios',   icon: Users },
  { href: '/admin/preguntas',    label: 'Preguntas',  icon: MessageSquare },
  { href: '/admin/hero',         label: 'Hero',       icon: ImageIcon },
  { href: '/admin/portadas',     label: 'Portadas',   icon: Images },
  { href: '/admin/marca',        label: 'Marca',      icon: Palette },
  { href: '/admin/whatsapp',     label: 'WhatsApp',   icon: MessageCircle },
]
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Verificación manual en el navegador**

`npm run dev` → iniciar sesión como admin:
1. "Reportes" aparece en el sidebar de admin.
2. La página lista TODOS los sorteos finalizados/pausados de TODOS los organizadores, cada uno con el nombre del organizador visible.
3. Los totales coinciden con los que se veían antes en `/admin/ordenes` para esos sorteos (antes de excluirlos ahí en la Task 3).
4. Expandir una fila muestra el detalle de sus pedidos sin botones de acción.

- [ ] **Step 5: Commit**

```bash
git add app/admin/reportes/page.tsx components/admin/AdminSidebar.tsx
git commit -m "feat: sección Reportes en el panel admin"
```
