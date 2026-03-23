import { PiShield as Shield, PiLockKey as Lock, PiEye as Eye, PiEyeClosed as EyeOff } from 'react-icons/pi'
import { formatAddress } from '../../lib/utils'

interface LineItemPreview {
  description: string
  qty: number
  unitPrice: number
}

interface InvoicePreviewProps {
  issuer: string
  buyer: string
  lineItems: LineItemPreview[]
  dueDate: string
  currency: string
  orderId: string
  memo: string
  auditEnabled: boolean
  standalone?: boolean
}

export default function InvoicePreview({
  issuer,
  buyer,
  lineItems,
  dueDate,
  currency,
  orderId,
  memo,
  auditEnabled,
  standalone,
}: InvoicePreviewProps) {
  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const hasItems = lineItems.some((i) => i.description && i.unitPrice)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden" style={{ minHeight: standalone ? undefined : 420 }}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-slate-200 bg-slate-50/80 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            <Shield className="w-4 h-4" />
            CoFHE-Encrypted
          </div>
          <span className="text-[10px] text-slate-400 font-mono tracking-widest">{today}</span>
        </div>
      </div>

      <div className="relative p-4 space-y-3 text-sm text-slate-900">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From (Issuer)</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 select-all">
                {issuer ? formatAddress(issuer) : '—'}
              </span>
              <Lock className="w-3.5 h-3.5 text-emerald-500/60" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To (Buyer)</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 select-all">
                {buyer ? formatAddress(buyer) : '—'}
              </span>
              <Lock className="w-3.5 h-3.5 text-emerald-500/60" />
            </div>
          </div>
        </div>

        {/* Invoice number / order ID */}
        {orderId && (
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice No.</span>
            <p className="font-bold text-slate-900 mt-1 text-lg">{orderId}</p>
          </div>
        )}

        {/* Line Items Table */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
            Line Items <Lock className="w-3 h-3 text-emerald-500" />
          </span>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 w-12 text-right">Qty</th>
                  <th className="px-3 py-2 w-20 text-right">Unit Price</th>
                  <th className="px-3 py-2 w-24 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {!hasItems ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-slate-400 text-center font-mono text-[10px] uppercase tracking-widest">
                      Add line items to preview
                    </td>
                  </tr>
                ) : (
                  lineItems
                    .filter((i) => i.description || i.unitPrice)
                    .map((item, i) => {
                      const amount = item.qty * item.unitPrice
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-slate-900">{item.description || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">{item.qty}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-medium">{amount.toLocaleString()}</td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
          <div className="flex justify-between text-xs font-mono text-slate-600">
            <span className="font-sans uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
            <span className="flex items-center gap-2">
              <span className="text-slate-900 font-medium">{subtotal.toLocaleString()}</span> {currency || 'ETH'}
              <Lock className="w-3 h-3 text-emerald-500" />
            </span>
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span className="font-sans uppercase tracking-widest text-[10px] font-bold">Tax (0%)</span>
            <span>0</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900 mt-1">
            <span className="uppercase tracking-widest">Total</span>
            <span className="flex items-center gap-2 text-xl font-black">
              {subtotal.toLocaleString()} <span className="text-xs text-slate-500 font-medium">{currency || 'ETH'}</span>
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</span>
            <div className="text-slate-900 mt-1 font-mono font-medium">{dueDate || '—'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency</span>
            <div className="text-slate-900 mt-1 font-mono font-medium">{currency || 'ETH'}</div>
          </div>
          {memo && (
            <div className="col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memo</span>
              <div className="text-slate-700 mt-1 flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                <span className="flex-1">{memo}</span>
                <EyeOff className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" title="Stored as hash on-chain" />
              </div>
            </div>
          )}
        </div>

        {/* Audit */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
          {auditEnabled ? (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Audit access enabled</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Audit access disabled</span>
            </>
          )}
        </div>

        {/* Legal footer */}
        <div className="border-t border-slate-200 pt-5 pb-2">
          <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-widest text-center">
            Generated on Fhenix using Fully Homomorphic Encryption.
            Amounts & addresses encrypted on-chain. <br />
            Decryption limited to authorized parties.
          </p>
        </div>
      </div>
    </div>
  )
}
