'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Meeting, MeetingAttendance, MeetingAgendaItem, MeetingTaskLink, Task } from '@/types'
import toast from 'react-hot-toast'

export function useMeetings() {
  const supabase = createBrowserClient()
  const { user } = useAuth()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null)
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([])
  const [agendaItems, setAgendaItems] = useState<MeetingAgendaItem[]>([])
  const [meetingTasks, setMeetingTasks] = useState<MeetingTaskLink[]>([])
  const [prevMeetingTasks, setPrevMeetingTasks] = useState<Task[]>([])

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_number', { ascending: false })
    if (data) setMeetings(data as Meeting[])
    setLoading(false)
  }, [])

  const loadMeeting = useCallback(async (meetingId: string) => {
    const [meetingRes, attendanceRes, agendaRes, tasksRes] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', meetingId).single(),
      supabase.from('meeting_attendance')
        .select('*, profile:profiles(id,full_name,initials,role)')
        .eq('meeting_id', meetingId),
      supabase.from('meeting_agenda_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('order_num'),
      supabase.from('meeting_tasks')
        .select('*, task:tasks(*)')
        .eq('meeting_id', meetingId),
    ])

    if (meetingRes.data) setActiveMeeting(meetingRes.data as Meeting)
    if (attendanceRes.data) setAttendance(attendanceRes.data as MeetingAttendance[])
    if (agendaRes.data) setAgendaItems(agendaRes.data as MeetingAgendaItem[])
    if (tasksRes.data) setMeetingTasks(tasksRes.data as MeetingTaskLink[])

    // Önceki toplantının tamamlanmamış görevleri (gündem 1 için)
    if (meetingRes.data) {
      const { data: prevMeeting } = await supabase
        .from('meetings')
        .select('id')
        .lt('meeting_number', meetingRes.data.meeting_number)
        .order('meeting_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prevMeeting) {
        const { data: prevLinks } = await supabase
          .from('meeting_tasks')
          .select('task:tasks(*)')
          .eq('meeting_id', prevMeeting.id)
        if (prevLinks) {
          const incomplete = prevLinks
            .map((l: any) => l.task)
            .filter((t: Task | null) => t && t.status !== 'tamamlandi')
          setPrevMeetingTasks(incomplete as Task[])
        }
      } else {
        setPrevMeetingTasks([])
      }
    }
  }, [])

  const createMeeting = async (data: {
    meeting_number: number
    title: string
    date: string
    start_time?: string
    location: string
  }) => {
    if (!user) return null
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({ ...data, created_by: user.id, status: 'taslak' })
      .select()
      .single()
    if (error) { toast.error('Toplantı oluşturulamadı'); return null }
    toast.success('Toplantı oluşturuldu')
    setMeetings(prev => [meeting as Meeting, ...prev])
    return meeting as Meeting
  }

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    const { data, error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Güncellenemedi'); return }
    const updated = data as Meeting
    setActiveMeeting(updated)
    setMeetings(prev => prev.map(m => m.id === id ? updated : m))
  }

  const upsertAttendance = async (meetingId: string, profileId: string, status: string) => {
    const { data, error } = await supabase
      .from('meeting_attendance')
      .upsert(
        { meeting_id: meetingId, profile_id: profileId, status, updated_at: new Date().toISOString() },
        { onConflict: 'meeting_id,profile_id' }
      )
      .select('*, profile:profiles(id,full_name,initials,role)')
      .single()
    if (error) { toast.error('Yoklama güncellenemedi'); return }
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.profile_id === profileId)
      if (idx >= 0) { const next = [...prev]; next[idx] = data as MeetingAttendance; return next }
      return [...prev, data as MeetingAttendance]
    })
  }

  const updateAgendaItem = async (itemId: string, updates: Partial<MeetingAgendaItem>) => {
    const { data, error } = await supabase
      .from('meeting_agenda_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()
    if (error) { toast.error('Gündem güncellenemedi'); return }
    setAgendaItems(prev => prev.map(a => a.id === itemId ? data as MeetingAgendaItem : a))
  }

  const addAgendaItem = async (meetingId: string, title: string) => {
    const maxOrder = agendaItems.length
      ? Math.max(...agendaItems.map(a => a.order_num)) + 1
      : 10
    const { data, error } = await supabase
      .from('meeting_agenda_items')
      .insert({ meeting_id: meetingId, order_num: maxOrder, title, is_fixed: false })
      .select()
      .single()
    if (error) { toast.error('Gündem maddesi eklenemedi'); return }
    setAgendaItems(prev => [...prev, data as MeetingAgendaItem])
  }

  const createAndLinkTask = async (
    meetingId: string,
    agendaItemId: string,
    taskData: {
      title: string
      workspace_id: string
      assignees: { id: string; full_name: string; initials: string }[]
      priority: string
    }
  ) => {
    if (!user) return
    const { data: task, error: te } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        workspace_id: taskData.workspace_id,
        assignees: taskData.assignees,
        priority: taskData.priority,
        status: 'bekleyen',
        description: '',
        drive_links: [],
        comments: [],
        label_ids: [],
        cover_pattern: 0,
        position: Date.now(),
        created_by: user.id,
      })
      .select()
      .single()
    if (te) { toast.error('Görev oluşturulamadı'); return }

    const { error: le } = await supabase
      .from('meeting_tasks')
      .insert({ meeting_id: meetingId, task_id: task.id, agenda_item_id: agendaItemId })
    if (le) { toast.error('Görev bağlanamadı'); return }

    setMeetingTasks(prev => [
      ...prev,
      { meeting_id: meetingId, task_id: task.id, agenda_item_id: agendaItemId, created_at: new Date().toISOString(), task: task as Task },
    ])
    toast.success('Görev oluşturuldu')
  }

  return {
    meetings, loading, activeMeeting, attendance, agendaItems, meetingTasks, prevMeetingTasks,
    fetchMeetings, loadMeeting, createMeeting, updateMeeting,
    upsertAttendance, updateAgendaItem, addAgendaItem, createAndLinkTask,
  }
}
