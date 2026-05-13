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
    const { requestId, email, action } = await request.json()

    if (!requestId || !email || !action) {
      return NextResponse.json({ error: 'requestId, email ve action zorunludur' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // join_requests tablosunu güncelle
    const { error: reqError } = await admin
      .from('join_requests')
      .update({ status: newStatus, processed_at: new Date().toISOString() })
      .eq('id', requestId)

    if (reqError) throw reqError

    // Sadece onaylama durumunda profile rolünü güncelle
    if (action === 'approve') {
      const { data: profiles, error: findError } = await admin
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .limit(1)

      if (findError) throw findError

      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        // Zaten YK rolündeyse değiştirme
        if (profile.role !== 'yk_baskani' && profile.role !== 'yk_uyesi') {
          const { error: roleError } = await admin
            .from('profiles')
            .update({ role: 'yk_uyesi' })
            .eq('id', profile.id)

          if (roleError) throw roleError
        }
      } else {
        // Bu e-posta ile kayıtlı kullanıcı yok — bilgi dön
        return NextResponse.json({
          success: true,
          warning: 'İstek onaylandı ancak bu e-posta ile kayıtlı kullanıcı bulunamadı. Kullanıcı giriş yaptığında rolü güncellenebilir.',
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Beklenmeyen hata'
    console.error('approve-join-request error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
