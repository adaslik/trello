'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Check, X, Clock, Users } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface JoinRequest {
  id: string
  email: string
  full_name: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
}

interface JoinRequestCardProps {
  isYK?: boolean
}

export default function JoinRequestCard({ isYK = false }: JoinRequestCardProps) {
  const supabase = createBrowserClient()
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ email: '', full_name: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  // YK başkanı için: istekleri getir
  useEffect(() => {
    if (isYK) {
      supabase
        .from('join_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .then(({ data }) => {
          if (data) setRequests(data as JoinRequest[])
        })
    }
  }, [isYK])

  const pendingCount = requests.filter(r => r.status === 'pending').length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.from('join_requests').insert({
        email: formData.email,
        full_name: formData.full_name,
        message: formData.message,
      })
      if (error) throw error
      toast.success('Katılma isteğiniz gönderildi')
      setShowModal(false)
      setFormData({ email: '', full_name: '', message: '' })
    } catch (error) {
      console.error('Join request error:', error)
      toast.error('İstek gönderilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success('Katılma isteği onaylandı')
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success('Katılma isteği reddedildi')
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  // YK başkanı görünümü
  if (isYK) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Katılma İstekleri</h3>
                <p className="text-sm text-gray-500">{pendingCount} bekleyen istek</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                İncele ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* İncele Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Katılma İstekleri</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {requests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Henüz istek yok</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{req.full_name}</h4>
                            <p className="text-sm text-gray-500">{req.email}</p>
                            {req.message && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                "{req.message}"
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              <Clock size={12} className="inline mr-1" />
                              {new Date(req.requested_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Onayla"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Reddet"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : req.status === 'approved' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                Onaylandı
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                Reddedildi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Normal kullanıcı için katılma formu
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <UserPlus size={20} className="text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">YK&apos;ya Katıl</h3>
          <p className="text-sm text-gray-500">Yönetim kuruluna katılmak için istek gönder</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
        >
          İste
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Katılma İsteği</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Adınız ve soyadınız"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="E-posta adresiniz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj (İsteğe bağlı)</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Kendiniz hakkında kısa bir mesaj..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Gönderiliyor...' : 'İsteği Gönder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}