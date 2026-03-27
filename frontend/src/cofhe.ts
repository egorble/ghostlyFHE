import { createCofheConfig, createCofheClient } from '@cofhe/sdk/web'
import { chains, type CofheChain } from '@cofhe/sdk/chains'
import { Encryptable } from '@cofhe/sdk'
import type { PublicClient, WalletClient } from 'viem'
import initTfhe from 'tfhe'

export { Encryptable }

let cofheClientInstance: ReturnType<typeof createCofheClient> | null = null
let initialized = false

export function getCofheClient() {
  if (!cofheClientInstance) {
    const config = createCofheConfig({
      supportedChains: [chains.sepolia as CofheChain],
    })
    cofheClientInstance = createCofheClient(config)
  }
  return cofheClientInstance
}

export const cofheClient = getCofheClient()

export async function connectCofhe(publicClient: PublicClient, walletClient: WalletClient) {
  // Pre-initialize TFHE WASM from public dir
  if (!initialized) {
    console.log('[CoFHE] Initializing TFHE WASM...')
    await initTfhe('/tfhe_bg.wasm')
    initialized = true
    console.log('[CoFHE] TFHE WASM loaded')
  }

  await cofheClient.connect(publicClient, walletClient)

  const connState = cofheClient.connection
  console.log('[CoFHE] Connected:', connState.connected, 'account:', connState.account, 'chainId:', connState.chainId)
}

// Lazily create self-permit only when needed (e.g. before encrypt/decrypt)
let permitReady = false
export async function ensurePermit() {
  if (permitReady) return
  console.log('[CoFHE] Getting or creating self-permit...')
  const permit = await cofheClient.permits.getOrCreateSelfPermit()
  permitReady = true
  console.log('[CoFHE] Self-permit active:', permit?.hash)
}
