'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Workspace, Label } from '@/types'
import { DEFAULT_LABEL_NAMES, LABEL_COLORS } from '@/lib/constants'

export function useWorkspaces() {
  const supabase = createBrowserClient()
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [labels, setLabels] = useState<Record<string, Label[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setWorkspaces(data as Workspace[])
    setLoading(false)
  }, [user])

  const fetchLabels = useCallback(async (wsId: string) => {
    const { data } = await supabase
      .from('labels')
      .select('*')
      .eq('workspace_id', wsId)
      .order('position', { ascending: true })

    if (data && data.length > 0) {
      setLabels(prev => ({ ...prev, [wsId]: data as Label[] }))
    } else {
      // Seed 10 default labels
      const defaults = LABEL_COLORS.map((color, i) => ({
        workspace_id: wsId,
        name: DEFAULT_LABEL_NAMES[i],
        color,
        position: i,
      }))
      const { data: inserted } = await supabase
        .from('labels')
        .insert(defaults)
        .select()
      if (inserted) setLabels(prev => ({ ...prev, [wsId]: inserted as Label[] }))
    }
  }, [])

  const createWorkspace = async (ws: Partial<Workspace>) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ ...ws, created_by: user.id })
      .select()
      .single()
    if (!error && data) {
      setWorkspaces(prev => [...prev, data as Workspace])
      await fetchLabels(data.id)
    }
    return data
  }

  const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setWorkspaces(prev => prev.map(w => w.id === id ? data as Workspace : w))
    }
    return data
  }

  const deleteWorkspace = async (id: string) => {
    await supabase.from('workspaces').delete().eq('id', id)
    setWorkspaces(prev => prev.filter(w => w.id !== id))
  }

  const updateLabel = async (id: number, name: string) => {
    await supabase.from('labels').update({ name }).eq('id', id)
    setLabels(prev => {
      const updated = { ...prev }
      for (const wsId in updated) {
        updated[wsId] = updated[wsId].map(l => l.id === id ? { ...l, name } : l)
      }
      return updated
    })
  }

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  return {
    workspaces, labels, loading,
    fetchLabels, createWorkspace, updateWorkspace,
    deleteWorkspace, updateLabel, refetch: fetchWorkspaces,
  }
}
