import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  // Sadece yk_baskani çağırabilir
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'yk_baskani') {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, role, gorev, sicil_no, telefon, web_sayfasi, kimdir } = body

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auth kullanıcısı oluştur (trigger otomatik profile ekler)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const initials = full_name
    .split(' ')
    .map((w: string) => w[0] || '')
    .join('')
    .toUpperCase()
    .substring(0, 2)

  // Profile'ı YK alanlarıyla güncelle (trigger zaten temel kaydı ekledi)
  await adminClient
    .from('profiles')
    .upsert({
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
      workspace_ids: [],
    })

  return NextResponse.json({ success: true })
}
