'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ChecklistItem } from '@/types'

export interface AssignedChecklistItem extends ChecklistItem {
  task: {
    id: string
    title: string
    workspace_id: string
    status: string
    priority: string
    end_date: string | null
  }
}

export function useAssignedChecklists() {
  const supabase = createBrowserClient()
  const { user } = useAuth()
  const [items, setItems] = useState<AssignedChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('task_checklists')
      .select('*, task:tasks!task_id(id, title, workspace_id, status, priority, end_date)')
      .eq('assigned_to', user.id)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
    if (data) setItems(data as AssignedChecklistItem[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchItems()

    const channel = supabase
      .channel(`assigned_checklists:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklists' }, () => {
        fetchItems()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchItems])

  return { items, loading, refetch: fetchItems }
}
