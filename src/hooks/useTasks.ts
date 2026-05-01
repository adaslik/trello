'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Task } from '@/types'
import toast from 'react-hot-toast'

export function useTasks(workspaceId: string | null) {
  const supabase = createBrowserClient()
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true })
    if (data) setTasks(data as Task[])
    setLoading(false)
  }, [workspaceId])

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return
    fetchTasks()

    const channel = supabase
      .channel(`tasks:${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [...prev, payload.new as Task])
          if (payload.new.created_by !== user?.id) {
            toast(`Yeni görev: "${(payload.new as Task).title}"`)
          }
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t))
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workspaceId, fetchTasks])

  const createTask = async (task: Partial<Task>) => {
    if (!user || !workspaceId) return null
    const maxPos = tasks.length ? Math.max(...tasks.map(t => t.position)) + 1 : 0
    const assignees = task.assignees?.length
      ? task.assignees
      : [{ id: user.id, full_name: profile?.full_name || '', initials: profile?.initials || '' }]
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        workspace_id: workspaceId,
        created_by: user.id,
        position: maxPos,
        assignees,
      })
      .select()
      .single()
    if (error) { toast.error('Görev eklenemedi'); return null }
    return data as Task
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Görev güncellenemedi'); return null }
    setTasks(prev => prev.map(t => t.id === id ? data as Task : t))
    return data as Task
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success('Görev silindi')
  }

  const moveTask = async (id: string, newStatus: Task['status']) => {
    await updateTask(id, { status: newStatus })
  }

  return { tasks, loading, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks }
}
