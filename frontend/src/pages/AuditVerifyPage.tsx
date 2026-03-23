import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PiFingerprint as ShieldCheck, PiArrowLeft as ArrowLeft, PiUploadSimple as Upload, PiKey as Key, PiSpinnerGap as Loader2, PiCheck as Check, PiX as X, PiFileText as FileJson, PiDownloadSimple as Download, PiArrowSquareOut as ExternalLink } from 'react-icons/pi'
import { toast } from 'sonner'
import { verifyAuditPackage } from '../services/AuditService'
import { useAuditStore } from '../stores/useAuditStore'
import { downloadJSON, cn } from '../lib/utils'
import type { AuditPackage, AuditVerificationPhase } from '../lib/types'

export function AuditVerifyPage() {
  const navigate = useNavigate()
  const { addLog } = useAuditStore()
  const [jsonText, setJsonText] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AuditVerificationPhase[] | null>(null)
  const [pkg, setPkg] = useState<AuditPackage | null>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setJsonText(reader.result as string)
    reader.readAsText(file)
  }

  async function handleVerify() {
    if (!jsonText.trim()) {
      toast.error('Paste or upload an audit package JSON')
      return
    }

    let parsed: AuditPackage
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('Invalid JSON')
      return
    }

    setPkg(parsed)
    setLoading(true)
    try {
      const phases = await verifyAuditPackage(parsed)
      setResults(phases)
      const allPassed = phases.every((p) => p.passed)
      addLog({
        timestamp: Date.now(),
        action: 'verify',
        invoiceId: parsed.invoiceId,
        details: allPassed ? 'All phases passed' : 'Some phases failed',
      })
      if (allPassed) toast.success('Verification passed!')
      else toast.warning('Some verification phases failed')
    } catch (err) {
      console.error('Verify failed:', err)
      toast.error('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    if (!results || !pkg) return
    downloadJSON({ package: pkg, verification: results, verifiedAt: new Date().toISOString() }, `ghostly-verify-${pkg.invoiceId}.json`)
  }

  const allPassed = results?.every((p) => p.passed) ?? false

  return (
    <div className="space-y-3 max-w-4xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/audit')} className="text-[12px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Audit Center
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#1F6E4D]" />
              Verify Audit Package
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Upload an audit package to verify its authenticity against on-chain data.
            </p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-100"></div>

      {/* Input section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-3">
          {/* JSON input */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[14px] font-bold text-slate-900 tracking-tight">
                <FileJson className="w-4 h-4 text-slate-400" /> Audit Package JSON
              </label>
              <label className="bg-white border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-sm focus-within:border-[#1F6E4D]">
                <Upload className="w-3.5 h-3.5" /> Upload File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={12}
              placeholder="Paste audit package JSON here..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E4D] focus:ring-1 focus:ring-[#1F6E4D] transition-all custom-scrollbar flex-1 shadow-sm"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 lg:border-l lg:border-slate-100 lg:pl-6">
            <label className="flex items-center gap-2 text-[14px] font-bold text-slate-900 tracking-tight">
              <Key className="w-4 h-4 text-slate-400" /> Verification Info
            </label>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 text-[11px] tracking-wide text-slate-600 space-y-4 font-mono leading-relaxed h-full">
              <div>
                <p className="text-slate-700 font-bold mb-2 font-sans uppercase text-[10px]">The audit package contains:</p>
                <ul className="list-dash pl-2 space-y-1.5 marker:text-slate-400">
                  <li>Invoice ID and delegate array</li>
                  <li>Disclosure scope config</li>
                  <li>Expiry timestamp</li>
                  <li>On-chain grant Tx Hash</li>
                </ul>
              </div>
              <div className="h-px bg-slate-100 w-full" />
              <div>
                <p className="text-slate-700 font-bold mb-2 font-sans uppercase text-[10px]">Verification checks:</p>
                <ul className="list-dash pl-2 space-y-1.5 marker:text-slate-400">
                  <li className="text-[#1F6E4D]/80">Phase 1: On-chain validity</li>
                  <li className="text-[#1F6E4D]/80">Phase 2: Integrity & exp</li>
                  <li className="text-[#1F6E4D]/80">Phase 3: Data retrieval</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleVerify} disabled={loading || !jsonText.trim()} className="w-full bg-[#1F6E4D] text-white px-4 py-3.5 text-[13px] font-bold shadow-sm transition-all hover:bg-[#115E3E] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 mt-4 rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? 'RUNNING VERIFICATION...' : 'VERIFY AUDIT PACKAGE'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {/* Overall status */}
          <div className={cn(
            'rounded-2xl border p-5 flex items-center justify-between relative overflow-hidden',
            allPassed ? 'border-[#115E3E]/20 bg-[#E5F2EC]' : 'border-red-500/20 bg-red-50'
          )}>
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", allPassed ? "bg-white text-[#1F6E4D]" : "bg-white text-red-500")}>
                {allPassed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div>
                <p className={cn('text-[14px] font-bold tracking-tight', allPassed ? 'text-[#1F6E4D]' : 'text-red-600')}>
                  {allPassed ? 'Verification Passed' : 'Verification Failed'}
                </p>
                <p className={cn("text-[11px] mt-0.5 font-medium", allPassed ? "text-[#115E3E]" : "text-red-500")}>
                  {results.filter((r) => r.passed).length}/{results.length} phases passed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              {allPassed && pkg && (
                <button onClick={() => navigate(`/invoices/${pkg.invoiceId}`)} className="bg-[#1F6E4D] text-white px-4 py-2.5 text-[11px] font-bold hover:bg-[#115E3E] transition-colors rounded-xl flex items-center gap-2 shadow-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> View Invoice
                </button>
              )}
              <button onClick={handleExport} className="bg-white border border-slate-200 px-4 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors rounded-xl flex items-center gap-2 shadow-sm">
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
          </div>

          {/* Phase cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((phase, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 relative overflow-hidden group shadow-sm">
                
                <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                   <div className={cn("p-1.5 rounded-full", phase.passed ? "bg-emerald-50 text-[#1F6E4D]" : "bg-red-50 text-red-500")}>
                     {phase.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                   </div>
                  <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">Phase {i + 1}: {phase.name}</h4>
                </div>
                
                <p className="text-[11px] text-slate-500 mb-4 h-8">{phase.details}</p>
                
                <div className="space-y-2 mt-4">
                  {phase.checks.map((check) => (
                    <div
                      key={check.key}
                      className={cn(
                        'flex flex-col gap-1 rounded-lg px-3 py-2 text-xs font-mono border',
                        check.ok ? 'bg-slate-50 text-slate-700 border-slate-100' : 'bg-red-50/50 text-red-600 border-red-100'
                      )}
                    >
                      <span className="text-[10px] font-bold opacity-70 font-sans text-slate-500">{check.key}</span>
                      <span className="truncate text-[11px]" title={check.detail}>{check.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Package details */}
          {pkg && (
            <details className="bg-white rounded-2xl border border-slate-100 p-5 group shadow-sm">
              <summary className="text-[13px] font-bold text-slate-900 tracking-tight cursor-pointer hover:text-[#1F6E4D] transition-colors outline-none">
                Raw Package Contents
              </summary>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-50 border border-slate-100 p-4 text-[11px] font-mono text-slate-600 custom-scrollbar">
                  {JSON.stringify(pkg, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
