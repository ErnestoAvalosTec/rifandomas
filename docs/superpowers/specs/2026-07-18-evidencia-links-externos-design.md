# Link externo en la evidencia de ganadores

**Fecha:** 2026-07-18
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y objetivo

La feature de "finalizar sorteo y publicar ganadores" (ver `docs/superpowers/specs/2026-07-17-finalizar-sorteo-ganadores-design.md`) ya permite declarar un ganador por lugar premiado con número de boleto + fotos de evidencia. El usuario pidió, además de fotos, poder agregar un link externo (YouTube, Facebook, u otra página) donde se publicó el resultado del sorteo, para que los visitantes de la página pública puedan consultar esa publicación directamente.

## Alcance

- Un link externo opcional por cada lugar premiado (misma granularidad que las fotos de evidencia — no uno solo para todo el sorteo).
- Un único link por lugar (no una lista de links).
- El link es puramente opcional y no afecta la regla existente de "número + al menos 1 foto obligatorios juntos" — la foto sigue siendo obligatoria para declarar un ganador; el link es un campo extra independiente.
- Se muestra en la página pública del sorteo, en la sección "GANADORES", junto a la galería de evidencia de ese lugar.

Fuera de alcance: múltiples links por lugar, un link a nivel de todo el sorteo, previsualización embebida del contenido del link (solo un botón que abre en pestaña nueva).

## Modelo de datos

Nueva columna en la tabla existente `sorteo_ganadores`:

| Columna | Tipo | Notas |
|---|---|---|
| `link_externo` | text, nullable | URL opcional (`http://` o `https://`). `null` si no se capturó. |

Migración `supabase/migrations/023_ganador_link_externo.sql`.

## Backend

`POST /api/sorteos/[id]/ganadores` (ruta existente) acepta un campo opcional adicional `linkExterno: string | undefined`:
- Si viene y no es una URL bien formada (`http://` o `https://`), responde 400 con un mensaje claro.
- Si viene vacío o no se envía, se guarda `null`.
- No participa en la validación de "número + evidencia obligatorios" — es independiente.
- Se persiste junto con el resto de los campos en el mismo `upsert` por `(sorteo_id, premio_id)`.

`GET /api/sorteos/[id]/ganadores` (ruta existente) ya devuelve `select('*')`, por lo que expondrá `link_externo` automáticamente sin cambios.

## UI — Admin y "Mis sorteos" (`GanadoresManager`)

Nuevo campo de texto "Link externo (opcional) — YouTube, Facebook, etc." dentro de la fila de cada premio, ubicado junto al campo de número de boleto ganador (antes de la sección de subida de fotos). Se guarda como parte del draft local de ese premio y se envía en el mismo `POST` al hacer clic en "Guardar ganador".

## UI pública (`SeccionGanadores`)

Cuando un lugar tiene `link_externo`, se muestra un botón/enlace "Ver publicación" (con ícono de enlace externo) junto a la galería de fotos de ese lugar. Abre el link en una pestaña nueva (`target="_blank" rel="noopener noreferrer"`). Si no hay link, no se muestra nada adicional — el bloque de evidencia se ve igual que hoy.

## Casos borde / validaciones

- Un link inválido (sin `http(s)://`) se rechaza con error claro al guardar, tanto si se agrega solo como si se agrega junto con fotos.
- Editar/corregir un ganador ya declarado permite también editar o quitar su link, igual que ya se puede con las fotos y el número de boleto.
- Un lugar sin ganador declarado no muestra ni campo de link ni botón, igual que hoy con las fotos.
