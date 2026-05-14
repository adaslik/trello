import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars eksik')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient()
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId zorunludur' }, { status: 400 })
    }

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('deleteUser error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Beklenmeyen hata'
    console.error('delete-member error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
