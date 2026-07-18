# Finalizar Sorteo y Publicar Ganadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin o socio dueño finalicen un sorteo, declaren ganadores por lugar premiado con evidencia visual, y que el sitio público muestre los sorteos finalizados (con sus ganadores) en modo solo lectura.

**Architecture:** Nueva tabla `sorteo_ganadores` (uno por lugar premiado). Un guard compartido `requireSorteoAccess` autoriza a admin o al dueño del sorteo contra dos rutas API nuevas (`/api/sorteos/[id]/finalizar`, `/api/sorteos/[id]/ganadores`) usadas tanto por el panel admin como por "Mis sorteos". Un componente cliente compartido `GanadoresManager` (subida de evidencia directo a Supabase Storage, igual que `SorteoForm`) declara/edita ganadores desde ambos paneles. En el sitio público, `SorteoCard` gana un modo `finalizado` reutilizado tanto en la página de detalle como en la nueva sección "Sorteos Finalizados" del home.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Auth Helpers + Storage), TypeScript, Tailwind CSS, react-hook-form/zod (no aplica aquí), sonner (toasts), lucide-react (iconos). Sin framework de testing — la verificación de cada tarea es `npx tsc --noEmit` + verificación manual (no hay jest/vitest/playwright instalados en el repo).

## Global Constraints

- Un ganador declarado por lugar premiado como máximo (`unique (sorteo_id, premio_id)` en `sorteo_ganadores`).
- Solo se puede finalizar un sorteo desde `estatus = 'activo'`.
- Declarar/editar un ganador exige número de boleto + al menos 1 imagen de evidencia juntos; ninguno de los dos es opcional por separado.
- El número de boleto ganador debe corresponder a un boleto `pagado` de ese sorteo (respetando el padding `es_loteria` 00.. vs 01..), si no, error.
- Un ganador ya declarado se puede editar/corregir en cualquier momento (admin o socio dueño) — nunca queda bloqueado.
- La finalización es independiente de declarar ganadores: se puede finalizar sin ninguno declarado y completarlos después, en cualquier orden de lugares.
- El nombre público del ganador es "primer nombre + primer apellido" — nunca el nombre completo.
- Página pública de un sorteo finalizado: sin compra, sin nuevas preguntas, sin verificador de boletos. Las preguntas ya aprobadas se quedan visibles como contenido informativo.
- Fuera de alcance: notificaciones automáticas del resultado, edición de datos del sorteo/premios tras finalizar, paginación de la sección de finalizados en home.
- `npx tsc --noEmit` está limpio (0 errores) en el estado actual del repo — es la línea base contra la que se compara cada tarea.

---

### Task 1: Migración de base de datos, bucket de Storage y tipos

**Files:**
- Create: `supabase/migrations/022_sorteo_ganadores.sql`
- Modify: `types/database.types.ts:254-255` (agregar bloque `sorteo_ganadores` dentro de `Tables`, después de `cuentas_deposito`)

**Interfaces:**
- Produces: tabla `public.sorteo_ganadores` con columnas `id, sorteo_id, premio_id, pedido_id, boleto_id, numero_ganador, evidencia_urls, declarado_por, created_at, updated_at`, constraint `unique (sorteo_id, premio_id)`. Política RLS nueva en `sorteos`: `estatus = 'finalizado'` es público (select). Bucket de Storage `evidencias-sorteo` (público, creado manualmente).

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/022_sorteo_ganadores.sql`:

```sql
-- Ganadores declarados por lugar premiado de un sorteo finalizado.
create table public.sorteo_ganadores (
  id uuid default uuid_generate_v4() primary key,
  sorteo_id uuid references public.sorteos(id) on delete cascade not null,
  premio_id uuid references public.premios(id) on delete cascade not null,
  pedido_id uuid references public.pedidos(id) not null,
  boleto_id uuid references public.boletos(id) not null,
  numero_ganador text not null,
  evidencia_urls text[] not null default '{}',
  declarado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (sorteo_id, premio_id)
);

-- RLS habilitado, sin políticas: solo el cliente con service-role (rutas API)
-- lee/escribe esta tabla. La página pública consulta vía createAdminSupabaseClient()
-- igual que ya hace con "perfiles" para el organizador, así que no hace falta
-- una política de lectura pública aquí.
alter table public.sorteo_ganadores enable row level security;

-- Hasta ahora "sorteos" solo exponía estatus='activo' al público. Los sorteos
-- finalizados también deben ser visibles (página de detalle + grid del home).
create policy "Sorteos finalizados son públicos"
  on public.sorteos for select
  using (estatus = 'finalizado');
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Esta migración no se aplica sola (el repo no tiene Supabase CLI configurado para push automático — todas las anteriores se corrieron manualmente). Abre el SQL Editor del dashboard de Supabase del proyecto y pega el contenido completo de `022_sorteo_ganadores.sql`, luego ejecútalo.

Verifica con:
```sql
select column_name from information_schema.columns where table_name = 'sorteo_ganadores';
```
Expected: 10 filas (`id, sorteo_id, premio_id, pedido_id, boleto_id, numero_ganador, evidencia_urls, declarado_por, created_at, updated_at`).

- [ ] **Step 3: Crear el bucket de Storage `evidencias-sorteo`**

En el dashboard de Supabase → Storage → New bucket:
- Nombre: `evidencias-sorteo`
- Público: sí (mismo criterio que `premios`, `hero-slides`, `portadas-predeterminadas`)

Si al probar la subida de evidencia (Task 5) da error de permisos, revisa Storage → Policies del bucket `premios` (que ya funciona para organizadores no-admin) y replica la misma política de INSERT para `evidencias-sorteo`.

- [ ] **Step 4: Agregar el tipo `sorteo_ganadores` a `types/database.types.ts`**

En `types/database.types.ts`, dentro de `Tables`, justo después del bloque `cuentas_deposito` (que cierra en la línea 254) y antes del `}` que cierra `Tables` (línea 255), insertar:

```ts
      sorteo_ganadores: {
        Row: {
          id: string
          sorteo_id: string
          premio_id: string
          pedido_id: string
          boleto_id: string
          numero_ganador: string
          evidencia_urls: string[]
          declarado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sorteo_id: string
          premio_id: string
          pedido_id: string
          boleto_id: string
          numero_ganador: string
          evidencia_urls?: string[]
          declarado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero_ganador?: string
          evidencia_urls?: string[]
          declarado_por?: string | null
          updated_at?: string
        }
      }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (0 errores).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/022_sorteo_ganadores.sql types/database.types.ts
git commit -m "feat: tabla sorteo_ganadores y política pública para sorteos finalizados"
```

---

### Task 2: Guard compartido `requireSorteoAccess`

**Files:**
- Modify: `lib/supabase/guard.ts`

**Interfaces:**
- Produces: `requireSorteoAccess(sorteoId: string): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }>` — autoriza si el usuario es admin o es `sorteos.usuario_id`. Usado por las rutas de Task 3 y 4.

- [ ] **Step 1: Agregar la función al guard**

En `lib/supabase/guard.ts`, agregar al final del archivo (después de `requireAdmin`):

```ts
export async function requireSorteoAccess(
  sorteoId: string
): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }> {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { userId: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'admin') {
    return { userId: user.id, error: null }
  }

  const { data: sorteo } = await (supabase as any)
    .from('sorteos')
    .select('usuario_id')
    .eq('id', sorteoId)
    .single()

  if (sorteo?.usuario_id === user.id) {
    return { userId: user.id, error: null }
  }

  return { userId: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/guard.ts
git commit -m "feat: guard requireSorteoAccess (admin o dueño del sorteo)"
```

---

### Task 3: Endpoint `POST /api/sorteos/[id]/finalizar`

**Files:**
- Create: `app/api/sorteos/[id]/finalizar/route.ts`

**Interfaces:**
- Consumes: `requireSorteoAccess(sorteoId)` de Task 2.
- Produces: `POST /api/sorteos/:id/finalizar` → `{ ok: true }` en éxito, `{ error: string }` en fallo. Usado por Task 6 y Task 7.

- [ ] **Step 1: Crear la ruta**

Crear `app/api/sorteos/[id]/finalizar/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireSorteoAccess } from '@/lib/supabase/guard'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const supabase = createAdminSupabaseClient() as any

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('estatus')
    .eq('id', params.id)
    .single()

  if (!sorteo) {
    return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
  }
  if (sorteo.estatus !== 'activo') {
    return NextResponse.json({ error: 'Solo se puede finalizar un sorteo activo' }, { status: 400 })
  }

  const { error } = await supabase
    .from('sorteos')
    .update({ estatus: 'finalizado' })
    .eq('id', params.id)

  if (error) {
    console.error('[finalizar-sorteo] update:', error)
    return NextResponse.json({ error: 'Error al finalizar el sorteo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Verificación manual**

Con el servidor corriendo (`npm run dev`) y sesión iniciada en el navegador como admin o como el dueño de un sorteo `activo`, copia la cookie de sesión y prueba:

```bash
curl -X POST http://localhost:3000/api/sorteos/<ID_DE_UN_SORTEO_ACTIVO>/finalizar \
  -H "Cookie: <cookie de la sesión del navegador>"
```
Expected: `{"ok":true}`. Repetir la misma llamada de nuevo debe dar `{"error":"Solo se puede finalizar un sorteo activo"}` (ya quedó en `finalizado`). Sin cookie de sesión debe dar 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/sorteos/[id]/finalizar/route.ts
git commit -m "feat: endpoint para finalizar un sorteo"
```

---

### Task 4: Endpoints `GET`/`POST /api/sorteos/[id]/ganadores`

**Files:**
- Create: `app/api/sorteos/[id]/ganadores/route.ts`

**Interfaces:**
- Consumes: `requireSorteoAccess(sorteoId)` de Task 2.
- Produces:
  - `GET /api/sorteos/:id/ganadores` → `SorteoGanadorRow[]` (filas crudas de `sorteo_ganadores`).
  - `POST /api/sorteos/:id/ganadores` body `{ premioId: string, numeroGanador: string, evidenciaUrls: string[] }` → `{ ok: true }` o `{ error: string }`.
  - Usado por `GanadoresManager` (Task 5).

- [ ] **Step 1: Crear la ruta**

Crear `app/api/sorteos/[id]/ganadores/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireSorteoAccess } from '@/lib/supabase/guard'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const supabase = createAdminSupabaseClient() as any
  const { data, error } = await supabase
    .from('sorteo_ganadores')
    .select('*')
    .eq('sorteo_id', params.id)

  if (error) {
    console.error('[GET ganadores]:', error)
    return NextResponse.json({ error: 'Error al cargar los ganadores' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const { premioId, numeroGanador, evidenciaUrls } = await req.json()

  if (!premioId || !numeroGanador?.trim() || !Array.isArray(evidenciaUrls) || evidenciaUrls.length === 0) {
    return NextResponse.json({ error: 'Falta el número de boleto ganador o la evidencia' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('estatus, total_numeros, es_loteria')
    .eq('id', params.id)
    .single()

  if (!sorteo) {
    return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
  }
  if (sorteo.estatus !== 'finalizado') {
    return NextResponse.json({ error: 'El sorteo debe estar finalizado para declarar ganadores' }, { status: 400 })
  }

  const digits = sorteo.es_loteria
    ? Math.round(Math.log10(sorteo.total_numeros))
    : String(sorteo.total_numeros).length
  const numeroNormalizado = String(numeroGanador).trim().padStart(digits, '0')

  const { data: boleto } = await supabase
    .from('boletos')
    .select('id, estatus, pedido_id')
    .eq('sorteo_id', params.id)
    .eq('numero', numeroNormalizado)
    .maybeSingle()

  if (!boleto || boleto.estatus !== 'pagado' || !boleto.pedido_id) {
    return NextResponse.json(
      { error: `El boleto #${numeroNormalizado} no tiene un pedido pagado asociado` },
      { status: 400 }
    )
  }

  const { error: upsertError } = await supabase
    .from('sorteo_ganadores')
    .upsert(
      {
        sorteo_id: params.id,
        premio_id: premioId,
        pedido_id: boleto.pedido_id,
        boleto_id: boleto.id,
        numero_ganador: numeroNormalizado,
        evidencia_urls: evidenciaUrls,
        declarado_por: access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sorteo_id,premio_id' }
    )

  if (upsertError) {
    console.error('[POST ganadores] upsert:', upsertError)
    return NextResponse.json({ error: 'Error al guardar el ganador' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Verificación manual**

Con un sorteo ya `finalizado` (de Task 3) y un boleto `pagado` conocido de ese sorteo:

```bash
curl -X POST http://localhost:3000/api/sorteos/<ID_SORTEO>/ganadores \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookie de sesión>" \
  -d '{"premioId":"<ID_PREMIO_LUGAR_1>","numeroGanador":"<NUMERO_PAGADO>","evidenciaUrls":["https://example.com/foo.jpg"]}'
```
Expected: `{"ok":true}`.

```bash
curl http://localhost:3000/api/sorteos/<ID_SORTEO>/ganadores -H "Cookie: <cookie de sesión>"
```
Expected: array con 1 objeto, `numero_ganador` normalizado y `evidencia_urls: ["https://example.com/foo.jpg"]`.

Probar con un número que no existe o no está pagado → `400` con mensaje `"El boleto #... no tiene un pedido pagado asociado"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/sorteos/[id]/ganadores/route.ts
git commit -m "feat: endpoints para declarar y consultar ganadores de un sorteo"
```

---

### Task 5: Componente compartido `GanadoresManager`

**Files:**
- Create: `components/shared/GanadoresManager.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/sorteos/[id]/ganadores` (Task 4), bucket `evidencias-sorteo` (Task 1), `createClient` de `@/lib/supabase/client`.
- Produces: `<GanadoresManager sorteoId={string} open={boolean} onClose={() => void} />`. Usado por Task 6 (admin) y Task 7 (dashboard).

- [ ] **Step 1: Crear el componente**

Crear `components/shared/GanadoresManager.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, X, CheckCircle2 } from 'lucide-react'

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }
const MAX_EVIDENCIAS = 6

interface PremioLocal {
  id: string
  lugar: number
  nombre: string
}

interface GanadorLocal {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
}

interface GanadorDraft {
  numeroGanador: string
  evidenciaUrls: string[]
}

export function GanadoresManager({ sorteoId, open, onClose }: { sorteoId: string; open: boolean; onClose: () => void }) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(true)
  const [premios, setPremios] = useState<PremioLocal[]>([])
  const [drafts, setDrafts] = useState<Record<string, GanadorDraft>>({})
  const [guardadoIds, setGuardadoIds] = useState<Set<string>>(new Set())
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return

    const cargar = async () => {
      setCargando(true)
      const [{ data: premiosData }, resGanadores] = await Promise.all([
        (supabase as any).from('premios').select('id, lugar, nombre').eq('sorteo_id', sorteoId).order('lugar', { ascending: true }),
        fetch(`/api/sorteos/${sorteoId}/ganadores`),
      ])
      const ganadoresData: GanadorLocal[] = resGanadores.ok ? await resGanadores.json() : []

      const draftsIniciales: Record<string, GanadorDraft> = {}
      const guardados = new Set<string>()
      ;(premiosData ?? []).forEach((p: PremioLocal) => {
        const existente = ganadoresData.find((g) => g.premio_id === p.id)
        draftsIniciales[p.id] = {
          numeroGanador: existente?.numero_ganador ?? '',
          evidenciaUrls: existente?.evidencia_urls ?? [],
        }
        if (existente) guardados.add(p.id)
      })

      setPremios(premiosData ?? [])
      setDrafts(draftsIniciales)
      setGuardadoIds(guardados)
      setCargando(false)
    }

    cargar()
  }, [open, sorteoId])

  const subirEvidencia = async (premioId: string, files: FileList) => {
    const actual = drafts[premioId]?.evidenciaUrls ?? []
    const disponibles = MAX_EVIDENCIAS - actual.length
    if (disponibles <= 0) { toast.error(`Máximo ${MAX_EVIDENCIAS} imágenes de evidencia`); return }

    setSubiendo((prev) => ({ ...prev, [premioId]: true }))
    const nuevasUrls: string[] = []
    for (const file of Array.from(files).slice(0, disponibles)) {
      const ext = file.name.split('.').pop()
      const path = `${sorteoId}/${premioId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { data, error } = await supabase.storage.from('evidencias-sorteo').upload(path, file, { upsert: true })
      if (error) { toast.error(`Error al subir ${file.name}`); continue }
      const { data: { publicUrl } } = supabase.storage.from('evidencias-sorteo').getPublicUrl(data.path)
      nuevasUrls.push(publicUrl)
    }

    if (nuevasUrls.length) {
      setDrafts((prev) => ({
        ...prev,
        [premioId]: { ...prev[premioId], evidenciaUrls: [...(prev[premioId]?.evidenciaUrls ?? []), ...nuevasUrls] },
      }))
    }
    setSubiendo((prev) => ({ ...prev, [premioId]: false }))
  }

  const quitarEvidencia = (premioId: string, url: string) => {
    setDrafts((prev) => ({
      ...prev,
      [premioId]: { ...prev[premioId], evidenciaUrls: prev[premioId].evidenciaUrls.filter((u) => u !== url) },
    }))
  }

  const guardarGanador = async (premioId: string) => {
    const draft = drafts[premioId]
    if (!draft?.numeroGanador.trim()) { toast.error('Ingresa el número de boleto ganador'); return }
    if (!draft.evidenciaUrls.length) { toast.error('Sube al menos una imagen de evidencia'); return }

    setGuardando((prev) => ({ ...prev, [premioId]: true }))
    const res = await fetch(`/api/sorteos/${sorteoId}/ganadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premioId, numeroGanador: draft.numeroGanador.trim(), evidenciaUrls: draft.evidenciaUrls }),
    })
    const json = await res.json()
    setGuardando((prev) => ({ ...prev, [premioId]: false }))
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar el ganador'); return }
    setGuardadoIds((prev) => new Set(prev).add(premioId))
    toast.success('Ganador guardado')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar ganadores</DialogTitle>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-brand-muted py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />Cargando premios...
          </div>
        ) : (
          <div className="space-y-5">
            {premios.map((premio) => {
              const draft = drafts[premio.id] ?? { numeroGanador: '', evidenciaUrls: [] }
              const declarado = guardadoIds.has(premio.id)
              return (
                <div key={premio.id} className="rounded-xl border border-brand-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-ui font-semibold text-sm text-brand-text">
                      {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}° Premio`} — {premio.nombre}
                    </p>
                    {declarado ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-ui font-semibold text-green-400">
                        <CheckCircle2 className="w-3 h-3" />Declarado
                      </span>
                    ) : (
                      <span className="text-[10px] font-ui font-semibold text-brand-muted">Pendiente</span>
                    )}
                  </div>

                  <Input
                    placeholder="Número de boleto ganador (ej. 0042)"
                    value={draft.numeroGanador}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [premio.id]: { ...prev[premio.id], numeroGanador: e.target.value } }))
                    }
                  />

                  <div className="flex flex-wrap gap-2">
                    {draft.evidenciaUrls.map((url) => (
                      <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-border">
                        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => quitarEvidencia(premio.id, url)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border border-dashed border-brand-border flex items-center justify-center cursor-pointer text-brand-muted hover:text-brand-text">
                      {subiendo[premio.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && subirEvidencia(premio.id, e.target.files)}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" disabled={guardando[premio.id]} onClick={() => guardarGanador(premio.id)}>
                      {guardando[premio.id] && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      {declarado ? 'Actualizar ganador' : 'Guardar ganador'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add components/shared/GanadoresManager.tsx
git commit -m "feat: componente compartido para declarar/editar ganadores"
```

(La verificación visual de este componente se hace en Task 6, cuando queda montado en una página real.)

---

### Task 6: UI Admin — Finalizar y Gestionar ganadores

**Files:**
- Modify: `app/admin/sorteos/page.tsx`

**Interfaces:**
- Consumes: `POST /api/sorteos/[id]/finalizar` (Task 3), `<GanadoresManager>` (Task 5).

- [ ] **Step 1: Agregar imports y estado nuevo**

En `app/admin/sorteos/page.tsx`, modificar el import de iconos (línea 9-12) agregando `Trophy`:

```ts
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Pencil,
  PauseCircle, Trash2, PlayCircle, Plus, Loader2, Tag, MoreHorizontal, Facebook, Trophy,
} from 'lucide-react'
```

Agregar el import del componente compartido, después del import de `Database` (línea 15):

```ts
import { GanadoresManager } from '@/components/shared/GanadoresManager'
```

Agregar estado nuevo, después de la declaración de `accionPendiente`/`motivoAccion` (línea 60):

```ts
  const [finalizarPendiente, setFinalizarPendiente] = useState<string | null>(null)
  const [finalizando, setFinalizando]               = useState<string | null>(null)
  const [ganadoresAbierto, setGanadoresAbierto]      = useState<string | null>(null)
```

- [ ] **Step 2: Agregar el handler `finalizar`**

Después del handler `reactivar` (línea 156-161), agregar:

```ts
  const finalizar = async (id: string) => {
    setFinalizando(id)
    const res = await fetch(`/api/sorteos/${id}/finalizar`, { method: 'POST' })
    const json = await res.json()
    setFinalizando(null)
    if (!res.ok) { toast.error(json.error ?? 'Error al finalizar el sorteo'); return }
    toast.success('Sorteo finalizado')
    setSorteos((prev) => prev.filter((s) => s.id !== id))
    setFinalizarPendiente(null)
  }
```

- [ ] **Step 3: Agregar el botón "Finalizar" en las acciones de escritorio**

Justo después del bloque `{s.estatus === 'activo' && (...)}` que muestra "Publicar en Facebook" (líneas 267-272), agregar:

```tsx
                  {s.estatus === 'activo' && (
                    <Button size="sm" variant="secondary" onClick={() => setFinalizarPendiente(s.id)} className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400">
                      <Trophy className="w-3.5 h-3.5" />Finalizar
                    </Button>
                  )}
                  {s.estatus === 'finalizado' && (
                    <Button size="sm" variant="secondary" onClick={() => setGanadoresAbierto(s.id)} className="gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
                    </Button>
                  )}
```

- [ ] **Step 4: Agregar las mismas acciones al dropdown móvil**

Dentro de `<DropdownMenuContent>`, justo después del bloque `{s.estatus === 'activo' && (...)}` de "Publicar en Facebook" (líneas 319-324), agregar:

```tsx
                      {s.estatus === 'activo' && (
                        <DropdownMenuItem onClick={() => setFinalizarPendiente(s.id)}>
                          <Trophy className="w-3.5 h-3.5 text-blue-400" />Finalizar
                        </DropdownMenuItem>
                      )}
                      {s.estatus === 'finalizado' && (
                        <DropdownMenuItem onClick={() => setGanadoresAbierto(s.id)}>
                          <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
                        </DropdownMenuItem>
                      )}
```

- [ ] **Step 5: Agregar el panel de confirmación de "Finalizar"**

Justo después del bloque `{/* ── Pause / delete confirm ── */}` (que cierra en la línea 514, justo antes del cierre del `<div key={s.id}...>` en línea 516), agregar:

```tsx
              {/* ── Finalizar confirm ── */}
              {finalizarPendiente === s.id && (
                <div className="border-t border-brand-border px-5 py-4 space-y-3">
                  <p className="text-xs text-brand-muted font-ui">
                    El sorteo dejará de venderse y pasará a "Sorteos Finalizados" en la web pública. Podrás declarar los ganadores ahora o después.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFinalizarPendiente(null)}>Cancelar</Button>
                    <Button size="sm" disabled={finalizando === s.id} onClick={() => finalizar(s.id)}>
                      {finalizando === s.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Confirmar finalización
                    </Button>
                  </div>
                </div>
              )}
```

- [ ] **Step 6: Montar `GanadoresManager` una sola vez**

Justo antes del `</div>` final que cierra el `return (...)` del componente (después del `)}` que cierra el `.map()` de sorteos, línea 519), agregar:

```tsx
      {ganadoresAbierto && (
        <GanadoresManager sorteoId={ganadoresAbierto} open={!!ganadoresAbierto} onClose={() => setGanadoresAbierto(null)} />
      )}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 8: Verificación manual en el navegador**

`npm run dev` → entrar como admin a `/admin/sorteos` → filtro "activo":
1. Click "Finalizar" en un sorteo → aparece el panel de confirmación → "Confirmar finalización" → el sorteo desaparece de la lista (ya no es `activo`).
2. Cambiar el filtro a "finalizado" → aparece ese sorteo con botón "Gestionar ganadores".
3. Click "Gestionar ganadores" → se abre el modal con una fila por premio, badge "Pendiente".
4. Escribir un número de boleto pagado real de ese sorteo + subir una imagen → "Guardar ganador" → toast de éxito, badge cambia a "Declarado".
5. Cerrar y reabrir el modal → los datos siguen prellenados (persistencia confirmada).

- [ ] **Step 9: Commit**

```bash
git add app/admin/sorteos/page.tsx
git commit -m "feat: acciones de finalizar y gestionar ganadores en el panel admin"
```

---

### Task 7: UI "Mis sorteos" — página de detalle + acciones

**Files:**
- Create: `app/dashboard/sorteos/[id]/page.tsx`
- Create: `components/dashboard/SorteoDetalleAcciones.tsx`

**Interfaces:**
- Consumes: `POST /api/sorteos/[id]/finalizar` (Task 3), `<GanadoresManager>` (Task 5).
- Produces: ruta `/dashboard/sorteos/[id]` (hoy da 404 — los links "Ver"/"Editar" de `app/dashboard/sorteos/page.tsx` ya apuntan aquí, no requieren cambio).

- [ ] **Step 1: Crear el componente de acciones (cliente)**

Crear `components/dashboard/SorteoDetalleAcciones.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trophy, Loader2 } from 'lucide-react'
import { GanadoresManager } from '@/components/shared/GanadoresManager'

export function SorteoDetalleAcciones({ sorteoId, estatus }: { sorteoId: string; estatus: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [ganadoresAbierto, setGanadoresAbierto] = useState(false)

  const finalizar = async () => {
    setFinalizando(true)
    const res = await fetch(`/api/sorteos/${sorteoId}/finalizar`, { method: 'POST' })
    const json = await res.json()
    setFinalizando(false)
    if (!res.ok) { toast.error(json.error ?? 'Error al finalizar el sorteo'); return }
    toast.success('Sorteo finalizado')
    setConfirmando(false)
    router.refresh()
  }

  if (estatus === 'activo') {
    return (
      <div className="rounded-xl border border-brand-border p-4">
        {!confirmando ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmando(true)}
            className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
          >
            <Trophy className="w-3.5 h-3.5" />Finalizar sorteo
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-brand-muted font-ui">
              El sorteo dejará de venderse y pasará a "Sorteos Finalizados" en la web pública. Podrás declarar los ganadores ahora o después.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button size="sm" disabled={finalizando} onClick={finalizar}>
                {finalizando && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Confirmar finalización
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (estatus === 'finalizado') {
    return (
      <>
        <Button size="sm" onClick={() => setGanadoresAbierto(true)} className="gap-1.5">
          <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
        </Button>
        <GanadoresManager sorteoId={sorteoId} open={ganadoresAbierto} onClose={() => setGanadoresAbierto(false)} />
      </>
    )
  }

  return null
}
```

- [ ] **Step 2: Crear la página de detalle (servidor)**

Crear `app/dashboard/sorteos/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { SorteoDetalleAcciones } from '@/components/dashboard/SorteoDetalleAcciones'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']

const ESTATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  activo: 'Activo',
  pausado: 'Pausado',
  rechazado: 'Rechazado',
  finalizado: 'Finalizado',
  eliminado: 'Eliminado',
}

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }

export default async function SorteoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) notFound()

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('id', params.id)
    .eq('usuario_id', session.user.id)
    .single()

  if (!sorteo) notFound()

  const typed = sorteo as SorteoRow & { premios: PremioRow[] }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('estatus')
    .eq('sorteo_id', params.id)
    .in('estatus', ['reservado', 'pagado'])

  const vendidos = boletos?.length ?? 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-3xl text-white tracking-wide">{typed.nombre}</h1>
          <p className="text-brand-muted font-body text-sm mt-1">
            {formatDate(typed.fecha_sorteo)} · {vendidos}/{typed.total_numeros} boletos · {formatCurrency(typed.precio_unitario)}/bol
          </p>
        </div>
        <Badge variant={typed.estatus as any}>{ESTATUS_LABEL[typed.estatus]}</Badge>
      </div>

      {typed.descripcion && (
        <p className="text-brand-muted font-body text-sm mb-6">{typed.descripcion}</p>
      )}

      <div className="space-y-3 mb-8">
        {typed.premios.slice().sort((a, b) => a.lugar - b.lugar).map((premio) => (
          <div key={premio.id} className="flex items-center gap-4 p-4 rounded-xl bg-brand-card border border-brand-border">
            {premio.imagen_url ? (
              <img src={premio.imagen_url} alt={premio.nombre} className="w-16 h-16 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-brand-bg border border-brand-border" />
            )}
            <div>
              <p className="text-[10px] font-ui font-semibold text-brand-muted uppercase tracking-wide">
                {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}° Premio`}
              </p>
              <p className="font-ui font-semibold text-white text-sm">{premio.nombre}</p>
            </div>
          </div>
        ))}
      </div>

      <SorteoDetalleAcciones sorteoId={typed.id} estatus={typed.estatus} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Verificación manual en el navegador**

`npm run dev` → iniciar sesión como el organizador dueño de un sorteo `activo` → ir a `/dashboard/sorteos` → click "Ver" (antes daba 404):
1. La página carga con nombre, premios y estatus del sorteo.
2. Botón "Finalizar sorteo" visible → confirmar → estatus pasa a "Finalizado" (`router.refresh()` refleja el cambio sin recargar manualmente).
3. Tras finalizar, aparece "Gestionar ganadores" → abre el mismo modal que en admin, funciona igual.
4. Repetir con un sorteo de otro organizador (no dueño) accediendo a `/dashboard/sorteos/<id>` directamente por URL → debe dar 404 (protección de propiedad).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/sorteos/[id]/page.tsx components/dashboard/SorteoDetalleAcciones.tsx
git commit -m "feat: página de detalle de \"Mis sorteos\" con finalizar y gestionar ganadores"
```

---

### Task 8: `SorteoCard` — modo `finalizado`

**Files:**
- Modify: `components/public/SorteoCard.tsx`

**Interfaces:**
- Produces: prop nueva `finalizado?: boolean` en `SorteoCardProps`. Usado por Task 9 (página de detalle) y Task 10 (grid del home).

- [ ] **Step 1: Agregar la prop e importar el icono `Trophy`**

En `components/public/SorteoCard.tsx`, modificar el import de iconos (línea 8):

```ts
import { Clock, Ticket, ChevronRight, Share2, Banknote, Trophy } from 'lucide-react'
```

Modificar `SorteoCardProps` (líneas 22-25):

```ts
interface SorteoCardProps {
  sorteo: Sorteo
  onParticipar: (sorteo: Sorteo, paquete: Paquete) => void
  finalizado?: boolean
}
```

Y la firma del componente (línea 101):

```ts
export function SorteoCard({ sorteo, onParticipar, finalizado = false }: SorteoCardProps) {
```

- [ ] **Step 2: Suprimir los badges de "¡Lleno!"/"¡Casi lleno!" cuando está finalizado**

Línea 233 (mobile), condición actual `{porcentaje >= 80 && totalPremios <= 1 && (`, cambiar a:

```tsx
          {porcentaje >= 80 && totalPremios <= 1 && !finalizado && (
```

Línea 417 (desktop), condición actual `{porcentaje >= 80 && (`, cambiar a:

```tsx
              {porcentaje >= 80 && !finalizado && (
```

- [ ] **Step 3: Reemplazar el CTA móvil**

Líneas 318-331 (el `<button onClick={() => onParticipar(...)}>` dentro de `{/* CTA + compartir */}` móvil), envolver en condicional:

```tsx
            {finalizado ? (
              <div style={{
                flex: 1, padding: '7px 0',
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
                fontSize: 11, fontWeight: 700,
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
                <Trophy style={{ width: 10, height: 10 }} />
                Sorteo finalizado
              </div>
            ) : (
              <button
                onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
                style={{
                  flex: 1, padding: '7px 0',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  borderRadius: 6, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}
              >
                <Ticket style={{ width: 10, height: 10 }} />
                ¡Participar!
              </button>
            )}
```

- [ ] **Step 4: Reemplazar el CTA de escritorio**

Líneas 552-568 (el `<button onClick={() => onParticipar(...)}>` dentro de `{/* CTA — orange + compartir */}` escritorio), envolver en condicional:

```tsx
            {finalizado ? (
              <div style={{
                flex: 1, padding: '12px 0',
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
                fontSize: 15, fontWeight: 700,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
                <Trophy style={{ width: 16, height: 16 }} />
                Sorteo finalizado
              </div>
            ) : (
              <button
                onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                <Ticket style={{ width: 16, height: 16 }} />
                ¡Participar!
              </button>
            )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 6: Commit**

```bash
git add components/public/SorteoCard.tsx
git commit -m "feat: modo solo-lectura de SorteoCard para sorteos finalizados"
```

(La verificación visual se hace en Task 9 y Task 10, cuando `finalizado` se pasa desde una página real.)

---

### Task 9: Página pública del sorteo — modo finalizado y sección de ganadores

**Files:**
- Modify: `app/sorteo/[id]/page.tsx`
- Modify: `components/public/SorteoDetalle.tsx`
- Modify: `components/public/SeccionPreguntas.tsx`
- Create: `components/public/SeccionGanadores.tsx`

**Interfaces:**
- Consumes: `finalizado` prop de `SorteoCard` (Task 8).
- Produces: `<SeccionGanadores premios={Premio[]} ganadores={GanadorInfo[]} />`.

- [ ] **Step 1: Ampliar la query y traer los ganadores en `app/sorteo/[id]/page.tsx`**

Cambiar la línea 24 de `getSorteo`:

```ts
    .eq('estatus', 'activo')
```
por:
```ts
    .in('estatus', ['activo', 'finalizado'])
```

Agregar una quinta consulta al `Promise.all` (líneas 104-109), y usar su resultado:

```ts
  const [{ data: marca }, { data: boletos }, { data: organizador }, { data: sorteosOrganizador }, { data: ganadoresData }] = await Promise.all([
    sb.from('marca').select(MARCA_SELECT).eq('id', 1).single(),
    supabase.from('boletos').select('sorteo_id').eq('sorteo_id', sorteo.id).in('estatus', ['reservado', 'pagado']),
    admin.from('perfiles').select('nombre, apellidos, avatar_url, calificacion, verificado, created_at').eq('id', sorteo.usuario_id).single(),
    admin.from('sorteos').select('estatus').eq('usuario_id', sorteo.usuario_id),
    admin.from('sorteo_ganadores').select('premio_id, numero_ganador, evidencia_urls, pedidos(cliente_nombre, cliente_apellidos)').eq('sorteo_id', sorteo.id),
  ])
```

Y pasar `ganadores` al componente (línea 124):

```tsx
        <SorteoDetalle
          sorteo={sorteoConVendidos}
          organizador={organizador}
          conteoOrganizador={conteoOrganizador}
          ganadores={(ganadoresData ?? []) as any}
        />
```

- [ ] **Step 2: Crear `components/public/SeccionGanadores.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Trophy, X, ZoomIn } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Premio = Database['public']['Tables']['premios']['Row']

interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  pedidos: { cliente_nombre: string; cliente_apellidos: string } | null
}

const LUGAR_LABEL: Record<number, string> = { 1: '1er', 2: '2do', 3: '3er' }

function nombreCorto(nombre: string, apellidos: string) {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? ''
  const primerApellido = apellidos.trim().split(/\s+/)[0] ?? ''
  return `${primerNombre} ${primerApellido}`.trim()
}

export function SeccionGanadores({ premios, ganadores }: { premios: Premio[]; ganadores: GanadorInfo[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const premiosOrdenados = premios.slice().sort((a, b) => a.lugar - b.lugar)

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 mt-14" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 48 }}>
        <h2 className="font-title text-white text-center mb-8" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', letterSpacing: '0.05em' }}>
          GANADORES
        </h2>

        <div className="space-y-4">
          {premiosOrdenados.map((premio) => {
            const ganador = ganadores.find((g) => g.premio_id === premio.id)
            return (
              <div key={premio.id} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.08)' }}>
                {premio.imagen_url ? (
                  <Image src={premio.imagen_url} alt={premio.nombre} width={64} height={64} className="rounded-lg object-contain bg-white p-1 flex-shrink-0" unoptimized />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Trophy className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-ui font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}°`} Premio — {premio.nombre}
                  </p>

                  {ganador ? (
                    <>
                      <p className="text-white font-ui font-semibold text-sm mb-2">
                        🏆 {ganador.pedidos ? nombreCorto(ganador.pedidos.cliente_nombre, ganador.pedidos.cliente_apellidos) : 'Ganador'}
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}> — boleto #{ganador.numero_ganador}</span>
                      </p>
                      {ganador.evidencia_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ganador.evidencia_urls.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightbox(url)}
                              className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}
                              aria-label={`Ver evidencia ${idx + 1}`}
                            >
                              <Image
                                src={url}
                                fill
                                sizes="56px"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                alt={`Evidencia ${idx + 1}`}
                                unoptimized
                              />
                              <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                style={{ background: 'rgba(0,0,0,0.45)' }}
                              >
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Ganador por anunciar</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setLightbox(null)}>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative w-full max-w-2xl" style={{ maxHeight: '85vh', aspectRatio: '1' }} onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} fill sizes="(max-width: 768px) 95vw, 672px" className="object-contain rounded-2xl" alt="Vista ampliada" unoptimized />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Agregar `soloLectura` a `SeccionPreguntas`**

En `components/public/SeccionPreguntas.tsx`, cambiar la firma (línea 24):

```ts
export function SeccionPreguntas({ sorteoId, soloLectura = false }: { sorteoId: string; soloLectura?: boolean }) {
```

Envolver el botón "Hacer una pregunta" y el formulario inline (todo el bloque desde `{/* ── CTA Preguntar ── */}` en la línea 111 hasta el cierre de `{/* ── Formulario inline ── */}` en la línea 233) en:

```tsx
      {!soloLectura && (
        <>
          {/* ── CTA Preguntar ── */}
          <button ...>
            ...
          </button>

          {/* ── Formulario inline ── */}
          {formAbierto && (
            ...
          )}
        </>
      )}
```

(Es decir: todo el contenido que ya existe entre esas líneas queda igual, solo se envuelve con `{!soloLectura && (<>...</>)}`. La lista de preguntas/respuestas — `{/* ── Lista Q&A ── */}`, líneas 236 en adelante — queda fuera de ese condicional, sin cambios, así se sigue mostrando siempre.)

- [ ] **Step 4: Integrar todo en `SorteoDetalle.tsx`**

Agregar el import de `SeccionGanadores` (después del import de `VerificadorBoleto`, línea 12):

```ts
import { SeccionGanadores } from './SeccionGanadores'
```

Agregar el tipo de ganador y la prop nueva a la firma del componente. Cambiar (líneas 140-149):

```tsx
interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  pedidos: { cliente_nombre: string; cliente_apellidos: string } | null
}

export function SorteoDetalle({
  sorteo, organizador, conteoOrganizador, ganadores = [],
}: {
  sorteo: Sorteo
  organizador?: Organizador | null
  conteoOrganizador?: ConteoOrganizador
  ganadores?: GanadorInfo[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)

  const handleParticipar = (_sorteo: Sorteo, paquete: Paquete) => {
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  const esLoteria = !!(sorteo as any).es_loteria
  const finalizado = sorteo.estatus === 'finalizado'
```

Reemplazar el bloque final del componente, desde `<div className="max-w-sm mx-auto px-4">` (línea 182) hasta el cierre de la función (línea 208), por:

```tsx
      <div className="max-w-sm mx-auto px-4">
        <SorteoCard sorteo={sorteo} onParticipar={handleParticipar} finalizado={finalizado} />
      </div>

      <GaleriaFotos premios={sorteo.premios} />

      {finalizado && <SeccionGanadores premios={sorteo.premios} ganadores={ganadores} />}

      {organizador && (
        <OrganizadorInfo organizador={organizador} conteo={conteoOrganizador ?? { activos: 0, finalizados: 0 }} />
      )}

      <SeccionPreguntas sorteoId={sorteo.id} soloLectura={finalizado} />

      <SorteosRelacionados sorteoId={sorteo.id} />

      {!finalizado && <VerificadorBoleto sorteos={[{ id: sorteo.id, nombre: sorteo.nombre }]} />}

      {!finalizado && paqueteSeleccionado && (
        <FormularioCompra
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sorteo={sorteo}
          paqueteInicial={paqueteSeleccionado}
        />
      )}
    </section>
  )
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 6: Verificación manual en el navegador**

`npm run dev` → abrir `/sorteo/<id de un sorteo finalizado con al menos un ganador declarado>`:
1. La página ya no da 404.
2. El card muestra "Sorteo finalizado" en vez de "¡Participar!", sin badge de "¡Casi lleno!".
3. Aparece la sección "GANADORES" con el lugar que tiene ganador mostrando nombre corto + evidencia clickeable (abre lightbox), y el lugar sin ganador mostrando "Ganador por anunciar".
4. La sección de preguntas no muestra el botón "Hacer una pregunta", pero si el sorteo tenía preguntas ya aprobadas, se siguen viendo.
5. No aparece la sección "VERIFICA TU BOLETO".
6. Abrir un sorteo `activo` normal y confirmar que nada cambió ahí (CTA de compra, verificador y preguntas siguen funcionando).

- [ ] **Step 7: Commit**

```bash
git add app/sorteo/\[id\]/page.tsx components/public/SorteoDetalle.tsx components/public/SeccionPreguntas.tsx components/public/SeccionGanadores.tsx
git commit -m "feat: página pública de sorteo finalizado en modo solo lectura con ganadores"
```

---

### Task 10: Home — sección "Sorteos Finalizados"

**Files:**
- Create: `components/public/SorteosFinalizadosGrid.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `finalizado` prop de `SorteoCard` (Task 8).

- [ ] **Step 1: Crear `components/public/SorteosFinalizadosGrid.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { SorteoCard } from './SorteoCard'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

export function SorteosFinalizadosGrid({ sorteos }: { sorteos: Sorteo[] }) {
  const router = useRouter()

  if (!sorteos.length) return null

  return (
    <section className="py-16" style={{ background: '#1c1c1c', borderTop: '1px solid #3a3a3a' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="font-title text-white" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing: '0.02em', marginBottom: 8 }}>
            SORTEOS FINALIZADOS
          </h2>
          <p className="font-body mx-auto" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(13px, 2vw, 15px)', maxWidth: 520 }}>
            Consulta los resultados y ganadores de nuestros sorteos ya realizados.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 items-start">
          {sorteos.map((sorteo) => (
            <div
              key={sorteo.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/sorteo/${sorteo.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/sorteo/${sorteo.id}`) }}
              className="cursor-pointer grayscale hover:grayscale-0 focus-visible:grayscale-0 transition-all duration-300 outline-none rounded-2xl"
            >
              <SorteoCard sorteo={sorteo} onParticipar={() => {}} finalizado />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Modificar `app/page.tsx`**

Agregar el import (después del import de `SorteosGrid`, línea 4):

```ts
import { SorteosFinalizadosGrid } from '@/components/public/SorteosFinalizadosGrid'
```

Agregar la consulta de finalizados justo después de la consulta de `sorteos` activos (líneas 24-28):

```ts
  const { data: sorteosFinalizados } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('estatus', 'finalizado')
    .order('fecha_sorteo', { ascending: false })
    .limit(12)
```

Modificar el tipado y el cálculo de `sorteoIds` (líneas 30-31):

```ts
  const sorteoTyped = (sorteos ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const finalizadosTyped = (sorteosFinalizados ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const sorteoIds = [...sorteoTyped.map((s) => s.id), ...finalizadosTyped.map((s) => s.id)]
```

Agregar el cálculo de `finalizadosConVendidos` justo después de `sorteosConVendidos` (línea 57-60):

```ts
  const finalizadosConVendidos = finalizadosTyped.map((s) => ({
    ...s,
    boletos_vendidos: vendidosPorSorteo[s.id] ?? 0,
  }))
```

Y renderizar la sección nueva entre `<SorteosGrid>` y `<VerificadorBoleto>` (líneas 78-79):

```tsx
        <SorteosGrid sorteos={sorteosConVendidos} />
        <SorteosFinalizadosGrid sorteos={finalizadosConVendidos} />
        <VerificadorBoleto sorteos={sorteoTyped.map((s) => ({ id: s.id, nombre: s.nombre }))} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 4: Verificación manual en el navegador**

`npm run dev` → abrir `/` (home):
1. Con al menos un sorteo `finalizado` existente, aparece la sección "SORTEOS FINALIZADOS" debajo de "SORTEOS ACTIVOS", en grid de tarjetas.
2. Las tarjetas se ven en escala de grises por defecto.
3. Al pasar el mouse sobre una tarjeta (o enfocarla con Tab + Enter), recupera color.
4. Click en cualquier parte de la tarjeta navega a `/sorteo/<id>`.
5. Sin sorteos finalizados, la sección no se renderiza (sin espacio vacío).

- [ ] **Step 5: Commit**

```bash
git add components/public/SorteosFinalizadosGrid.tsx app/page.tsx
git commit -m "feat: sección de Sorteos Finalizados en el home"
```
