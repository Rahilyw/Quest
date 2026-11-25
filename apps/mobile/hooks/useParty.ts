import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ensureDuoAvailable } from '@/hooks/useDuoAvailable'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import {
  isValidPartyCode,
  normalizePartyCode,
  partyErrorCopy,
  partyLobbyState,
  type PartyLobbyState,
} from '@/lib/party'

export interface PartyMember {
  user_id: string
  username: string
  joined_at: string
  completion_id: string | null
  is_creator: boolean
}

export interface PartyLobby {
  id: string
  quest_id: string
  code: string
  created_by: string
  created_at: string
  expires_at: string
  is_open: boolean
  members: PartyMember[]
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseMember(raw: unknown): PartyMember | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const user_id = asString(row.user_id)
  const username = asString(row.username)
  if (!user_id || !username) return null
  return {
    user_id,
    username,
    joined_at: asString(row.joined_at) ?? '',
    completion_id: asString(row.completion_id),
    is_creator: row.is_creator === true,
  }
}

function parseLobby(data: unknown): PartyLobby | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const root = data as Record<string, unknown>
  const id = asString(root.id)
  const quest_id = asString(root.quest_id)
  const code = asString(root.code)
  const created_by = asString(root.created_by)
  const expires_at = asString(root.expires_at)
  if (!id || !quest_id || !code || !created_by || !expires_at) return null
  const membersRaw = root.members
  const members = Array.isArray(membersRaw)
    ? membersRaw.map(parseMember).filter((m): m is PartyMember => m != null)
    : []
  return {
    id,
    quest_id,
    code,
    created_by,
    created_at: asString(root.created_at) ?? '',
    expires_at,
    is_open: root.is_open !== false,
    members,
  }
}

export function useOwnParty(questId: string | null | undefined, enabled = true) {
  const [party, setParty] = useState<PartyLobby | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!questId || !enabled) {
      setParty(null)
      return
    }
    // Dark-launch: never call party RPCs until min_party_size is readable.
    if (!(await ensureDuoAvailable())) {
      setParty(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('own_party', { p_quest_id: questId })
    if (rpcError) {
      setParty(null)
      setError(null)
      setLoading(false)
      return
    }
    setParty(parseLobby(data))
    setLoading(false)
  }, [questId, enabled])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  useEffect(() => {
    if (!party?.id) return
    const id = setInterval(() => {
      void refresh()
    }, 8000)
    return () => clearInterval(id)
  }, [party?.id, refresh])

  const state: PartyLobbyState = partyLobbyState(party)

  return { party, state, loading, error, refresh }
}

export async function createParty(questId: string): Promise<
  { ok: true; code: string; expires_at: string } | { ok: false; error: string }
> {
  if (!(await ensureDuoAvailable())) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  const { data, error } = await supabase.rpc('create_party', { p_quest_id: questId })
  if (error) {
    return { ok: false, error: partyErrorCopy(error.hint, error.message) }
  }
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const code = root ? asString(root.code) : null
  const expires_at = root ? asString(root.expires_at) : null
  if (!code || !expires_at) {
    return { ok: false, error: partyErrorCopy(null, null) }
  }
  track('party_created', { quest_id: questId })
  return { ok: true, code, expires_at }
}

export async function joinParty(rawCode: string): Promise<
  { ok: true; quest_id: string; partner_username: string | null } | { ok: false; error: string }
> {
  if (!(await ensureDuoAvailable())) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  const code = normalizePartyCode(rawCode)
  if (!isValidPartyCode(code)) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  const { data, error } = await supabase.rpc('join_party', { p_code: code })
  if (error) {
    return { ok: false, error: partyErrorCopy(error.hint, error.message) }
  }
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const quest_id = root ? asString(root.quest_id) : null
  if (!quest_id) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  track('party_joined', { quest_id })
  return {
    ok: true,
    quest_id,
    partner_username: root ? asString(root.partner_username) : null,
  }
}

export async function leaveParty(rawCode: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await ensureDuoAvailable())) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  const code = normalizePartyCode(rawCode)
  if (!isValidPartyCode(code)) {
    return { ok: false, error: partyErrorCopy('PARTY_NOT_FOUND') }
  }
  const { error } = await supabase.rpc('leave_party', { p_code: code })
  if (error) {
    return { ok: false, error: partyErrorCopy(error.hint, error.message) }
  }
  return { ok: true }
}
