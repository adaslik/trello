'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')
    const errorDesc = params.get('error_description')

    if (errorParam) {
      setError(`${errorParam}: ${errorDesc ?? ''}`)
      return
    }

    if (!code) {
      router.replace('/')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(error.message)
      } else {
        router.replace('/')
      }
    })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow border border-red-100">
          <p className="text-red-600 font-medium mb-2">Giriş hatası</p>
          <p className="text-sm text-slate-500 break-all">{error}</p>
          <button onClick={() => router.replace('/')} className="mt-4 text-indigo-600 text-sm underline">
            Giriş ekranına dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Giriş yapılıyor...</p>
      </div>
    </div>
  )
}
