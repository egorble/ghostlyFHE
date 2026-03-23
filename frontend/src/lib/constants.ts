export const STATUS_COLORS: Record<number, string> = {
  0: 'badge-pending',
  1: 'badge-pending',
  2: 'badge-pending',
  3: 'badge-paid',
  4: 'badge-expired',
  5: 'badge-expired',
  6: 'badge-cancelled',
}


// Chain status
export const CHAIN_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  sending: 'Sending',
  failed: 'Failed',
}

export const CHAIN_STATUS_COLORS: Record<string, string> = {
  confirmed:
    'inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700',
  sending:
    'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700',
  failed:
    'inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700',
}

// Audit scope labels
export const AUDIT_SCOPE_LABELS: Record<string, string> = {
  amount: 'Invoice Amount',
  tax: 'Tax Information',
  parties: 'Issuer & Buyer',
  details: 'Order ID & Memo',
  lineItems: 'Line Items',
  currency: 'Currency',
  dates: 'Due Date & Created',
  hashes: 'Data Hashes',
  status: 'Invoice Status',
}

// Polling
export const POLLING_INTERVAL = 15_000
export const MAX_RECENT_INVOICES = 4
export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io'
