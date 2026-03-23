import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuditAuthorization } from '../lib/types'

interface AuditLogEntry {
  timestamp: number
  action: 'grant' | 'revoke' | 'verify' | 'generate'
  invoiceId: string
  details: string
}

interface AuditState {
  authorizations: Map<string, AuditAuthorization[]>
  logs: AuditLogEntry[]

  addAuthorization: (invoiceId: string, auth: AuditAuthorization) => void
  removeAuthorization: (invoiceId: string, delegate: string) => void
  getAuthsForInvoice: (invoiceId: string) => AuditAuthorization[]
  addLog: (entry: AuditLogEntry) => void
  clearLogs: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      authorizations: new Map(),
      logs: [],

      addAuthorization: (invoiceId, auth) =>
        set((state) => {
          const m = new Map(state.authorizations)
          const list = [...(m.get(invoiceId) ?? []), auth]
          m.set(invoiceId, list)
          return { authorizations: m }
        }),

      removeAuthorization: (invoiceId, delegate) =>
        set((state) => {
          const m = new Map(state.authorizations)
          const list = (m.get(invoiceId) ?? []).filter((a) => a.delegate !== delegate)
          m.set(invoiceId, list)
          return { authorizations: m }
        }),

      getAuthsForInvoice: (invoiceId) => get().authorizations.get(invoiceId) ?? [],

      addLog: (entry) => set((s) => ({ logs: [entry, ...s.logs].slice(0, 200) })),

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'ghostly-audit-store',
      partialize: (state) => ({
        authorizations: Array.from(state.authorizations.entries()),
        logs: state.logs,
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { authorizations?: [string, AuditAuthorization[]][]; logs?: AuditLogEntry[] } | null
        return {
          ...current,
          authorizations: new Map(p?.authorizations ?? []),
          logs: p?.logs ?? [],
        }
      },
    }
  )
)
