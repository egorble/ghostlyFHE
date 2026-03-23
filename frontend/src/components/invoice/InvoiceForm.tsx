import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiPlus as Plus, PiTrash as Trash2, PiSpinnerGap as Loader2, PiPaperPlaneRight as Send, PiLockKey as Lock } from 'react-icons/pi'
import { toast } from 'sonner'
import type { Address } from 'viem'
import { useUserStore } from '../../stores/useUserStore'
import { useInvoiceStore } from '../../stores/useInvoiceStore'
import { useTransactionStore } from '../../stores/useTransactionStore'
import { encryptInvoiceData, encryptLineItemData, hashString } from '../../services/CofheService'
import * as Fhenix from '../../services/FhenixService'
import type { LineItem } from '../../lib/types'
import { CURRENCY_LABELS } from '../../lib/types'
import InvoicePreview from './InvoicePreview'

interface FormLineItem {
  id: number
  description: string
  qty: string
  unitPrice: string
}

let nextId = 1

export function InvoiceForm() {
  const navigate = useNavigate()
  const { address, cofheReady } = useUserStore()
  const { setLocalMetadata } = useInvoiceStore()
  const { isProcessing, progress, message, setProcessing, setProgress, addLog, reset } = useTransactionStore()

  const [buyerAddress, setBuyerAddress] = useState('')
  const [lineItems, setLineItems] = useState<FormLineItem[]>([{ id: nextId++, description: '', qty: '1', unitPrice: '' }])
  const [dueDate, setDueDate] = useState('')
  const [currency, setCurrency] = useState(0)
  const [orderId, setOrderId] = useState('')
  const [memo, setMemo] = useState('')
  const [auditEnabled, setAuditEnabled] = useState(true)

  const addRow = () => setLineItems(p => [...p, { id: nextId++, description: '', qty: '1', unitPrice: '' }])
  const removeRow = (id: number) => setLineItems(p => p.filter(r => r.id !== id))
  const updateRow = (id: number, field: string, val: string) => {
    setLineItems(p => p.map(r => r.id === id ? { ...r, [field]: val } : r))
  }

  const parsedAmount = lineItems.reduce((s, i) => s + (parseInt(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !cofheReady) return
    if (buyerAddress.toLowerCase() === address.toLowerCase()) {
      toast.error('Cannot invoice yourself. Use a different buyer address.')
      return
    }

    try {
      setProcessing(true)

      // Step 1: Encrypt addresses + currency
      setProgress(10, 'Encrypting addresses...')
      addLog('FHE-encrypting issuer & buyer addresses + currency...')
      const { encIssuerAddr, encBuyerAddr, encCurrency } = await encryptInvoiceData({
        issuerAddress: address,
        buyerAddress,
        currency,
      })
      addLog('Addresses encrypted with ZK proof')

      // Step 2: Create invoice on-chain
      setProgress(25, 'Creating invoice on-chain...')
      addLog('Submitting createInvoice transaction...')
      const dueDateTs = BigInt(Math.floor(new Date(dueDate).getTime() / 1000))
      const txHash = await Fhenix.createInvoice(
        buyerAddress as Address, encIssuerAddr, encBuyerAddr, dueDateTs, encCurrency,
        hashString(orderId), hashString(memo), auditEnabled, address as Address,
      )
      addLog(`Tx: ${txHash}`)

      setProgress(40, 'Waiting for confirmation...')
      const publicClient = Fhenix.getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 })

      const invoiceCount = await Fhenix.getInvoiceCount()
      const invoiceId = invoiceCount - 1n
      addLog(`Invoice #${invoiceId} created`)

      // Step 3: Add line items
      const parsedLineItems: LineItem[] = []
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i]
        if (!item.description || !item.unitPrice) continue
        const qty = parseInt(item.qty) || 1
        const price = Math.round(parseFloat(item.unitPrice) * 100) || 0  // cents
        const amount = qty * price

        setProgress(45 + (i / lineItems.length) * 30, `Encrypting item ${i + 1}...`)
        addLog(`Encrypting: ${item.description}`)

        const { encryptDescription } = await import('../../services/CofheService')
        const encDesc = await encryptDescription(item.description, address, buyerAddress, invoiceId)
        const { encQuantity, encUnitPrice, encAmount } = await encryptLineItemData({ quantity: qty, unitPrice: price, amount })

        setProgress(45 + ((i + 0.5) / lineItems.length) * 30, `Adding item ${i + 1} on-chain...`)
        const liTx = await Fhenix.addLineItem(invoiceId, encDesc, encQuantity, encUnitPrice, encAmount, address as Address)
        await publicClient.waitForTransactionReceipt({ hash: liTx, timeout: 120_000 })
        addLog(`Item ${i + 1} added`)

        parsedLineItems.push({ description: item.description, qty, unitPrice: price, amount })
      }

      // Step 4: Send invoice
      setProgress(80, 'Sending invoice to buyer...')
      addLog('Sending invoice...')
      const sendTx = await Fhenix.sendInvoice(invoiceId, address as Address)
      await publicClient.waitForTransactionReceipt({ hash: sendTx, timeout: 120_000 })
      addLog('Invoice sent!')

      // Step 5: Save local metadata
      setLocalMetadata(invoiceId.toString(), { orderId, memo, currency, lineItems: parsedLineItems })

      setProgress(100, 'Complete!')
      toast.success(`Invoice #${invoiceId} created and sent!`)
      setTimeout(() => { reset(); navigate(`/invoices/${invoiceId.toString()}`) }, 1500)
    } catch (err) {
      console.error(err)
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      toast.error('Failed to create invoice')
      setProcessing(false)
    }
  }

  const previewItems = lineItems.map(i => ({
    description: i.description, qty: parseInt(i.qty) || 0, unitPrice: parseFloat(i.unitPrice) || 0, amount: (parseInt(i.qty) || 0) * (parseFloat(i.unitPrice) || 0),
  }))

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Parties Block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Transaction Parties</h3>
        
        {/* Seller */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Seller Address <span className="text-[10px] text-slate-400 lowercase tracking-widest">(current wallet)</span>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700">
            {address || 'Not connected'}
          </div>
        </div>

        {/* Buyer */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Buyer Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text" required value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D]/40 focus:ring-4 focus:ring-[#1F6E4D]/10 transition-all" 
            placeholder="0x..."
          />
        </div>
      </div>

      {/* Line Items Block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Line Items</h3>
          <button type="button" onClick={addRow}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:shadow transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Description</th>
                <th className="w-20 px-4 py-3">Qty</th>
                <th className="w-28 px-4 py-3">Unit price</th>
                <th className="w-28 px-4 py-3">Amount</th>
                <th className="w-12 px-3 py-3 text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-transparent">
              {lineItems.map((row) => {
                const amount = (parseInt(row.qty) || 0) * (parseFloat(row.unitPrice) || 0)
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors focus-within:bg-slate-50">
                    <td className="px-2 py-1">
                      <input type="text" value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        className="w-full bg-transparent border-0 text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none py-2 px-2 text-sm" placeholder="Service, product, etc." required />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="numeric" value={row.qty}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) updateRow(row.id, 'qty', e.target.value) }}
                        className="w-full bg-transparent border-0 text-slate-900 font-mono placeholder:text-slate-400 focus:ring-0 focus:outline-none py-2 px-2 text-sm" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="decimal" value={row.unitPrice}
                        onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) updateRow(row.id, 'unitPrice', e.target.value) }}
                        className="w-full bg-transparent border-0 text-slate-900 font-mono placeholder:text-slate-400 focus:ring-0 focus:outline-none py-2 px-2 text-sm" placeholder="0" required />
                    </td>
                    <td className="px-4 py-2 text-slate-900 font-mono flex items-center gap-2 mt-1">
                      {amount.toLocaleString()}
                      <Lock className="h-3 w-3 text-[#1F6E4D]" title="Encrypted on-chain" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeRow(row.id)} disabled={lineItems.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors inline-flex justify-center items-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Payment Details</h3>
        
        {/* Due Date + Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Due date <span className="text-red-500">*</span></label>
            <input type="date" required value={dueDate} min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D]/40 focus:ring-4 focus:ring-[#1F6E4D]/10 transition-all [color-scheme:light]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Payment currency <span className="text-red-500">*</span></label>
            <select value={currency} onChange={(e) => setCurrency(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#1F6E4D]/40 focus:ring-4 focus:ring-[#1F6E4D]/10 transition-all cursor-pointer">
              <option value={0}>ETH</option>
              <option value={1}>USDC</option>
            </select>
          </div>
        </div>

        {/* Order ID + Memo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Order ID <span className="text-slate-400 lowercase tracking-widest">(optional)</span></label>
            <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D]/40 focus:ring-4 focus:ring-[#1F6E4D]/10 transition-all" placeholder="PO-12345 or blank" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Memo <span className="text-slate-400 lowercase tracking-widest">(optional)</span></label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D]/40 focus:ring-4 focus:ring-[#1F6E4D]/10 transition-all" placeholder="Payment terms, notes..." />
          </div>
        </div>

        {/* Subtotal */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Subtotal <span className="text-slate-400 lowercase tracking-widest">(calculated)</span>
          </label>
          <div className="rounded-xl border border-[#1F6E4D]/20 bg-[#1F6E4D]/5 px-5 py-4 text-sm font-black text-[#1F6E4D] flex items-center justify-between">
            <div className="flex items-end gap-3">
              <span className="text-2xl leading-none">{parsedAmount.toLocaleString()}</span> 
              <span className="text-[#1F6E4D]/70 text-xs font-semibold leading-relaxed">{CURRENCY_LABELS[currency]}</span>
            </div>
            <Lock className="h-5 w-5 text-[#1F6E4D]/60" title="FHE encrypted on-chain" />
          </div>
        </div>
      </div>

      {/* Security Block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Privacy & Security</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Audit Authorization</div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1 max-w-sm">
              When enabled, you can grant time-limited access to third-party auditors securely without revealing permanent keys.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={auditEnabled} onChange={(e) => setAuditEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F6E4D]"></div>
          </label>
        </div>
      </div>

      {/* Progress Box */}
      {isProcessing && (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Processing Txns...</span>
            <span className="text-xs font-mono text-blue-600 font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {message && <p className="text-[11px] text-blue-600 uppercase tracking-widest font-mono font-medium">{message}</p>}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={isProcessing || !cofheReady}
        className="w-full cursor-pointer rounded-2xl bg-[#1F6E4D] px-4 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#16553b] hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {isProcessing ? 'Executing On-Chain Transactions...' : 'Create & Send Confidential Invoice'}
      </button>
    </form>
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,420px]">
      <div className="min-w-0">{formContent}</div>
      <div className="lg:sticky lg:top-8 lg:self-start transition-all duration-500">
        <InvoicePreview
          issuer={address || ''} buyer={buyerAddress}
          lineItems={previewItems} dueDate={dueDate}
          currency={CURRENCY_LABELS[currency]} orderId={orderId}
          memo={memo} auditEnabled={auditEnabled}
        />
      </div>
    </div>
  )
}
