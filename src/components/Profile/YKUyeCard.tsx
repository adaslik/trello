'use client'

import { useState } from 'react'
import { 
  Phone, Mail, Globe, Edit2, Save, X, 
  Twitter, Linkedin, Instagram, Facebook 
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase'
import { ROLE_LABELS } from '@/lib/constants'
import toast from 'react-hot-toast'

interface YKUyeCardProps {
  editable?: boolean
}

export default function YKUyeCard({ editable = true }: YKUyeCardProps) {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    sicil_no: profile?.sicil_no || '',
    gorev: profile?.gorev || '',
    dogum_tarihi: profile?.dogum_tarihi || '',
    telefon: profile?.telefon || '',
    web_sayfasi: profile?.web_sayfasi || '',
    kimdir: profile?.kimdir || '',
    twitter: profile?.sosyal_medya?.twitter || '',
    linkedin: profile?.sosyal_medya?.linkedin || '',
    instagram: profile?.sosyal_medya?.instagram || '',
    facebook: profile?.sosyal_medya?.facebook || '',
  })

  const isYK = profile?.role === 'yk_baskani' || profile?.role === 'yk_uyesi'

  if (!profile || !isYK) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          sicil_no: formData.sicil_no || null,
          gorev: formData.gorev || null,
          dogum_tarihi: formData.dogum_tarihi || null,
          telefon: formData.telefon || null,
          web_sayfasi: formData.web_sayfasi || null,
          kimdir: formData.kimdir || null,
          sosyal_medya: {
            twitter: formData.twitter || null,
            linkedin: formData.linkedin || null,
            instagram: formData.instagram || null,
            facebook: formData.facebook || null,
          },
        })
        .eq('id', profile.id)

      if (error) throw error
      toast.success('Profil güncellendi')
      setEditing(false)
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  const SocialIcon = ({ type, value }: { type: string; value: string }) => {
    if (!value) return null
    const iconProps = { size: 16 }
    const linkProps = { href: value, target: '_blank', rel: 'noopener noreferrer', className: 'text-gray-500 hover:text-blue-600 transition-colors' }
    
    switch (type) {
      case 'twitter': return <a {...linkProps}><Twitter {...iconProps} /></a>
      case 'linkedin': return <a {...linkProps}><Linkedin {...iconProps} /></a>
      case 'instagram': return <a {...linkProps}><Instagram {...iconProps} /></a>
      case 'facebook': return <a {...linkProps}><Facebook {...iconProps} /></a>
      default: return null
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Profil Bilgileri</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              <Save size={16} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              <X size={16} />
              İptal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sicil No</label>
            <input
              type="text"
              value={formData.sicil_no}
              onChange={(e) => setFormData({ ...formData, sicil_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sicil numaranız"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Görev</label>
            <input
              type="text"
              value={formData.gorev}
              onChange={(e) => setFormData({ ...formData, gorev: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="YK Başkanı, YK Üyesi, vs."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
            <input
              type="date"
              value={formData.dogum_tarihi}
              onChange={(e) => setFormData({ ...formData, dogum_tarihi: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+90 555 123 4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web Sayfası</label>
            <input
              type="url"
              value={formData.web_sayfasi}
              onChange={(e) => setFormData({ ...formData, web_sayfasi: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kimdir (Kısa Tanıtım)</label>
          <textarea
            value={formData.kimdir}
            onChange={(e) => setFormData({ ...formData, kimdir: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Kendinizi kısaca tanıtın..."
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sosyal Medya</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Twitter size={20} className="text-gray-400" />
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="Twitter URL"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Linkedin size={20} className="text-gray-400" />
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="LinkedIn URL"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Instagram size={20} className="text-gray-400" />
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="Instagram URL"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Facebook size={20} className="text-gray-400" />
              <input
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="Facebook URL"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Görüntüleme modu
  const hasData = formData.sicil_no || formData.gorev || formData.telefon || formData.kimdir

  if (!hasData && !editable) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-100">
              {profile.initials}
            </div>
          )}
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
              <p className="text-sm text-gray-500">{ROLE_LABELS[profile.role]}</p>
            </div>
            {editable && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Edit2 size={16} />
                Düzenle
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {formData.sicil_no && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-800">Sicil:</span>
                <span>{formData.sicil_no}</span>
              </div>
            )}
            {formData.gorev && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-800">Görev:</span>
                <span>{formData.gorev}</span>
              </div>
            )}
            {formData.dogum_tarihi && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-800">Doğum:</span>
                <span>{formatDate(formData.dogum_tarihi)}</span>
              </div>
            )}
            {formData.telefon && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={16} />
                <a href={`tel:${formData.telefon}`} className="hover:text-blue-600">{formData.telefon}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={16} />
              <a href={`mailto:${profile.email}`} className="hover:text-blue-600 truncate">{profile.email}</a>
            </div>
            {formData.web_sayfasi && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe size={16} />
                <a href={formData.web_sayfasi} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate">
                  {formData.web_sayfasi.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Sosyal Medya */}
          {(formData.twitter || formData.linkedin || formData.instagram || formData.facebook) && (
            <div className="mt-4 flex items-center gap-4">
              <SocialIcon type="twitter" value={formData.twitter} />
              <SocialIcon type="linkedin" value={formData.linkedin} />
              <SocialIcon type="instagram" value={formData.instagram} />
              <SocialIcon type="facebook" value={formData.facebook} />
            </div>
          )}

          {/* Kimdir */}
          {formData.kimdir && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Kimdir?</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{formData.kimdir}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}