'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { PRIORITY_COLORS, PRIORITY_LABELS, ROLE_LABELS, formatDate } from '@/lib/constants'
import type { Workspace, Profile, Task } from '@/types'
import type { AssignedChecklistItem } from '@/hooks/useAssignedChecklists'

interface HomeViewProps {
  workspaces: Workspace[]
  profile: Profile
  notifications: any[]
  assignedTasks: Task[]
  assignedChecklists: AssignedChecklistItem[]
  onSelectWs: (id: string) => void
  onAssignedTaskClick: (task: Task) => void
  onAssignedChecklistClick: (taskId: string, workspaceId: string) => void
}

export default function HomeView({ workspaces, profile, notifications, assignedTasks, assignedChecklists, onSelectWs, onAssignedTaskClick, onAssignedChecklistClick }: HomeViewProps) {
  const supabase = createBrowserClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [kpiPanel, setKpiPanel] = useState<{ label: string; tasks: Task[] } | null>(null)

  useEffect(() => {
    if (!workspaces.length) { setLoading(false); return }
    const wsIds = workspaces.map(w => w.id)
    supabase
      .from('tasks')
      .select('id,title,status,priority,end_date,workspace_id,created_at,assignees')
      .in('workspace_id', wsIds)
      .then(({ data }) => {
        if (data) setTasks(data as Task[])
        setLoading(false)
      })
  }, [workspaces])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const total      = tasks.length
  const completed  = tasks.filter(t => t.status === 'tamamlandi').length
  const inProgress = tasks.filter(t => t.status === 'devam_ediyor').length
  const reviewing  = tasks.filter(t => t.status === 'incelemede').length
  const pending    = tasks.filter(t => t.status === 'bekleyen').length
  const overdue    = tasks.filter(t =>
    t.end_date && new Date(t.end_date) < today && t.status !== 'tamamlandi'
  ).length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const upcoming = tasks
    .filter(t => t.end_date && new Date(t.end_date) >= today && t.status !== 'tamamlandi')
    .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
    .slice(0, 7)

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  const wsStats = workspaces
    .map(ws => ({
      ws,
      total: tasks.filter(t => t.workspace_id === ws.id).length,
      done:  tasks.filter(t => t.workspace_id === ws.id && t.status === 'tamamlandi').length,
      overdue: tasks.filter(t =>
        t.workspace_id === ws.id &&
        t.end_date && new Date(t.end_date) < today &&
        t.status !== 'tamamlandi'
      ).length,
    }))
    .sort((a, b) => b.total - a.total)

  const statusBreakdown = [
    { label: 'Bekleyen',     count: pending,    color: '#94a3b8' },
    { label: 'Devam Ediyor', count: inProgress, color: '#6366f1' },
    { label: 'İncelemede',   count: reviewing,  color: '#f59e0b' },
    { label: 'Tamamlandı',   count: completed,  color: '#10b981' },
  ]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Günaydın'
    if (h < 18) return 'İyi günler'
    return 'İyi akşamlar'
  }

  const dateStr = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {greeting()}, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">{dateStr}</p>
        </div>
        <div className="text-right bg-white border border-slate-200 rounded-2xl px-5 py-3">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest">TAMAMLANMA ORANI</p>
          <p className="text-3xl font-black text-indigo-600 leading-none mt-1">%{completionRate}</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full w-32 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {ROLE_LABELS[profile.role]} · {workspaces.length} alan
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Görev', value: total,     icon: '📋', bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   getTasks: () => tasks },
          { label: 'Tamamlanan',   value: completed,  icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', getTasks: () => tasks.filter(t => t.status === 'tamamlandi') },
          { label: 'Devam Eden',   value: inProgress, icon: '🔄', bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  getTasks: () => tasks.filter(t => t.status === 'devam_ediyor') },
          { label: 'Geciken',      value: overdue,    icon: '⚠️', bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-600',     getTasks: () => tasks.filter(t => t.end_date && new Date(t.end_date) < today && t.status !== 'tamamlandi') },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setKpiPanel({ label: c.label, tasks: c.getTasks() })}
            className={`${c.bg} border ${c.border} rounded-2xl p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-100`}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{c.icon}</span>
              <span className={`text-3xl font-black leading-none ${c.text}`}>{c.value}</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">{c.label}</p>
          </button>
        ))}
      </div>

      {/* ── Bana Atanan Görevler ── */}
      {(() => {
        const active = assignedTasks
          .filter(t => t.status !== 'tamamlandi')
          .sort((a, b) => {
            if (!a.end_date && !b.end_date) return 0
            if (!a.end_date) return 1
            if (!b.end_date) return -1
            return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          })
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 tracking-widest">BANA ATANAN GÖREVLER</h2>
              {active.length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  {active.length} aktif
                </span>
              )}
            </div>
            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <span className="text-2xl mb-1.5">✓</span>
                <p className="text-xs text-slate-400">Aktif atanmış görev yok</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {active.slice(0, 8).map(task => {
                    const ws = workspaces.find(w => w.id === task.workspace_id)
                    const isOverdue = task.end_date && new Date(task.end_date) < today && task.status !== 'tamamlandi'
                    const pri = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.orta
                    return (
                      <button
                        key={task.id}
                        onClick={() => onAssignedTaskClick(task)}
                        className={`flex flex-col gap-1.5 p-3 rounded-xl text-left border transition-all hover:shadow-sm ${
                          isOverdue
                            ? 'border-red-200 bg-red-50 hover:bg-red-100'
                            : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ws?.color || '#6366f1' }} />
                          <span className="text-[9px] text-slate-400 truncate">{ws?.name}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2">{task.title}</p>
                        <div className="flex items-center gap-1 mt-auto pt-0.5 flex-wrap">
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: pri.bg, color: pri.text }}
                          >
                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
                          </span>
                          {task.end_date && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-auto ${
                              isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {formatDate(task.end_date)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {active.length > 8 && (
                  <p className="text-[10px] text-slate-400 text-center mt-3">+{active.length - 8} görev daha</p>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Bana Atanan Alt Görevler ── */}
      {(() => {
        const activeItems = assignedChecklists.filter(i => !i.is_completed)
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 tracking-widest">BANA ATANAN ALT GÖREVLER</h2>
              {activeItems.length > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                  {activeItems.length} aktif
                </span>
              )}
            </div>
            {activeItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <span className="text-2xl mb-1.5">✓</span>
                <p className="text-xs text-slate-400">Aktif atanmış alt görev yok</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeItems.slice(0, 8).map(item => {
                    const ws = workspaces.find(w => w.id === item.task.workspace_id)
                    const isOverdue = item.task.end_date && new Date(item.task.end_date) < today
                    return (
                      <button
                        key={item.id}
                        onClick={() => onAssignedChecklistClick(item.task_id, item.task.workspace_id)}
                        className={`flex flex-col gap-1.5 p-3 rounded-xl text-left border transition-all hover:shadow-sm ${
                          isOverdue
                            ? 'border-red-200 bg-red-50 hover:bg-red-100'
                            : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ws?.color || '#6366f1' }} />
                          <span className="text-[9px] text-slate-400 truncate">{ws?.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate leading-snug">{item.task.title}</p>
                        <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2">{item.title}</p>
                        {item.task.end_date && (
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-auto self-start ${
                            isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {formatDate(item.task.end_date)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {activeItems.length > 8 && (
                  <p className="text-[10px] text-slate-400 text-center mt-3">+{activeItems.length - 8} alt görev daha</p>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Middle row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Görev Dağılımı + Çalışma Alanları */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4">GÖREV DAĞILIMI</h2>
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-slate-600 font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{s.count}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">
                        {total > 0 ? Math.round((s.count / total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: total > 0 ? `${(s.count / total) * 100}%` : '0%',
                        background: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4">ÇALIŞMA ALANLARI</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {wsStats.map(({ ws, total: wsTotal, done, overdue: wsOverdue }) => {
                const rate = wsTotal > 0 ? Math.round((done / wsTotal) * 100) : 0
                return (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWs(ws.id)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-colors border border-slate-100 hover:border-slate-200"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: ws.color }}
                    >
                      {ws.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{ws.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${rate}%`, background: ws.color }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 flex-shrink-0">{rate}%</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{wsTotal} görev</span>
                        {wsOverdue > 0 && (
                          <span className="text-[9px] text-red-500 font-medium">{wsOverdue} gecikmiş</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Yaklaşan son tarihler */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4">YAKLAŞAN SON TARİHLER</h2>
          {upcoming.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="text-3xl mb-2">🎉</span>
              <p className="text-xs text-slate-400">Yaklaşan son tarih yok</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {upcoming.map(task => {
                const ws = workspaces.find(w => w.id === task.workspace_id)
                const daysLeft = Math.ceil(
                  (new Date(task.end_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
                const isUrgent = daysLeft <= 2
                const isToday  = daysLeft === 0
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl ${isUrgent ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <div
                      className="w-1 rounded-full flex-shrink-0 mt-0.5"
                      style={{ height: 32, background: ws?.color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 leading-snug truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{ws?.name}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                      isToday  ? 'bg-red-100 text-red-600' :
                      isUrgent ? 'bg-orange-100 text-orange-600' :
                                 'bg-slate-100 text-slate-500'
                    }`}>
                      {isToday ? 'Bugün' : `${daysLeft}g`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Son eklenen görevler */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4">SON EKLENEN GÖREVLER</h2>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Henüz görev yok</p>
          ) : (
            <div className="space-y-1">
              {recentTasks.map(task => {
                const ws  = workspaces.find(w => w.id === task.workspace_id)
                const pri = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.orta
                return (
                  <button
                    key={task.id}
                    onClick={() => onSelectWs(task.workspace_id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: ws?.color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400">{ws?.name}</p>
                    </div>
                    {task.assignees?.slice(0, 3).map(a => (
                      <span key={a.id} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center flex-shrink-0" title={a.full_name}>
                        {a.initials}
                      </span>
                    ))}
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: pri.bg, color: pri.text }}
                    >
                      {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Son bildirimler */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4">SON BİLDİRİMLER</h2>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">🔔</span>
              <p className="text-xs text-slate-400">Bildirim yok</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 6).map(n => (
                <button
                  key={n.id}
                  onClick={() => n.workspace_id && onSelectWs(n.workspace_id)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-indigo-50' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-600 mb-0.5">{n.workspace_name}</p>
                    <p className="text-xs text-slate-600 truncate">{n.text}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Panel Modal ── */}
      {kpiPanel && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          onClick={() => setKpiPanel(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">{kpiPanel.label}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{kpiPanel.tasks.length} görev</span>
                <button
                  onClick={() => setKpiPanel(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1 p-3">
              {kpiPanel.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl mb-2">🎉</span>
                  <p className="text-sm text-slate-400">Bu kategoride görev yok</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {kpiPanel.tasks.map(task => {
                    const ws  = workspaces.find(w => w.id === task.workspace_id)
                    const pri = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.orta
                    const isOverdue = task.end_date && new Date(task.end_date) < today && task.status !== 'tamamlandi'
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setKpiPanel(null); onSelectWs(task.workspace_id) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-100"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ws?.color || '#6366f1' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ws?.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.end_date && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {formatDate(task.end_date)}
                            </span>
                          )}
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: pri.bg, color: pri.text }}
                          >
                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
