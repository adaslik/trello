'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, Label } from '@/types'
import { lightenColor } from '@/lib/constants'

interface CalendarViewProps {
  tasks: Task[]
  labels: Label[]
  wsColor: string
  onTaskClick: (task: Task) => void
}

export default function CalendarView({ tasks, labels, wsColor, onTaskClick }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const navigate = (dir: number) => {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Mon-start

  // Build event map
  const byDay: Record<number, Task[]> = {}
  tasks.forEach(task => {
    if (!task.start_date || !task.end_date) return
    const s = new Date(task.start_date)
    const e = new Date(task.end_date)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = d.getDate()
        if (!byDay[k]) byDay[k] = []
        if (!byDay[k].find(t => t.id === task.id)) byDay[k].push(task)
      }
    }
  })

  const monthName = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let i = 1; i <= last.getDate(); i++) cells.push(i)

  const isToday = (d: number) =>
    year === today.getFullYear() && month === today.getMonth() && d === today.getDate()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <h3 className="text-sm font-semibold text-slate-700 capitalize">{monthName}</h3>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-[9px] font-bold text-slate-400 text-center py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[70px] bg-slate-50 rounded-lg opacity-40" />
          const evts = byDay[day] || []
          return (
            <div
              key={i}
              className={`min-h-[70px] rounded-lg p-1.5 border ${
                isToday(day)
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`text-[10px] font-semibold mb-1 ${isToday(day) ? 'text-indigo-600' : 'text-slate-500'}`}>
                {day}
              </div>
              {evts.slice(0, 3).map(task => {
                const firstLabel = task.label_ids?.[0] != null ? labels.find(l => l.id === task.label_ids[0]) : null
                const color = firstLabel?.color || wsColor
                return (
                  <div
                    key={task.id}
                    className="text-[8px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer font-medium"
                    style={{ background: color + '22', color }}
                    onClick={() => onTaskClick(task)}
                  >
                    {task.title}
                  </div>
                )
              })}
              {evts.length > 3 && (
                <div className="text-[8px] text-slate-400">+{evts.length - 3} daha</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
