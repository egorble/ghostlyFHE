export const InvoiceStatus = {
  Created: 0,
  Sent: 1,
  PartiallyPaid: 2,
  Paid: 3,
  Overdue: 4,
  Disputed: 5,
  Cancelled: 6,
} as const
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export const PaymentCurrency = {
  ETH: 0,
  USDC: 1,
} as const
export type PaymentCurrency = (typeof PaymentCurrency)[keyof typeof PaymentCurrency]

export const STATUS_LABELS = ['Created', 'Sent', 'Partial', 'Paid', 'Overdue', 'Disputed', 'Cancelled']
export const CURRENCY_LABELS = ['ETH', 'USDC']

export interface LineItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  id: bigint
  issuer: string
  buyer: string
  lineItemCount: number
  dueDate: number
  status: InvoiceStatus
  createdAt: number
  auditEnabled: boolean
  orderIdHash?: string
  memoHash?: string
  orderId?: string
  memo?: string
  currency?: PaymentCurrency
  lineItems?: LineItem[]
}

export interface Receipt {
  id: bigint
  invoiceId: bigint
  payer: string
  issuer: string
  timestamp: number
}

// --- Chain status ---
export const ChainStatus = {
  Confirmed: 'confirmed',
  Sending: 'sending',
  Failed: 'failed',
} as const
export type ChainStatus = (typeof ChainStatus)[keyof typeof ChainStatus]

// --- Transaction phases ---
export const TransactionPhase = {
  Authorization: 'authorization',
  Encryption: 'encryption',
  Finalizing: 'finalizing',
} as const
export type TransactionPhase = (typeof TransactionPhase)[keyof typeof TransactionPhase]

// --- Audit ---
export interface AuditScope {
  amount: boolean
  tax: boolean
  parties: boolean
  details: boolean
  lineItems: boolean
  currency: boolean
  dates: boolean
  hashes: boolean
  status: boolean
}

export const DEFAULT_AUDIT_SCOPE: AuditScope = {
  amount: true,
  tax: true,
  parties: true,
  details: true,
  lineItems: true,
  currency: true,
  dates: true,
  hashes: true,
  status: true,
}

export interface AuditAuthorization {
  invoiceId: string
  delegate: string
  expiry: number
  scope: AuditScope
  grantedAt: number
  grantedBy: string
  txHash?: string
}

export interface AuditPackage {
  version: string
  network: string
  contract: string
  invoiceId: string
  delegate: string
  scope: AuditScope
  expiresAt: number
  generatedAt: number
  generatedBy: string
  txHash: string
}

export interface AuditVerificationPhase {
  name: string
  passed: boolean
  details: string
  checks: { key: string; ok: boolean; detail: string }[]
}

// --- Encrypted local storage ---
export interface EncryptedStorageEntry {
  iv: string
  ciphertext: string
  tag: string
}

// --- Invoice with chain metadata ---
export interface InvoiceWithMeta extends Invoice {
  chainStatus?: ChainStatus
  txHash?: string
  syncedAt?: number
}

// --- Exportable flat types for CSV ---
export interface ExportableInvoice {
  id: string
  issuer: string
  buyer: string
  status: string
  dueDate: string
  createdAt: string
  currency: string
  lineItemCount: string
  auditEnabled: string
  orderId: string
  memo: string
}

export interface ExportableReceipt {
  id: string
  invoiceId: string
  payer: string
  issuer: string
  timestamp: string
}
