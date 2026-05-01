'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent, PointerSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Check, X } from 'lucide-react'
import type { Task, Label } from '@/types'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, COVER_PATTERNS, lightenColor } from '@/lib/constants'

const DEFAULT_STATUSES = ['bekleyen', 'devam_ediyor', 'incelemede', 'tamamlandi'] as const

// ─── Drag handle + card ──────────────────────────────────────────────────────

interface KanbanCardProps {
  task: Task
  labels: Label[]
  wsColor: string
  onClick: () => void
}

function KanbanCard({ task, labels, wsColor, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const taskLabels = (task.label_ids || []).map(id => labels.find(l => l.id === id)).filter(Boolean) as Label[]
  const pri = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.orta
  const bg = lightenColor(wsColor)
  const coverSvg = COVER_PATTERNS[task.cover_pattern % 4](bg, wsColor)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white border border-slate-200 rounded-xl mb-2 overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all"
    >
      {/* Cover area with grip handle */}
      <div className="relative">
        {task.cover_image_url ? (
          <img
            src={task.cover_image_url}
            alt=""
            className="w-full object-cover"
            style={{ height: 44 }}
          />
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: coverSvg
                .replace('height:120px', 'height:44px')
                .replace('height="120"', 'height="44"'),
            }}
          />
        )}
        {/* Drag grip — only this element initiates drag */}
        <div
          {...listeners}
          className="absolute top-1 right-1 p-1 rounded bg-white/60 text-slate-500 cursor-grab active:cursor-grabbing hover:bg-white/90"
          title="Taşımak için sürükle"
        >
          <GripVertical size={11} />
        </div>
      </div>

      {/* Card body — click opens modal */}
      <div className="p-2.5 cursor-pointer" onClick={onClick}>
        {taskLabels.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {taskLabels.map(l => (
              <div
                key={l.id}
                className="h-1.5 rounded-full min-w-[24px]"
                style={{ background: l.color }}
                title={l.name}
              />
            ))}
          </div>
        )}
        <p className="text-xs font-medium text-slate-800 leading-snug mb-2">{task.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: pri.bg, color: pri.text }}
          >
            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
          </span>
          {task.assignees?.map(a => (
            <span key={a.id} className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center" title={a.full_name}>
              {a.initials}
            </span>
          ))}
          {task.end_date && (
            <span className="text-[9px] text-slate-400 ml-auto">
              {new Date(task.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.drive_links?.length > 0 && (
            <span className="text-[9px] text-slate-400">📎{task.drive_links.length}</span>
          )}
          {task.comments?.length > 0 && (
            <span className="text-[9px] text-slate-400">💬{task.comments.length}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Droppable column wrapper ─────────────────────────────────────────────────

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 rounded-xl p-2 overflow-y-auto min-h-[120px] transition-colors ${
        isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-slate-100'
      }`}
    >
      {children}
    </div>
  )
}

// ─── Editable column header ───────────────────────────────────────────────────

interface ColumnHeaderProps {
  label: string
  count: number
  canEdit: boolean
  onRename: (v: string) => void
  onDelete?: () => void
}

function ColumnHeader({ label, count, canEdit, onRename, onDelete }: ColumnHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(label)

  const commit = () => {
    const trimmed = val.trim()
    if (trimmed) onRename(trimmed)
    else setVal(label)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between mb-2 px-1 gap-1 min-h-[24px]">
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            autoFocus
            className="text-[10px] font-bold text-slate-700 tracking-wider uppercase bg-transparent border-b border-slate-400 outline-none flex-1 min-w-0"
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setVal(label); setEditing(false) }
            }}
          />
          <button onClick={commit} className="text-green-500 hover:text-green-700 flex-shrink-0">
            <Check size={11} />
          </button>
          <button
            onClick={() => { setVal(label); setEditing(false) }}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <span
          className={`text-[10px] font-bold text-slate-500 tracking-wider uppercase truncate ${
            canEdit ? 'cursor-pointer hover:text-slate-700' : ''
          }`}
          onClick={() => canEdit && setEditing(true)}
          title={canEdit ? 'Yeniden adlandırmak için tıkla' : undefined}
        >
          {label}
        </span>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[9px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">
          {count}
        </span>
        {canEdit && onDelete && (
          <button
            onClick={onDelete}
            className="text-slate-300 hover:text-red-400 transition-colors"
            title="Sütunu sil"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  wsId: string
  tasks: Task[]
  labels: Label[]
  wsColor: string
  canEdit: boolean
  onTaskClick: (task: Task) => void
  onAddTask: (status: string) => void
  onMoveTask: (id: string, status: Task['status']) => void
}

export default function KanbanBoard({
  wsId, tasks, labels, wsColor, canEdit,
  onTaskClick, onAddTask, onMoveTask,
}: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Column label overrides for default statuses (localStorage)
  const [colLabels, setColLabels] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(`col-labels-${wsId}`) || '{}') } catch { return {} }
  })

  // Custom columns added by user (localStorage)
  const [customCols, setCustomCols] = useState<{ slug: string; label: string }[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`custom-cols-${wsId}`) || '[]') } catch { return [] }
  })

  const saveColLabels = (next: Record<string, string>) => {
    setColLabels(next)
    localStorage.setItem(`col-labels-${wsId}`, JSON.stringify(next))
  }

  const saveCustomCols = (next: { slug: string; label: string }[]) => {
    setCustomCols(next)
    localStorage.setItem(`custom-cols-${wsId}`, JSON.stringify(next))
  }

  const renameColumn = (slug: string, newLabel: string) => {
    if (DEFAULT_STATUSES.includes(slug as typeof DEFAULT_STATUSES[number])) {
      saveColLabels({ ...colLabels, [slug]: newLabel })
    } else {
      saveCustomCols(customCols.map(c => c.slug === slug ? { ...c, label: newLabel } : c))
    }
  }

  const addColumn = () => {
    const slug = `custom_${Date.now()}`
    saveCustomCols([...customCols, { slug, label: 'Yeni Sütun' }])
  }

  const deleteCustomColumn = (slug: string) => {
    saveCustomCols(customCols.filter(c => c.slug !== slug))
  }

  const allColumns = [
    ...DEFAULT_STATUSES.map(s => ({ slug: s, label: colLabels[s] || STATUS_LABELS[s as keyof typeof STATUS_LABELS] })),
    ...customCols,
  ]

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const overId = over.id as string
    const activeTask = tasks.find(t => t.id === taskId)
    if (!activeTask) return

    const allStatusSlugs = allColumns.map(c => c.slug)
    let newStatus: string

    if (allStatusSlugs.includes(overId)) {
      // Dropped directly onto a column container
      newStatus = overId
    } else {
      // Dropped onto a task card — find which column that task lives in
      const overTask = tasks.find(t => t.id === overId)
      if (!overTask) return
      newStatus = overTask.status
    }

    if (newStatus !== activeTask.status) {
      onMoveTask(taskId, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-full">
        {allColumns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.slug)
          const isCustom = !DEFAULT_STATUSES.includes(col.slug as typeof DEFAULT_STATUSES[number])
          return (
            <div key={col.slug} className="flex flex-col min-h-0 min-w-[240px] flex-1">
              <ColumnHeader
                label={col.label}
                count={colTasks.length}
                canEdit={canEdit}
                onRename={newLabel => renameColumn(col.slug, newLabel)}
                onDelete={isCustom && canEdit ? () => deleteCustomColumn(col.slug) : undefined}
              />
              <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id={col.slug}>
                  {colTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      labels={labels}
                      wsColor={wsColor}
                      onClick={() => onTaskClick(task)}
                    />
                  ))}
                  {canEdit && (
                    <button
                      onClick={() => onAddTask(col.slug)}
                      className="w-full py-2 text-[11px] text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded-xl hover:border-slate-400 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Ekle
                    </button>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          )
        })}

        {canEdit && (
          <div className="flex-shrink-0 w-48 flex flex-col">
            <div className="mb-2 px-1 min-h-[24px]" />
            <button
              onClick={addColumn}
              className="flex-1 min-h-[120px] border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:text-slate-600 hover:border-slate-400 flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <Plus size={18} />
              <span className="text-xs font-medium">Sütun Ekle</span>
            </button>
          </div>
        )}
      </div>
    </DndContext>
  )
}
