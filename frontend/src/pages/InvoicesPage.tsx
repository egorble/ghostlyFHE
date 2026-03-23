import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiSpinnerGap as Loader2, PiArrowsClockwise as RefreshCw, PiDownloadSimple as Download, PiCards as FileText, PiPaperPlaneRight as Send } from 'react-icons/pi'
import { motion } from 'framer-motion'
import { useUserStore } from '../stores/useUserStore'
import * as InvoiceCache from '../services/InvoiceCacheService'
import { InvoiceCard } from '../components/invoice/InvoiceCard'
import { EmptyState } from '../components/ui/empty-state'
import FilterTabs from '../components/ui/FilterTabs'
import SearchInput from '../components/ui/SearchInput'
import { generateCSV, downloadCSV } from '../lib/utils'
import type { Invoice } from '../lib/types'
import { STATUS_LABELS } from '../lib/types'

type RoleFilter = 'all' | 'sent' | 'received'
type StatusFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5' | '6'

const ROLE_TABS = [
  { key: 'all' as RoleFilter, label: 'All' },
  { key: 'sent' as RoleFilter, label: 'Sent' },
  { key: 'received' as RoleFilter, label: 'Received' },
]

const STATUS_TABS = [
  { key: 'all' as StatusFilter, label: 'All' },
  { key: '0' as StatusFilter, label: 'Created' },
  { key: '1' as StatusFilter, label: 'Sent' },
  { key: '3' as StatusFilter, label: 'Paid' },
  { key: '6' as StatusFilter, label: 'Cancelled' },
]

export function InvoicesPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useUserStore()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([])
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      // 1. Show cached instantly
      const cached = InvoiceCache.loadCachedInvoices(address)
      if (cached.sent.length > 0 || cached.received.length > 0) {
        setSentInvoices(cached.sent.reverse())
        setReceivedInvoices(cached.received.reverse())
        // Auto-decrypt any missing totals from cache
        InvoiceCache.decryptAllMissing([...cached.sent, ...cached.received])
      } else {
        setLoading(true)
      }
      // 2. Sync in background
      InvoiceCache.syncInvoices(address).then(changed => {
        if (changed) {
          const fresh = InvoiceCache.loadCachedInvoices(address)
          setSentInvoices(fresh.sent.reverse())
          setReceivedInvoices(fresh.received.reverse())
        }
        setLoading(false)
      })
      // 3. Start periodic background sync
      InvoiceCache.startBackgroundSync(address)
    }
    return () => InvoiceCache.stopBackgroundSync()
  }, [isConnected, address])

  async function handleSync() {
    setSyncing(true)
    await InvoiceCache.syncInvoices(address!, false)
    const fresh = InvoiceCache.loadCachedInvoices(address!)
    setSentInvoices(fresh.sent.reverse())
    setReceivedInvoices(fresh.received.reverse())
    setSyncing(false)
  }

  const filteredInvoices = useMemo(() => {
    let items: { invoice: Invoice; role: 'seller' | 'buyer' }[] = []

    if (roleFilter === 'all' || roleFilter === 'sent') {
      items.push(...sentInvoices.map((i) => ({ invoice: i, role: 'seller' as const })))
    }
    if (roleFilter === 'all' || roleFilter === 'received') {
      items.push(...receivedInvoices.map((i) => ({ invoice: i, role: 'buyer' as const })))
    }

    // Deduplicate and determine role by connected address
    const deduped = new Map<string, { invoice: Invoice; role: 'seller' | 'buyer' }>()
    for (const item of items) {
      const key = item.invoice.id.toString()
      if (!deduped.has(key)) {
        // Determine role by comparing connected address to issuer/buyer
        const isIssuer = address && item.invoice.issuer?.toLowerCase() === address.toLowerCase()
        const role = isIssuer ? 'seller' as const : 'buyer' as const
        deduped.set(key, { invoice: item.invoice, role })
      }
    }
    items = Array.from(deduped.values())

    if (statusFilter !== 'all') {
      items = items.filter((item) => item.invoice.status === Number(statusFilter))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (item) =>
          item.invoice.id.toString().includes(q) ||
          item.invoice.issuer?.toLowerCase().includes(q) ||
          item.invoice.buyer?.toLowerCase().includes(q)
      )
    }

    return items
  }, [sentInvoices, receivedInvoices, roleFilter, statusFilter, search])

  function handleExportCSV() {
    const csv = generateCSV(
      ['ID', 'Issuer', 'Buyer', 'Status', 'Due Date', 'Created', 'Line Items', 'Audit'],
      filteredInvoices.map(({ invoice: i }) => [
        i.id.toString(),
        i.issuer || '',
        i.buyer || '',
        STATUS_LABELS[i.status] || '',
        i.dueDate ? new Date(i.dueDate * 1000).toISOString() : '',
        i.createdAt ? new Date(i.createdAt * 1000).toISOString() : '',
        String(i.lineItemCount),
        i.auditEnabled ? 'Yes' : 'No',
      ])
    )
    downloadCSV(csv, 'ghostly-invoices.csv')
  }

  if (!isConnected) {
    return <EmptyState icon={FileText} title="Connect Wallet" description="Connect your wallet to view invoices." />
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
           <p className="text-[12px] text-slate-500 mt-0.5">Manage and track your confidential invoices securely.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => navigate('/invoices/create')} className="px-5 py-2.5 bg-[#1F6E4D] text-white text-sm font-medium rounded-xl hover:bg-[#16553b] transition-all shadow-sm hover:shadow-md flex items-center gap-2">
             <Send className="w-4 h-4" /> Create New
           </button>
           <button onClick={handleSync} disabled={syncing} className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm hover:shadow-md" title="Sync Invoices">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={handleExportCSV} disabled={filteredInvoices.length === 0} className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md flex items-center gap-2" title="Export to CSV">
             <Download className="w-4 h-4" /> Export
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-4">
           <FilterTabs items={ROLE_TABS} active={roleFilter} onChange={setRoleFilter} />
           <div className="hidden sm:block w-px h-8 bg-slate-200 my-auto"></div>
           <FilterTabs items={STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search ID or Address..."
          className="w-full lg:w-72"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#1F6E4D]" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyState
            icon={FileText}
            title="No Invoices Found"
            description="You don't have any invoices matching the current criteria."
          />
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filteredInvoices.map(({ invoice, role }, index) => (
            <motion.div
              key={invoice.id.toString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <InvoiceCard
                invoice={invoice}
                role={role}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
