# SEO RifandoMas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar mejoras SEO completas (sitemap dinámico, robots.txt, metadataBase, Schema.org JSON-LD y OG image dinámica) para mejorar posicionamiento en Google y compartibilidad en redes sociales.

**Architecture:** Cinco archivos independientes en el App Router de Next.js 14. No se requieren librerías externas: `robots.ts` y `sitemap.ts` usan `MetadataRoute` de Next.js, `opengraph-image.tsx` usa `ImageResponse` de `next/og` (ya incluido en Next.js 14), y el JSON-LD se inyecta con un componente server-side inline en la página de sorteo.

**Tech Stack:** Next.js 14 App Router, Supabase (via `createAdminSupabaseClient`), TypeScript.

## Global Constraints

- Dominio de producción: `https://rifandomas.com.mx` — usar esta URL exacta en todos los archivos, sin trailing slash.
- No instalar dependencias nuevas — todo usa APIs nativas de Next.js 14.
- Usar siempre `createAdminSupabaseClient()` de `@/lib/supabase/server` para leer datos en archivos de ruta (bypasa RLS).
- Color primario de marca: `#22C55E`.
- El proyecto vive en `rifandoplus/` dentro del repo.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `app/robots.ts` | Crear | Indicar a Google qué indexar y qué ignorar |
| `app/sitemap.ts` | Crear | Listar todas las URLs públicas con prioridad |
| `app/layout.tsx` | Modificar | Agregar `metadataBase`, `og:locale`, `og:site_name`, `og:url` |
| `app/sorteo/[id]/page.tsx` | Modificar | Agregar componente `JsonLd` con schema `Event` |
| `app/opengraph-image.tsx` | Crear | Generar imagen 1200×630 para preview social del home |

---

## Task 1: robots.ts — Bloquear rutas privadas de Google

**Files:**
- Create: `app/robots.ts`

**Interfaces:**
- Consumes: nada
- Produces: respuesta en `GET /robots.txt` que bloquea `/admin`, `/dashboard`, `/api` y declara el sitemap

- [ ] **Step 1: Crear `app/robots.ts`**

```ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/api'],
    },
    sitemap: 'https://rifandomas.com.mx/sitemap.xml',
  }
}
```

- [ ] **Step 2: Verificar en servidor de desarrollo**

Correr el servidor: `npm run dev`

Abrir en navegador o con curl:
```
http://localhost:3000/robots.txt
```

Salida esperada:
```
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api

Sitemap: https://rifandomas.com.mx/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
git add app/robots.ts
git commit -m "feat(seo): add robots.txt blocking admin/dashboard/api routes"
```

---

## Task 2: sitemap.ts — Sitemap dinámico con todos los sorteos activos

**Files:**
- Create: `app/sitemap.ts`

**Interfaces:**
- Consumes: `createAdminSupabaseClient` de `@/lib/supabase/server`; tabla `sorteos` con campos `id: string`, `updated_at: string`
- Produces: respuesta en `GET /sitemap.xml` con entrada para `/` y una por cada sorteo activo

- [ ] **Step 1: Crear `app/sitemap.ts`**

```ts
import { MetadataRoute } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient()
  const { data: sorteos } = await supabase
    .from('sorteos')
    .select('id, updated_at')
    .eq('estatus', 'activo')

  const sorteoEntries: MetadataRoute.Sitemap = (sorteos ?? []).map((s) => ({
    url: `https://rifandomas.com.mx/sorteo/${s.id}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://rifandomas.com.mx',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...sorteoEntries,
  ]
}
```

- [ ] **Step 2: Verificar en servidor de desarrollo**

Con el servidor corriendo (`npm run dev`), abrir:
```
http://localhost:3000/sitemap.xml
```

Salida esperada — XML válido con al menos la entrada del home y una entrada por cada sorteo activo en la base de datos:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rifandomas.com.mx</loc>
    <lastmod>2026-06-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>https://rifandomas.com.mx/sorteo/[uuid]</loc>
    ...
  </url>
</urlset>
```

Si el XML tiene solo la entrada del home y no hay sorteos en la DB local, es correcto también.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): add dynamic sitemap including all active sorteos"
```

---

## Task 3: layout.tsx — metadataBase + og:locale + og:site_name

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: nada nuevo — modifica el objeto `metadata` existente
- Produces: `metadataBase` resuelve correctamente todos los OG tags relativos; `og:locale=es_MX`, `og:site_name=RifandoMas`, `og:url` establecidos

- [ ] **Step 1: Modificar el objeto `metadata` en `app/layout.tsx`**

Reemplazar el objeto `metadata` existente (líneas 22-35) con:

```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://rifandomas.com.mx'),
  title: 'RifandoMas | Sorteos y Rifas Virtuales en México',
  description: 'La plataforma más confiable para sorteos y rifas virtuales en México. Premios de alto valor, pagos seguros y resultados transparentes.',
  keywords: 'rifas, sorteos, México, boletos, premios, RifandoMas',
  icons: {
    icon: '/api/favicon',
    shortcut: '/api/favicon',
  },
  openGraph: {
    title: 'RifandoMas | Sorteos y Rifas Virtuales',
    description: 'Participa en los mejores sorteos de México',
    type: 'website',
    url: 'https://rifandomas.com.mx',
    siteName: 'RifandoMas',
    locale: 'es_MX',
  },
}
```

**Nota:** No se agrega `openGraph.images` aquí — Next.js detecta automáticamente `app/opengraph-image.tsx` cuando `metadataBase` está configurado y lo enlaza solo.

- [ ] **Step 2: Verificar en servidor de desarrollo**

Abrir `http://localhost:3000` y ver el HTML fuente (Ctrl+U o clic derecho → Ver código fuente). Buscar estas etiquetas en el `<head>`:

```html
<meta property="og:site_name" content="RifandoMas" />
<meta property="og:locale" content="es_MX" />
<meta property="og:url" content="https://rifandomas.com.mx" />
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(seo): add metadataBase, og:locale es_MX, og:site_name"
```

---

## Task 4: JsonLd — Schema.org Event en páginas de sorteo

**Files:**
- Modify: `app/sorteo/[id]/page.tsx`

**Interfaces:**
- Consumes: `sorteo: SorteoConPremios` (ya disponible en el componente `SorteoPage`); `premioPrincipal: PremioRow | undefined` (ya calculado en `generateMetadata`)
- Produces: tag `<script type="application/ld+json">` en el HTML de cada página de sorteo con schema `Event` válido

- [ ] **Step 1: Agregar el componente `JsonLd` en `app/sorteo/[id]/page.tsx`**

Insertar este componente **antes** de `export default async function SorteoPage`:

```tsx
function JsonLd({ sorteo, premioPrincipal }: {
  sorteo: SorteoConPremios
  premioPrincipal?: PremioRow
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: sorteo.nombre,
    description: sorteo.descripcion ?? `Participa en el sorteo "${sorteo.nombre}" y gana grandes premios.`,
    startDate: sorteo.fecha_sorteo,
    url: `https://rifandomas.com.mx/sorteo/${sorteo.id}`,
    ...(premioPrincipal?.imagen_url && { image: premioPrincipal.imagen_url }),
    organizer: {
      '@type': 'Organization',
      name: 'RifandoMas',
      url: 'https://rifandomas.com.mx',
    },
    offers: {
      '@type': 'Offer',
      price: String(sorteo.precio_unitario),
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: `https://rifandomas.com.mx/sorteo/${sorteo.id}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 2: Usar `JsonLd` dentro de `SorteoPage`**

En la función `SorteoPage`, agregar `premioPrincipal` y el componente `<JsonLd>` en el return. Modificar la función así:

```tsx
export default async function SorteoPage({ params }: { params: { id: string } }) {
  const sorteo = await getSorteo(params.id)
  if (!sorteo) notFound()

  // ... (resto del código existente sin cambios hasta el return)

  const premioPrincipal = sorteo.premios?.slice().sort((a, b) => a.lugar - b.lugar)[0]

  return (
    <div className="min-h-screen bg-brand-bg">
      <JsonLd sorteo={sorteo} premioPrincipal={premioPrincipal} />
      <Navbar logoUrl={marca?.logo_url} topbar={marca} />
      <main>
        <SorteoDetalle sorteo={sorteoConVendidos} organizador={organizador} conteoOrganizador={conteoOrganizador} />
      </main>
      <Footer logoUrl={marca?.logo_url} footer={marca} />
    </div>
  )
}
```

**Nota:** `premioPrincipal` ya se calcula en `generateMetadata` — aquí se recalcula en el componente de página para no pasar datos entre funciones.

- [ ] **Step 3: Verificar**

Abrir cualquier página de sorteo activo, por ejemplo `http://localhost:3000/sorteo/[id]`, y ver el HTML fuente. Buscar:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Event","name":"...
</script>
```

Luego validar el schema en: `https://validator.schema.org/` pegando la URL o el JSON.

- [ ] **Step 4: Commit**

```bash
git add app/sorteo/[id]/page.tsx
git commit -m "feat(seo): add Schema.org Event JSON-LD to sorteo pages"
```

---

## Task 5: opengraph-image.tsx — OG Image dinámica para el home

**Files:**
- Create: `app/opengraph-image.tsx`

**Interfaces:**
- Consumes: `createAdminSupabaseClient` de `@/lib/supabase/server`; tabla `marca` campo `logo_url: string | null`
- Produces: imagen PNG 1200×630 servida en `/opengraph-image`; Next.js la enlaza automáticamente al `<head>` del home gracias a `metadataBase` (Task 3)

- [ ] **Step 1: Crear `app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const alt = 'RifandoMas — Sorteos y Rifas Virtuales en México'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const supabase = createAdminSupabaseClient()
  const { data: marca } = await supabase
    .from('marca')
    .select('logo_url')
    .eq('id', 1)
    .single()

  const logoUrl = marca?.logo_url ?? null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderTop: '14px solid #22C55E',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="RifandoMas"
            style={{ height: 110, marginBottom: 36, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ fontSize: 72, fontWeight: 800, color: '#22C55E', marginBottom: 36 }}>
            RifandoMas
          </div>
        )}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            marginBottom: 20,
            maxWidth: 900,
          }}
        >
          Sorteos y Rifas Virtuales en México
        </div>
        <div style={{ fontSize: 26, color: '#6b7280' }}>
          rifandomas.com.mx
        </div>
      </div>
    ),
    { ...size }
  )
}
```

- [ ] **Step 2: Verificar la imagen generada**

Con el servidor corriendo, abrir en navegador:
```
http://localhost:3000/opengraph-image
```

Debe mostrar una imagen PNG 1200×630 con el logo (si existe en la DB local) o el texto "RifandoMas" en verde, el texto descriptivo y la URL del sitio.

- [ ] **Step 3: Verificar que se enlaza en el home**

Abrir `http://localhost:3000` y ver el HTML fuente. Buscar:
```html
<meta property="og:image" content="https://rifandomas.com.mx/opengraph-image" />
```

- [ ] **Step 4: Commit**

```bash
git add app/opengraph-image.tsx
git commit -m "feat(seo): add dynamic OG image 1200x630 for home page"
```

---

## Verificación final post-deploy

Una vez desplegado en producción (`rifandomas.com.mx`):

1. **Google Search Console** → Inspeccionar URL → probar `https://rifandomas.com.mx/sitemap.xml` y enviarlo en "Sitemaps"
2. **Facebook Sharing Debugger** → pegar `https://rifandomas.com.mx` y `https://rifandomas.com.mx/sorteo/[id]` — verificar que aparezca imagen, título y descripción correctos
3. **Schema.org Validator** → pegar URL de un sorteo activo y verificar que el `Event` schema sea válido
4. **Bing Webmaster Tools** → registrar el sitio y enviar el sitemap (10-15% de tráfico adicional en México)

---

## Herramientas recomendadas adicionales (no requieren código)

| Herramienta | Acción |
|-------------|--------|
| Google Analytics 4 | Crear propiedad y pegar el script de medición en `app/layout.tsx` (siguiente iteración) |
| Bing Webmaster Tools | Registrar en `bing.com/webmasters` y enviar sitemap |
| Facebook Sharing Debugger | `developers.facebook.com/tools/debug/` |
| PageSpeed Insights | `pagespeed.web.dev` — revisar LCP del home en móvil |
