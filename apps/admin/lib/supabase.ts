import 'server-only'

import { createClient } from '@supabase/supabase-js'

// Bypasses RLS — server-side only, never import in client components
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
