# Link Externo en Evidencia de Ganadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir agregar un link externo opcional (YouTube, Facebook, etc.) por cada lugar premiado declarado, visible junto a la evidencia fotográfica en la página pública del sorteo.

**Architecture:** Una columna nueva y nullable en `sorteo_ganadores`. El endpoint existente `POST /api/sorteos/[id]/ganadores` gana un campo opcional más con su propia validación de formato de URL, independiente de la validación de foto+número. `GanadoresManager` gana un input de texto más. La cadena de props que ya lleva `evidencia_urls` desde `app/sorteo/[id]/page.tsx` hasta `SeccionGanadores.tsx` se extiende con `link_externo`.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, lucide-react.

## Global Constraints

- El link es opcional y por lugar premiado (no por sorteo completo, no múltiples por lugar).
- La foto de evidencia sigue siendo obligatoria para declarar un ganador; el link nunca sustituye esa obligación ni depende de ella.
- Un link inválido (sin `http://`/`https://`) se rechaza con un mensaje claro, tanto al guardar solo el link como junto con foto.
- Editar un ganador ya declarado permite editar/quitar su link igual que sus fotos y número.
- `npx tsc --noEmit` debe quedar limpio (0 errores) — línea base actual del repo.

---

### Task 1: Migración de base de datos y tipos

**Files:**
- Create: `supabase/migrations/023_ganador_link_externo.sql`
- Modify: `types/database.types.ts:255-286` (bloque `sorteo_ganadores`)

**Interfaces:**
- Produces: columna `sorteo_ganadores.link_externo text | null`.

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/023_ganador_link_externo.sql`:

```sql
-- Link externo opcional (YouTube, Facebook, etc.) donde se publicó el
-- resultado de un lugar premiado, además de las fotos de evidencia.
alter table public.sorteo_ganadores
  add column if not exists link_externo text;
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Correrla manualmente en el SQL Editor del dashboard de Supabase (mismo procedimiento que las migraciones anteriores de este proyecto — no hay push automático).

Verifica con:
```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_name = 'sorteo_ganadores' and column_name = 'link_externo';
```
Expected: 1 fila, `data_type = text`, `is_nullable = YES`.

- [ ] **Step 3: Actualizar `types/database.types.ts`**

En el bloque `sorteo_ganadores` (líneas 255-286), agregar `link_externo` a los tres sub-tipos:

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
          link_externo: string | null
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
          link_externo?: string | null
          declarado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero_ganador?: string
          evidencia_urls?: string[]
          link_externo?: string | null
          declarado_por?: string | null
          updated_at?: string
        }
      }
```

(Reemplaza el bloque completo `sorteo_ganadores: { ... }` existente por este.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/023_ganador_link_externo.sql types/database.types.ts
git commit -m "feat: columna link_externo en sorteo_ganadores"
```

---

### Task 2: Backend — aceptar y validar `linkExterno`

**Files:**
- Modify: `app/api/sorteos/[id]/ganadores/route.ts`

**Interfaces:**
- Consumes: columna `link_externo` de Task 1.
- Produces: `POST /api/sorteos/:id/ganadores` acepta ahora `{ premioId, numeroGanador, evidenciaUrls, linkExterno? }`.

- [ ] **Step 1: Agregar el campo y su validación**

En `app/api/sorteos/[id]/ganadores/route.ts`, modificar el `POST` (la extracción del body en la línea 27 y el objeto del `upsert` en las líneas 67-81):

```ts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const { premioId, numeroGanador, evidenciaUrls, linkExterno } = await req.json()

  if (!premioId || !numeroGanador?.trim() || !Array.isArray(evidenciaUrls) || evidenciaUrls.length === 0) {
    return NextResponse.json({ error: 'Falta el número de boleto ganador o la evidencia' }, { status: 400 })
  }

  const linkExternoTrim: string | null = typeof linkExterno === 'string' ? linkExterno.trim() : ''
  if (linkExternoTrim && !/^https?:\/\//i.test(linkExternoTrim)) {
    return NextResponse.json({ error: 'El link externo debe empezar con http:// o https://' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any
```

(El resto de la función, desde la consulta del sorteo hasta la normalización del número y la búsqueda del boleto, queda exactamente igual — no la repitas, solo inserta lo de arriba en su lugar.)

Y en el objeto del `upsert` (líneas 67-81 actuales), agregar el campo:

```ts
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
        link_externo: linkExternoTrim || null,
        declarado_por: access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sorteo_id,premio_id' }
    )
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Verificación manual**

Este repo no tiene staging (`.env.local` apunta a producción) — no correr `npm run dev` ni hacer requests contra la app real. Verificar leyendo el código: confirma que un `linkExterno` vacío o ausente guarda `null`, uno inválido (ej. `"facebook.com/post"`, sin `http`) da 400, y uno válido (`"https://facebook.com/post/123"`) pasa la validación y se guarda tal cual (después de `.trim()`).

- [ ] **Step 4: Commit**

```bash
git add app/api/sorteos/[id]/ganadores/route.ts
git commit -m "feat: acepta y valida link externo al declarar un ganador"
```

---

### Task 3: UI — campo de link en `GanadoresManager`

**Files:**
- Modify: `components/shared/GanadoresManager.tsx`

**Interfaces:**
- Consumes: `POST /api/sorteos/[id]/ganadores` con `linkExterno` (Task 2).

- [ ] **Step 1: Agregar el campo al draft y al formulario**

En `components/shared/GanadoresManager.tsx`:

Modificar las interfaces `GanadorLocal` (líneas 20-24) y `GanadorDraft` (líneas 26-29):

```ts
interface GanadorLocal {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  link_externo: string | null
}

interface GanadorDraft {
  numeroGanador: string
  evidenciaUrls: string[]
  linkExterno: string
}
```

Modificar la inicialización de drafts dentro de `cargar()` (líneas 51-60):

```ts
      const draftsIniciales: Record<string, GanadorDraft> = {}
      const guardados = new Set<string>()
      ;(premiosData ?? []).forEach((p: PremioLocal) => {
        const existente = ganadoresData.find((g) => g.premio_id === p.id)
        draftsIniciales[p.id] = {
          numeroGanador: existente?.numero_ganador ?? '',
          evidenciaUrls: existente?.evidencia_urls ?? [],
          linkExterno: existente?.link_externo ?? '',
        }
        if (existente) guardados.add(p.id)
      })
```

Modificar `guardarGanador` (líneas 103-119) para enviar el campo nuevo:

```ts
  const guardarGanador = async (premioId: string) => {
    const draft = drafts[premioId]
    if (!draft?.numeroGanador.trim()) { toast.error('Ingresa el número de boleto ganador'); return }
    if (!draft.evidenciaUrls.length) { toast.error('Sube al menos una imagen de evidencia'); return }

    setGuardando((prev) => ({ ...prev, [premioId]: true }))
    const res = await fetch(`/api/sorteos/${sorteoId}/ganadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        premioId,
        numeroGanador: draft.numeroGanador.trim(),
        evidenciaUrls: draft.evidenciaUrls,
        linkExterno: draft.linkExterno.trim(),
      }),
    })
    const json = await res.json()
    setGuardando((prev) => ({ ...prev, [premioId]: false }))
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar el ganador'); return }
    setGuardadoIds((prev) => new Set(prev).add(premioId))
    toast.success('Ganador guardado')
  }
```

Y agregar el input en el JSX, justo después del `<Input placeholder="Número de boleto ganador..."` (líneas 152-158) y antes del bloque de evidencia (`<div className="flex flex-wrap gap-2">`, línea 160):

```tsx
                  <Input
                    placeholder="Número de boleto ganador (ej. 0042)"
                    value={draft.numeroGanador}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [premio.id]: { ...prev[premio.id], numeroGanador: e.target.value } }))
                    }
                  />

                  <Input
                    placeholder="Link externo (opcional) — YouTube, Facebook, etc."
                    value={draft.linkExterno}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [premio.id]: { ...prev[premio.id], linkExterno: e.target.value } }))
                    }
                  />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Verificación manual en el navegador**

`npm run dev` → como admin o socio dueño, abrir "Gestionar ganadores" de un sorteo finalizado:
1. El campo "Link externo (opcional)..." aparece debajo del número de boleto, en cada lugar.
2. Escribir un link inválido (sin `http`) + guardar → toast de error del backend.
3. Escribir un link válido + foto + número → guarda correctamente.
4. Cerrar y reabrir el modal → el link queda prellenado.
5. Dejar el campo vacío al declarar/editar un ganador que ya tenía link → el link se borra (se guarda `null`).

- [ ] **Step 4: Commit**

```bash
git add components/shared/GanadoresManager.tsx
git commit -m "feat: campo de link externo en el gestor de ganadores"
```

---

### Task 4: Mostrar el link en la página pública

**Files:**
- Modify: `app/sorteo/[id]/page.tsx`
- Modify: `components/public/SorteoDetalle.tsx`
- Modify: `components/public/SeccionGanadores.tsx`

**Interfaces:**
- Consumes: `sorteo_ganadores.link_externo` (Task 1).

- [ ] **Step 1: Incluir `link_externo` en la query y el mapeo**

En `app/sorteo/[id]/page.tsx`, modificar la query (línea 109) agregando la columna al `select`:

```ts
    admin.from('sorteo_ganadores').select('premio_id, numero_ganador, evidencia_urls, link_externo, pedidos(cliente_nombre, cliente_apellidos)').eq('sorteo_id', sorteo.id),
```

Y el mapeo (líneas 112-122):

```ts
  const ganadores = (ganadoresData ?? []).map((g: any) => {
    const primerNombre = g.pedidos?.cliente_nombre?.trim().split(/\s+/)[0] ?? ''
    const primerApellido = g.pedidos?.cliente_apellidos?.trim().split(/\s+/)[0] ?? ''
    const nombreCorto = [primerNombre, primerApellido].filter(Boolean).join(' ') || null
    return {
      premio_id: g.premio_id as string,
      numero_ganador: g.numero_ganador as string,
      evidencia_urls: (g.evidencia_urls ?? []) as string[],
      nombre_corto: nombreCorto as string | null,
      link_externo: (g.link_externo ?? null) as string | null,
    }
  })
```

- [ ] **Step 2: Actualizar el tipo en `SorteoDetalle.tsx`**

En `components/public/SorteoDetalle.tsx`, modificar la interfaz `GanadorInfo` (líneas 141-146):

```ts
interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  nombre_corto: string | null
  link_externo: string | null
}
```

- [ ] **Step 3: Mostrar el botón en `SeccionGanadores.tsx`**

En `components/public/SeccionGanadores.tsx`:

Agregar el import de `ExternalLink` (línea 5):

```ts
import { Trophy, X, ZoomIn, ExternalLink } from 'lucide-react'
```

Actualizar la interfaz `GanadorInfo` (líneas 10-15):

```ts
interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  nombre_corto: string | null
  link_externo: string | null
}
```

Y agregar el botón justo después del bloque de fotos de evidencia (después del `)}` que cierra `{ganador.evidencia_urls.length > 0 && (...)}`, línea 82, y antes del `</>` que cierra el fragmento del ganador, línea 83):

```tsx
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
                      {ganador.link_externo && (
                        <a
                          href={ganador.link_externo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-ui font-semibold"
                          style={{ color: '#4ADE80' }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver publicación
                        </a>
                      )}
```

(Las líneas del bloque de fotos quedan igual — el cambio real es solo agregar el bloque nuevo `{ganador.link_externo && (...)}` justo después.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 5: Verificación manual en el navegador**

`npm run dev` → abrir la página pública de un sorteo finalizado con un ganador que tenga link guardado (de la Task 3):
1. Aparece "Ver publicación" con ícono, debajo de las fotos de evidencia de ese lugar.
2. Click abre el link en una pestaña nueva.
3. Un lugar sin link no muestra el botón (sin espacio vacío raro).

- [ ] **Step 6: Commit**

```bash
git add app/sorteo/\[id\]/page.tsx components/public/SorteoDetalle.tsx components/public/SeccionGanadores.tsx
git commit -m "feat: muestra el link externo del ganador en la página pública"
```
