'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient<Database> {
  return createClientComponentClient<Database>() as unknown as SupabaseClient<Database>
}
