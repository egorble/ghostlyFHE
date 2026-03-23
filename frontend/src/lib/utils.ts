import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CURRENCY_LABELS } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString()
}

export function truncateHash(hash: string, chars = 8) {
  if (!hash) return ''
  return hash.length <= chars * 2 + 3
    ? hash
    : `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`
}

export function formatAmount(value: number | bigint, currencyIdx?: number): string {
  const label = currencyIdx !== undefined ? CURRENCY_LABELS[currencyIdx] ?? '' : ''
  const num = typeof value === 'bigint' ? Number(value) : value
  return `${num.toLocaleString()} ${label}`.trim()
}

export function formatCountdown(expiryTimestamp: number): string {
  const diff = expiryTimestamp * 1000 - Date.now()
  if (diff <= 0) return 'Expired'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) lines.push(row.map(escape).join(','))
  return lines.join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function explorerUrl(txHash: string) {
  return `https://sepolia.etherscan.io/tx/${txHash}`
}
