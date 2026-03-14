import { useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

export function useSessions() {
  const { sessions, setSessions } = useStore()

  const loadSessions = useCallback(async () => {
    const list = await window.api.listSessions()
    setSessions(list)
  }, [setSessions])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const deleteSession = useCallback(
    async (id: string) => {
      await window.api.deleteSession(id)
      loadSessions()
    },
    [loadSessions]
  )

  const renameSession = useCallback(
    async (id: string, title: string) => {
      await window.api.updateSessionTitle(id, title)
      loadSessions()
    },
    [loadSessions]
  )

  return { sessions, deleteSession, renameSession, loadSessions }
}
