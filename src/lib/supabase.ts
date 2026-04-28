import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For client components — auth-helpers reads env vars lazily,
// so this file is safe to import during prerender even if env is missing.
export const createBrowserClient = () => createClientComponentClient()
