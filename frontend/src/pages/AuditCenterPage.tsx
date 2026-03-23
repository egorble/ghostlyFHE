import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiGhost as Shield, PiFingerprint as ShieldCheck, PiCalendarBlank as Calendar, PiDownloadSimple as Download, PiSpinnerGap as Loader2, PiArrowSquareOut as ExternalLink, PiXCircle as XCircle } from 'react-icons/pi'
import { toast } from 'sonner'
import type { Address } from 'viem'
import { useUserStore } from '../stores/useUserStore'
import { useAuditStore } from '../stores/useAuditStore'
import * as Fhenix from '../services/FhenixService'
import { generateAuditPackage } from '../services/AuditService'
import { EmptyState } from '../components/ui/empty-state'
import { downloadJSON } from '../lib/utils'
import { AUDIT_SCOPE_LABELS } from '../lib/constants'
import type { Invoice, AuditScope } from '../lib/types'
import { DEFAULT_AUDIT_SCOPE } from '../lib/types'

export function AuditCenterPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useUserStore()
  const { addAuthorization, removeAuthorization, addLog } = useAuditStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [delegatedInvoices, setDelegatedInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [delegate, setDelegate] = useState('')
  const [expiry, setExpiry] = useState('')
  const [scope, setScope] = useState<AuditScope>({ ...DEFAULT_AUDIT_SCOPE })
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDelegated, setLoadingDelegated] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      loadInvoices()
      loadDelegatedInvoices()
    }
  }, [isConnected, address])

  async function loadInvoices() {
    if (!address) return
    setLoading(true)
    try {
      const ids = await Fhenix.getIssuerInvoices(address).catch(() => [] as bigint[])
      const buyerIds = await Fhenix.getBuyerInvoices(address).catch(() => [] as bigint[])
      const issuerSet = new Set(ids.map(String))
      const allIds = [...new Set([...ids, ...buyerIds].map(String))].map(BigInt)
      const invs = await Promise.all(
        allIds.map(async (id) => {
          try { return await Fhenix.getInvoiceFull(id) }
          catch {
            const inv = { ...(await Fhenix.getInvoiceMinimal(id)), id } as Invoice
            if (issuerSet.has(id.toString())) inv.issuer = address!
            else inv.buyer = address!
            return inv
          }
        })
      )
      setInvoices(invs.filter((i) => i.auditEnabled))
    } catch (err) {
      console.error('Failed to load invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadDelegatedInvoices() {
    if (!address) return
    setLoadingDelegated(true)
    try {
      const ids = await Fhenix.getDelegatedInvoiceIds(address)
      const invs = await Promise.all(
        ids.map(async (id) => {
          try { return await Fhenix.getInvoiceFull(id) }
          catch { return { ...(await Fhenix.getInvoiceMinimal(id)), id } as Invoice }
        })
      )
      setDelegatedInvoices(invs)
    } catch (err) {
      console.error('Failed to load delegated invoices:', err)
    } finally {
      setLoadingDelegated(false)
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  function toggleScope(key: keyof AuditScope) {
    setScope((s) => ({ ...s, [key]: !s[key] }))
  }

  async function handleGenerate() {
    if (!address || !delegate || !expiry || selected.size === 0) {
      toast.error('Fill in all fields and select at least one invoice')
      return
    }

    setGenerating(true)
    const expiryTs = Math.floor(new Date(expiry).getTime() / 1000)

    try {
      for (const invoiceId of selected) {
        toast.info(`Granting access for Invoice #${invoiceId}...`)
        const txHash = await Fhenix.grantAccess(
          BigInt(invoiceId),
          delegate as Address,
          BigInt(expiryTs),
          address as Address
        )
        const publicClient = Fhenix.getPublicClient()
        await publicClient.waitForTransactionReceipt({ hash: txHash })

        const pkg = generateAuditPackage(invoiceId, scope, delegate, expiryTs, address, txHash)
        downloadJSON(pkg, `ghostly-audit-${invoiceId}.json`)

        addAuthorization(invoiceId, {
          invoiceId,
          delegate,
          expiry: expiryTs,
          scope,
          grantedAt: Math.floor(Date.now() / 1000),
          grantedBy: address,
          txHash,
        })

        addLog({
          timestamp: Date.now(),
          action: 'grant',
          invoiceId,
          details: `Granted to ${delegate}, expires ${expiry}`,
        })
      }

      toast.success(`Audit access granted for ${selected.size} invoice(s)`)
      setSelected(new Set())
    } catch (err) {
      console.error('Audit grant failed:', err)
      toast.error('Failed to grant audit access')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke() {
    if (!address || !delegate || selected.size === 0) {
      toast.error('Select invoices and enter delegate address')
      return
    }
    setRevoking(true)
    try {
      for (const invoiceId of selected) {
        toast.info(`Revoking access for Invoice #${invoiceId}...`)
        const txHash = await Fhenix.revokeAccess(BigInt(invoiceId), delegate as Address, address as Address)
        const publicClient = Fhenix.getPublicClient()
        await publicClient.waitForTransactionReceipt({ hash: txHash })
        removeAuthorization(invoiceId, delegate)
        addLog({ timestamp: Date.now(), action: 'revoke', invoiceId, details: `Revoked from ${delegate}` })
      }
      toast.success(`Access revoked for ${selected.size} invoice(s)`)
      setSelected(new Set())
    } catch (err) {
      console.error('Revoke failed:', err)
      toast.error('Failed to revoke access')
    } finally {
      setRevoking(false)
    }
  }

  if (!isConnected) {
    return <EmptyState icon={Shield} title="Connect Wallet" description="Connect your wallet to access the Audit Center." />
  }

  return (
    <div className="space-y-3 max-w-2xl animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#1F6E4D]" />
            Audit Center
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Grant time-limited access to encrypted invoice data for auditors.
          </p>
        </div>
      </div>

      <div className="h-px w-full bg-slate-100"></div>

      {/* Verify link */}
      <button
        onClick={() => navigate('/audit/verify')}
        className="w-full text-left flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-4 shadow-sm transition-all hover:shadow-md hover:bg-slate-50 group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#E5F2EC] flex items-center justify-center group-hover:bg-[#D1E8DD] transition-colors">
            <ShieldCheck className="w-5 h-5 text-[#1F6E4D]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-900 tracking-tight">Verify Audit Package</p>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Validate an audit package against on-chain data</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center bg-white transition-colors group-hover:border-slate-300">
          <span className="text-slate-400 group-hover:text-slate-700">→</span>
        </div>
      </button>

      {/* Delegated Access — invoices others granted access to */}
      {(loadingDelegated || delegatedInvoices.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <h3 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F6E4D]" />
            Delegated Access
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">— invoices you can audit</span>
          </h3>
          {loadingDelegated ? (
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-tight text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#1F6E4D]" /> Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {delegatedInvoices.map((inv) => (
                <button
                  key={inv.id.toString()}
                  onClick={() => navigate(`/invoices/${inv.id.toString()}`)}
                  className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 hover:bg-[#E5F2EC] hover:border-[#1F6E4D]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900">Invoice #{inv.id.toString()}</span>
                    {inv.issuer && <span className="text-[11px] font-mono text-slate-400">{inv.issuer.slice(0, 8)}...{inv.issuer.slice(-6)}</span>}
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#1F6E4D]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Flow */}
      <div className="space-y-3">
        {/* Invoice selection */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
          <h3 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-600 w-5 h-5 rounded-md flex items-center justify-center text-[11px]">1</span> 
            Select Invoices
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-tight text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#1F6E4D]" /> Loading Invoices...
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-[12px] text-slate-500 italic">No audit-enabled invoices found.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {invoices.map((inv) => {
                const id = inv.id.toString()
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleSelect(id)}
                      className="h-4 w-4 rounded border-slate-200 text-[#1F6E4D] focus:ring-[#1F6E4D] focus:ring-offset-0"
                    />
                    <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#1F6E4D]">#</span>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Invoice #{id}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Delegate address */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
          <h3 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-600 w-5 h-5 rounded-md flex items-center justify-center text-[11px]">2</span> 
            Delegate Address
          </h3>
          <input
            type="text"
            value={delegate}
            onChange={(e) => setDelegate(e.target.value)}
            placeholder="0x... auditor wallet address"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D] focus:ring-1 focus:ring-[#1F6E4D] transition-all shadow-sm"
          />
        </div>

        {/* Expiry */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
          <h3 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-600 w-5 h-5 rounded-md flex items-center justify-center text-[11px]">3</span> 
            Expiry Date
          </h3>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#1F6E4D] focus:ring-1 focus:ring-[#1F6E4D] transition-all shadow-sm [color-scheme:light]"
            />
          </div>
        </div>

        {/* Scope */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
          <h3 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-2">
             <span className="bg-slate-100 text-slate-600 w-5 h-5 rounded-md flex items-center justify-center text-[11px]">4</span> 
             Disclosure Scope
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(scope) as (keyof AuditScope)[]).map((key) => (
              <label key={key} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  checked={scope[key]}
                  onChange={() => toggleScope(key)}
                  className="h-4 w-4 rounded border-slate-200 text-[#1F6E4D] focus:ring-[#1F6E4D] focus:ring-offset-0"
                />
                <span className="text-[12px] font-medium text-slate-700">{AUDIT_SCOPE_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {selected.size > 0 && (
        <div className="rounded-2xl border border-[#115E3E]/20 bg-[#E5F2EC] p-4 mt-3 flex flex-col gap-1 relative overflow-hidden">
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1F6E4D]">Summary</div>
          <div className="text-[13px] font-medium text-[#115E3E] max-w-lg relative z-10 leading-relaxed">
            <span className="font-bold">{selected.size}</span> invoice(s) selected for audit by <span className="font-mono bg-white/50 px-1 py-0.5 rounded text-[11px] font-bold">{delegate ? delegate.slice(0, 8) + '...' + delegate.slice(-6) : '...'}</span>.
            Access expires on <span className="font-bold">{expiry ? new Date(expiry).toLocaleDateString() : '...'}</span>.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-3">
        <button
          onClick={handleGenerate}
          disabled={generating || revoking || selected.size === 0 || !delegate || !expiry}
          className="flex-1 bg-[#1F6E4D] text-white px-4 py-3.5 text-[13px] font-bold shadow-sm transition-all hover:bg-[#115E3E] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
        >
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Download className="w-4 h-4" /> Grant Access & Download Package</>}
        </button>
        <button
          onClick={handleRevoke}
          disabled={generating || revoking || selected.size === 0 || !delegate}
          className="sm:w-48 bg-red-50 border border-red-200 text-red-600 px-4 py-3.5 text-[13px] font-bold transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
        >
          {revoking ? <><Loader2 className="w-4 h-4 animate-spin" /> Revoking...</> : <><XCircle className="w-4 h-4" /> Revoke Access</>}
        </button>
      </div>
    </div>
  )
}
