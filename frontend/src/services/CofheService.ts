import { cofheClient, connectCofhe, ensurePermit, Encryptable } from '../cofhe.ts'
import type { PublicClient, WalletClient } from 'viem'
import { keccak256, toBytes } from 'viem'

export { cofheClient, connectCofhe, Encryptable }

// cofhejs for decrypt (uses /sealoutput v1 which works)
import { cofhejs } from 'cofhejs/web'

// Store clients for lazy cofhejs init
let savedPublicClient: PublicClient | null = null
let savedWalletClient: WalletClient | null = null
let cofhejsReady = false
let cofhejsInitializing: Promise<void> | null = null

export async function initCofhe(publicClient: PublicClient, walletClient: WalletClient) {
  // Save clients for lazy cofhejs init later
  savedPublicClient = publicClient
  savedWalletClient = walletClient

  // Only init @cofhe/sdk connection (no signatures needed beyond connect)
  await connectCofhe(publicClient, walletClient)
}

// Lazily init cofhejs — called only when first decrypt is needed
async function ensureCofhejs(): Promise<void> {
  if (cofhejsReady) return
  if (cofhejsInitializing) return cofhejsInitializing

  cofhejsInitializing = (async () => {
    if (!savedPublicClient || !savedWalletClient) throw new Error('Wallet not connected')
    const account = savedWalletClient.account?.address
    if (!account) throw new Error('No account')

    console.log('[CoFHE] cofhejs lazy init starting...')
    const result = await cofhejs.initializeWithViem({
      viemClient: savedPublicClient,
      viemWalletClient: savedWalletClient,
      environment: 'TESTNET',
    })
    if (result.success) {
      cofhejsReady = true
      console.log('[CoFHE] cofhejs initialized for decrypt')
    } else {
      console.warn('[CoFHE] cofhejs init failed:', result.error)
      throw new Error('cofhejs init failed')
    }
  })()

  try {
    await cofhejsInitializing
  } finally {
    cofhejsInitializing = null
  }
}

export function hashString(value: string): `0x${string}` {
  if (!value) return '0x0000000000000000000000000000000000000000000000000000000000000000'
  return keccak256(toBytes(value))
}

// ==================== AES DESCRIPTION ENCRYPT/DECRYPT ====================
// Shared key = keccak256(issuer + buyer + invoiceId) — both parties can derive it

function deriveDescKey(issuer: string, buyer: string, invoiceId: bigint): Uint8Array {
  const seed = keccak256(toBytes(`${issuer.toLowerCase()}:${buyer.toLowerCase()}:${invoiceId}`))
  return new Uint8Array(seed.slice(2).match(/.{2}/g)!.map(b => parseInt(b, 16)))
}

export async function encryptDescription(text: string, issuer: string, buyer: string, invoiceId: bigint): Promise<`0x${string}`> {
  if (!text) return '0x'
  const keyBytes = deriveDescKey(issuer, buyer, invoiceId)
  const key = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  // Format: iv(12) + ciphertext
  const result = new Uint8Array(12 + enc.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(enc), 12)
  return `0x${Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('')}`
}

export async function decryptDescription(encHex: string, issuer: string, buyer: string, invoiceId: bigint): Promise<string> {
  if (!encHex || encHex === '0x' || encHex.length < 28) return ''
  try {
    const bytes = new Uint8Array(encHex.slice(2).match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const iv = bytes.slice(0, 12)
    const ciphertext = bytes.slice(12)
    const keyBytes = deriveDescKey(issuer, buyer, invoiceId)
    const key = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, 'AES-GCM', false, ['decrypt'])
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(dec)
  } catch {
    return '[encrypted]'
  }
}

// ==================== ENCRYPT (via @cofhe/sdk) ====================

export async function encryptAddress(address: string) {
  await ensurePermit()
  const [encrypted] = await cofheClient.encryptInputs([
    Encryptable.address(address as `0x${string}`)
  ]).execute()
  return encrypted
}

export async function encryptUint8(value: number) {
  await ensurePermit()
  const [encrypted] = await cofheClient.encryptInputs([
    Encryptable.uint8(BigInt(value))
  ]).execute()
  return encrypted
}

export async function encryptUint32(value: number) {
  await ensurePermit()
  const [encrypted] = await cofheClient.encryptInputs([
    Encryptable.uint32(BigInt(value))
  ]).execute()
  return encrypted
}

export async function encryptUint128(value: bigint) {
  await ensurePermit()
  const [encrypted] = await cofheClient.encryptInputs([
    Encryptable.uint128(value)
  ]).execute()
  return encrypted
}

export async function encryptPayment(amount: bigint) {
  return encryptUint128(amount)
}

export async function encryptInvoiceData(params: {
  issuerAddress: string
  buyerAddress: string
  currency: number
}) {
  await ensurePermit()
  const [encIssuerAddr, encBuyerAddr, encCurrency] = await cofheClient.encryptInputs([
    Encryptable.address(params.issuerAddress as `0x${string}`),
    Encryptable.address(params.buyerAddress as `0x${string}`),
    Encryptable.uint8(BigInt(params.currency)),
  ]).execute()

  return { encIssuerAddr, encBuyerAddr, encCurrency }
}

export async function encryptLineItemData(params: {
  quantity: number
  unitPrice: number
  amount: number
}) {
  await ensurePermit()
  const [encQuantity, encUnitPrice, encAmount] = await cofheClient.encryptInputs([
    Encryptable.uint32(BigInt(params.quantity)),
    Encryptable.uint128(BigInt(params.unitPrice)),
    Encryptable.uint128(BigInt(params.amount)),
  ]).execute()

  return { encQuantity, encUnitPrice, encAmount }
}

// ==================== DECRYPT (via cofhejs unseal — uses /sealoutput v1) ====================

// FheTypes for cofhejs
const CofheTypes = { Bool: 0, Uint8: 2, Uint16: 3, Uint32: 4, Uint64: 5, Uint128: 6, Address: 7 } as const

const failedHandles = new Set<string>()

async function unsealValue(ctHash: bigint, utype: number): Promise<bigint> {
  const key = ctHash.toString(16).substring(0, 16)
  if (failedHandles.has(key)) throw new Error('Previously failed')

  // Lazily init cofhejs on first decrypt
  await ensureCofhejs()

  try {
    const result = await cofhejs.unseal(ctHash, utype)
    if (!result.success) {
      failedHandles.add(key)
      throw new Error(result.error?.message || 'unseal failed')
    }
    return BigInt(result.data.toString())
  } catch (err) {
    failedHandles.add(key)
    throw err
  }
}

export async function decryptUint128(ctHash: bigint): Promise<bigint> {
  if (ctHash === 0n) throw new Error('Zero handle')
  return unsealValue(ctHash, CofheTypes.Uint128)
}

export async function decryptUint32(ctHash: bigint): Promise<number> {
  if (ctHash === 0n) throw new Error('Zero handle')
  return Number(await unsealValue(ctHash, CofheTypes.Uint32))
}

export async function decryptUint8(ctHash: bigint): Promise<number> {
  if (ctHash === 0n) throw new Error('Zero handle')
  return Number(await unsealValue(ctHash, CofheTypes.Uint8))
}

export async function decryptInvoiceTotals(handles: { subtotal: bigint; amountPaid: bigint; currency: bigint }) {
  try {
    const [subtotal, amountPaid, currency] = await Promise.all([
      decryptUint128(handles.subtotal),
      decryptUint128(handles.amountPaid),
      decryptUint8(handles.currency),
    ])
    return { subtotal, amountPaid, currency }
  } catch (err) {
    console.warn('[CoFHE] Decrypt failed:', (err as Error).message?.substring(0, 60))
    return null
  }
}

export async function decryptLineItem(handles: { qty: bigint; unitPrice: bigint; amount: bigint }) {
  try {
    const [qty, unitPrice, amount] = await Promise.all([
      decryptUint32(handles.qty),
      decryptUint128(handles.unitPrice),
      decryptUint128(handles.amount),
    ])
    return { qty, unitPrice: Number(unitPrice), amount: Number(amount) }
  } catch (err) {
    console.warn('[CoFHE] Line item decrypt failed:', (err as Error).message?.substring(0, 60))
    return null
  }
}
