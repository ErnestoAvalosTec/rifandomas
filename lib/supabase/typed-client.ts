import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Helper that returns a typed client regardless of how it was created
export type TypedSupabaseClient = SupabaseClient<Database>
