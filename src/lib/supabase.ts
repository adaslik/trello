import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Env vars are inlined into the client bundle at build time.
// Passing them explicitly avoids any auto-detection ambiguity.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const createBrowserClient = () =>
  createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
