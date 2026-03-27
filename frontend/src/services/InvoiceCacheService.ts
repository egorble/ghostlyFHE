import { useInvoiceStore } from '../stores/useInvoiceStore'
import type { Invoice } from '../lib/types'
import * as Fhenix from './FhenixService'

// Convert BigInt fields to number/string for JSON serialization
function serializableInvoice(inv: Invoice): Invoice {
  return {
    ...inv,
    id: typeof inv.id === 'bigint' ? Number(inv.id) : inv.id,
    dueDate: typeof inv.dueDate === 'bigint' ? Number(inv.dueDate) : inv.dueDate,
    createdAt: typeof inv.createdAt === 'bigint' ? Number(inv.createdAt) : inv.createdAt,
    lineItemCount: typeof inv.lineItemCount === 'bigint' ? Number(inv.lineItemCount) : inv.lineItemCount,
  } as unknown as Invoice
}

const SYNC_INTERVAL = 30_000 // 30 seconds
let syncTimer: ReturnType<typeof setInterval> | null = null
let syncing = false

export function loadCachedInvoices(address: string): { sent: Invoice[]; received: Invoice[] } {
  const store = useInvoiceStore.getState()
  const all = store.getCachedInvoicesForWallet(address)
  if (all.length === 0) return { sent: [], received: [] }

  const sent = all.filter(i => i.issuer?.toLowerCase() === address.toLowerCase())
  const received = all.filter(i => i.buyer?.toLowerCase() === address.toLowerCase())
  return { sent, received }
}

export async function syncInvoices(address: string, silent = false): Promise<boolean> {
  if (syncing) return false
  syncing = true

  try {
    const store = useInvoiceStore.getState()

    // Quick check: has invoice count changed?
    const count = Number(await Fhenix.getInvoiceCount())
    if (count === store.lastInvoiceCount && store.walletAddress?.toLowerCase() === address.toLowerCase() && Date.now() - store.lastSyncTime < SYNC_INTERVAL) {
      return false // Nothing changed
    }

    // Fetch invoice lists
    const [issuedIds, buyerIds] = await Promise.all([
      Fhenix.getIssuerInvoices(address).catch(() => [] as bigint[]),
      Fhenix.getBuyerInvoices(address).catch(() => [] as bigint[]),
    ])

    // Determine which invoices need fresh fetch
    const allIds = new Set([...issuedIds, ...buyerIds].map(id => id.toString()))
    const needsFetch: bigint[] = []

    for (const id of allIds) {
      const cached = store.cachedInvoices[id]
      if (!cached) {
        needsFetch.push(BigInt(id))
        continue
      }
      // Re-fetch if status might have changed (not terminal)
      if (cached.status <= 2) { // Created, Sent, PartiallyPaid
        needsFetch.push(BigInt(id))
      }
    }

    // Fetch needed invoices (throttled)
    const loaded: Invoice[] = []
    for (const id of needsFetch) {
      try {
        const inv = await Fhenix.getInvoiceFull(id)
        loaded.push(inv)
      } catch {
        try {
          const inv = { ...(await Fhenix.getInvoiceMinimal(id)), id } as Invoice
          const idStr = id.toString()
          if (issuedIds.some(i => i.toString() === idStr)) inv.issuer = address
          if (buyerIds.some(i => i.toString() === idStr)) inv.buyer = address
          loaded.push(inv)
        } catch { /* skip */ }
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 200))
    }

    // Merge with existing cache (serialize BigInts)
    const merged = { ...store.cachedInvoices }
    for (const inv of loaded) {
      merged[inv.id.toString()] = serializableInvoice(inv)
    }

    // Update store
    useInvoiceStore.setState({
      cachedInvoices: merged,
      lastInvoiceCount: count,
      lastSyncTime: Date.now(),
      walletAddress: address,
    })

    // Auto-decrypt new invoices in background (if cofhejs ready)
    if (loaded.length > 0) {
      setTimeout(() => autoDecryptInvoices(Object.values(merged)), 2000)
    }

    return loaded.length > 0
  } catch (err) {
    if (!silent) console.warn('[Cache] Sync failed:', err)
    return false
  } finally {
    syncing = false
  }
}

export function startBackgroundSync(address: string) {
  stopBackgroundSync()
  // Initial sync
  syncInvoices(address, true)
  // Periodic sync
  syncTimer = setInterval(() => syncInvoices(address, true), SYNC_INTERVAL)
}

export function stopBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

// Decrypt all invoices that don't have cached totals — called on page load
export async function decryptAllMissing(invoices: Invoice[]) {
  // Wait for cofhejs to be ready
  const { cofhejs } = await import('cofhejs/web')
  const store = cofhejs.store?.getState?.()
  if (!store?.account) {
    // cofhejs not initialized yet — retry after delay
    setTimeout(() => decryptAllMissing(invoices), 3000)
    return
  }
  autoDecryptInvoices(invoices)
}

// Auto-decrypt invoices that don't have cached totals yet
async function autoDecryptInvoices(invoices: Invoice[]) {
  const store = useInvoiceStore.getState()
  for (const inv of invoices) {
    const id = inv.id.toString()
    if (store.decryptedTotals[id]) continue // Already cached
    try {
      const result = await Fhenix.getDecryptedTotals(BigInt(id))
      if (result) {
        useInvoiceStore.getState().setDecryptedTotals(id, {
          subtotal: Number(result.subtotal),
          amountPaid: Number(result.amountPaid),
          currency: result.currency,
        })
      }
    } catch { /* skip, will retry next sync */ }
    await new Promise(r => setTimeout(r, 1000)) // throttle
  }
}

// Decrypt helpers that check cache first
export async function getCachedOrDecryptTotals(invoiceId: bigint, _issuer?: string, _buyer?: string): Promise<{ subtotal: number; amountPaid: number; currency: number } | null> {
  const store = useInvoiceStore.getState()
  const id = invoiceId.toString()
  const cached = store.decryptedTotals[id]
  if (cached) return cached

  // Not cached — try decrypt
  const result = await Fhenix.getDecryptedTotals(invoiceId)
  if (result) {
    const totals = {
      subtotal: Number(result.subtotal),
      amountPaid: Number(result.amountPaid),
      currency: result.currency,
    }
    useInvoiceStore.getState().setDecryptedTotals(id, totals)
    return totals
  }
  return null
}

export async function getCachedOrDecryptLineItems(invoiceId: bigint, count: number, issuer?: string, buyer?: string): Promise<{ description: string; qty: number; unitPrice: number; amount: number }[] | null> {
  const store = useInvoiceStore.getState()
  const id = invoiceId.toString()
  const cached = store.decryptedLineItems[id]
  if (cached && cached.length > 0) return cached

  // Not cached — decrypt each item
  const items: { description: string; qty: number; unitPrice: number; amount: number }[] = []
  for (let i = 0; i < count; i++) {
    const li = await Fhenix.getDecryptedLineItem(invoiceId, i, issuer, buyer)
    if (li) items.push(li)
  }
  if (items.length > 0) {
    useInvoiceStore.getState().setDecryptedLineItems(id, items)
  }
  return items.length > 0 ? items : null
}
