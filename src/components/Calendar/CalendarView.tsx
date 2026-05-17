'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, Label } from '@/types'
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants'

interface CalendarViewProps {
  tasks: Task[]
  labels: Label[]
  wsColor: string
  onTaskClick: (task: Task) => void
}

type Mode = 'monthly' | 'weekly' | 'daily'

// "2026-05-15" → yerel gece yarısı (UTC kaymasından kaçın)
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7 // Mon = 0
  r.setDate(r.getDate() - dow)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CalendarView({ tasks, labels, wsColor, onTaskClick }: CalendarViewProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [mode, setMode]   = useState<Mode>('monthly')
  const [cursor, setCursor] = useState(new Date(today)) // any date in current period

  // ── Ortak: gün → görevler haritası ──────────────────────────
  // Her görev sadece start_date ve end_date günlerinde görünür
  const byKey: Record<string, { task: Task; isEnd: boolean }[]> = {}

  const addToKey = (key: string, task: Task, isEnd: boolean) => {
    if (!byKey[key]) byKey[key] = []
    if (!byKey[key].find(e => e.task.id === task.id)) byKey[key].push({ task, isEnd })
  }

  tasks.forEach(task => {
    if (task.start_date) addToKey(toKey(parseDate(task.start_date)), task, false)
    if (task.end_date && task.end_date !== task.start_date)
      addToKey(toKey(parseDate(task.end_date)), task, true)
  })

  // ── Navigasyon ───────────────────────────────────────────────
  const navigate = (dir: number) => {
    const d = new Date(cursor)
    if (mode === 'monthly')  { d.setMonth(d.getMonth() + dir) }
    else if (mode === 'weekly')  { d.setDate(d.getDate() + dir * 7) }
    else                         { d.setDate(d.getDate() + dir) }
    setCursor(d)
  }

  // ── Başlık ───────────────────────────────────────────────────
  const headerLabel = () => {
    if (mode === 'monthly') {
      return new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        .toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    }
    if (mode === 'weekly') {
      const ws = startOfWeek(cursor)
      const we = addDays(ws, 6)
      const sm = ws.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      const em = we.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${sm} – ${em}`
    }
    return cursor.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  // ── Görev etiketi ─────────────────────────────────────────────
  const TaskChip = ({ task, isEnd }: { task: Task; isEnd: boolean }) => {
    const firstLabel = task.label_ids?.[0] != null ? labels.find(l => l.id === task.label_ids[0]) : null
    const color = firstLabel?.color || wsColor
    return (
      <div
        onClick={() => onTaskClick(task)}
        title={isEnd ? `Bitiş: ${task.title}` : `Başlangıç: ${task.title}`}
        className="flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded cursor-pointer font-medium truncate"
        style={isEnd
          ? { background: color + '18', color, border: `1px solid ${color}55` }
          : { background: color + '33', color }}
      >
        <span className="flex-shrink-0 text-[7px]">{isEnd ? '⏹' : '▶'}</span>
        <span className="truncate">{task.title}</span>
      </div>
    )
  }

  // ── Görev kartı (haftalık/günlük için büyük) ──────────────────
  type CardType = 'start' | 'end' | 'ongoing'
  const CARD_ICON: Record<CardType, string> = { start: '▶', end: '⏹', ongoing: '⟶' }
  const CARD_LABEL: Record<CardType, string> = { start: 'Başlıyor', end: 'Bitiyor', ongoing: 'Devam Ediyor' }

  const TaskCard = ({ task, type }: { task: Task; type: CardType }) => {
    const firstLabel = task.label_ids?.[0] != null ? labels.find(l => l.id === task.label_ids[0]) : null
    const color = firstLabel?.color || wsColor
    const pri   = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.orta
    const opacity = type === 'ongoing' ? '18' : type === 'end' ? '12' : '22'
    return (
      <div
        onClick={() => onTaskClick(task)}
        className="p-2.5 rounded-lg cursor-pointer border hover:opacity-80 transition-opacity"
        style={{ borderLeft: `3px solid ${color}`, background: color + opacity, borderTopColor: color + '30', borderRightColor: color + '30', borderBottomColor: color + '30' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px]" style={{ color }}>{CARD_ICON[type]}</span>
          <p className="text-[12px] font-semibold text-slate-800 flex-1">{task.title}</p>
          <span className="text-[9px] font-medium px-1.5 py-px rounded-full flex-shrink-0" style={{ background: color + '22', color }}>
            {CARD_LABEL[type]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-slate-500">{STATUS_LABELS[task.status as keyof typeof STATUS_LABELS] || task.status}</span>
          <span
            className="text-[9px] font-medium px-1.5 py-px rounded-full"
            style={{ background: pri.bg, color: pri.text }}
          >
            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
          </span>
          {(task.start_date || task.end_date) && (
            <span className="text-[9px] text-slate-400 ml-auto">
              {task.start_date && new Date(task.start_date).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}
              {task.start_date && task.end_date && ' → '}
              {task.end_date && new Date(task.end_date).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── AYLIK görünüm ─────────────────────────────────────────────
  const MonthlyView = () => {
    const year  = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const last  = new Date(year, month + 1, 0)
    const startDow = (first.getDay() + 6) % 7

    const cells: (number | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let i = 1; i <= last.getDate(); i++) cells.push(i)

    const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

    return (
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-[9px] font-bold text-slate-400 text-center py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[64px] bg-slate-50 rounded-lg opacity-30" />
          const key  = toKey(new Date(year, month, day))
          const evts = byKey[key] || []
          const isT  = isSameDay(new Date(year, month, day), today)
          return (
            <div key={i} className={`min-h-[64px] rounded-lg p-1 border ${isT ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
              <div className={`text-[10px] font-semibold mb-1 ${isT ? 'text-indigo-600' : 'text-slate-400'}`}>{day}</div>
              <div className="space-y-0.5">
                {evts.slice(0, 2).map(e => <TaskChip key={e.task.id + (e.isEnd ? '-e' : '-s')} {...e} />)}
                {evts.length > 2 && <div className="text-[8px] text-slate-400 pl-1">+{evts.length - 2}</div>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── HAFTALIK görünüm ──────────────────────────────────────────
  const WeeklyView = () => {
    const ws = startOfWeek(cursor)
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

    return (
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const key  = toKey(day)
          const evts = byKey[key] || []
          const isT  = isSameDay(day, today)
          return (
            <div key={i} className="flex flex-col">
              <div className={`text-center mb-1.5 py-1 rounded-lg ${isT ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                <p className={`text-[9px] font-bold ${isT ? 'text-white' : 'text-slate-400'}`}>{dayNames[i]}</p>
                <p className={`text-sm font-bold ${isT ? 'text-white' : 'text-slate-700'}`}>{day.getDate()}</p>
              </div>
              <div className="flex-1 min-h-[120px] bg-white border border-slate-100 rounded-lg p-1 space-y-0.5">
                {evts.map(e => <TaskChip key={e.task.id + (e.isEnd ? '-e' : '-s')} {...e} />)}
                {evts.length === 0 && <div className="h-full" />}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── GÜNLÜK görünüm ────────────────────────────────────────────
  const DailyView = () => {
    const key  = toKey(cursor)
    const evts = byKey[key] || []
    const isT  = isSameDay(cursor, today)

    const startTasks   = evts.filter(e => !e.isEnd).map(e => e.task)
    const endTasks     = evts.filter(e =>  e.isEnd).map(e => e.task)
    const ongoingTasks = tasks.filter(task => {
      if (!task.start_date || !task.end_date) return false
      const s = parseDate(task.start_date)
      const e = parseDate(task.end_date)
      return s < cursor && e > cursor
    })
    const allCount = startTasks.length + endTasks.length + ongoingTasks.length

    return (
      <div>
        <div className={`flex items-center justify-center gap-2 py-3 rounded-xl mb-4 ${isT ? 'bg-indigo-600' : 'bg-slate-100'}`}>
          <span className={`text-sm font-bold ${isT ? 'text-white' : 'text-slate-700'}`}>
            {cursor.toLocaleDateString('tr-TR', { weekday: 'long' })}
          </span>
          {isT && <span className="text-[10px] bg-white text-indigo-600 font-bold px-2 py-0.5 rounded-full">Bugün</span>}
        </div>
        {allCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm text-slate-400">Bu gün görev yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {startTasks.map(task   => <TaskCard key={task.id + '-s'} task={task} type="start"   />)}
            {endTasks.map(task     => <TaskCard key={task.id + '-e'} task={task} type="end"     />)}
            {ongoingTasks.map(task => <TaskCard key={task.id + '-o'} task={task} type="ongoing" />)}
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2">
        {/* Mod seçici */}
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['monthly', 'weekly', 'daily'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'monthly' ? 'Aylık' : m === 'weekly' ? 'Haftalık' : 'Günlük'}
            </button>
          ))}
        </div>

        {/* Navigasyon */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft size={15} className="text-slate-500" />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-[120px] text-center capitalize">
            {headerLabel()}
          </span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronRight size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Bugün butonu */}
        <button
          onClick={() => setCursor(new Date(today))}
          className="text-[11px] font-medium px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Bugün
        </button>
      </div>

      {/* Görünüm */}
      {mode === 'monthly' && <MonthlyView />}
      {mode === 'weekly'  && <WeeklyView />}
      {mode === 'daily'   && <DailyView />}
    </div>
  )
}
