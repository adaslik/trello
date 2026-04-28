'use client'

import { useAuth } from '@/hooks/useAuth'
import LoginPage from '@/components/Auth/LoginPage'
import Dashboard from '@/views/Dashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />
  return <Dashboard />
}
