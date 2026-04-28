import 'server-only'
import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// For server components
export const createServerClient = () =>
  createServerComponentClient(
    { cookies },
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )

// For route handlers (e.g. /api, /auth/callback)
export const createRouteClient = () =>
  createRouteHandlerClient(
    { cookies },
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )
