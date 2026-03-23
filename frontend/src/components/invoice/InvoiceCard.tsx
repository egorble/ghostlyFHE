import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiCaretDown as ChevronDown, PiCaretUp as ChevronUp, PiChartLineUp as Activity, PiPackage as Box, PiLockKey as Lock } from 'react-icons/pi'
import { StatusBadge } from '../ui/status-badge'
import CopyButton from '../ui/CopyButton'
import { formatAddress, formatDate, cn } from '../../lib/utils'
import { useInvoiceStore } from '../../stores/useInvoiceStore'
import { CHAIN_STATUS_COLORS, CHAIN_STATUS_LABELS } from '../../lib/constants'
import type { Invoice } from '../../lib/types'

const statusColors: Record<number, string> = {
  0: 'border-slate-200 hover:border-slate-300', // Created
  1: 'border-blue-100 hover:border-blue-300', // Sent
  2: 'border-amber-100 hover:border-amber-300', // Processing
  3: 'border-emerald-100 hover:border-emerald-300', // Paid
  4: 'border-red-100 hover:border-red-300', // Overdue
  5: 'border-purple-100 hover:border-purple-300', // Disputed
  6: 'border-slate-200 bg-slate-50', // Cancelled
}

const roleBadge: Record<string, string> = {
  seller: 'bg-slate-100 text-slate-600 border-transparent',
  buyer: 'bg-[#1F6E4D]/10 text-[#1F6E4D] border-transparent',
}

interface InvoiceCardProps {
  invoice: Invoice
  role?: 'seller' | 'buyer'
  onPay?: (invoice: Invoice) => void
  onCancel?: (invoice: Invoice) => void
  compact?: boolean
}

export function InvoiceCard({ invoice, role, onPay, onCancel, compact }: InvoiceCardProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const { chainStatus, decryptedTotals: allDecryptedTotals } = useInvoiceStore()
  const chain = chainStatus.get(invoice.id.toString())

  // Read from persistent cache — reactive (auto-updates when store changes)
  const cachedTotals = allDecryptedTotals[invoice.id.toString()]
  const decryptedAmount = cachedTotals ? BigInt(cachedTotals.subtotal) : null
  const decryptedCurrency = cachedTotals?.currency ?? null
  const decrypting = false

  function toggleExpand(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  return (
    <div className="relative group/card h-full">
      <div
        onClick={() => navigate(`/invoices/${invoice.id.toString()}`)}
        className={cn(
          'h-full flex flex-col bg-white rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-xl hover:-translate-y-1',
          statusColors[invoice.status] ?? 'border-slate-200',
          compact ? 'p-4' : 'p-5',
        )}
      >
        {/* Syncing alert */}
        {chain === 'sending' && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-4 text-xs font-bold text-amber-600">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            SYNCING WITH FHENIX...
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col mb-4 bg-transparent z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 tracking-tight">#{invoice.id.toString()}</span>
              <CopyButton text={invoice.id.toString()} />
            </div>
            <div className="flex items-center gap-2">
              {role && (
                <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold', roleBadge[role])}>
                  {role === 'seller' ? 'Seller' : 'Buyer'}
                </span>
              )}
              {chain && (
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", CHAIN_STATUS_COLORS[chain])}>
                  {CHAIN_STATUS_LABELS[chain]}
                </span>
              )}
              {!chain && <StatusBadge status={invoice.status} role={role} />}
            </div>
          </div>
          <div className="h-px w-full bg-slate-100 my-4"></div>
        </div>

        <div className="flex justify-between items-end mb-4 px-1">
          <div className="space-y-1">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</p>
             {decryptedAmount !== null ? (
               <p className="text-2xl font-black text-slate-900 leading-none">
                 {(Number(decryptedAmount) / 100).toFixed(2)} <span className="text-sm font-medium text-slate-500">{decryptedCurrency === 1 ? 'USDC' : 'ETH'}</span>
               </p>
             ) : decrypting ? (
               <p className="text-lg font-bold text-slate-400 flex items-center gap-2">
                 <Lock className="w-4 h-4 animate-pulse" /> Decrypting...
               </p>
             ) : (
               <p className="text-lg font-bold text-slate-400 flex items-center gap-2">
                 <Lock className="w-4 h-4" /> Encrypted
               </p>
             )}
          </div>
          <div className="text-right space-y-1">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Date</p>
             <p className="text-sm font-bold text-slate-900">
               {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
             </p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">From</span>
            <span className="font-mono text-slate-700">{invoice.issuer ? formatAddress(invoice.issuer) : 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">To</span>
            <span className="font-mono text-slate-700">{invoice.buyer ? formatAddress(invoice.buyer) : 'Unknown'}</span>
          </div>
        </div>
        
        <div className="mt-auto"></div>

        {/* Line items count */}
        {invoice.lineItemCount > 0 && (
          <div className="mt-4">
            <button
              onClick={toggleExpand}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#1F6E4D] hover:text-[#16553b] transition-colors bg-[#1F6E4D]/5 hover:bg-[#1F6E4D]/10 py-2.5 px-3 rounded-xl border border-transparent"
            >
              <div className="flex items-center gap-2">
                <Box className="w-3 h-3" />
                {invoice.lineItemCount} Item{invoice.lineItemCount !== 1 ? 's' : ''} <Lock className="w-3 h-3" />
              </div>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-slate-400 text-center py-3">
                Open invoice details to view decrypted line items
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {(onPay || onCancel) && (
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id.toString()}`) }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all hover:border-slate-300"
            >
              View Details
            </button>
            {onPay && invoice.status >= 1 && invoice.status <= 2 && (
              <button
                onClick={(e) => { e.stopPropagation(); onPay(invoice) }}
                className="flex-1 rounded-xl bg-[#1F6E4D] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#16553b] shadow-sm hover:shadow transition-all"
              >
                Pay Now
              </button>
            )}
            {onCancel && invoice.status <= 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(invoice) }}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-100 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
