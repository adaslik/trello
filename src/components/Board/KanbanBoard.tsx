'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import type { Task, Label } from '@/types'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, COVER_PATTERNS, lightenColor } from '@/lib/constants'

const STATUSES = ['bekleyen', 'devam_ediyor', 'incelemede', 'tamamlandi'] as const

interface KanbanCardProps {
  task: Task
  labels: Label[]
  wsColor: string
  onClick: () => void
}

function KanbanCard({ task, labels, wsColor, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const taskLabels = (task.label_ids || []).map(id => labels.find(l => l.id === id)).filter(Boolean) as Label[]
  const pri = PRIORITY_COLORS[task.priority]
  const bg = lightenColor(wsColor)
  const coverSvg = COVER_PATTERNS[task.cover_pattern % 4](bg, wsColor)

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl mb-2 overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div dangerouslySetInnerHTML={{ __html: coverSvg.replace('height:120px', 'height:44px').replace('height="120"', 'height="44"') }} />
      <div className="p-2.5">
        {taskLabels.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {taskLabels.map(l => (
              <div key={l.id} className="h-1.5 rounded-full min-w-[24px]" style={{ background: l.color }} title={l.name} />
            ))}
          </div>
        )}
        <p className="text-xs font-medium text-slate-800 leading-snug mb-2">{task.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: pri.bg, color: pri.text }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.assignee_initials && (
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center">
              {task.assignee_initials}
            </span>
          )}
          {task.end_date && (
            <span className="text-[9px] text-slate-400 ml-auto">
              {new Date(task.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.drive_links?.length > 0 && <span className="text-[9px] text-slate-400">📎{task.drive_links.length}</span>}
          {task.comments?.length > 0 && <span className="text-[9px] text-slate-400">💬{task.comments.length}</span>}
        </div>
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  labels: Label[]
  wsColor: string
  canEdit: boolean
  onTaskClick: (task: Task) => void
  onAddTask: (status: Task['status']) => void
  onMoveTask: (id: string, status: Task['status']) => void
}

export default function KanbanBoard({ tasks, labels, wsColor, canEdit, onTaskClick, onAddTask, onMoveTask }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as Task['status']
    if (STATUSES.includes(newStatus as any)) {
      onMoveTask(taskId, newStatus as Task['status'])
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-3 h-full">
        {STATUSES.map(status => {
          const colTasks = tasks.filter(t => t.status === status)
          return (
            <div key={status} className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[9px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div
                  id={status}
                  className="flex-1 bg-slate-100 rounded-xl p-2 overflow-y-auto min-h-[120px]"
                >
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
                      onClick={() => onAddTask(status)}
                      className="w-full py-2 text-[11px] text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded-xl hover:border-slate-400 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Ekle
                    </button>
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
