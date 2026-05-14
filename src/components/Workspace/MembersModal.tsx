'use client'

import { useState } from 'react'
import { X, Plus, Shield, Eye, UserMinus, Building2, Layout } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Workspace, MembershipRole } from '@/types'
import { useMemberships } from '@/hooks/useMemberships'
import { useAuth } from '@/hooks/useAuth'

interface MembersModalProps {
  workspace: Workspace
  allProfiles: Profile[]
  onClose: () => void
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  admin: 'Yönetici',
  observer: 'Gözlemci',
}

const ROLE_COLORS: Record<MembershipRole, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  observer: 'bg-slate-100 text-slate-600',
}

function Avatar({ profile }: { profile: { initials: string; avatar_url?: string | null; full_name: string } }) {
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {profile.initials}
    </div>
  )
}

export default function MembersModal({ workspace, allProfiles, onClose }: MembersModalProps) {
  const { profile: currentUser } = useAuth()
  const [tab, setTab] = useState<'workspace' | 'board'>('workspace')
  const [activeBoard, setActiveBoard] = useState(workspace.boards[0] || '')
  const [addingWs, setAddingWs] = useState(false)
  const [addingBoard, setAddingBoard] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<MembershipRole>('observer')

  const {
    wsMembers, boardMembers, loading,
    addWsMember, updateWsMemberRole, removeWsMember,
    addBoardMember, updateBoardMemberRole, removeBoardMember,
  } = useMemberships(workspace.id)

  const isAdmin = (currentUser?.role && ['yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi'].includes(currentUser.role))
    || wsMembers.some(m => m.user_id === currentUser?.id && m.role === 'admin')

  const sortByRole = <T extends { role: MembershipRole }>(list: T[]) =>
    [...list].sort((a, b) => (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1))

  const activeBoardMembers = sortByRole(boardMembers.filter(m => m.board_name === activeBoard))
  const sortedWsMembers = sortByRole(wsMembers)

  const unaddedWsProfiles = allProfiles.filter(p =>
    p.id !== currentUser?.id && !wsMembers.some(m => m.user_id === p.id)
  )

  const unaddedBoardProfiles = allProfiles.filter(p =>
    !activeBoardMembers.some(m => m.user_id === p.id)
  )

  const handleAddWsMember = async () => {
    if (!selectedUserId || !currentUser) return
    const error = await addWsMember(selectedUserId, selectedRole, currentUser.id)
    if (error) {
      toast.error('Eklenemedi: ' + error.message)
    } else {
      toast.success('Üye eklendi' + (selectedRole === 'admin' ? ' — tüm panolarda yönetici yetkisi verildi' : ''))
      setAddingWs(false)
      setSelectedUserId('')
      setSelectedRole('observer')
    }
  }

  const handleAddBoardMember = async () => {
    if (!selectedUserId || !currentUser) return
    const error = await addBoardMember(activeBoard, selectedUserId, selectedRole, currentUser.id)
    if (error) {
      toast.error('Eklenemedi: ' + error.message)
    } else {
      toast.success('Pano üyesi eklendi')
      setAddingBoard(false)
      setSelectedUserId('')
      setSelectedRole('observer')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl mt-12 mb-8 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: workspace.color }} />
            <h2 className="text-sm font-bold text-slate-800">{workspace.name} — Üyeler</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab('workspace')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === 'workspace' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={12} /> Çalışma Alanı
          </button>
          <button
            onClick={() => setTab('board')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === 'board' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layout size={12} /> Panolar
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'workspace' ? (
            <>
              {/* Info */}
              <p className="text-[10px] text-slate-400 mb-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Çalışma alanına <strong>Yönetici</strong> olarak eklenenler, bu alanın tüm panolarında otomatik olarak yönetici yetkisi kazanır.
              </p>

              {/* Role summary */}
              {wsMembers.length > 0 && (
                <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <Shield size={10} /> {wsMembers.filter(m => m.role === 'admin').length} Yönetici
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Eye size={10} /> {wsMembers.filter(m => m.role === 'observer').length} Gözlemci
                  </span>
                </div>
              )}

              {/* Member list */}
              <div className="space-y-1 mb-3">
                {sortedWsMembers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Henüz özel üye yok</p>
                )}
                {sortedWsMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50">
                    <Avatar profile={m.profile || { initials: '?', full_name: '?', avatar_url: null }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{m.profile?.full_name || '—'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.profile?.email}</p>
                    </div>
                    {isAdmin ? (
                      <select
                        value={m.role}
                        onChange={async e => {
                          const err = await updateWsMemberRole(m.id, e.target.value as MembershipRole)
                          if (err) toast.error('Güncellenemedi')
                          else toast.success('Rol güncellendi')
                        }}
                        className="text-[10px] px-2 py-1 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="observer">Gözlemci</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${ROLE_COLORS[m.role]}`}>
                        {m.role === 'admin' ? <Shield size={9} /> : <Eye size={9} />}
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                    {(isAdmin || m.user_id === currentUser?.id) && (
                      <button
                        onClick={async () => { await removeWsMember(m.id); toast.success('Üye kaldırıldı') }}
                        className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add member */}
              {isAdmin && !addingWs && (
                <button
                  onClick={() => setAddingWs(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={13} /> Üye Ekle
                </button>
              )}
              {isAdmin && addingWs && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">— Kişi seç —</option>
                    {unaddedWsProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value as MembershipRole)}
                      className="flex-1 text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="admin">Yönetici</option>
                      <option value="observer">Gözlemci</option>
                    </select>
                    <button
                      onClick={handleAddWsMember}
                      disabled={!selectedUserId}
                      className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => { setAddingWs(false); setSelectedUserId('') }}
                      className="px-3 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Board selector tabs */}
              {workspace.boards.length > 1 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {workspace.boards.map(b => (
                    <button
                      key={b}
                      onClick={() => setActiveBoard(b)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        activeBoard === b ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              {/* Board role summary */}
              {activeBoardMembers.length > 0 && (
                <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <Shield size={10} /> {activeBoardMembers.filter(m => m.role === 'admin').length} Yönetici
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Eye size={10} /> {activeBoardMembers.filter(m => m.role === 'observer').length} Gözlemci
                  </span>
                </div>
              )}

              {/* Board member list */}
              <div className="space-y-1 mb-3">
                {activeBoardMembers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Bu panoda özel üye yok</p>
                )}
                {activeBoardMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50">
                    <Avatar profile={m.profile || { initials: '?', full_name: '?', avatar_url: null }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{m.profile?.full_name || '—'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.profile?.email}</p>
                    </div>
                    {isAdmin ? (
                      <select
                        value={m.role}
                        onChange={async e => {
                          const err = await updateBoardMemberRole(m.id, e.target.value as MembershipRole)
                          if (err) toast.error('Güncellenemedi')
                          else toast.success('Rol güncellendi')
                        }}
                        className="text-[10px] px-2 py-1 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="observer">Gözlemci</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${ROLE_COLORS[m.role]}`}>
                        {m.role === 'admin' ? <Shield size={9} /> : <Eye size={9} />}
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                    {(isAdmin || m.user_id === currentUser?.id) && (
                      <button
                        onClick={async () => { await removeBoardMember(m.id); toast.success('Üye kaldırıldı') }}
                        className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add board member */}
              {isAdmin && !addingBoard && (
                <button
                  onClick={() => setAddingBoard(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={13} /> Pano Üyesi Ekle
                </button>
              )}
              {isAdmin && addingBoard && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">— Kişi seç —</option>
                    {unaddedBoardProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value as MembershipRole)}
                      className="flex-1 text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="admin">Yönetici</option>
                      <option value="observer">Gözlemci</option>
                    </select>
                    <button
                      onClick={handleAddBoardMember}
                      disabled={!selectedUserId}
                      className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => { setAddingBoard(false); setSelectedUserId('') }}
                      className="px-3 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
