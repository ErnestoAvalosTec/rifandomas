import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

const BUCKET = 'portadas-predeterminadas'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_EXTS  = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { data, error } = await supabase
    .from('imagenes_predeterminadas')
    .select('*')
    .order('categoria', { ascending: true })
    .order('orden', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const categoria = formData.get('categoria') as string | null
  const nombre = (formData.get('nombre') as string | null) ?? null
  const orden = parseInt((formData.get('orden') as string) ?? '0', 10)

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!categoria) return NextResponse.json({ error: 'Falta la categoría' }, { status: 400 })

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes (jpg, png, webp, gif).' }, { status: 400 })
  }

  const path = `portada-${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('imagenes_predeterminadas')
    .insert({ categoria, nombre, url: urlData.publicUrl, orden, activo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data, error } = await supabase
    .from('imagenes_predeterminadas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data: img } = await supabase
    .from('imagenes_predeterminadas')
    .select('url')
    .eq('id', id)
    .single()

  if (img?.url) {
    const url = new URL(img.url)
    const storagePath = url.pathname.split(`/object/public/${BUCKET}/`)[1]
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath])
    }
  }

  const { error } = await supabase.from('imagenes_predeterminadas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
