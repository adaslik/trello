'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    const finish = () => router.replace('/')

    if (!code) {
      finish()
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(finish).catch(finish)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Giriş yapılıyor...</p>
      </div>
    </div>
  )
}
