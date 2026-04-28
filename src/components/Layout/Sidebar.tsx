'use client'

import { Plus, LogOut, Settings } from 'lucide-react'
import type { Workspace, Profile } from '@/types'
import { CAT_ORDER, CAT_LABELS, lightenColor } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'

interface SidebarProps {
  workspaces: Workspace[]
  activeWsId: string | null
  profile: Profile
  unreadByWs: Record<string, number>
  onSelectWs: (id: string) => void
  onAddWs: (cat: string) => void
  onManage: () => void
}

export default function Sidebar({
  workspaces, activeWsId, profile, unreadByWs,
  onSelectWs, onAddWs, onManage,
}: SidebarProps) {
  const { signOut } = useAuth()
  const isYK = profile.role === 'yk_baskani' || profile.role === 'yk_uyesi'

  const grouped: Record<string, Workspace[]> = {}
  CAT_ORDER.forEach(c => { grouped[c] = [] })
  workspaces.forEach(ws => {
    if (grouped[ws.category]) grouped[ws.category].push(ws)
  })

  return (
    <div className="w-52 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      {/* User */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
          </div>
        </div>
        <div className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded-lg truncate">
          {profile.role.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto py-2">
        {CAT_ORDER.map(cat => {
          const items = grouped[cat]
          if (!items.length) return null
          return (
            <div key={cat} className="mb-1">
              <div className="flex items-center justify-between px-4 py-1.5">
                <span className="text-[9px] font-bold text-slate-500 tracking-widest">
                  {CAT_LABELS[cat]}
                </span>
                {isYK && (
                  <button
                    onClick={() => onAddWs(cat)}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>
              {items.map(ws => {
                const active = ws.id === activeWsId
                const unread = unreadByWs[ws.id] || 0
                return (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWs(ws.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                      active
                        ? 'bg-slate-700 border-r-2 border-indigo-400'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ws.color }} />
                    <span className={`text-[11px] flex-1 truncate ${active ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {ws.name}
                    </span>
                    {unread > 0 && (
                      <span className="text-[8px] bg-red-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 flex gap-2">
        {isYK && (
          <button onClick={onManage} className="flex-1 flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-white py-1.5 rounded-lg hover:bg-slate-800">
            <Settings size={12} /> Yönet
          </button>
        )}
        <button onClick={signOut} className="flex-1 flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-white py-1.5 rounded-lg hover:bg-slate-800">
          <LogOut size={12} /> Çıkış
        </button>
      </div>
    </div>
  )
}
