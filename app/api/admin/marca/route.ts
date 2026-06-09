import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

const BUCKET = 'brand'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])
const ALLOWED_EXTS  = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg', 'ico'])

const TIPO_TO_FIELD: Record<string, string> = {
  logo:       'logo_url',
  favicon:    'favicon_url',
  cta_banner: 'cta_banner_url',
}

const TIPO_TO_PATH: Record<string, string> = {
  logo:       'logo',
  favicon:    'favicon',
  cta_banner: 'cta-banner',
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const tipo = formData.get('tipo') as string | null

  if (!file || !tipo || !TIPO_TO_FIELD[tipo]) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes (jpg, png, webp, svg, ico).' }, { status: 400 })
  }
  const path = `${TIPO_TO_PATH[tipo]}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const field = TIPO_TO_FIELD[tipo]
  const { error } = await supabase
    .from('marca')
    .update({ [field]: url, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url })
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { tipo } = await req.json() as { tipo: string }

  const field = TIPO_TO_FIELD[tipo]
  if (!field) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const { error } = await supabase
    .from('marca')
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
