// Simple rate-limited queue for RPC calls to avoid 429 errors
const MAX_CONCURRENT = 2
const DELAY_MS = 500

let running = 0
const queue: (() => void)[] = []

function processNext() {
  if (running >= MAX_CONCURRENT || queue.length === 0) return
  running++
  const next = queue.shift()!
  next()
}

export function rpcThrottle<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          running--
          setTimeout(processNext, DELAY_MS)
        })
    })
    processNext()
  })
}

// Cache for decrypt results to avoid re-requesting
const decryptCache = new Map<string, { value: unknown; ts: number }>()
const CACHE_TTL = 60_000 // 1 minute

export function getCached<T>(key: string): T | undefined {
  const entry = decryptCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.ts > CACHE_TTL) {
    decryptCache.delete(key)
    return undefined
  }
  return entry.value as T
}

export function setCache(key: string, value: unknown) {
  decryptCache.set(key, { value, ts: Date.now() })
}
