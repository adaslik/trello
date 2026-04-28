'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session from the URL hash on mount
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Şifreler eşleşmiyor')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Şifreniz güncellendi')
      router.replace('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="bg-indigo-600 px-8 py-8 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <span className="text-xl">🏛</span>
          </div>
          <h1 className="text-xl font-semibold">Yeni Şifre Belirle</h1>
          <p className="text-indigo-200 text-sm mt-1">Meslek Odası Görev Yönetim Sistemi</p>
        </div>

        <div className="p-8">
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Bağlantı doğrulanıyor...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Yeni Şifre</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={6}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Şifre Tekrar</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  required minLength={6}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Lütfen bekleyin...' : 'Şifremi Güncelle'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
