'use client'

import { useState, useRef } from 'react'
import { X, Trash2, Plus, ExternalLink, Send, RefreshCw, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Task, Label, Profile } from '@/types'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, COVER_PATTERNS, lightenColor } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/constants'
import { createBrowserClient } from '@/lib/supabase'

interface TaskModalProps {
  task: Task | null
  wsColor: string
  labels: Label[]
  members: Profile[]
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
  defaultStatus?: Task['status']
}

export default function TaskModal({
  task, wsColor, labels, members,
  onClose, onSave, onDelete, defaultStatus = 'bekleyen',
}: TaskModalProps) {
  const { profile } = useAuth()
  const commentRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const [title, setTitle] = useState(task?.title || '')
  const [desc, setDesc] = useState(task?.description || '')
  const [status, setStatus] = useState<Task['status']>(task?.status || defaultStatus)
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'orta')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || profile?.id || '')
  const [startDate, setStartDate] = useState(task?.start_date || '')
  const [endDate, setEndDate] = useState(task?.end_date || '')
  const [board, setBoard] = useState(task?.board || '')
  const [selectedLabels, setSelectedLabels] = useState<number[]>(task?.label_ids || [])
  const [driveLinks, setDriveLinks] = useState(task?.drive_links || [])
  const [comments, setComments] = useState(task?.comments || [])
  const [coverPattern, setCoverPattern] = useState(task?.cover_pattern ?? Math.floor(Math.random() * 4))
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(task?.cover_image_url ?? null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [driveName, setDriveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [localLabelNames, setLocalLabelNames] = useState<Record<number, string>>({})

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
    const assignee = members.find(m => m.id === assigneeId)
    // Apply any local label name edits
    const updatedLabels = labels.map(l =>
      localLabelNames[l.id] ? { ...l, name: localLabelNames[l.id] } : l
    )
    await onSave({
      title: title.trim(),
      description: desc,
      status, priority,
      assignee_id: assigneeId || null,
      assignee_name: assignee?.full_name || null,
      assignee_initials: assignee?.initials || null,
      start_date: startDate || null,
      end_date: endDate || null,
      board: board || null,
      label_ids: selectedLabels,
      drive_links: driveLinks,
      comments,
      cover_pattern: coverPattern,
      cover_image_url: coverImageUrl ?? null,
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
        <div className="flex flex-1 min-h-0">

          {/* Left */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[520px] border-r border-slate-100">
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

            {/* Labels */}
            <div className="mb-5">
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
            <div className="mb-5">
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
          <div className="w-56 p-4 bg-slate-50 flex-shrink-0 space-y-4 overflow-y-auto max-h-[520px]">
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
              <p className="text-[9px] font-bold text-slate-400 tracking-widest mb-1.5">SORUMLU</p>
              <select
                className="w-full text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white"
                value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="">Atanmamış</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
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
