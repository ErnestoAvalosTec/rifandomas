/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore }) as unknown as SupabaseClient<Database>
}

export function createAdminSupabaseClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
