import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuditEntry } from '@/types/audit'

interface AuditState {
  entries: AuditEntry[]
  add: (entry: AuditEntry) => void
  clear: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) => set(s => ({ entries: [entry, ...s.entries].slice(0, 2000) })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'bacord-audit' }
  )
)
