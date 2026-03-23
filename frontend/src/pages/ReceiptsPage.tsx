import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiWallet as ReceiptIcon, PiArrowsClockwise as RefreshCw, PiDownloadSimple as Download, PiSpinnerGap as Loader2 } from 'react-icons/pi'
import { motion } from 'framer-motion'
import { useUserStore } from '../stores/useUserStore'
import { useReceiptStore } from '../stores/useReceiptStore'
import * as Fhenix from '../services/FhenixService'
import { EmptyState } from '../components/ui/empty-state'
import CopyButton from '../components/ui/CopyButton'
import { formatAddress, formatDate, downloadCSV } from '../lib/utils'
import type { Receipt } from '../lib/types'

export function ReceiptsPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useUserStore()
  const { setReceipt, exportCsv } = useReceiptStore()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (isConnected && address) loadReceipts()
  }, [isConnected, address])

  async function loadReceipts() {
    if (!address) return
    setLoading(true)
    try {
      const ids = await Fhenix.getReceiptsByUser(address)
      const data = await Promise.all(ids.map((id) => Fhenix.getReceiptPublicData(id)))
      const reversed = data.reverse()
      setReceipts(reversed)
      reversed.forEach((r) => setReceipt(r.id.toString(), r))
    } catch (err) {
      console.error('Failed to load receipts:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    await loadReceipts()
    setSyncing(false)
  }

  function handleExportCSV() {
    const csv = exportCsv()
    downloadCSV(csv, 'ghostly-receipts.csv')
  }

  if (!isConnected) {
    return <EmptyState icon={ReceiptIcon} title="Connect Wallet" description="Connect your wallet to view receipts." />
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Receipts
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Payment receipts for your invoices</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handleSync} disabled={syncing} className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportCSV} disabled={receipts.length === 0} className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-emerald-200 via-slate-100 to-transparent"></div>

      {loading ? (
        <div className="flex justify-center flex-col items-center gap-4 py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loading receipts...</p>
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title="No receipts" description="Payment receipts will appear here." />
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3"
        >
          {receipts.map((r) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={r.id.toString()} 
              className="bg-white rounded-2xl border border-slate-200 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Subtle top border glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1F6E4D]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1F6E4D]/[0.02] to-transparent pointer-events-none" />
              
              <div className="p-5 flex flex-col h-full relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-slate-900 text-sm">Receipt #{r.id.toString()}</span>
                    <CopyButton text={r.id.toString()} />
                  </div>
                  <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Paid
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/invoices/${r.invoiceId.toString()}`)}
                        className="text-emerald-600 hover:text-emerald-700 font-medium font-mono transition-colors"
                      >
                        #{r.invoiceId.toString()}
                      </button>
                      <CopyButton text={r.invoiceId.toString()} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Timestamp</span>
                    <p className="text-slate-700 font-mono mt-0.5">{formatDate(r.timestamp)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payer</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-slate-700">{formatAddress(r.payer)}</span>
                      <CopyButton text={r.payer} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Issuer</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-slate-700">{formatAddress(r.issuer)}</span>
                      <CopyButton text={r.issuer} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
