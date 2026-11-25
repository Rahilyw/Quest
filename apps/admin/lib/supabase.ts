import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@quest/db-types'

// Bypasses RLS — server-side only, never import in client components
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
