import { POLLING_INTERVAL } from '../lib/constants'
import { useInvoiceStore } from '../stores/useInvoiceStore'

let timer: ReturnType<typeof setInterval> | null = null
let running = false

async function poll() {
  const { sendingHashes, removeSendingHash, setChainStatus } = useInvoiceStore.getState()
  if (sendingHashes.size === 0) return

  const { createPublicClient, http } = await import('viem')
  const { sepolia } = await import('viem/chains')
  const client = createPublicClient({ chain: sepolia, transport: http('https://sepolia.drpc.org') })

  for (const [invoiceId, txHash] of sendingHashes.entries()) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
      if (receipt) {
        if (receipt.status === 'success') {
          setChainStatus(invoiceId, 'confirmed')
        } else {
          setChainStatus(invoiceId, 'failed')
        }
        removeSendingHash(invoiceId)
      }
    } catch {
      // tx not mined yet — keep polling
    }
  }
}

export function startPolling() {
  if (running) return
  running = true
  timer = setInterval(poll, POLLING_INTERVAL)
  poll() // immediate first check
}

export function stopPolling() {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function isPollingRunning() {
  return running
}
