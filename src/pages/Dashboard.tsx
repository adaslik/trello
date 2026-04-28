'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Settings, LayoutGrid, BarChart2, Calendar } from 'lucide-react'
import Sidebar from '@/components/Layout/Sidebar'
import KanbanBoard from '@/components/Board/KanbanBoard'
import GanttView from '@/components/Gantt/GanttView'
import CalendarView from '@/components/Calendar/CalendarView'
import TaskModal from '@/components/Task/TaskModal'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useTasks } from '@/hooks/useTasks'
import { createBrowserClient } from '@/lib/supabase'
import { WORKSPACE_COLORS, CAT_LABELS, canEditWorkspace } from '@/lib/constants'
import type { Task, Workspace, Profile } from '@/types'
import toast from 'react-hot-toast'

type View = 'kanban' | 'gantt' | 'takvim'

export default function Dashboard() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const { workspaces, labels, createWorkspace, updateWorkspace, deleteWorkspace, fetchLabels } = useWorkspaces()
  const [activeWsId, setActiveWsId] = useState<string | null>(null)
  const { tasks, createTask, updateTask, deleteTask, moveTask } = useTasks(activeWsId)
  const [view, setView] = useState<View>('kanban')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('bekleyen')
  const [members, setMembers] = useState<Profile[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [showWsModal, setShowWsModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [wsForm, setWsForm] = useState({ name: '', category: 'birim', color: WORKSPACE_COLORS[0], boards: '', access_roles: ['yk_baskani'] as string[], editId: null as string | null, defaultCat: 'birim' })

  const activeWs = workspaces.find(w => w.id === activeWsId)
  const wsLabels = activeWsId ? (labels[activeWsId] || []) : []
  const isYK = profile?.role === 'yk_baskani' || profile?.role === 'yk_uyesi'
  const canEdit = profile && activeWs ? canEditWorkspace(profile.role, activeWs.access_roles) : false

  // Set first workspace on load
  useEffect(() => {
    if (workspaces.length && !activeWsId) {
      setActiveWsId(workspaces[0].id)
    }
  }, [workspaces])

  // Fetch labels when workspace changes
  useEffect(() => {
    if (activeWsId) fetchLabels(activeWsId)
  }, [activeWsId])

  // Fetch members
  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setMembers(data as Profile[])
    })
  }, [])

  // Fetch notifications
  useEffect(() => {
    if (!profile) return
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data) })
  }, [profile])

  const selectWs = (id: string) => {
    setActiveWsId(id)
    setView('kanban')
  }

  const openTaskModal = (task: Task | null, status?: Task['status']) => {
    setEditingTask(task)
    setDefaultStatus(status || 'bekleyen')
    setTaskModalOpen(true)
  }

  const handleSaveTask = async (data: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, data)
      toast.success('Görev güncellendi')
    } else {
      await createTask(data)
      toast.success('Görev eklendi')
    }
  }

  const handleDeleteTask = async () => {
    if (!editingTask) return
    await deleteTask(editingTask.id)
  }

  // Workspace modal
  const openWsModal = (editId: string | null = null, defaultCat = 'birim') => {
    const ws = editId ? workspaces.find(w => w.id === editId) : null
    setWsForm({
      name: ws?.name || '',
      category: ws?.category || defaultCat,
      color: ws?.color || WORKSPACE_COLORS[0],
      boards: ws?.boards.join(', ') || '',
      access_roles: ws?.access_roles || ['yk_baskani'],
      editId,
      defaultCat,
    })
    setShowWsModal(true)
  }

  const saveWs = async () => {
    if (!wsForm.name.trim()) return
    const boards = wsForm.boards.split(',').map(s => s.trim()).filter(Boolean)
    const data = {
      name: wsForm.name,
      category: wsForm.category as Workspace['category'],
      color: wsForm.color,
      boards: boards.length ? boards : ['Genel'],
      access_roles: wsForm.access_roles as any,
    }
    if (wsForm.editId) {
      await updateWorkspace(wsForm.editId, data)
      toast.success('Çalışma alanı güncellendi')
    } else {
      const ws = await createWorkspace(data)
      if (ws) { setActiveWsId(ws.id); toast.success('Çalışma alanı oluşturuldu') }
    }
    setShowWsModal(false)
  }

  const unreadByWs: Record<string, number> = {}
  notifications.filter(n => !n.is_read).forEach(n => {
    unreadByWs[n.workspace_id] = (unreadByWs[n.workspace_id] || 0) + 1
  })
  const totalUnread = notifications.filter(n => !n.is_read).length

  if (!profile) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        workspaces={workspaces}
        activeWsId={activeWsId}
        profile={profile}
        unreadByWs={unreadByWs}
        onSelectWs={selectWs}
        onAddWs={(cat) => openWsModal(null, cat)}
        onManage={() => setShowManageModal(true)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-sm" style={{ background: activeWs?.color || '#888' }} />
            <h1 className="text-sm font-semibold text-slate-800">{activeWs?.name || 'Çalışma Alanı'}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${canEdit ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {canEdit ? 'Düzenleyebilirsin' : 'Görüntüle'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {([
                { v: 'kanban', icon: LayoutGrid, label: 'Kanban' },
                { v: 'gantt', icon: BarChart2, label: 'Gantt' },
                { v: 'takvim', icon: Calendar, label: 'Takvim' },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors ${
                    view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {canEdit && (
              <button
                onClick={() => openTaskModal(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
              >
                <Plus size={13} /> Görev
              </button>
            )}

            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Bell size={16} />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {view === 'kanban' && activeWsId && (
            <KanbanBoard
              tasks={tasks}
              labels={wsLabels}
              wsColor={activeWs?.color || '#534AB7'}
              canEdit={!!canEdit}
              onTaskClick={task => openTaskModal(task)}
              onAddTask={status => openTaskModal(null, status)}
              onMoveTask={moveTask}
            />
          )}
          {view === 'gantt' && (
            <GanttView
              tasks={tasks}
              wsColor={activeWs?.color || '#534AB7'}
              onTaskClick={task => openTaskModal(task)}
            />
          )}
          {view === 'takvim' && (
            <CalendarView
              tasks={tasks}
              labels={wsLabels}
              wsColor={activeWs?.color || '#534AB7'}
              onTaskClick={task => openTaskModal(task)}
            />
          )}
        </div>
      </div>

      {/* Notifications panel */}
      {showNotif && (
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Bildirimler</span>
            <button
              onClick={async () => {
                await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              Tümü okundu
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">Bildirim yok</div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${!n.is_read ? 'bg-indigo-50' : ''}`}
                onClick={() => { if (n.workspace_id) selectWs(n.workspace_id); setShowNotif(false) }}
              >
                <div className="text-[9px] text-indigo-600 font-medium mb-1">{n.workspace_name}</div>
                <div className="text-xs text-slate-700">{n.text}</div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModalOpen && (
        <TaskModal
          task={editingTask}
          wsColor={activeWs?.color || '#534AB7'}
          labels={wsLabels}
          members={members}
          defaultStatus={defaultStatus}
          onClose={() => { setTaskModalOpen(false); setEditingTask(null) }}
          onSave={handleSaveTask}
          onDelete={editingTask ? handleDeleteTask : undefined}
        />
      )}

      {/* Workspace Modal */}
      {showWsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              {wsForm.editId ? 'Çalışma Alanını Düzenle' : 'Yeni Çalışma Alanı'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Ad</label>
                <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                  value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))} placeholder="ör. Hukuk Komisyonu" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Kategori</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                  value={wsForm.category} onChange={e => setWsForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="yk">Yönetim</option>
                  <option value="komisyon">Komisyon</option>
                  <option value="temsilcilik">Temsilcilik</option>
                  <option value="birim">Birim</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1.5">Renk</label>
                <div className="flex gap-2 flex-wrap">
                  {WORKSPACE_COLORS.map(c => (
                    <div key={c} onClick={() => setWsForm(p => ({ ...p, color: c }))}
                      className={`w-6 h-6 rounded cursor-pointer border-2 ${wsForm.color === c ? 'border-slate-800' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Panolar (virgülle)</label>
                <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                  value={wsForm.boards} onChange={e => setWsForm(p => ({ ...p, boards: e.target.value }))} placeholder="ör. Toplantılar, Kararlar" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowWsModal(false)} className="px-4 py-2 text-sm text-slate-600">İptal</button>
              <button onClick={saveWs} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Çalışma Alanları</h3>
            <div className="space-y-2">
              {workspaces.map(ws => (
                <div key={ws.id} className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: ws.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{ws.name}</p>
                    <p className="text-[9px] text-slate-400">{ws.boards.length} pano</p>
                  </div>
                  <button onClick={() => { setShowManageModal(false); openWsModal(ws.id) }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded">✎</button>
                  {ws.category !== 'yk' && (
                    <button onClick={async () => {
                      if (confirm('Bu alanı silmek istediğinizden emin misiniz?')) {
                        await deleteWorkspace(ws.id)
                        if (activeWsId === ws.id) setActiveWsId(workspaces[0]?.id || null)
                        toast.success('Alan silindi')
                      }
                    }} className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded">Sil</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowManageModal(false)} className="px-4 py-2 text-sm text-slate-600">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
