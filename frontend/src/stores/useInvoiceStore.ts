import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Invoice, LineItem, ChainStatus } from '../lib/types'

export interface LocalMetadata {
  orderId?: string
  memo?: string
  currency?: number
  lineItems?: LineItem[]
}

export interface DecryptedTotals {
  subtotal: number
  amountPaid: number
  currency: number
}

export interface DecryptedLineItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

interface InvoiceState {
  // Persisted
  cachedInvoices: Record<string, Invoice>           // invoiceId → Invoice
  decryptedTotals: Record<string, DecryptedTotals>  // invoiceId → decrypted amounts
  decryptedLineItems: Record<string, DecryptedLineItem[]> // invoiceId → line items
  localMetadataMap: Record<string, LocalMetadata>   // invoiceId → metadata from creation
  lastSyncTime: number
  lastInvoiceCount: number
  walletAddress: string | null                      // cache is per-wallet

  // Non-persisted (runtime only)
  invoices: Map<string, Invoice>
  localMetadata: Map<string, LocalMetadata>
  sendingHashes: Map<string, string>
  chainStatus: Map<string, ChainStatus>

  // Actions
  setInvoice: (id: string, inv: Invoice) => void
  setCachedInvoices: (invoices: Invoice[], address: string) => void
  setDecryptedTotals: (id: string, totals: DecryptedTotals) => void
  setDecryptedLineItems: (id: string, items: DecryptedLineItem[]) => void
  getDecryptedTotals: (id: string) => DecryptedTotals | undefined
  getDecryptedLineItems: (id: string) => DecryptedLineItem[] | undefined
  getCachedInvoicesForWallet: (address: string) => Invoice[]
  setLocalMetadata: (id: string, meta: Partial<LocalMetadata>) => void
  getInvoice: (id: string) => Invoice | undefined
  restoreLocalMetadata: (ids: string[]) => void
  setSendingHash: (invoiceId: string, txHash: string) => void
  removeSendingHash: (invoiceId: string) => void
  setChainStatus: (invoiceId: string, status: ChainStatus) => void
  updateSyncInfo: (count: number) => void
  clearCacheForWallet: () => void
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      // Persisted defaults
      cachedInvoices: {},
      decryptedTotals: {},
      decryptedLineItems: {},
      localMetadataMap: {},
      lastSyncTime: 0,
      lastInvoiceCount: 0,
      walletAddress: null,

      // Runtime defaults
      invoices: new Map(),
      localMetadata: new Map(),
      sendingHashes: new Map(),
      chainStatus: new Map(),

      // Actions
      setInvoice: (id, inv) =>
        set((state) => {
          const m = new Map(state.invoices)
          m.set(id, inv)
          // Serialize BigInts for cache
          const safe = { ...inv } as Record<string, unknown>
          for (const k of Object.keys(safe)) {
            if (typeof safe[k] === 'bigint') safe[k] = Number(safe[k])
          }
          return { invoices: m, cachedInvoices: { ...state.cachedInvoices, [id]: safe as unknown as Invoice } }
        }),

      setCachedInvoices: (invoices, address) => {
        const cached: Record<string, Invoice> = {}
        for (const inv of invoices) cached[inv.id.toString()] = inv
        set({ cachedInvoices: cached, walletAddress: address, lastSyncTime: Date.now() })
      },

      setDecryptedTotals: (id, totals) =>
        set((state) => ({ decryptedTotals: { ...state.decryptedTotals, [id]: totals } })),

      setDecryptedLineItems: (id, items) =>
        set((state) => ({ decryptedLineItems: { ...state.decryptedLineItems, [id]: items } })),

      getDecryptedTotals: (id) => get().decryptedTotals[id],

      getDecryptedLineItems: (id) => get().decryptedLineItems[id],

      getCachedInvoicesForWallet: (address) => {
        const state = get()
        if (state.walletAddress?.toLowerCase() !== address.toLowerCase()) return []
        return Object.values(state.cachedInvoices)
      },

      setLocalMetadata: (id, meta) => {
        set((state) => {
          const m = new Map(state.localMetadata)
          const merged = { ...m.get(id), ...meta }
          m.set(id, merged)
          return {
            localMetadata: m,
            localMetadataMap: { ...state.localMetadataMap, [id]: merged },
          }
        })
      },

      getInvoice: (id) => get().invoices.get(id) || get().cachedInvoices[id],

      restoreLocalMetadata: (ids: string[]) => {
        set((state) => {
          const m = new Map(state.localMetadata)
          for (const id of ids) {
            if (m.has(id)) continue
            // Check persisted map first
            if (state.localMetadataMap[id]) {
              m.set(id, state.localMetadataMap[id])
              continue
            }
            // Legacy: check old localStorage format
            try {
              const raw = localStorage.getItem(`ghostly_meta_${id}`)
              if (raw) m.set(id, JSON.parse(raw))
            } catch { /* ignore */ }
          }
          return { localMetadata: m }
        })
      },

      setSendingHash: (invoiceId, txHash) =>
        set((state) => {
          const m = new Map(state.sendingHashes)
          m.set(invoiceId, txHash)
          const cs = new Map(state.chainStatus)
          cs.set(invoiceId, 'sending')
          return { sendingHashes: m, chainStatus: cs }
        }),

      removeSendingHash: (invoiceId) =>
        set((state) => {
          const m = new Map(state.sendingHashes)
          m.delete(invoiceId)
          return { sendingHashes: m }
        }),

      setChainStatus: (invoiceId, status) =>
        set((state) => {
          const cs = new Map(state.chainStatus)
          cs.set(invoiceId, status)
          return { chainStatus: cs }
        }),

      updateSyncInfo: (count) =>
        set({ lastInvoiceCount: count, lastSyncTime: Date.now() }),

      clearCacheForWallet: () =>
        set({
          cachedInvoices: {},
          decryptedTotals: {},
          decryptedLineItems: {},
          lastSyncTime: 0,
          lastInvoiceCount: 0,
          walletAddress: null,
        }),
    }),
    {
      name: 'ghostly-invoice-store',
      partialize: (state) => ({
        cachedInvoices: state.cachedInvoices,
        decryptedTotals: state.decryptedTotals,
        decryptedLineItems: state.decryptedLineItems,
        localMetadataMap: state.localMetadataMap,
        lastSyncTime: state.lastSyncTime,
        lastInvoiceCount: state.lastInvoiceCount,
        walletAddress: state.walletAddress,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          return JSON.parse(str)
        },
        setItem: (name, value) => {
          // Convert BigInt to string before JSON serialization
          const str = JSON.stringify(value, (_key, val) =>
            typeof val === 'bigint' ? val.toString() : val
          )
          localStorage.setItem(name, str)
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
