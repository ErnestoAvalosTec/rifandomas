import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const BUCKET = 'brand'

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient() as any
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const tipo = formData.get('tipo') as 'logo' | 'favicon' | null

  if (!file || !tipo) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = tipo === 'logo' ? `logo.${ext}` : `favicon.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upsert — reemplaza si ya existe
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  // Forzar cache bust añadiendo timestamp a la URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const field = tipo === 'logo' ? 'logo_url' : 'favicon_url'
  const { error } = await supabase
    .from('marca')
    .update({ [field]: url, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminSupabaseClient() as any
  const { tipo } = await req.json() as { tipo: 'logo' | 'favicon' }

  const field = tipo === 'logo' ? 'logo_url' : 'favicon_url'

  const { error } = await supabase
    .from('marca')
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
