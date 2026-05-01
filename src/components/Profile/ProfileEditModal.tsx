'use client'

import { useState, useEffect } from 'react'
import { X, Save, Globe, Phone, FileText, Home, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  editProfile?: Profile | null
  isCreateMode?: boolean
}

export default function ProfileEditModal(props: ProfileEditModalProps) {
  const { isOpen, onClose, editProfile, isCreateMode } = props
  const router = useRouter()
  const { profile: currentUser, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const targetProfile = editProfile || currentUser
  const isYKChairman = currentUser?.role === 'yk_baskani'
  const isOwnProfile = !isCreateMode && (!editProfile || editProfile.id === currentUser?.id)
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    gorev: '',
    sicil_no: '',
    telefon: '',
    web_sayfasi: '',
    kimdir: '',
    role: 'yk_uyesi' as 'yk_uyesi' | 'yk_baskani',
  })

  useEffect(() => {
    if (isCreateMode) {
      setForm({
        full_name: '',
        email: '',
        gorev: '',
        sicil_no: '',
        telefon: '',
        web_sayfasi: '',
        kimdir: '',
        role: 'yk_uyesi',
      })
    } else if (targetProfile) {
      setForm({
        full_name: targetProfile.full_name || '',
        email: targetProfile.email || '',
        gorev: targetProfile.gorev || '',
        sicil_no: targetProfile.sicil_no || '',
        telefon: targetProfile.telefon || '',
        web_sayfasi: targetProfile.web_sayfasi || '',
        kimdir: targetProfile.kimdir || '',
        role: (targetProfile.role as 'yk_uyesi' | 'yk_baskani') || 'yk_uyesi',
      })
    }
  }, [targetProfile, isCreateMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isCreateMode && isYKChairman) {
        const res = await fetch('/api/create-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Üye oluşturulamadı')
        toast.success('YK üyesi eklendi. Üye şifresini "Şifremi Unuttum" ile belirleyebilir.')
      } else if (editProfile && isYKChairman) {
        const supabase = createBrowserClient()
        const { error } = await supabase
          .from('profiles')
          .update(form)
          .eq('id', editProfile.id)
        if (error) throw error
        toast.success('Profil güncellendi')
      } else {
        await updateProfile(form)
        toast.success('Profil güncellendi')
      }

      if (isOwnProfile && showPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error('Şifreler eşleşmiyor')
          setLoading(false)
          return
        }
        const supabase = createBrowserClient()
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
        if (pwError) throw pwError
        toast.success('Şifre güncellendi')
      }

      onClose()
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Güncelleme başarısız')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isEditingOther = editProfile && editProfile.id !== currentUser?.id

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isCreateMode && (
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  title="Anasayfaya Dön"
                >
                  <Home size={20} />
                </button>
              )}
              <h2 className="text-xl font-bold text-gray-900">
                {isCreateMode ? 'Yeni YK Üyesi Oluştur' : isEditingOther ? form.full_name + ' - Düzenle' : 'Profilini Düzenle'}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {isCreateMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            {isCreateMode && isYKChairman && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'yk_uyesi' | 'yk_baskani' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="yk_uyesi">YK Üyesi</option>
                  <option value="yk_baskani">YK Başkanı</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText size={14} className="inline mr-1" />Görev
              </label>
              <input
                type="text"
                value={form.gorev}
                onChange={(e) => setForm({ ...form, gorev: e.target.value })}
                placeholder="örn: Başkan Yardımcısı"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sicil No</label>
              <input
                type="text"
                value={form.sicil_no}
                onChange={(e) => setForm({ ...form, sicil_no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone size={14} className="inline mr-1" />Telefon
              </label>
              <input
                type="tel"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                placeholder="+90 555 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe size={14} className="inline mr-1" />Web Sayfası
              </label>
              <input
                type="url"
                value={form.web_sayfasi}
                onChange={(e) => setForm({ ...form, web_sayfasi: e.target.value })}
                placeholder="https://ornek.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hakkında</label>
              <textarea
                value={form.kimdir}
                onChange={(e) => setForm({ ...form, kimdir: e.target.value })}
                placeholder="Kısa biyografi..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {isOwnProfile && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowPassword(!showPassword); setNewPassword(''); setConfirmPassword('') }}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <Lock size={14} />
                  {showPassword ? 'Şifre değişikliğini iptal et' : 'Şifre Değiştir'}
                </button>
                {showPassword && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        minLength={6}
                        placeholder="En az 6 karakter"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        minLength={6}
                        placeholder="Şifrenizi tekrar girin"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}