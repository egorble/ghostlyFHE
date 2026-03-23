import { create } from 'zustand'
import type { Receipt } from '../lib/types'
import { generateCSV } from '../lib/utils'

interface ReceiptState {
  receipts: Map<string, Receipt>
  setReceipt: (id: string, receipt: Receipt) => void
  getAllReceipts: () => Receipt[]
  exportCsv: () => string
}

export const useReceiptStore = create<ReceiptState>((set, get) => ({
  receipts: new Map(),

  setReceipt: (id, receipt) =>
    set((state) => {
      const m = new Map(state.receipts)
      m.set(id, receipt)
      return { receipts: m }
    }),

  getAllReceipts: () => Array.from(get().receipts.values()),

  exportCsv: () => {
    const receipts = Array.from(get().receipts.values())
    return generateCSV(
      ['ID', 'Invoice ID', 'Payer', 'Issuer', 'Timestamp'],
      receipts.map((r) => [
        r.id.toString(),
        r.invoiceId.toString(),
        r.payer,
        r.issuer,
        new Date(r.timestamp * 1000).toISOString(),
      ])
    )
  },
}))
