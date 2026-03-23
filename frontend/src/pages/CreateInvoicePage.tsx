import { motion } from 'framer-motion'
import { InvoiceForm } from '../components/invoice/InvoiceForm'
import { useUserStore } from '../stores/useUserStore'
import { EmptyState } from '../components/ui/empty-state'
import { PiCards as FileText, PiMagicWand as PlusCircle } from 'react-icons/pi'

export function CreateInvoicePage() {
  const { isConnected, cofheReady } = useUserStore()

  if (!isConnected) {
    return (
      <EmptyState
        icon={PlusCircle}
        title="Connect Wallet"
        description="Connect your wallet to create invoices."
      />
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <FileText className="w-8 h-8 text-[#1F6E4D]" />
             Create Invoice
           </h1>
           <p className="text-sm text-slate-500 mt-2">
             Draft a new confidential invoice with FHE-encrypted line items
           </p>
        </div>
        {!cofheReady && (
          <div className="px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold uppercase tracking-wider animate-pulse flex items-center gap-2">
            INITIALIZING FHE ENCRYPTION...
          </div>
        )}
      </div>

      <div className="h-px w-full bg-slate-100"></div>

      <InvoiceForm />
    </motion.div>
  )
}
