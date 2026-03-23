import type { AuditScope, AuditPackage, AuditVerificationPhase } from '../lib/types'
import * as Fhenix from './FhenixService'
import type { Address } from 'viem'

export function generateAuditPackage(
  invoiceId: string,
  scope: AuditScope,
  delegate: string,
  expiresAt: number,
  generatedBy: string,
  txHash: string
): AuditPackage {
  return {
    version: '1.0.0',
    network: 'sepolia',
    contract: 'ConfidentialInvoice',
    invoiceId,
    delegate,
    scope,
    expiresAt,
    generatedAt: Math.floor(Date.now() / 1000),
    generatedBy,
    txHash,
  }
}

export async function verifyAuthorization(
  invoiceId: string,
  delegate: string
): Promise<{ valid: boolean; expiry: number }> {
  try {
    const publicClient = Fhenix.getPublicClient()
    const { ABIS } = await import('../contracts/abis')
    const { CONTRACT_ADDRESSES } = await import('../contracts/addresses')

    const expiry = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ConfidentialInvoice as Address,
      abi: ABIS.ConfidentialInvoice,
      functionName: 'delegatedAccess',
      args: [BigInt(invoiceId), delegate as Address],
    }) as bigint

    const expiryNum = Number(expiry)
    const now = Math.floor(Date.now() / 1000)
    return { valid: expiryNum > now, expiry: expiryNum }
  } catch {
    return { valid: false, expiry: 0 }
  }
}

export async function verifyAuditPackage(
  pkg: AuditPackage
): Promise<AuditVerificationPhase[]> {
  const phases: AuditVerificationPhase[] = []

  // Phase 1: Authorization check
  const authResult = await verifyAuthorization(pkg.invoiceId, pkg.delegate)
  const delegateValid = typeof pkg.delegate === 'string' && /^0x[0-9a-fA-F]{40}$/.test(pkg.delegate)
  const expiryMatch = authResult.expiry > 0 && pkg.expiresAt === authResult.expiry
  phases.push({
    name: 'Authorization Check',
    passed: authResult.valid && delegateValid,
    details: authResult.valid
      ? `On-chain authorization valid until ${new Date(authResult.expiry * 1000).toLocaleDateString()}`
      : 'No valid on-chain authorization found',
    checks: [
      {
        key: 'on-chain-auth',
        ok: authResult.valid,
        detail: authResult.valid ? `Expires: ${new Date(authResult.expiry * 1000).toLocaleDateString()}` : 'Authorization expired or not found',
      },
      {
        key: 'delegate-address',
        ok: delegateValid,
        detail: delegateValid ? `${pkg.delegate.slice(0, 10)}...${pkg.delegate.slice(-8)}` : 'Invalid delegate address format',
      },
      {
        key: 'expiry-match',
        ok: expiryMatch,
        detail: expiryMatch ? 'Package expiry matches on-chain record' : `Mismatch: package=${pkg.expiresAt}, chain=${authResult.expiry}`,
      },
    ],
  })

  // Phase 2: Package integrity
  const now = Math.floor(Date.now() / 1000)
  const onChainExpiry = authResult.expiry > 0 ? authResult.expiry : pkg.expiresAt
  const notExpired = onChainExpiry > now
  const hasRequiredFields = !!pkg.invoiceId && !!pkg.delegate && !!pkg.txHash && !!pkg.generatedBy
  phases.push({
    name: 'Package Integrity',
    passed: notExpired && hasRequiredFields,
    details: notExpired ? 'Package is valid and not expired' : 'Authorization has expired',
    checks: [
      {
        key: 'expiry',
        ok: notExpired,
        detail: `Expires: ${new Date(onChainExpiry * 1000).toLocaleDateString()}`,
      },
      {
        key: 'required-fields',
        ok: hasRequiredFields,
        detail: hasRequiredFields ? 'All required fields present' : 'Missing required fields in package',
      },
      {
        key: 'version',
        ok: pkg.version === '1.0.0',
        detail: `Version: ${pkg.version}`,
      },
      {
        key: 'network',
        ok: pkg.network === 'sepolia',
        detail: `Network: ${pkg.network}`,
      },
    ],
  })

  // Phase 3: Data retrieval test
  try {
    const invoice = await Fhenix.getInvoiceMinimal(BigInt(pkg.invoiceId))
    phases.push({
      name: 'Data Retrieval',
      passed: true,
      details: 'Invoice data retrievable from chain',
      checks: [
        { key: 'invoice-exists', ok: true, detail: `Invoice #${pkg.invoiceId} found` },
        { key: 'status', ok: true, detail: `Status: ${invoice.status}` },
      ],
    })
  } catch {
    phases.push({
      name: 'Data Retrieval',
      passed: false,
      details: 'Failed to retrieve invoice from chain',
      checks: [
        { key: 'invoice-exists', ok: false, detail: 'Invoice not found on-chain' },
      ],
    })
  }

  return phases
}
