'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, ExternalLink, Send, RefreshCw, ImageIcon, Check, UserPlus, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Task, Label, Profile, ChecklistItem, Workspace, TaskActivity } from '@/types'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, COVER_PATTERNS, lightenColor } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/constants'
import { createBrowserClient } from '@/lib/supabase'
import { useChecklists } from '@/hooks/useChecklists'
import { useTaskActivity } from '@/hooks/useTaskActivity'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat önce`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} gün önce`
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatActivityText(a: TaskActivity): string {
  if (a.action_type === 'created') return 'Görevi oluşturdu'
  if (a.action_type === 'mirrored') return `"${a.new_value}" alanına aynalaması oluşturuldu`
  if (a.action_type === 'comment_added') {
    const preview = (a.new_value || '').slice(0, 60)
    return `Yorum ekledi: "${preview}${(a.new_value?.length || 0) > 60 ? '...' : ''}"`
  }
  if (a.action_type === 'field_changed') {
    switch (a.field_name) {
      case 'status':    return `Durumu "${a.old_value}" → "${a.new_value}" yaptı`
      case 'priority':  return `Önceliği "${a.old_value}" → "${a.new_value}" yaptı`
      case 'title':     return `Başlığı "${a.new_value}" olarak güncelledi`
      case 'description': return 'Açıklamayı güncelledi'
      case 'assignees': return `Sorumluları güncelledi → ${a.new_value || '(boş)'}`
      case 'end_date':  return a.new_value ? `Bitiş tarihini ${formatDate(a.new_value)} olarak ayarladı` : 'Bitiş tarihini kaldırdı'
      case 'start_date': return a.new_value ? `Başlangıç tarihini ${formatDate(a.new_value)} olarak ayarladı` : 'Başlangıç tarihini kaldırdı'
      default:          return 'Alan güncelledi'
    }
  }
  return 'Güncelledi'
}

// ─── Checklist Row ────────────────────────────────────────────────────────────

interface ChecklistRowProps {
  item: ChecklistItem
  members: Profile[]
  onToggle: (id: string, val: boolean) => void
  onAssign: (id: string, userId: string | null) => void
  onDelete: (id: string) => void
  onUpdateTitle: (id: string, title: string) => void
}

function ChecklistRow({ item, members, onToggle, onAssign, onDelete, onUpdateTitle }: ChecklistRowProps) {
  const [editing, setEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(item.title)
  const [showMenu, setShowMenu] = useState(false)

  const commitTitle = () => {
    if (titleVal.trim()) onUpdateTitle(item.id, titleVal)
    else setTitleVal(item.title)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-slate-50">
      <button
        onClick={() => onToggle(item.id, !item.is_completed)}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          item.is_completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
        }`}
      >
        {item.is_completed && <Check size={10} className="text-white" />}
      </button>

      {editing ? (
        <input
          autoFocus
          className="flex-1 text-xs bg-transparent border-b border-indigo-300 outline-none py-0.5"
          value={titleVal}
          onChange={e => setTitleVal(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => {
            if (e.key === 'Enter') commitTitle()
            if (e.key === 'Escape') { setTitleVal(item.title); setEditing(false) }
          }}
        />
      ) : (
        <span
          className={`flex-1 text-xs cursor-pointer ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
          onClick={() => setEditing(true)}
        >
          {item.title}
        </span>
      )}

      {/* Assignee */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center transition-opacity ${
            item.assigned_profile
              ? 'bg-indigo-100 text-indigo-700 opacity-100'
              : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100'
          }`}
          title={item.assigned_profile?.full_name || 'Kişi ata'}
        >
          {item.assigned_profile ? item.assigned_profile.initials : <UserPlus size={9} />}
        </button>
        {showMenu && (
          <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-44 py-1 max-h-48 overflow-y-auto">
            {item.assigned_to && (
              <button
                onClick={() => { onAssign(item.id, null); setShowMenu(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
              >
                Atamayı kaldır
              </button>
            )}
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => { onAssign(item.id, m.id); setShowMenu(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${m.id === item.assigned_to ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                  {m.initials}
                </span>
                <span className="truncate">{m.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 flex-shrink-0 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task | null
  wsColor: string
  labels: Label[]
  members: Profile[]
  workspaces: Workspace[]
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
  onMirror: (workspaceId: string) => Promise<void>
  defaultStatus?: Task['status']
}

export default function TaskModal({
  task, wsColor, labels, members, workspaces,
  onClose, onSave, onDelete, onMirror, defaultStatus = 'bekleyen',
}: TaskModalProps) {
  const { profile } = useAuth()
  const commentRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const [title, setTitle] = useState(task?.title || '')
  const [desc, setDesc] = useState(task?.description || '')
  const [status, setStatus] = useState<Task['status']>(task?.status || defaultStatus)
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'orta')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
    task?.assignees?.map(a => a.id) ?? (profile?.id ? [profile.id] : [])
  )
  const [startDate, setStartDate] = useState(task?.start_date || '')
  const [endDate, setEndDate] = useState(task?.end_date || '')
  const [board, setBoard] = useState(task?.board || '')
  const [selectedLabels, setSelectedLabels] = useState<number[]>([...new Set(task?.label_ids || [])])
  const [driveLinks, setDriveLinks] = useState(task?.drive_links || [])
  const [comments, setComments] = useState(task?.comments || [])
  const [coverPattern, setCoverPattern] = useState(task?.cover_pattern ?? Math.floor(Math.random() * 4))
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(task?.cover_image_url ?? null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [driveName, setDriveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [localLabelNames, setLocalLabelNames] = useState<Record<number, string>>({})
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const { items: checklistItems, addItem: addChecklistItem, toggleItem, updateTitle: updateChecklistTitle, assignItem, deleteItem: deleteChecklistItem } = useChecklists(task?.id || null)
  const { activities } = useTaskActivity(task?.id || null)
  const [mobileLabelsOpen, setMobileLabelsOpen] = useState(false)
  const [mobileAssigneesOpen, setMobileAssigneesOpen] = useState(false)

  // Mirror related workspaces
  const [mirrorWsList, setMirrorWsList] = useState<{ ws: Workspace; isSource: boolean }[]>([])

  const fetchMirrors = useCallback(async () => {
    if (!task) return
    const rootId = task.mirror_of || task.id
    const { data } = await supabase
      .from('tasks')
      .select('id, workspace_id, mirror_of')
      .or(`id.eq.${rootId},mirror_of.eq.${rootId}`)
      .neq('id', task.id)
    if (data) {
      setMirrorWsList(data.map(t => {
        const ws = workspaces.find(w => w.id === t.workspace_id)
        return ws ? { ws, isSource: !t.mirror_of } : null
      }).filter(Boolean) as { ws: Workspace; isSource: boolean }[])
    }
  }, [task?.id, workspaces])

  useEffect(() => { fetchMirrors() }, [fetchMirrors])

  const bg = lightenColor(wsColor)
  const coverSvg = COVER_PATTERNS[coverPattern % COVER_PATTERNS.length](bg, wsColor)

  const handleCoverImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `cover-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('task-covers')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('task-covers').getPublicUrl(data.path)
      setCoverImageUrl(publicUrl)
    } else if (error) {
      if (error.message.includes('Bucket not found')) {
        toast.error('Supabase\'de "task-covers" bucket\'ı oluşturulmalı. Storage > New bucket > "task-covers" (Public)')
      } else {
        toast.error('Resim yüklenemedi: ' + error.message)
      }
    }
    setUploadingCover(false)
    // reset input so same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleLabel = (id: number) => {
    setSelectedLabels(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addDriveLink = () => {
    if (!driveUrl.trim()) return
    setDriveLinks(prev => [...prev, { name: driveName.trim() || 'Dosya', url: driveUrl.trim() }])
    setDriveUrl(''); setDriveName('')
  }

  const removeDriveLink = (i: number) => {
    setDriveLinks(prev => prev.filter((_, idx) => idx !== i))
  }

  const addComment = () => {
    const text = commentRef.current?.value.trim()
    if (!text || !profile) return
    const newComment = {
      id: Date.now().toString(),
      author_id: profile.id,
      author_name: profile.full_name,
      author_initials: profile.initials,
      text,
      created_at: new Date().toISOString(),
    }
    setComments(prev => [...prev, newComment])
    if (commentRef.current) commentRef.current.value = ''
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const assignees = members
      .filter(m => selectedAssigneeIds.includes(m.id))
      .map(m => ({ id: m.id, full_name: m.full_name, initials: m.initials }))
    await onSave({
      title: title.trim(),
      description: desc,
      status, priority,
      assignees,
      start_date: startDate || null,
      end_date: endDate || null,
      board: board || null,
      label_ids: selectedLabels,
      drive_links: driveLinks,
      comments,
      cover_pattern: coverPattern,
      ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
    })
    setSaving(false)
    onClose()
  }

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl mt-8 mb-8 overflow-hidden flex flex-col">

        {/* Cover */}
        <div className="relative flex-shrink-0">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt="Kapak resmi"
              className="w-full object-cover"
              style={{ height: 120 }}
            />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: coverSvg }} />
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCover}
              className="bg-white/80 backdrop-blur-sm text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white disabled:opacity-60"
            >
              <ImageIcon size={11} />
              {uploadingCover ? 'Yükleniyor...' : coverImageUrl ? 'Resmi Değiştir' : 'Resim Ekle'}
            </button>
            {coverImageUrl ? (
              <button
                onClick={() => setCoverImageUrl(null)}
                className="bg-white/80 backdrop-blur-sm text-red-500 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white"
              >
                <X size={11} /> Resmi Kaldır
              </button>
            ) : (
              <button
                onClick={() => setCoverPattern(p => (p + 1) % 4)}
                className="bg-white/80 backdrop-blur-sm text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white"
              >
                <RefreshCw size={11} /> Desen
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-white/80 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg hover:bg-white"
            >
              <X size={14} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverImageSelect}
          />
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left */}
          <div className="flex-1 p-6 overflow-y-auto md:max-h-[520px] border-b md:border-b-0 md:border-r border-slate-100">
            <input
              className="w-full text-xl font-semibold text-slate-800 border-none outline-none placeholder-slate-300 mb-5 bg-transparent"
              placeholder="Görev başlığı..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />

            {/* Description */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">AÇIKLAMA</p>
              <textarea
                className="w-full min-h-[90px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-y outline-none focus:border-indigo-300 focus:bg-white"
                placeholder="Açıklama ekle..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            {/* Checklist */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest">ALT GÖREVLER</p>
                {task && checklistItems.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {checklistItems.filter(i => i.is_completed).length}/{checklistItems.length} tamamlandı
                  </span>
                )}
              </div>
              {!task ? (
                <p className="text-xs text-slate-400 italic">Görevi kaydettikten sonra alt görev ekleyebilirsiniz.</p>
              ) : (
                <>
                  {checklistItems.length > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-0.5 mb-2">
                    {checklistItems.map(item => (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        members={members}
                        onToggle={toggleItem}
                        onAssign={assignItem}
                        onDelete={deleteChecklistItem}
                        onUpdateTitle={updateChecklistTitle}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                      placeholder="Alt görev ekle..."
                      value={newChecklistTitle}
                      onChange={e => setNewChecklistTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addChecklistItem(newChecklistTitle)
                          setNewChecklistTitle('')
                        }
                      }}
                    />
                    <button
                      onClick={() => { addChecklistItem(newChecklistTitle); setNewChecklistTitle('') }}
                      disabled={!newChecklistTitle.trim()}
                      className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-40 text-xs"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ─── Mobile-only ordered section ─────────────────────────────── */}
            <div className="md:hidden space-y-4 mb-5">

              {/* 1. Google Drive Bağlantıları */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">GOOGLE DRIVE BAĞLANTILARI</p>
                <div className="space-y-2 mb-2">
                  {driveLinks.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M4.5 19.5l3-5.5h9l3 5.5H4.5z" fill="#1DA462"/>
                        <path d="M8.5 5.5L12 12l-4.5 7.5L4 13z" fill="#4285F4"/>
                        <path d="M15.5 5.5H8.5L4 13h7z" fill="#FBBC05"/>
                        <path d="M15.5 5.5L20 13l-3.5 6.5H11z" fill="#EA4335" opacity=".85"/>
                      </svg>
                      <span className="flex-1 text-sm text-slate-700 truncate">{d.name}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                        <ExternalLink size={12} className="text-slate-400 hover:text-indigo-600" />
                      </a>
                      <button onClick={() => removeDriveLink(i)}>
                        <X size={12} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                    placeholder="Drive linki yapıştır..."
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDriveLink()}
                  />
                  <input
                    className="w-24 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                    placeholder="Ad"
                    value={driveName}
                    onChange={e => setDriveName(e.target.value)}
                  />
                  <button onClick={addDriveLink} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 2. Başlangıç ve Bitiş Tarihi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">BAŞLANGIÇ</p>
                  <input type="date" className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">BİTİŞ</p>
                  <input type="date" className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* 3. Sorumlular — sadece seçili varsa, açılır */}
              {selectedAssigneeIds.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileAssigneesOpen(o => !o)}
                    className="flex items-center justify-between w-full mb-1"
                  >
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest">SORUMLULAR</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {members.filter(m => selectedAssigneeIds.includes(m.id)).slice(0, 3).map(m => (
                          <span key={m.id} className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center border border-white">
                            {m.initials}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">{mobileAssigneesOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {mobileAssigneesOpen && (
                    <div className="mt-1 space-y-1">
                      {members.map(m => {
                        const checked = selectedAssigneeIds.includes(m.id)
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => setSelectedAssigneeIds(prev =>
                              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            )}
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                              {m.initials}
                            </div>
                            <span className="flex-1 text-xs text-slate-700 truncate">{m.full_name}</span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 border ${
                              checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                            }`}>
                              {checked && '✓'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Durum */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">DURUM</p>
                <select
                  className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                  value={status} onChange={e => setStatus(e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                  {!Object.keys(STATUS_LABELS).includes(status) && (
                    <option value={status}>{status}</option>
                  )}
                </select>
              </div>

              {/* 5. Öncelik */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">ÖNCELİK</p>
                <select
                  className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                  value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}
                >
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* 6. Etiket — sadece seçili varsa, açılır */}
              {selectedLabels.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileLabelsOpen(o => !o)}
                    className="flex items-center justify-between w-full mb-1"
                  >
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest">ETİKETLER</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {labels.filter(l => selectedLabels.includes(l.id)).slice(0, 4).map(l => (
                          <div key={l.id} className="h-2 w-4 rounded-full" style={{ background: l.color }} />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">{mobileLabelsOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {mobileLabelsOpen && (
                    <div className="mt-1 space-y-1">
                      {labels.map(label => {
                        const checked = selectedLabels.includes(label.id)
                        const name = localLabelNames[label.id] ?? label.name
                        return (
                          <div
                            key={label.id}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => toggleLabel(label.id)}
                          >
                            <div className="w-9 h-5 rounded flex-shrink-0" style={{ background: label.color }} />
                            <span className="flex-1 text-sm text-slate-700 truncate">{name}</span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 border ${
                              checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                            }`}>
                              {checked && '✓'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Aynalama */}
              {task && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <GitBranch size={9} className="text-slate-400" />
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest">AYNALAMA</p>
                  </div>
                  {task.mirror_of && (
                    <p className="text-[9px] text-purple-500 font-medium mb-1.5">Bu kart bir aynalamasıdır</p>
                  )}
                  {mirrorWsList.length > 0 ? (
                    <div className="space-y-1 mb-2">
                      {mirrorWsList.map(({ ws, isSource }) => (
                        <div key={ws.id} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ws.color }} />
                          <span className="text-[10px] text-slate-600 flex-1 truncate">{ws.name}</span>
                          {isSource && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded">kaynak</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mb-2">Henüz aynalama yok</p>
                  )}
                  <select
                    defaultValue=""
                    onChange={async e => {
                      if (!e.target.value) return
                      const wsId = e.target.value
                      e.target.value = ''
                      await onMirror(wsId)
                      await fetchMirrors()
                    }}
                    className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer"
                  >
                    <option value="" disabled>+ Aynala...</option>
                    {workspaces
                      .filter(ws => ws.id !== task.workspace_id && !mirrorWsList.find(m => m.ws.id === ws.id))
                      .map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)
                    }
                  </select>
                </div>
              )}

              {/* 8. Değişiklik Geçmişi */}
              {task && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-3">DEĞİŞİKLİK GEÇMİŞİ</p>
                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Henüz değişiklik kaydı yok</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map(a => (
                        <div key={a.id} className="flex gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {a.user_initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-slate-700">{a.user_name}</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{formatActivityText(a)}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{relativeTime(a.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Labels */}
            <div className="hidden md:block mb-5">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">ETİKETLER</p>
              <div className="space-y-1">
                {labels.map(label => {
                  const checked = selectedLabels.includes(label.id)
                  const name = localLabelNames[label.id] ?? label.name
                  return (
                    <div
                      key={label.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleLabel(label.id)}
                    >
                      <div
                        className="w-9 h-5 rounded flex-shrink-0"
                        style={{ background: label.color }}
                      />
                      <input
                        className="flex-1 text-sm text-slate-700 bg-transparent border-none outline-none border-b border-transparent focus:border-slate-300"
                        value={name}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setLocalLabelNames(prev => ({ ...prev, [label.id]: e.target.value }))}
                        placeholder="Etiket adı..."
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 border ${
                        checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {checked && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Drive Links */}
            <div className="hidden md:block mb-5">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">GOOGLE DRIVE BAĞLANTILARI</p>
              <div className="space-y-2 mb-2">
                {driveLinks.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg group hover:bg-slate-50">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M4.5 19.5l3-5.5h9l3 5.5H4.5z" fill="#1DA462"/>
                      <path d="M8.5 5.5L12 12l-4.5 7.5L4 13z" fill="#4285F4"/>
                      <path d="M15.5 5.5H8.5L4 13h7z" fill="#FBBC05"/>
                      <path d="M15.5 5.5L20 13l-3.5 6.5H11z" fill="#EA4335" opacity=".85"/>
                    </svg>
                    <span className="flex-1 text-sm text-slate-700 truncate">{d.name}</span>
                    <a href={d.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={12} className="text-slate-400 hover:text-indigo-600" />
                    </a>
                    <button onClick={() => removeDriveLink(i)} className="opacity-0 group-hover:opacity-100">
                      <X size={12} className="text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                  placeholder="Drive linki yapıştır..."
                  value={driveUrl}
                  onChange={e => setDriveUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDriveLink()}
                />
                <input
                  className="w-24 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                  placeholder="Ad"
                  value={driveName}
                  onChange={e => setDriveName(e.target.value)}
                />
                <button onClick={addDriveLink} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Activity Log */}
            {task && (
              <div className="hidden md:block mb-5">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-3">DEĞİŞİKLİK GEÇMİŞİ</p>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Henüz değişiklik kaydı yok</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map(a => (
                      <div key={a.id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {a.user_initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-700">{a.user_name}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{formatActivityText(a)}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{relativeTime(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">YORUMLAR</p>
              <div className="space-y-3 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-indigo-100 text-indigo-800"
                    >
                      {c.author_initials}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-semibold text-slate-700 mb-0.5">{c.author_name}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  ref={commentRef}
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                  placeholder="Yorum yaz..."
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                />
                <button onClick={addComment} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden md:block w-full md:w-56 p-4 bg-slate-50 flex-shrink-0 space-y-4 overflow-y-auto md:max-h-[520px]">
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">DURUM</p>
              <select
                className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                value={status} onChange={e => setStatus(e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
                {!Object.keys(STATUS_LABELS).includes(status) && (
                  <option value={status}>{status}</option>
                )}
              </select>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">ÖNCELİK</p>
              <select
                className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">SORUMLULAR</p>
              <div className="space-y-1">
                {members.map(m => {
                  const checked = selectedAssigneeIds.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer"
                      onClick={() => setSelectedAssigneeIds(prev =>
                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {m.initials}
                      </div>
                      <span className="flex-1 text-xs text-slate-700 truncate">{m.full_name}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 border ${
                        checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {checked && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">BAŞLANGIÇ</p>
              <input type="date" className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">BİTİŞ</p>
              <input type="date" className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {/* Mirror Section */}
            {task && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GitBranch size={9} className="text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest">AYNALAMA</p>
                </div>
                {task.mirror_of && (
                  <p className="text-[9px] text-purple-500 font-medium mb-1.5">Bu kart bir aynalamasıdır</p>
                )}
                {mirrorWsList.length > 0 ? (
                  <div className="space-y-1 mb-2">
                    {mirrorWsList.map(({ ws, isSource }) => (
                      <div key={ws.id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ws.color }} />
                        <span className="text-[10px] text-slate-600 flex-1 truncate">{ws.name}</span>
                        {isSource && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded">kaynak</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mb-2">Henüz aynalama yok</p>
                )}
                <select
                  defaultValue=""
                  onChange={async e => {
                    if (!e.target.value) return
                    const wsId = e.target.value
                    e.target.value = ''
                    await onMirror(wsId)
                    await fetchMirrors()
                  }}
                  className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer"
                >
                  <option value="" disabled>+ Aynala...</option>
                  {workspaces
                    .filter(ws => ws.id !== task.workspace_id && !mirrorWsList.find(m => m.ws.id === ws.id))
                    .map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)
                  }
                </select>
              </div>
            )}

            {task && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[9px] text-slate-400">
                  Oluşturuldu: {formatDate(task.created_at)}
                </p>
                <p className="text-[9px] text-slate-400">
                  Güncellendi: {formatDate(task.updated_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <div>
            {task && onDelete && (
              <button
                onClick={async () => { if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) { await onDelete(); onClose() } }}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm"
              >
                <Trash2 size={14} /> Görevi sil
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
