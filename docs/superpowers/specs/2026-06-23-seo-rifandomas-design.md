# SEO RifandoMas — Diseño de Mejoras (Opción B)

**Fecha:** 2026-06-23
**Proyecto:** rifandomas.com.mx (Next.js 14 App Router + Supabase)
**Alcance:** Posicionamiento orgánico + compartibilidad en redes sociales
**Prioridad:** Urgente — implementar esta semana

---

## Contexto y brechas identificadas

El sitio ya está indexado en Google Search Console. Las brechas críticas encontradas en el código actual son:

| Brecha | Archivo | Impacto |
|--------|---------|---------|
| No existe `sitemap.xml` | — | Google no descubre sorteos nuevos automáticamente |
| No existe `robots.txt` | — | Google puede indexar `/admin`, `/api`, `/dashboard` |
| Falta `metadataBase` | `app/layout.tsx` | OG tags con rutas relativas son inválidos |
| Sin `og:locale` ni `og:site_name` | `app/layout.tsx` | Metadata social incompleta |
| Sin Schema.org JSON-LD | `app/sorteo/[id]/page.tsx` | Sin rich snippets en Google |
| Sin OG image en home | `app/layout.tsx` | Links al home sin preview visual |

---

## Sección 1 — Fundamentos (sitemap + robots + metadataBase)

### `app/sitemap.ts` (archivo nuevo)

Sitemap dinámico generado server-side. Consulta Supabase para obtener todos los sorteos con `estatus = 'activo'` y genera una entrada por cada uno.

```
Entradas:
  /                    priority=1.0, changeFrequency='daily'
  /sorteo/[id] × N    priority=0.8, changeFrequency='daily', lastModified=updated_at
```

Usa `createAdminSupabaseClient()` (bypassa RLS) para leer sorteos activos con sus campos `id` y `updated_at`.

### `app/robots.ts` (archivo nuevo)

```
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api
Sitemap: https://rifandomas.com.mx/sitemap.xml
```

### `app/layout.tsx` (modificación)

Agregar al objeto `metadata`:
- `metadataBase: new URL('https://rifandomas.com.mx')` — requerido para que Next.js resuelva rutas relativas en OG tags
- `openGraph.siteName: 'RifandoMas'`
- `openGraph.locale: 'es_MX'`
- `openGraph.url: 'https://rifandomas.com.mx'`
- `openGraph.images` apuntando a `/opengraph-image` (generada dinámicamente, ver Sección 3)

---

## Sección 2 — Schema.org JSON-LD en páginas de sorteo

### `app/sorteo/[id]/page.tsx` (modificación)

Agregar un `<script type="application/ld+json">` con schema tipo `Event` generado server-side desde los datos del sorteo. Se inserta dentro del componente de página (Next.js lo eleva al `<head>` automáticamente).

**Campos del schema `Event`:**

| Campo schema | Fuente en código |
|---|---|
| `name` | `sorteo.nombre` |
| `description` | `sorteo.descripcion` |
| `startDate` | `sorteo.fecha_sorteo` (ISO 8601) |
| `url` | `https://rifandomas.com.mx/sorteo/${sorteo.id}` |
| `image` | `premioPrincipal.imagen_url` |
| `organizer.name` | `'RifandoMas'` |
| `organizer.url` | `'https://rifandomas.com.mx'` |
| `offers.price` | `sorteo.precio_unitario` |
| `offers.priceCurrency` | `'MXN'` |
| `offers.availability` | `'https://schema.org/InStock'` |
| `offers.url` | `https://rifandomas.com.mx/sorteo/${sorteo.id}` |

No requiere librerías adicionales. El componente `JsonLd` es un simple server component que renderiza el script.

---

## Sección 3 — OG Image dinámica para el home

### `app/opengraph-image.tsx` (archivo nuevo)

Archivo especial de Next.js 14 que genera automáticamente una imagen `1200×630px` con `ImageResponse` de `next/og`. Next.js la sirve en `/opengraph-image` y la enlaza automáticamente cuando `metadataBase` está configurado.

**Contenido visual de la imagen:**
- Fondo blanco con acento verde `#22C55E`
- Logo de RifandoMas — se carga con `fetch` desde la URL pública de Supabase Storage (`marca.logo_url`); si falla el fetch, se muestra solo el texto "RifandoMas" como fallback para que la imagen siempre se genere
- Texto: "Sorteos y Rifas Virtuales en México"
- Subtexto: "rifandomas.com.mx"

**Archivos afectados:** Solo `app/opengraph-image.tsx` (nuevo). No modifica ningún componente existente.

---

## Herramientas adicionales recomendadas (fuera del código)

Además de Google Search Console, estas herramientas complementan el SEO:

| Herramienta | Para qué sirve | Costo |
|---|---|---|
| **Google Analytics 4** | Tráfico, fuentes, conversiones | Gratis |
| **Bing Webmaster Tools** | Indexación en Bing/Edge (10-15% del tráfico MX) | Gratis |
| **Facebook Sharing Debugger** | Verificar que los OG tags se lean bien | Gratis |
| **Schema.org Validator** | Validar el JSON-LD generado | Gratis |
| **PageSpeed Insights** | Medir Core Web Vitals en producción | Gratis |
| **Ahrefs / Semrush** | Keyword research y backlinks (siguiente iteración) | Pago |

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `app/sitemap.ts` | Crear |
| `app/robots.ts` | Crear |
| `app/opengraph-image.tsx` | Crear |
| `app/layout.tsx` | Modificar (metadataBase + og:locale + og:site_name + og:url + og:images) |
| `app/sorteo/[id]/page.tsx` | Modificar (agregar componente JsonLd) |

---

## Fuera de alcance (siguiente iteración)

- Optimización de Core Web Vitals / hero slider (Opción C)
- Plantillas de publicación en Facebook
- Keyword research y estrategia de contenido
- Blog o sección de contenido SEO
