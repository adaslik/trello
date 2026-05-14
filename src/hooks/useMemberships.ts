'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { WorkspaceMembership, BoardMembership, MembershipRole } from '@/types'

export function useMemberships(workspaceId: string | null) {
  const supabase = createBrowserClient()
  const [wsMembers, setWsMembers] = useState<WorkspaceMembership[]>([])
  const [boardMembers, setBoardMembers] = useState<BoardMembership[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const [wm, bm] = await Promise.all([
      supabase
        .from('workspace_memberships')
        .select('*, profile:profiles(id,full_name,initials,email,avatar_url)')
        .eq('workspace_id', workspaceId)
        .order('created_at'),
      supabase
        .from('board_memberships')
        .select('*, profile:profiles(id,full_name,initials,email,avatar_url)')
        .eq('workspace_id', workspaceId)
        .order('created_at'),
    ])
    if (wm.data) setWsMembers(wm.data as WorkspaceMembership[])
    if (bm.data) setBoardMembers(bm.data as BoardMembership[])
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { fetch() }, [fetch])

  const addWsMember = async (userId: string, role: MembershipRole, invitedBy: string) => {
    const { error } = await supabase.from('workspace_memberships').insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    })
    if (!error) await fetch()
    return error
  }

  const updateWsMemberRole = async (membershipId: string, role: MembershipRole) => {
    const { error } = await supabase
      .from('workspace_memberships')
      .update({ role })
      .eq('id', membershipId)
    if (!error) await fetch()
    return error
  }

  const removeWsMember = async (membershipId: string) => {
    await supabase.from('workspace_memberships').delete().eq('id', membershipId)
    await fetch()
  }

  const addBoardMember = async (boardName: string, userId: string, role: MembershipRole, invitedBy: string) => {
    const { error } = await supabase.from('board_memberships').insert({
      workspace_id: workspaceId,
      board_name: boardName,
      user_id: userId,
      role,
      invited_by: invitedBy,
    })
    if (!error) await fetch()
    return error
  }

  const updateBoardMemberRole = async (membershipId: string, role: MembershipRole) => {
    const { error } = await supabase
      .from('board_memberships')
      .update({ role })
      .eq('id', membershipId)
    if (!error) await fetch()
    return error
  }

  const removeBoardMember = async (membershipId: string) => {
    await supabase.from('board_memberships').delete().eq('id', membershipId)
    await fetch()
  }

  return {
    wsMembers, boardMembers, loading, refetch: fetch,
    addWsMember, updateWsMemberRole, removeWsMember,
    addBoardMember, updateBoardMemberRole, removeBoardMember,
  }
}
