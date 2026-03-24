import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  custom,
  formatEther,
  parseAbiItem,
} from 'viem'
import { sepolia } from 'viem/chains'
import { ABIS } from '../contracts/abis.ts'
import { ADDRESSES } from '../contracts/addresses.ts'
import type { Invoice, Receipt } from '../lib/types.ts'
import { InvoiceStatus } from '../lib/types.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EncInput = any

let publicClient: PublicClient | null = null
let walletClient: WalletClient | null = null

export function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: sepolia,
      transport: http('https://sepolia.drpc.org'),
    })
  }
  return publicClient
}

export async function getWalletClient(): Promise<WalletClient> {
  if (!walletClient) {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
    if (!ethereum) throw new Error('MetaMask not found')
    walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(ethereum),
    })
  }
  return walletClient
}

export function setClients(pub: PublicClient, wallet: WalletClient) {
  publicClient = pub
  walletClient = wallet
}



// ============== READ FUNCTIONS ==============

export async function getInvoiceMinimal(id: bigint): Promise<Partial<Invoice>> {
  const client = getPublicClient()
  const result = await client.readContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'getInvoiceMinimal',
    args: [id],
  }) as [bigint, bigint, number, bigint, boolean]

  return {
    id,
    lineItemCount: Number(result[0]),
    dueDate: Number(result[1]),
    status: result[2] as InvoiceStatus,
    createdAt: Number(result[3]),
    auditEnabled: result[4],
    issuer: '',
    buyer: '',
  }
}

export async function getInvoiceFull(id: bigint): Promise<Invoice> {
  // Must use walletClient so msg.sender is set for ACL check
  const wallet = walletClient ?? await getWalletClient()
  const account = wallet.account ?? (await wallet.getAddresses())[0]
  const client = getPublicClient()
  const result = await client.readContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'getInvoiceFull',
    args: [id],
    account,
  }) as [string, string, string, string, bigint, bigint, number, bigint, boolean]

  return {
    id,
    issuer: result[0],
    buyer: result[1],
    orderIdHash: result[2],
    memoHash: result[3],
    lineItemCount: Number(result[4]),
    dueDate: Number(result[5]),
    status: result[6] as InvoiceStatus,
    createdAt: Number(result[7]),
    auditEnabled: result[8],
  }
}

export async function getDecryptedTotals(id: bigint): Promise<{ subtotal: bigint; amountPaid: bigint; currency: number } | null> {
  const { rpcThrottle, getCached, setCache } = await import('./RpcQueue')
  const cacheKey = `totals-${id}`
  const cached = getCached<{ subtotal: bigint; amountPaid: bigint; currency: number }>(cacheKey)
  if (cached) return cached

  return rpcThrottle(async () => {
    const client = getPublicClient()
    const wallet = walletClient ?? await getWalletClient()
    const account = wallet.account ?? (await wallet.getAddresses())[0]
    try {
      const result = await client.readContract({
        address: ADDRESSES.ConfidentialInvoice as Address,
        abi: ABIS.ConfidentialInvoice,
        functionName: 'getEncryptedTotals',
        args: [id],
        account,
      }) as [bigint, bigint, bigint]

      const { decryptInvoiceTotals } = await import('./CofheService')
      const decrypted = await decryptInvoiceTotals({ subtotal: result[0], amountPaid: result[1], currency: result[2] })
      if (decrypted) setCache(cacheKey, decrypted)
      return decrypted
    } catch (err) {
      console.warn('getDecryptedTotals failed:', err)
      return null
    }
  })
}

export async function getDecryptedLineItem(invoiceId: bigint, index: number, issuer?: string, buyer?: string): Promise<{ description: string; qty: number; unitPrice: number; amount: number } | null> {
  const { rpcThrottle, getCached, setCache } = await import('./RpcQueue')
  const cacheKey = `lineitem-${invoiceId}-${index}`
  const cached = getCached<{ description: string; qty: number; unitPrice: number; amount: number }>(cacheKey)
  if (cached) return cached

  return rpcThrottle(async () => {
    const client = getPublicClient()
    const wallet = walletClient ?? await getWalletClient()
    const account = wallet.account ?? (await wallet.getAddresses())[0]
    try {
      const result = await client.readContract({
        address: ADDRESSES.ConfidentialInvoice as Address,
        abi: ABIS.ConfidentialInvoice,
        functionName: 'getLineItem',
        args: [invoiceId, BigInt(index)],
        account,
      }) as [string, bigint, bigint, bigint]

      const { decryptLineItem, decryptDescription } = await import('./CofheService')

      // Decrypt description via AES (always try, even if FHE fails)
      let description = 'Encrypted'
      if (issuer && buyer && result[0] && result[0] !== '0x' && (result[0] as string).length > 4) {
        description = await decryptDescription(result[0], issuer, buyer, invoiceId)
      }

      // Try FHE decrypt for amounts (may fail for some handles)
      const decrypted = await decryptLineItem({ qty: result[1], unitPrice: result[2], amount: result[3] })

      const item = { description, qty: decrypted?.qty ?? 0, unitPrice: decrypted?.unitPrice ?? 0, amount: decrypted?.amount ?? 0 }
      setCache(cacheKey, item)
      return item
    } catch (err) {
      console.warn('getDecryptedLineItem failed:', err)
      return null
    }
  })
}

export async function getIssuerInvoices(addr: string): Promise<bigint[]> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'getIssuerInvoices',
    args: [addr as Address],
  })) as bigint[]
}

export async function getBuyerInvoices(addr: string): Promise<bigint[]> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'getBuyerInvoices',
    args: [addr as Address],
  })) as bigint[]
}

export async function getInvoiceCount(): Promise<bigint> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'getInvoiceCount',
  })) as bigint
}

export async function getReceiptCount(): Promise<bigint> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialReceipt as Address,
    abi: ABIS.ConfidentialReceipt,
    functionName: 'getReceiptCount',
  })) as bigint
}

export async function getReceiptPublicData(id: bigint): Promise<Receipt> {
  const client = getPublicClient()
  const result = await client.readContract({
    address: ADDRESSES.ConfidentialReceipt as Address,
    abi: ABIS.ConfidentialReceipt,
    functionName: 'getReceiptPublicData',
    args: [id],
  }) as [bigint, string, string, bigint]

  return {
    id,
    invoiceId: result[0],
    payer: result[1],
    issuer: result[2],
    timestamp: Number(result[3]),
  }
}

export async function getReceiptsByInvoice(invoiceId: bigint): Promise<bigint[]> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialReceipt as Address,
    abi: ABIS.ConfidentialReceipt,
    functionName: 'getReceiptsByInvoice',
    args: [invoiceId],
  })) as bigint[]
}

export async function getReceiptsByUser(addr: string): Promise<bigint[]> {
  const client = getPublicClient()
  return (await client.readContract({
    address: ADDRESSES.ConfidentialReceipt as Address,
    abi: ABIS.ConfidentialReceipt,
    functionName: 'getReceiptsByUser',
    args: [addr as Address],
  })) as bigint[]
}

// ============== WRITE FUNCTIONS ==============

export async function createInvoice(
  buyer: Address,
  encIssuerAddr: EncInput,
  encBuyerAddr: EncInput,
  dueDate: bigint,
  encCurrency: EncInput,
  orderIdHash: `0x${string}`,
  memoHash: `0x${string}`,
  auditEnabled: boolean,
  account: Address,
): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'createInvoice',
    args: [buyer, encIssuerAddr, encBuyerAddr, dueDate, encCurrency, orderIdHash, memoHash, auditEnabled],
    account,
    chain: sepolia,
  })
}

export async function addLineItem(
  invoiceId: bigint,
  encDescription: `0x${string}`,
  encQuantity: EncInput,
  encUnitPrice: EncInput,
  encAmount: EncInput,
  account: Address,
): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'addLineItem',
    args: [invoiceId, encDescription, encQuantity, encUnitPrice, encAmount],
    account,
    chain: sepolia,
  })
}

export async function sendInvoice(invoiceId: bigint, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'sendInvoice',
    args: [invoiceId],
    account,
    chain: sepolia,
  })
}

export async function payInvoice(
  invoiceId: bigint,
  encPayment: EncInput,
  account: Address,
): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'payInvoice',
    args: [invoiceId, encPayment],
    account,
    chain: sepolia,
  })
}

export async function cancelInvoice(invoiceId: bigint, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'cancelInvoice',
    args: [invoiceId],
    account,
    chain: sepolia,
  })
}

export async function disputeInvoice(invoiceId: bigint, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'disputeInvoice',
    args: [invoiceId],
    account,
    chain: sepolia,
  })
}

export async function resolveDispute(invoiceId: bigint, inFavorOfBuyer: boolean, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'resolveDispute',
    args: [invoiceId, inFavorOfBuyer],
    account,
    chain: sepolia,
  })
}

export async function markOverdue(invoiceId: bigint, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'markOverdue',
    args: [invoiceId],
    account,
    chain: sepolia,
  })
}

export async function confirmFullPayment(invoiceId: bigint, account: Address): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'confirmFullPayment',
    args: [invoiceId],
    account,
    chain: sepolia,
  })
}

export async function grantAccess(
  invoiceId: bigint,
  delegate: Address,
  expiry: bigint,
  account: Address,
): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'grantAccess',
    args: [invoiceId, delegate, expiry],
    account,
    chain: sepolia,
  })
}

export async function revokeAccess(
  invoiceId: bigint,
  delegate: Address,
  account: Address,
): Promise<`0x${string}`> {
  const wc = await getWalletClient()
  return wc.writeContract({
    address: ADDRESSES.ConfidentialInvoice as Address,
    abi: ABIS.ConfidentialInvoice,
    functionName: 'revokeAccess',
    args: [invoiceId, delegate],
    account,
    chain: sepolia,
  })
}


// Returns invoice IDs where this address was granted audit access (via AccessGranted events)
export async function getDelegatedInvoiceIds(delegate: string): Promise<bigint[]> {
  const client = getPublicClient()
  const now = BigInt(Math.floor(Date.now() / 1000))
  const currentBlock = await client.getBlockNumber()
  const fromBlock = currentBlock > 9000n ? currentBlock - 9000n : 0n

  const granted = await client.getLogs({
    address: ADDRESSES.ConfidentialInvoice as Address,
    event: parseAbiItem('event AccessGranted(uint256 indexed invoiceId, address indexed delegate, uint256 expiry)'),
    args: { delegate: delegate as Address },
    fromBlock,
  })

  const revoked = await client.getLogs({
    address: ADDRESSES.ConfidentialInvoice as Address,
    event: parseAbiItem('event AccessRevoked(uint256 indexed invoiceId, address indexed delegate)'),
    args: { delegate: delegate as Address },
    fromBlock,
  })

  const revokedIds = new Set(revoked.map((l) => l.args.invoiceId!.toString()))

  // Keep only non-revoked, non-expired grants (deduplicate by invoiceId, take latest)
  const latest = new Map<string, bigint>()
  for (const log of granted) {
    const id = log.args.invoiceId!.toString()
    const expiry = log.args.expiry!
    if (!revokedIds.has(id) && expiry > now) {
      latest.set(id, log.args.invoiceId!)
    }
  }

  return Array.from(latest.values())
}

export async function getBalance(addr: string): Promise<string> {
  const client = getPublicClient()
  const balance = await client.getBalance({ address: addr as Address })
  return formatEther(balance)
}

