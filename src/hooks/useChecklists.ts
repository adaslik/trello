'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { ChecklistItem } from '@/types'

export function useChecklists(taskId: string | null) {
  const supabase = createBrowserClient()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!taskId) { setItems([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('task_checklists')
      .select('*, assigned_profile:profiles!assigned_to(full_name, initials)')
      .eq('task_id', taskId)
      .order('position')
    setItems((data as ChecklistItem[]) || [])
    setLoading(false)
  }, [taskId])

  useEffect(() => { refetch() }, [refetch])

  const addItem = async (title: string) => {
    if (!taskId || !title.trim()) return
    const { data } = await supabase
      .from('task_checklists')
      .insert({ task_id: taskId, title: title.trim(), position: items.length })
      .select('*, assigned_profile:profiles!assigned_to(full_name, initials)')
      .single()
    if (data) setItems(prev => [...prev, data as ChecklistItem])
  }

  const toggleItem = async (id: string, is_completed: boolean) => {
    await supabase.from('task_checklists').update({ is_completed }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_completed } : i))
  }

  const updateTitle = async (id: string, title: string) => {
    if (!title.trim()) return
    await supabase.from('task_checklists').update({ title: title.trim() }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: title.trim() } : i))
  }

  const assignItem = async (id: string, assigned_to: string | null) => {
    await supabase.from('task_checklists').update({ assigned_to }).eq('id', id)
    await refetch()
  }

  const deleteItem = async (id: string) => {
    await supabase.from('task_checklists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, addItem, toggleItem, updateTitle, assignItem, deleteItem }
}
