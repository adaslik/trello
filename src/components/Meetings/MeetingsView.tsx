'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, ClipboardList,
  Users, Calendar, MapPin, Clock, Check, FileText, Pencil, X,
} from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import { useMeetings } from '@/hooks/useMeetings'
import { useAuth } from '@/hooks/useAuth'
import {
  YK_ROLES, ROLE_LABELS, PRIORITY_LABELS,
  MEETING_STATUS_LABELS, MEETING_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, ATTENDANCE_CYCLE,
  AGENDA_STATUS_LABELS,
} from '@/lib/constants'
import type { Profile, Workspace, AttendanceStatus, AgendaItemStatus } from '@/types'

interface Props {
  profiles: Profile[]
  workspaces: Workspace[]
}

const PRIORITY_OPTIONS = ['dusuk', 'orta', 'yuksek', 'acil'] as const

export default function MeetingsView({ profiles, workspaces }: Props) {
  const { profile } = useAuth()
  const {
    meetings, loading, activeMeeting, attendance, agendaItems, meetingTasks, prevMeetingTasks,
    fetchMeetings, loadMeeting, createMeeting, updateMeeting,
    upsertAttendance, updateAgendaItem, addAgendaItem, createAndLinkTask,
  } = useMeetings()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({ meeting_number: '', title: 'YK Olağan Toplantısı', date: '', start_time: '', location: 'Oda Toplantı Salonu' })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [taskForm, setTaskForm] = useState<{ agendaItemId: string; title: string; workspace_id: string; assignees: string[]; priority: string } | null>(null)
  const [newAgendaTitle, setNewAgendaTitle] = useState('')
  const [showNewAgenda, setShowNewAgenda] = useState(false)
  const [decisionText, setDecisionText] = useState('')
  const [savingDecision, setSavingDecision] = useState(false)
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const ykMembers = profiles.filter(p => YK_ROLES.includes(p.role as any))

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  useEffect(() => {
    if (!selectedId) return
    loadMeeting(selectedId)
    setExpandedItems(new Set())
    setTaskForm(null)
    setShowNewAgenda(false)
  }, [selectedId, loadMeeting])

  useEffect(() => {
    if (activeMeeting) setDecisionText(activeMeeting.decision_text || '')
  }, [activeMeeting?.id])

  const openMeeting = (id: string) => setSelectedId(id)
  const closeMeeting = () => { setSelectedId(null) }

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleNotesBlur = (itemId: string, notes: string) => {
    clearTimeout(notesTimers.current[itemId])
    notesTimers.current[itemId] = setTimeout(() => {
      updateAgendaItem(itemId, { notes })
    }, 300)
  }

  const cycleAttendance = (profileId: string) => {
    if (!activeMeeting) return
    const current = attendance.find(a => a.profile_id === profileId)?.status || 'katilmadi'
    const idx = ATTENDANCE_CYCLE.indexOf(current as AttendanceStatus)
    const next = ATTENDANCE_CYCLE[(idx + 1) % ATTENDANCE_CYCLE.length]
    upsertAttendance(activeMeeting.id, profileId, next)
  }

  const handleCreateMeeting = async () => {
    if (!newForm.meeting_number || !newForm.date) return
    const meeting = await createMeeting({
      meeting_number: Number(newForm.meeting_number),
      title: newForm.title,
      date: newForm.date,
      start_time: newForm.start_time || undefined,
      location: newForm.location,
    })
    if (meeting) {
      setShowNewForm(false)
      setNewForm({ meeting_number: '', title: 'YK Olağan Toplantısı', date: '', start_time: '', location: 'Oda Toplantı Salonu' })
      openMeeting(meeting.id)
    }
  }

  const handleSaveDecision = async () => {
    if (!activeMeeting) return
    setSavingDecision(true)
    await updateMeeting(activeMeeting.id, { decision_text: decisionText })
    setSavingDecision(false)
  }

  const handleCreateTask = async () => {
    if (!taskForm || !activeMeeting || !taskForm.title || !taskForm.workspace_id) return
    const assigneeProfiles = profiles.filter(p => taskForm.assignees.includes(p.id))
      .map(p => ({ id: p.id, full_name: p.full_name, initials: p.initials }))
    await createAndLinkTask(activeMeeting.id, taskForm.agendaItemId, {
      title: taskForm.title,
      workspace_id: taskForm.workspace_id,
      assignees: assigneeProfiles,
      priority: taskForm.priority,
    })
    setTaskForm(null)
  }

  const attendanceSummary = () => {
    const counts = { katildi: 0, katilmadi: 0, mazeretli: 0, gecikti: 0 }
    ykMembers.forEach(m => {
      const s = attendance.find(a => a.profile_id === m.id)?.status || 'katilmadi'
      counts[s as AttendanceStatus]++
    })
    return counts
  }

  // ── Liste görünümü ───────────────────────────────────────────────
  if (!selectedId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-slate-800">YK Toplantıları</h1>
            <p className="text-xs text-slate-400 mt-0.5">Toplantı kayıtları ve karar metinleri</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
          >
            <Plus size={13} /> Yeni Toplantı
          </button>
        </div>

        {/* Yeni toplantı formu */}
        {showNewForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">Yeni Toplantı</span>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Toplantı No *</label>
                <input
                  type="number" min="1"
                  value={newForm.meeting_number}
                  onChange={e => setNewForm(f => ({ ...f, meeting_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="42"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Tarih *</label>
                <input
                  type="date"
                  value={newForm.date}
                  onChange={e => setNewForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Başlık</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Başlangıç Saati</label>
                <input
                  type="time"
                  value={newForm.start_time}
                  onChange={e => setNewForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Yer</label>
                <input
                  type="text"
                  value={newForm.location}
                  onChange={e => setNewForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
              <button
                onClick={handleCreateMeeting}
                disabled={!newForm.meeting_number || !newForm.date}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
              >
                Oluştur
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">Yükleniyor…</div>
        )}

        {!loading && meetings.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">Henüz toplantı kaydı yok.</p>
            <p className="text-xs text-slate-300 mt-1">Yeni Toplantı butonuyla başlayın.</p>
          </div>
        )}

        <div className="space-y-3">
          {meetings.map(m => {
            const sc = MEETING_STATUS_COLORS[m.status]
            return (
              <button
                key={m.id}
                onClick={() => openMeeting(m.id)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400">#{m.meeting_number}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {MEETING_STATUS_LABELS[m.status]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={11} />{new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {m.start_time && <span className="flex items-center gap-1"><Clock size={11} />{m.start_time}</span>}
                      <span className="flex items-center gap-1"><MapPin size={11} />{m.location}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 mt-1 flex-shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Detay görünümü ───────────────────────────────────────────────
  if (!activeMeeting) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Yükleniyor…</div>
  }

  const summary = attendanceSummary()
  const sc = MEETING_STATUS_COLORS[activeMeeting.status]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Başlık */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={closeMeeting} className="mt-0.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-400">#{activeMeeting.meeting_number}</span>
            <select
              value={activeMeeting.status}
              onChange={e => updateMeeting(activeMeeting.id, { status: e.target.value as any })}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
              style={{ background: sc.bg, color: sc.text }}
            >
              {(['taslak', 'aktif', 'tamamlandi'] as const).map(s => (
                <option key={s} value={s}>{MEETING_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <h2 className="text-base font-bold text-slate-800 truncate">{activeMeeting.title}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={11} />{new Date(activeMeeting.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {activeMeeting.start_time && <span className="flex items-center gap-1"><Clock size={11} />{activeMeeting.start_time}</span>}
            <span className="flex items-center gap-1"><MapPin size={11} />{activeMeeting.location}</span>
          </div>
        </div>
      </div>

      {/* ── YOKLAMA ─────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Yoklama</span>
          </div>
          <div className="flex gap-2 text-[10px] font-medium">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{summary.katildi} katıldı</span>
            {summary.mazeretli > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{summary.mazeretli} mazeretli</span>}
            {summary.gecikti > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{summary.gecikti} geç kaldı</span>}
            {summary.katilmadi > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{summary.katilmadi} katılmadı</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ykMembers.map(member => {
            const att = attendance.find(a => a.profile_id === member.id)
            const status: AttendanceStatus = (att?.status as AttendanceStatus) || 'katilmadi'
            return (
              <button
                key={member.id}
                onClick={() => cycleAttendance(member.id)}
                title={`${member.full_name} — ${ATTENDANCE_STATUS_LABELS[status]} (tıkla: değiştir)`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${ATTENDANCE_STATUS_COLORS[status]}`}
              >
                <span className="w-5 h-5 rounded-full bg-white bg-opacity-60 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {member.initials}
                </span>
                <span className="truncate max-w-[80px]">{member.full_name.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-300 mt-2">Üyeye tıklayarak durumunu değiştirin: Katıldı → Mazeretli → Geç Kaldı → Katılmadı</p>
      </section>

      {/* ── GÜNDEM MADDELERİ ─────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList size={14} className="text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700">Gündem Maddeleri</span>
        </div>

        {agendaItems.map((item, idx) => {
          const expanded = expandedItems.has(item.id)
          const itemTasks = meetingTasks.filter(mt => mt.agenda_item_id === item.id)
          const isFirst = item.order_num === 1

          return (
            <div key={item.id} className={`border-b border-slate-100 last:border-b-0 ${expanded ? 'bg-slate-50' : ''}`}>
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                {expanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                <span className="text-[11px] font-bold text-indigo-400 flex-shrink-0 w-5">{item.order_num}.</span>
                <span className="text-sm text-slate-700 flex-1 text-left">{item.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {itemTasks.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">{itemTasks.length} görev</span>
                  )}
                  <select
                    value={item.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); updateAgendaItem(item.id, { status: e.target.value as AgendaItemStatus }) }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${
                      item.status === 'tamamlandi' ? 'bg-green-100 text-green-700' :
                      item.status === 'ertelendi'  ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {(['bekleyen', 'tamamlandi', 'ertelendi'] as AgendaItemStatus[]).map(s => (
                      <option key={s} value={s}>{AGENDA_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4">
                  {/* Önceki toplantıdan kalan görevler (sadece madde 1) */}
                  {isFirst && prevMeetingTasks.length > 0 && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-amber-700 mb-2">Önceki toplantıdan devredilen ({prevMeetingTasks.length})</p>
                      <div className="space-y-1">
                        {prevMeetingTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-xs text-amber-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notlar */}
                  <textarea
                    defaultValue={item.notes || ''}
                    onBlur={e => handleNotesBlur(item.id, e.target.value)}
                    placeholder="Tartışma notları…"
                    rows={3}
                    className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />

                  {/* Bu maddeden doğan görevler */}
                  {itemTasks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {itemTasks.map(mt => (
                        <div key={mt.task_id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <div className="w-2 h-2 rounded-sm bg-indigo-400 flex-shrink-0" />
                          <span className="text-xs text-slate-700 flex-1 truncate">{mt.task.title}</span>
                          <span className="text-[10px] text-slate-400">{mt.task.assignees?.[0]?.full_name?.split(' ')[0] || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Görev ekleme formu */}
                  {taskForm?.agendaItemId === item.id ? (
                    <div className="mt-3 bg-white border border-indigo-200 rounded-lg p-3 space-y-2">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Görev başlığı"
                        value={taskForm.title}
                        onChange={e => setTaskForm(f => f && ({ ...f, title: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        onKeyDown={e => { if (e.key === 'Escape') setTaskForm(null) }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={taskForm.workspace_id}
                          onChange={e => setTaskForm(f => f && ({ ...f, workspace_id: e.target.value }))}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          <option value="">Çalışma alanı seçin</option>
                          {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                        </select>
                        <select
                          value={taskForm.priority}
                          onChange={e => setTaskForm(f => f && ({ ...f, priority: e.target.value }))}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ykMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setTaskForm(f => {
                              if (!f) return f
                              const has = f.assignees.includes(m.id)
                              return { ...f, assignees: has ? f.assignees.filter(id => id !== m.id) : [...f.assignees, m.id] }
                            })}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                              taskForm.assignees.includes(m.id)
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {m.initials}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setTaskForm(null)} className="px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded-lg">İptal</button>
                        <button
                          onClick={handleCreateTask}
                          disabled={!taskForm.title || !taskForm.workspace_id}
                          className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                        >
                          Oluştur
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setTaskForm({ agendaItemId: item.id, title: '', workspace_id: workspaces[0]?.id || '', assignees: [], priority: 'orta' })}
                      className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium"
                    >
                      <Plus size={12} /> Görev Ekle
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Yeni gündem maddesi ekleme */}
        <div className="px-4 py-3">
          {showNewAgenda ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Yeni gündem maddesi"
                value={newAgendaTitle}
                onChange={e => setNewAgendaTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newAgendaTitle.trim()) { addAgendaItem(activeMeeting.id, newAgendaTitle.trim()); setNewAgendaTitle(''); setShowNewAgenda(false) }
                  if (e.key === 'Escape') { setShowNewAgenda(false); setNewAgendaTitle('') }
                }}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => { if (newAgendaTitle.trim()) { addAgendaItem(activeMeeting.id, newAgendaTitle.trim()); setNewAgendaTitle(''); setShowNewAgenda(false) } }}
                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              ><Check size={13} /></button>
              <button onClick={() => { setShowNewAgenda(false); setNewAgendaTitle('') }} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={13} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewAgenda(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 font-medium transition-colors"
            >
              <Plus size={12} /> Serbest Gündem Maddesi Ekle
            </button>
          )}
        </div>
      </section>

      {/* ── KARAR METNİ ─────────────────────────────────────────── */}
      <section className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Karar Metni</span>
          </div>
          <button
            onClick={handleSaveDecision}
            disabled={savingDecision}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            <Check size={12} /> {savingDecision ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
        <RichTextEditor
          content={decisionText}
          onChange={setDecisionText}
          placeholder="Toplantı kararlarını buraya yazın…"
        />
      </section>
    </div>
  )
}
