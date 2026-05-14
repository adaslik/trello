'use client'

import { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { TaskActivity } from '@/types'

export function useTaskActivity(taskId: string | null) {
  const supabase = createBrowserClient()
  const [activities, setActivities] = useState<TaskActivity[]>([])

  const fetchActivities = useCallback(async () => {
    if (!taskId) { setActivities([]); return }
    const { data } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    if (data) setActivities(data as TaskActivity[])
  }, [taskId])

  useEffect(() => {
    fetchActivities()
    if (!taskId) return
    const ch = supabase
      .channel(`task_activities:${taskId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_activities',
        filter: `task_id=eq.${taskId}`,
      }, () => fetchActivities())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [taskId, fetchActivities])

  return { activities, refetch: fetchActivities }
}
