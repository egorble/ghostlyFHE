import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PiProhibit as Ban, PiWarning as AlertTriangle, PiCheckCircle as CheckCircle, PiDownloadSimple as Download, PiShield as Shield } from 'react-icons/pi'
import type { Address } from 'viem'
import { motion } from 'framer-motion'
import { StatusBadge } from '../ui/status-badge'
import CopyButton from '../ui/CopyButton'
import PaymentProgress from '../ui/PaymentProgress'
import { formatAddress, formatDate, downloadJSON, cn } from '../../lib/utils'
import { CHAIN_STATUS_COLORS, CHAIN_STATUS_LABELS } from '../../lib/constants'
import { useUserStore } from '../../stores/useUserStore'
import { useInvoiceStore } from '../../stores/useInvoiceStore'
import { useTransactionStore } from '../../stores/useTransactionStore'
import * as Fhenix from '../../services/FhenixService'
import { encryptPayment } from '../../services/CofheService'
import type { Invoice } from '../../lib/types'
import { InvoiceStatus } from '../../lib/types'

interface InvoiceDetailProps {
  invoiceId: string
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const { address, cofheReady } = useUserStore()
  const { localMetadata, chainStatus } = useInvoiceStore()
  const { isProcessing, setProcessing, phase, phaseHistory, startPhase, completePhase, reset } = useTransactionStore()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const chain = chainStatus.get(invoiceId)
  const isIssuer = address && invoice?.issuer?.toLowerCase() === address.toLowerCase()
  const isBuyer = address && invoice?.buyer?.toLowerCase() === address.toLowerCase()

  const [decryptedSubtotal, setDecryptedSubtotal] = useState<bigint | null>(null)
  const [decryptedPaid, setDecryptedPaid] = useState<bigint | null>(null)
  const [decryptedCurrency, setDecryptedCurrency] = useState<number | null>(null)
  const [decryptedLineItems, setDecryptedLineItems] = useState<{ description: string; qty: number; unitPrice: number; amount: number }[]>([])
  const [decrypting, setDecrypting] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  useEffect(() => {
    if (!invoice || decryptedSubtotal !== null) return

    // 1. Check persistent cache first (instant)
    const store = useInvoiceStore.getState()
    const cachedTotals = store.decryptedTotals[invoice.id.toString()]
    if (cachedTotals) {
      setDecryptedSubtotal(BigInt(cachedTotals.subtotal))
      setDecryptedPaid(BigInt(cachedTotals.amountPaid))
      setDecryptedCurrency(cachedTotals.currency)
    }
    const cachedItems = store.decryptedLineItems[invoice.id.toString()]
    if (cachedItems && cachedItems.length > 0) {
      setDecryptedLineItems(cachedItems)
      if (cachedTotals) return // All cached, skip decrypt
    }

    // 2. If not cached and cofhe ready, decrypt
    if (!cofheReady || decrypting) return
    setDecrypting(true)
    ;(async () => {
      try {
        const { getCachedOrDecryptTotals, getCachedOrDecryptLineItems } = await import('../../services/InvoiceCacheService')
        if (!cachedTotals) {
          const totals = await getCachedOrDecryptTotals(invoice.id)
          if (totals) {
            setDecryptedSubtotal(BigInt(totals.subtotal))
            setDecryptedPaid(BigInt(totals.amountPaid))
            setDecryptedCurrency(totals.currency)
          }
        }
        if (!cachedItems || cachedItems.length === 0) {
          const items = await getCachedOrDecryptLineItems(invoice.id, invoice.lineItemCount, invoice.issuer, invoice.buyer)
          if (items) setDecryptedLineItems(items)
        }
      } catch (err) {
        console.warn('Decrypt failed:', err)
      } finally {
        setDecrypting(false)
      }
    })()
  }, [cofheReady, invoice])

  async function loadInvoice() {
    setLoading(true)
    try {
      const inv = await Fhenix.getInvoiceFull(BigInt(invoiceId))
      setInvoice(inv)
    } catch {
      try {
        const inv = await Fhenix.getInvoiceMinimal(BigInt(invoiceId))
        setInvoice(inv as Invoice)
      } catch {
        toast.error('Failed to load invoice')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    if (!address || !cofheReady) return
    setProcessing(true)
    try {
      startPhase('authorization')
      completePhase()

      startPhase('encryption')
      toast.info('Encrypting payment confirmation...')
      // Encrypt subtotal as payment amount (mark full payment)
      const payAmount = decryptedSubtotal ?? 0n
      const encPay = await encryptPayment(payAmount > 0n ? payAmount : 1n)
      completePhase()

      startPhase('finalizing')
      toast.info('Submitting payment...')
      const txHash = await Fhenix.payInvoice(BigInt(invoiceId), encPay, address as Address)
      const publicClient = Fhenix.getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      completePhase()
      toast.success('Invoice paid!')
      await loadInvoice()
    } catch (err) {
      console.error('Pay failed:', err)
      toast.error('Payment failed')
    } finally {
      setProcessing(false)
      reset()
    }
  }

  async function handleCancel() {
    if (!address) return
    setProcessing(true)
    try {
      const txHash = await Fhenix.cancelInvoice(BigInt(invoiceId), address as Address)
      const publicClient = Fhenix.getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast.success('Invoice cancelled')
      await loadInvoice()
    } catch (err) {
      console.error('Cancel failed:', err)
      toast.error('Cancel failed')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDispute() {
    if (!address) return
    setProcessing(true)
    try {
      const txHash = await Fhenix.disputeInvoice(BigInt(invoiceId), address as Address)
      const publicClient = Fhenix.getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast.success('Invoice disputed')
      await loadInvoice()
    } catch (err) {
      console.error('Dispute failed:', err)
      toast.error('Dispute failed')
    } finally {
      setProcessing(false)
    }
  }



  function handleDownloadAuditPackage() {
    if (!invoice) return
    downloadJSON(
      {
        version: '1.0.0',
        invoiceId: invoiceId,
        issuer: invoice.issuer,
        buyer: invoice.buyer,
        status: invoice.status,
        dueDate: invoice.dueDate,
        auditEnabled: invoice.auditEnabled,
        orderIdHash: invoice.orderIdHash,
        memoHash: invoice.memoHash,
        localMetadata: localMetadata,
      },
      `ghostly-audit-${invoiceId}.json`
    )
    toast.success('Audit package downloaded')
  }

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center gap-4 py-20">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin-slow opacity-50 blur-[2px]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loading invoice data...</p>
        </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white shadow-sm rounded-2xl border border-slate-200 border-dashed">
        <Ban className="w-8 h-8 text-slate-400 mb-3" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Not Found</p>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-3"
    >
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Invoice #{invoiceId}
              <CopyButton text={invoiceId} />
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {chain && <span className={cn("px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-slate-700 shadow-sm", CHAIN_STATUS_COLORS[chain])}>{CHAIN_STATUS_LABELS[chain]}</span>}
          <div className="scale-110 origin-right">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-emerald-200 via-slate-100 to-transparent"></div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent pointer-events-none" />
        
        <div className="p-4 relative z-10">
          {/* Amount */}
          <div className="border-b border-slate-100 pb-6 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Amount</p>
            {decryptedSubtotal !== null ? (
              <h2 className="text-3xl font-bold text-slate-900">
                {(Number(decryptedSubtotal) / 100).toFixed(2)}
                <span className="text-lg font-normal text-slate-500 ml-2">
                  {decryptedCurrency === 1 ? 'USDC' : 'ETH'}
                </span>
              </h2>
            ) : decrypting ? (
              <h2 className="text-2xl font-bold text-slate-400 animate-pulse">Decrypting...</h2>
            ) : (
              <h2 className="text-2xl font-bold text-slate-400">Encrypted</h2>
            )}
            {decryptedPaid !== null && decryptedPaid > 0n && (
              <p className="text-sm text-slate-500 mt-1">
                Paid: <span className="text-emerald-600 font-mono">{(Number(decryptedPaid) / 100).toFixed(2)}</span>
                {decryptedSubtotal !== null && decryptedPaid >= decryptedSubtotal && (
                  <span className="ml-2 text-emerald-600 font-bold">✓ Fully Paid</span>
                )}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetailField label="Issuer" value={invoice.issuer ? formatAddress(invoice.issuer) : 'Encrypted'} mono copyable={invoice.issuer} />
            <DetailField label="Buyer" value={invoice.buyer ? formatAddress(invoice.buyer) : 'Encrypted'} mono copyable={invoice.buyer} />
            <DetailField label="Created" value={invoice.createdAt ? formatDate(invoice.createdAt) : 'N/A'} />
            <DetailField label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'} />
            <DetailField label="Line Items" value={String(invoice.lineItemCount)} />
            <DetailField label="Audit" value={invoice.auditEnabled ? 'Enabled' : 'Disabled'} />
            <DetailField label="Currency" value={decryptedCurrency !== null ? (decryptedCurrency === 1 ? 'USDC' : 'ETH') : decrypting ? 'Decrypting...' : 'Encrypted'} />
          </div>
        </div>

        {/* Line items table */}
        {(decryptedLineItems.length > 0 || invoice.lineItemCount > 0) && (
          <div className="border-t border-slate-100 bg-slate-50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">#</th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right w-24">Qty</th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right w-32">Price</th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {decryptedLineItems.length > 0 ? (
                    decryptedLineItems.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-100 transition-colors">
                        <td className="px-4 py-4 text-sm text-slate-500">{i + 1}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{item.description || 'Encrypted'}</td>
                        <td className="px-4 py-4 text-sm text-slate-700 text-right font-mono">{item.qty}</td>
                        <td className="px-4 py-4 text-sm text-slate-700 text-right font-mono">{(item.unitPrice / 100).toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-slate-900 text-right font-mono font-bold">{(item.amount / 100).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-400">
                        {decrypting ? 'Decrypting line items...' : `${invoice.lineItemCount} encrypted item(s)`}
                      </td>
                    </tr>
                  )}
                </tbody>
                {decryptedSubtotal !== null && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-emerald-50">
                      <td colSpan={3} className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-emerald-600 text-right">Total</td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-emerald-600 font-mono">{(Number(decryptedSubtotal) / 100).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Audit anchors */}
        {(invoice.orderIdHash || invoice.memoHash) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden transition-shadow hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-5 relative z-10">
              <Shield className="w-5 h-5 text-slate-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">On-chain Commitments</h3>
            </div>
            
            <div className="space-y-3 relative z-10">
              {invoice.orderIdHash && (
                <div className="flex flex-col gap-1 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">orderIdHash</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs text-slate-700 truncate">{invoice.orderIdHash}</span>
                    <CopyButton text={invoice.orderIdHash} />
                  </div>
                </div>
              )}
              {invoice.memoHash && (
                <div className="flex flex-col gap-1 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">memoHash</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs text-slate-700 truncate">{invoice.memoHash}</span>
                    <CopyButton text={invoice.memoHash} />
                  </div>
                </div>
              )}
            </div>
            
            {invoice.auditEnabled && (
              <button onClick={handleDownloadAuditPackage} className="w-full mt-4 bg-white border border-slate-200 shadow-sm px-4 py-3 text-[11px] font-bold tracking-widest uppercase text-slate-700 hover:bg-slate-50 transition-colors rounded-xl flex items-center justify-center gap-2 relative z-10">
                <Download className="w-4 h-4" /> Download Audit Package
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        {address && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden transition-shadow hover:shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-5 relative z-10">Actions</h3>

            {isProcessing && (
              <div className="mb-3 relative z-10">
                <PaymentProgress currentPhase={phase} phaseHistory={phaseHistory} />
              </div>
            )}

            <div className="space-y-4 relative z-10">
              {isBuyer && invoice.status === InvoiceStatus.Sent && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <button
                    onClick={handlePay}
                    disabled={isProcessing || !cofheReady}
                    className="w-full bg-[#1F6E4D] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#15593c] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark as Paid
                  </button>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono text-center">Encrypted confirmation via Fhenix FHE</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {isIssuer && (invoice.status === InvoiceStatus.Created || invoice.status === InvoiceStatus.Sent) && (
                  <button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="w-full bg-red-50 border border-red-200 px-4 py-3 text-[11px] font-bold tracking-widest uppercase text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" /> Cancel Invoice
                  </button>
                )}

                {isBuyer && (invoice.status === InvoiceStatus.Sent || invoice.status === InvoiceStatus.PartiallyPaid) && (
                  <button
                    onClick={handleDispute}
                    disabled={isProcessing}
                    className="w-full bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] font-bold tracking-widest uppercase text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" /> Dispute
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function DetailField({ label, value, mono, copyable, className }: { label: string; value: string; mono?: boolean, copyable?: string, className?: string }) {
  return (
    <div className={className}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <p className={cn('text-sm text-slate-900', mono && 'font-mono')}>{value}</p>
        {copyable && <CopyButton text={copyable} />}
      </div>
    </div>
  )
}
