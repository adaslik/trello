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
    const body = await request.json()
    const { email, full_name, role, gorev, sicil_no, telefon, web_sayfasi, kimdir } = body

    if (!email || !full_name) {
      return NextResponse.json({ error: 'E-posta ve ad soyad zorunludur' }, { status: 400 })
    }

    // Auth kullanıcısı oluştur — trigger profile'ı otomatik ekler
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: sicil_no || '123456',
      user_metadata: { full_name, role: role || 'yk_uyesi' },
    })

    if (authError) {
      console.error('Auth createUser error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const initials = full_name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)

    // Profile'ı YK alanlarıyla güncelle
    const { error: profileError } = await admin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name,
      initials,
      role: role || 'yk_uyesi',
      gorev: gorev || null,
      sicil_no: sicil_no || null,
      telefon: telefon || null,
      web_sayfasi: web_sayfasi || null,
      kimdir: kimdir || null,
    })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Beklenmeyen hata'
    console.error('create-member error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
