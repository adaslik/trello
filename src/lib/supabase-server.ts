import 'server-only'
import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// For server components
export const createServerClient = () =>
  createServerComponentClient({ cookies })

// For route handlers (e.g. /api, /auth/callback)
export const createRouteClient = () =>
  createRouteHandlerClient({ cookies })
