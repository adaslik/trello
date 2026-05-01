'use client'

import type { Task, Label } from '@/types'
import { PRIORITY_COLORS, lightenColor } from '@/lib/constants'

interface GanttViewProps {
  tasks: Task[]
  wsColor: string
  onTaskClick: (task: Task) => void
}

export default function GanttView({ tasks, wsColor, onTaskClick }: GanttViewProps) {
  if (!tasks.length) {
    return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Henüz görev yok</div>
  }

  const dated = tasks.filter(t => t.start_date && t.end_date)
  if (!dated.length) {
    return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Tarihli görev yok — görev eklerken başlangıç/bitiş tarihi girin</div>
  }

  const starts = dated.map(t => new Date(t.start_date!).getTime())
  const ends = dated.map(t => new Date(t.end_date!).getTime())
  const minTs = Math.min(...starts) - 86400000
  const maxTs = Math.max(...ends) + 86400000 * 2
  const total = maxTs - minTs
  const today = Date.now()
  const todayPct = Math.max(0, Math.min(100, ((today - minTs) / total) * 100))

  // Generate day labels
  const days: { pct: number; label: string }[] = []
  const dayCount = Math.round(total / 86400000)
  const step = Math.max(1, Math.floor(dayCount / 7))
  for (let i = 0; i < dayCount; i += step) {
    const d = new Date(minTs + i * 86400000)
    days.push({
      pct: (i / dayCount) * 100,
      label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    })
  }

  const barBg = lightenColor(wsColor)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 600 }}>
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
          <div className="text-[9px] text-slate-400 px-3 py-2 font-medium">Görev</div>
          <div className="relative h-8 bg-slate-100 border-b border-slate-200">
            {days.map((d, i) => (
              <span
                key={i}
                className="absolute text-[9px] text-slate-400 -translate-x-1/2 top-1.5"
                style={{ left: `${d.pct}%` }}
              >
                {d.label}
              </span>
            ))}
            <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `${todayPct}%` }} />
          </div>
        </div>

        {/* Rows */}
        {dated.map(task => {
          const s = (new Date(task.start_date!).getTime() - minTs) / total * 100
          const w = Math.max(1, (new Date(task.end_date!).getTime() - new Date(task.start_date!).getTime()) / total * 100)
          const pri = PRIORITY_COLORS[task.priority]

          return (
            <div
              key={task.id}
              className="grid border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              style={{ gridTemplateColumns: '180px 1fr' }}
              onClick={() => onTaskClick(task)}
            >
              <div className="px-3 py-2 text-xs text-slate-700 truncate flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: wsColor }} />
                {task.title}
              </div>
              <div className="relative h-10 flex items-center">
                <div className="absolute top-0 bottom-0 w-px bg-red-400/50 z-10" style={{ left: `${todayPct}%` }} />
                <div
                  className="absolute h-5 rounded-full flex items-center px-2 text-[9px] font-semibold overflow-hidden whitespace-nowrap"
                  style={{ left: `${s}%`, width: `${w}%`, background: barBg, color: wsColor, minWidth: 8 }}
                >
                  {w > 8 ? (task.assignees?.map(a => a.initials).join(', ') || '') : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
