'use client'

import { useState, useEffect } from 'react'
import { X, Save, Globe, Phone, Calendar, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  editProfile?: Profile | null // YK başkanı başkasını düzenleyebilir
}

export default function ProfileEditModal({ isOpen, onClose, editProfile }: ProfileEditModalProps) {
  const { profile: currentUser, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Düzenlenecek profil: YK başkanı başkasını düzenliyorsa editProfile, yoksa kendisi
  const targetProfile = editProfile || currentUser
  
  const [form, setForm] = useState({
    full_name: '',
    gorev: '',
    sicil_no: '',
    telefon: '',
    web_sayfasi: '',
    kimdir: '',
  })

  useEffect(() => {
    if (targetProfile) {
      setForm({
        full_name: targetProfile.full_name || '',
        gorev: targetProfile.gorev || '',
        sicil_no: targetProfile.sicil_no || '',
        telefon: targetProfile.telefon || '',
        web_sayfasi: targetProfile.web_sayfasi || '',
        kimdir: targetProfile.kimdir || '',
      })
    }
  }, [targetProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editProfile && currentUser?.role === 'yk_baskani') {
        // YK başkanı başkasını düzenliyor - doğrudan güncelleme
        const { createBrowserClient } = await import('@/lib/supabase')
        const supabase = createBrowserClient()
        const { error } = await supabase
          .from('profiles')
          .update(form)
          .eq('id', editProfile.id)
        
        if (error) throw error
        toast.success('Profil güncellendi')
      } else {
        // Kullanıcı kendi profilini güncelliyor
        await updateProfile(form)
        toast.success('Profil güncellendi')
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

  const isYKChairman = currentUser?.role === 'yk_baskani'
  const isEditingOther = editProfile && editProfile.id !== currentUser?.id

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditingOther ? `${form.full_name} - Düzenle` : 'Profilini Düzenle'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad Soyad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Görev */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText size={14} className="inline mr-1" />
                Görev
              </label>
              <input
                type="text"
                value={form.gorev}
                onChange={(e) => setForm({ ...form, gorev: e.target.value })}
                placeholder="örn: Başkan Yardımcısı"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Sicil No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sicil No
              </label>
              <input
                type="text"
                value={form.sicil_no}
                onChange={(e) => setForm({ ...form, sicil_no: e.target.value })}
                placeholder="Sicil numaranız"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone size={14} className="inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                placeholder="+90 555 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Web Sayfası */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe size={14} className="inline mr-1" />
                Web Sayfası
              </label>
              <input
                type="url"
                value={form.web_sayfasi}
                onChange={(e) => setForm({ ...form, web_sayfasi: e.target.value })}
                placeholder="https://ornek.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Kimdir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hakkında
              </label>
              <textarea
                value={form.kimdir}
                onChange={(e) => setForm({ ...form, kimdir: e.target.value })}
                placeholder="Kısa biyografi..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Buttons */}
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