'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, Phone, Globe, Calendar, ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'
import ProfileEditModal from '@/components/Profile/ProfileEditModal'
import { useAuth } from '@/hooks/useAuth'

export default function YKUyelerPage() {
  const supabase = createBrowserClient()
  const { profile: currentUser } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .or('role.eq.yk_baskani,role.eq.yk_uyesi')
      .order('full_name')
      .then(({ data }) => {
        if (data) setMembers(data as Profile[])
        setLoading(false)
      })
  }, [])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users size={28} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">YK Üyeleri</h1>
              <p className="text-gray-500">Yönetim kurulu üyeleri ve iletişim bilgileri</p>
            </div>
          </div>
        </div>

        {/* Members Grid */}
        {members.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Henüz YK üyesi bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {member.initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{member.full_name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{ROLE_LABELS[member.role]}</p>
                    {member.gorev && (
                      <p className="text-sm text-gray-500 truncate">{member.gorev}</p>
                    )}
                  </div>
                </div>
                
                {/* Quick Info */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {member.telefon && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{member.telefon}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.web_sayfasi && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe size={14} />
                      <span className="truncate">{member.web_sayfasi.replace(/^https?:\/\//, '')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {selectedMember.avatar_url ? (
                    <img
                      src={selectedMember.avatar_url}
                      alt={selectedMember.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                      {selectedMember.initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{selectedMember.full_name}</h2>
                    <p className="text-blue-600 font-medium">{ROLE_LABELS[selectedMember.role]}</p>
                    {selectedMember.gorev && (
                      <p className="text-gray-600 mt-1">{selectedMember.gorev}</p>
                    )}
                  </div>
                  {currentUser?.role === 'yk_baskani' && (
                    <button
                      onClick={() => { setEditingProfile(selectedMember); setShowProfileModal(true) }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Düzenle"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {selectedMember.sicil_no && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Sicil No</span>
                      <span className="font-medium text-gray-900">{selectedMember.sicil_no}</span>
                    </div>
                  )}
                  {selectedMember.dogum_tarihi && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Doğum Tarihi</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedMember.dogum_tarihi)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">E-posta</span>
                    <a href={`mailto:${selectedMember.email}`} className="font-medium text-blue-600 hover:underline">
                      {selectedMember.email}
                    </a>
                  </div>
                  {selectedMember.telefon && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Telefon</span>
                      <a href={`tel:${selectedMember.telefon}`} className="font-medium text-blue-600 hover:underline">
                        {selectedMember.telefon}
                      </a>
                    </div>
                  )}
                  {selectedMember.web_sayfasi && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Web Sayfası</span>
                      <a
                        href={selectedMember.web_sayfasi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {selectedMember.web_sayfasi.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {selectedMember.sosyal_medya && Object.keys(selectedMember.sosyal_medya).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Sosyal Medya</h3>
                    <div className="flex gap-3">
                      {selectedMember.sosyal_medya?.twitter && (
                        <a
                          href={selectedMember.sosyal_medya.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <span className="text-sm">Twitter</span>
                        </a>
                      )}
                      {selectedMember.sosyal_medya?.linkedin && (
                        <a
                          href={selectedMember.sosyal_medya.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <span className="text-sm">LinkedIn</span>
                        </a>
                      )}
                      {selectedMember.sosyal_medya?.instagram && (
                        <a
                          href={selectedMember.sosyal_medya.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <span className="text-sm">Instagram</span>
                        </a>
                      )}
                      {selectedMember.sosyal_medya?.facebook && (
                        <a
                          href={selectedMember.sosyal_medya.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <span className="text-sm">Facebook</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Kimdir */}
                {selectedMember.kimdir && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Kimdir?</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedMember.kimdir}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Edit Modal */}
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => { setShowProfileModal(false); setEditingProfile(null) }}
          editProfile={editingProfile}
        />
      </div>
    </div>
  )
}