'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Task } from '@/types'
import toast from 'react-hot-toast'

export function useAssignedTasks() {
  const supabase = createBrowserClient()
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setTasks(data as Task[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchTasks()

    const channel = supabase
      .channel(`assigned_tasks:${user.id}`)
      // Task assigned to me (new or re-assigned)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks',
        filter: `assignee_id=eq.${user.id}`,
      }, (payload) => {
        const task = payload.new as Task
        setTasks(prev => {
          if (prev.find(t => t.id === task.id)) return prev
          toast(`Yeni görev atandı: "${task.title}"`)
          return [task, ...prev]
        })
      })
      // Content updated on a task that is still assigned to me
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
        filter: `assignee_id=eq.${user.id}`,
      }, (payload) => {
        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t))
      })
      // Catch all UPDATEs to detect when a task is re-assigned away from me
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
      }, (payload) => {
        const updated = payload.new as Task
        if (updated.assignee_id !== user.id) {
          setTasks(prev => prev.filter(t => t.id !== updated.id))
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'tasks',
      }, (payload) => {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchTasks])

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

  return { tasks, loading, updateTask, refetch: fetchTasks }
}
