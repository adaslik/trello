'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Settings, LayoutGrid, BarChart2, Calendar, Home, Users, LogOut, User, Menu, X as XIcon, Shield, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Layout/Sidebar'
import KanbanBoard from '@/components/Board/KanbanBoard'
import GanttView from '@/components/Gantt/GanttView'
import CalendarView from '@/components/Calendar/CalendarView'
import TaskModal from '@/components/Task/TaskModal'
import HomeView from '@/components/Home/HomeView'
import MembersModal from '@/components/Workspace/MembersModal'
import YKUyeCard from '@/components/Profile/YKUyeCard'
import JoinRequestCard from '@/components/JoinRequest/JoinRequestCard'
import ProfileEditModal from '@/components/Profile/ProfileEditModal'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useTasks } from '@/hooks/useTasks'
import { useAssignedTasks } from '@/hooks/useAssignedTasks'
import { useAssignedChecklists } from '@/hooks/useAssignedChecklists'
import { useMemberships } from '@/hooks/useMemberships'
import { createBrowserClient } from '@/lib/supabase'
import { WORKSPACE_COLORS, CAT_LABELS, canEditWorkspace, STATUS_LABELS, PRIORITY_LABELS, isYKAdmin, isYKMember } from '@/lib/constants'
import type { Task, Workspace, Profile } from '@/types'
import toast from 'react-hot-toast'

type View = 'anasayfa' | 'kanban' | 'gantt' | 'takvim'

export default function Dashboard() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const supabase = createBrowserClient()
  const { workspaces, labels, createWorkspace, updateWorkspace, deleteWorkspace, fetchLabels } = useWorkspaces()
  const [activeWsId, setActiveWsId] = useState<string | null>(null)
  const { tasks, createTask, updateTask, deleteTask, moveTask } = useTasks(activeWsId)
  const { tasks: assignedTasks, updateTask: updateAssignedTask } = useAssignedTasks()
  const { items: assignedChecklists } = useAssignedChecklists()
  const [view, setView] = useState<View>('anasayfa')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editFromAssigned, setEditFromAssigned] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('bekleyen')
  const [members, setMembers] = useState<Profile[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [showWsModal, setShowWsModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showYKCard, setShowYKCard] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [wsForm, setWsForm] = useState({ name: '', category: 'birim', color: WORKSPACE_COLORS[0], boards: '', access_roles: ['yk_baskani'] as string[], editId: null as string | null, defaultCat: 'birim' })

  const activeWs = workspaces.find(w => w.id === activeWsId)
  const wsLabels = activeWsId ? (labels[activeWsId] || []) : []
  const isYK = isYKMember(profile?.role)
  const canEdit = profile && activeWs ? canEditWorkspace(profile.role, activeWs.access_roles) : false
  const { wsMembers, refetch: refetchMembers } = useMemberships(activeWsId)
  const isBoardAdmin = profile ? (
    isYKMember(profile.role) ||
    wsMembers.some(m => m.user_id === profile.id && m.role === 'admin')
  ) : false
  const effectiveCanEdit = canEdit || isBoardAdmin

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

  // Fetch notifications + realtime subscription
  useEffect(() => {
    if (!profile) return

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data) })

    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev.slice(0, 19)])
        toast(`🔔 ${(payload.new as any).text}`, { duration: 4000 })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  const selectWs = (id: string) => {
    setActiveWsId(id)
    setView('kanban')
  }

  const selectWsFromHome = (id: string) => {
    setActiveWsId(id)
    setView('kanban')
  }

  const openTaskModal = (task: Task | null, status?: Task['status']) => {
    setEditFromAssigned(false)
    setEditingTask(task)
    setDefaultStatus(status || 'bekleyen')
    setTaskModalOpen(true)
  }

  const openAssignedTask = async (task: Task) => {
    if (!labels[task.workspace_id]) {
      await fetchLabels(task.workspace_id)
    }
    setEditFromAssigned(true)
    setEditingTask(task)
    setTaskModalOpen(true)
  }

  const openChecklistTask = async (taskId: string, workspaceId: string) => {
    if (!labels[workspaceId]) await fetchLabels(workspaceId)
    const { data } = await supabase.from('tasks').select('*').eq('id', taskId).single()
    if (data) {
      setEditFromAssigned(true)
      setEditingTask(data as Task)
      setTaskModalOpen(true)
    }
  }

  // Bildirim gönderme yardımcısı
  const sendNotifs = useCallback(async (
    recipientIds: string[],
    wsId: string,
    wsName: string,
    text: string,
  ) => {
    if (!recipientIds.length) return
    await supabase.from('notifications').insert(
      recipientIds.map(uid => ({ user_id: uid, workspace_id: wsId, workspace_name: wsName, text }))
    )
  }, [])

  // Detect changed fields and build activity entries
  const detectChanges = (old: Task, updates: Partial<Task>) => {
    if (!profile) return []
    const base = { user_id: profile.id, user_name: profile.full_name, user_initials: profile.initials }
    const entries: any[] = []

    if (updates.status !== undefined && updates.status !== old.status)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'status',
        old_value: STATUS_LABELS[old.status as keyof typeof STATUS_LABELS] || old.status,
        new_value: STATUS_LABELS[updates.status as keyof typeof STATUS_LABELS] || updates.status })

    if (updates.priority !== undefined && updates.priority !== old.priority)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'priority',
        old_value: PRIORITY_LABELS[old.priority as keyof typeof PRIORITY_LABELS],
        new_value: PRIORITY_LABELS[updates.priority as keyof typeof PRIORITY_LABELS] })

    if (updates.title !== undefined && updates.title !== old.title)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'title',
        old_value: old.title, new_value: updates.title })

    if (updates.description !== undefined && updates.description !== old.description)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'description',
        old_value: null, new_value: null })

    if (updates.assignees !== undefined) {
      const oldIds = [...(old.assignees || [])].map(a => a.id).sort().join(',')
      const newIds = [...(updates.assignees || [])].map(a => a.id).sort().join(',')
      if (oldIds !== newIds)
        entries.push({ ...base, action_type: 'field_changed', field_name: 'assignees',
          old_value: (old.assignees || []).map(a => a.full_name).join(', '),
          new_value: (updates.assignees || []).map(a => a.full_name).join(', ') })
    }

    if (updates.end_date !== undefined && updates.end_date !== old.end_date)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'end_date',
        old_value: old.end_date, new_value: updates.end_date })

    if (updates.start_date !== undefined && updates.start_date !== old.start_date)
      entries.push({ ...base, action_type: 'field_changed', field_name: 'start_date',
        old_value: old.start_date, new_value: updates.start_date })

    if (updates.comments) {
      const newComments = updates.comments.filter(c => !(old.comments || []).find(oc => oc.id === c.id))
      for (const c of newComments)
        entries.push({ ...base, action_type: 'comment_added', field_name: null, old_value: null, new_value: c.text })
    }

    return entries
  }

  // Sync mirrored tasks with the same field updates
  const syncMirrors = async (task: Task, updates: Partial<Task>) => {
    const rootId = task.mirror_of || task.id
    const { data: siblings } = await supabase
      .from('tasks')
      .select('id')
      .or(`id.eq.${rootId},mirror_of.eq.${rootId}`)
      .neq('id', task.id)
    if (!siblings?.length) return

    const syncFields: (keyof Task)[] = ['title', 'description', 'status', 'priority', 'assignees', 'start_date', 'end_date', 'drive_links', 'comments', 'cover_pattern', 'cover_image_url']
    const syncData: Partial<Task> = {}
    for (const f of syncFields) {
      if (f in updates) (syncData as any)[f] = (updates as any)[f]
    }
    if (!Object.keys(syncData).length) return

    for (const s of siblings) {
      await supabase.from('tasks').update(syncData).eq('id', s.id)
    }
  }

  const handleSaveTask = async (data: Partial<Task>) => {
    if (editingTask) {
      const changes = detectChanges(editingTask, data)
      if (editFromAssigned) {
        await updateAssignedTask(editingTask.id, data)
      } else {
        await updateTask(editingTask.id, data)
      }
      // Log activity entries
      for (const entry of changes) {
        await supabase.from('task_activities').insert({ task_id: editingTask.id, ...entry })
      }
      // Sync mirrors
      await syncMirrors(editingTask, data)

      // Bildirimler
      if (profile) {
        const taskWs = workspaces.find(w => w.id === editingTask.workspace_id)
        const wsId   = editingTask.workspace_id
        const wsName = taskWs?.name || ''
        const currentAssignees = (data.assignees ?? editingTask.assignees ?? []).map(a => a.id)
        const others = currentAssignees.filter(id => id !== profile.id)

        for (const entry of changes) {
          if (entry.action_type === 'field_changed' && entry.field_name === 'status') {
            await sendNotifs(others, wsId, wsName,
              `"${editingTask.title}" görevi "${entry.new_value}" durumuna alındı`)
          } else if (entry.action_type === 'comment_added') {
            await sendNotifs(others, wsId, wsName,
              `${profile.full_name}, "${editingTask.title}" görevine yorum ekledi`)
          } else if (entry.action_type === 'field_changed' && entry.field_name === 'assignees') {
            const oldIds = (editingTask.assignees ?? []).map(a => a.id)
            const newlyAdded = (data.assignees ?? [])
              .map(a => a.id)
              .filter(id => !oldIds.includes(id) && id !== profile.id)
            await sendNotifs(newlyAdded, wsId, wsName,
              `"${editingTask.title}" görevine atandınız`)
          } else if (entry.action_type === 'field_changed' && entry.field_name === 'priority') {
            await sendNotifs(others, wsId, wsName,
              `"${editingTask.title}" görevinin önceliği "${entry.new_value}" olarak güncellendi`)
          }
        }
      }

      toast.success('Görev güncellendi')
    } else {
      const created = await createTask(data)
      if (created && profile) {
        await supabase.from('task_activities').insert({
          task_id: created.id,
          user_id: profile.id,
          user_name: profile.full_name,
          user_initials: profile.initials,
          action_type: 'created',
          field_name: null, old_value: null, new_value: null,
        })
        // Yeni görev atandı bildirimi
        const taskWs = workspaces.find(w => w.id === created.workspace_id)
        const recipients = (created.assignees ?? [])
          .map(a => a.id)
          .filter(id => id !== profile.id)
        await sendNotifs(recipients, created.workspace_id, taskWs?.name || '',
          `Size yeni bir görev atandı: "${created.title}"`)
      }
      toast.success('Görev eklendi')
    }
  }

  const handleMirror = async (workspaceId: string) => {
    if (!editingTask || !profile) return
    const rootId = editingTask.mirror_of || editingTask.id
    // Fetch the root task to copy all fields
    const sourceTask = editingTask.mirror_of
      ? ((await supabase.from('tasks').select('*').eq('id', rootId).single()).data as Task)
      : editingTask
    if (!sourceTask) { toast.error('Kaynak görev bulunamadı'); return }

    const { id, workspace_id, mirror_of, created_at, updated_at, label_ids, board, position, ...rest } = sourceTask
    const { error } = await supabase.from('tasks').insert({
      ...rest,
      workspace_id: workspaceId,
      mirror_of: rootId,
      created_by: profile.id,
      position: 0,
      label_ids: [],
      board: null,
    })
    if (error) { toast.error('Aynalama oluşturulamadı'); return }

    const targetWsName = workspaces.find(w => w.id === workspaceId)?.name || workspaceId
    await supabase.from('task_activities').insert({
      task_id: rootId,
      user_id: profile.id,
      user_name: profile.full_name,
      user_initials: profile.initials,
      action_type: 'mirrored',
      field_name: null, old_value: null, new_value: targetWsName,
    })
    toast.success(`"${targetWsName}" alanına aynalaması oluşturuldu`)
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

  const modalWsId = editFromAssigned && editingTask ? editingTask.workspace_id : activeWsId
  const modalWs = workspaces.find(w => w.id === modalWsId)
  const modalLabels = modalWsId ? (labels[modalWsId] || []) : []

  if (!profile) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar — masaüstünde görünür, mobilde gizlenir */}
      <div className="hidden md:flex">
      <Sidebar
        workspaces={workspaces}
        activeWsId={activeWsId}
        profile={profile}
        unreadByWs={unreadByWs}
        onSelectWs={selectWs}
        onAddWs={(cat) => openWsModal(null, cat)}
        onManage={() => setShowManageModal(true)}
        onEditProfile={() => setShowProfileModal(true)}
      />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Mobilde workspace seçici */}
            <div className="md:hidden flex-1 min-w-0">
              <select
                className="w-full text-sm font-medium text-slate-800 bg-transparent border-none outline-none truncate"
                value={activeWsId || ''}
                onChange={e => { if (e.target.value) selectWs(e.target.value) }}
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
            {/* Masaüstünde mevcut başlık */}
            <div className="hidden md:flex items-center gap-3">
              {view === 'anasayfa' ? (
                <h1 className="text-sm font-semibold text-slate-800">Ana Sayfa</h1>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-sm" style={{ background: activeWs?.color || '#888' }} />
                  <h1 className="text-sm font-semibold text-slate-800">{activeWs?.name || 'Çalışma Alanı'}</h1>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${effectiveCanEdit ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {effectiveCanEdit ? 'Düzenleyebilirsin' : 'Görüntüle'}
                  </span>
                  {activeWs && (
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {wsMembers.length > 0 ? (
                        <div className="flex items-center -space-x-1.5 mr-0.5">
                          {wsMembers.slice(0, 4).map(m => (
                            <div
                              key={m.id}
                              className="relative"
                              title={`${m.profile?.full_name || '?'} · ${m.role === 'admin' ? 'Yönetici' : 'Gözlemci'}`}
                            >
                              {m.profile?.avatar_url ? (
                                <img src={m.profile.avatar_url} alt={m.profile.full_name} className="w-5 h-5 rounded-full object-cover ring-1 ring-white" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                                  {m.profile?.initials || '?'}
                                </div>
                              )}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center ring-1 ring-white ${m.role === 'admin' ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                                {m.role === 'admin' ? <Shield size={5} className="text-white" /> : <Eye size={5} className="text-white" />}
                              </span>
                            </div>
                          ))}
                          {wsMembers.length > 4 && (
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                              +{wsMembers.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Users size={11} />
                      )}
                      Üyeler
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Masaüstünde gösterilecekler */}
            <div className="hidden md:flex items-center gap-2">
              {/* Home button */}
              <button
                onClick={() => setView('anasayfa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                  view === 'anasayfa' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
              >
                <Home size={12} /> Ana Sayfa
              </button>

              {/* YK Üyeleri button */}
              <button
                onClick={() => router.push('/yk-uyeleri')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Users size={12} /> YK Üyeleri
              </button>

              {/* Çalışanlar button */}
              <button
                onClick={() => router.push('/calisanlar')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Users size={12} /> Çalışanlar
              </button>

              {/* Yeni YK Üyesi - Sadece YK Başkanı için */}
              {isYK && (
                <button
                  onClick={() => { setEditingProfile(null); setShowProfileModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  <Plus size={12} /> Yeni Üye
                </button>
              )}

              {/* View switcher */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {([
                  { v: 'kanban', icon: LayoutGrid, label: 'Kanban' },
                  { v: 'gantt', icon: BarChart2, label: 'Gantt' },
                  { v: 'takvim', icon: Calendar, label: 'Takvim' },
                ] as const).map(({ v, icon: Icon, label }) => (
                  <button
                    key={v}
                    onClick={() => { if (!activeWsId && workspaces.length) setActiveWsId(workspaces[0].id); setView(v) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors ${
                      view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {effectiveCanEdit && view !== 'anasayfa' && (
              <button
                onClick={() => openTaskModal(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
              >
                <Plus size={13} /> <span className="hidden sm:inline">Görev</span>
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

            {/* Mobil profil / menü butonu */}
            <div className="relative md:hidden">
              <button
                onClick={() => setShowMobileMenu(v => !v)}
                className="w-8 h-8 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0"
              >
                {profile?.initials}
              </button>
              {showMobileMenu && (
                <>
                  {/* Arka plan kapanma alanı */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                  <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-52 py-2 overflow-hidden">
                    {/* Kullanıcı bilgisi */}
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{profile?.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
                    </div>
                    {/* Workspace listesi */}
                    <div className="px-3 py-1">
                      <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1">ÇALIŞMA ALANLARI</p>
                      <div className="space-y-0.5 max-h-40 overflow-y-auto">
                        {workspaces.map(ws => (
                          <button
                            key={ws.id}
                            onClick={() => { selectWs(ws.id); setShowMobileMenu(false) }}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                              activeWsId === ws.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ws.color }} />
                            <span className="truncate">{ws.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 mt-2 pt-1">
                      <button
                        onClick={() => { router.push('/yk-uyeleri'); setShowMobileMenu(false) }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Users size={13} /> YK Üyeleri
                      </button>
                      <button
                        onClick={() => { router.push('/calisanlar'); setShowMobileMenu(false) }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Users size={13} /> Çalışanlar
                      </button>
                      <button
                        onClick={() => { setEditingProfile(null); setShowProfileModal(true); setShowMobileMenu(false) }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <User size={13} /> Profilimi Düzenle
                      </button>
                      {isYK && (
                        <button
                          onClick={() => { openWsModal(); setShowMobileMenu(false) }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Plus size={13} /> Yeni Çalışma Alanı
                        </button>
                      )}
                      <button
                        onClick={() => signOut()}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-red-50"
                      >
                        <LogOut size={13} /> Çıkış Yap
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 pb-20 md:pb-5">
          {view === 'anasayfa' && profile && (
            <>
              {isYK && showYKCard && <YKUyeCard />}
              <HomeView
                workspaces={workspaces}
                profile={profile}
                notifications={notifications}
                assignedTasks={assignedTasks}
                assignedChecklists={assignedChecklists}
                onSelectWs={selectWsFromHome}
                onAssignedTaskClick={openAssignedTask}
                onAssignedChecklistClick={openChecklistTask}
                showProfileCard={showYKCard}
                onToggleProfileCard={isYK ? () => setShowYKCard(v => !v) : undefined}
                joinRequestNode={<JoinRequestCard isYK={isYK} compact />}
              />
            </>
          )}
          {view === 'kanban' && activeWsId && (
            <KanbanBoard
              wsId={activeWsId}
              tasks={tasks}
              labels={wsLabels}
              wsColor={activeWs?.color || '#534AB7'}
              canEdit={!!effectiveCanEdit}
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
          wsColor={modalWs?.color || '#534AB7'}
          labels={modalLabels}
          members={members}
          workspaces={workspaces}
          defaultStatus={defaultStatus}
          onClose={() => { setTaskModalOpen(false); setEditingTask(null); setEditFromAssigned(false) }}
          onSave={handleSaveTask}
          onDelete={editingTask && !editFromAssigned ? handleDeleteTask : undefined}
          onMirror={handleMirror}
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

      {/* Members Modal */}
      {showMembersModal && activeWs && (
        <MembersModal
          workspace={activeWs}
          allProfiles={members}
          onClose={() => { setShowMembersModal(false); refetchMembers() }}
        />
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => { setShowProfileModal(false); setEditingProfile(null) }}
        editProfile={editingProfile}
        isCreateMode={!editingProfile && isYK}
      />

      {/* Mobil Alt Navigasyon */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40 safe-area-pb">
        {([
          { v: 'anasayfa', icon: Home, label: 'Ana Sayfa' },
          { v: 'kanban',   icon: LayoutGrid, label: 'Tahta' },
          { v: 'gantt',    icon: BarChart2,  label: 'Gantt' },
          { v: 'takvim',   icon: Calendar,   label: 'Takvim' },
        ] as const).map(({ v, icon: Icon, label }) => (
          <button
            key={v}
            onClick={() => {
              if (v !== 'anasayfa' && !activeWsId && workspaces.length) setActiveWsId(workspaces[0].id)
              setView(v)
            }}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-medium transition-colors ${
              view === v ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Icon size={20} strokeWidth={view === v ? 2.5 : 1.5} />
            {label}
          </button>
        ))}
        {totalUnread > 0 && (
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-medium text-slate-400 relative"
          >
            <div className="relative">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            Bildirim
          </button>
        )}
      </div>
    </div>
  )
}
