import { useState, useRef, useEffect } from 'react'
import { PiWallet as Wallet, PiSpinnerGap as Loader2, PiCopy, PiCheck, PiCaretDown } from 'react-icons/pi'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { sepolia } from 'viem/chains'
import { useUserStore } from '../../stores/useUserStore.ts'
import { initCofhe } from '../../services/CofheService.ts'
import { setClients, getBalance } from '../../services/FhenixService.ts'
import { formatAddress } from '../../lib/utils.ts'
import { toast } from 'sonner'

function getEthereum() {
  return (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void } }).ethereum
}

export function WalletButton() {
  const { address, isConnected, balance, cofheReady, setAddress, setConnected, setCofheReady, setBalance } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Auto-reconnect on page load
  useEffect(() => {
    const ethereum = getEthereum()
    if (!ethereum || isConnected) return

    ethereum.request({ method: 'eth_accounts' }).then(async (result) => {
      const accounts = result as string[]
      if (accounts.length > 0) {
        await connectAccount(accounts[0])
        toast.success('Wallet reconnected')
      }
    }).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Listen for account changes
  useEffect(() => {
    const ethereum = getEthereum()
    if (!ethereum?.on) return

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts.length === 0) {
        disconnect()
      } else if (accounts[0] !== address) {
        await connectAccount(accounts[0])
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    return () => { ethereum.removeListener?.('accountsChanged', handleAccountsChanged) }
  }, [address])

  async function connectAccount(account: string) {
    const ethereum = getEthereum()
    if (!ethereum) return

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http('https://sepolia.drpc.org'),
    })
    const walletClient = createWalletClient({
      account: account as `0x${string}`,
      chain: sepolia,
      transport: custom(ethereum),
    })

    setClients(publicClient, walletClient)
    setAddress(account)
    setConnected(true)

    const bal = await getBalance(account)
    setBalance(bal)

    try {
      await initCofhe(publicClient, walletClient)
      setCofheReady(true)
    } catch {
      setCofheReady(false)
    }
  }

  async function connect() {
    const ethereum = getEthereum()
    if (!ethereum) {
      toast.error('MetaMask not found. Please install MetaMask.')
      return
    }

    setLoading(true)
    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[]

      // Switch to Sepolia
      try {
        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
      } catch (switchError: unknown) {
        const err = switchError as { code?: number }
        if (err.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: '0xaa36a7', chainName: 'Sepolia', rpcUrls: ['https://sepolia.drpc.org'], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, blockExplorerUrls: ['https://sepolia.etherscan.io'] }],
          })
        } else throw switchError
      }

      toast.info('Initializing FHE encryption...')
      await connectAccount(accounts[0])
      toast.success('Wallet connected')
    } catch (err) {
      console.error('Connect error:', err)
      toast.error('Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setAddress(null)
    setConnected(false)
    setCofheReady(false)
    setBalance('0')
    setOpen(false)
    toast.info('Wallet disconnected')
  }

  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Not connected — show connect button
  if (!isConnected || !address) {
    return (
      <button onClick={connect} disabled={loading} className="flex items-center gap-2 bg-[#1F6E4D] text-white text-[12px] font-medium rounded-full px-4 py-2 hover:bg-[#16563b] transition-all shadow-sm">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  // Connected — show wallet info with dropdown
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full pl-3 pr-2 py-1.5 hover:shadow-md transition-all cursor-pointer"
      >
        {/* Balance */}
        <span className="text-[11px] font-bold text-slate-900 hidden sm:block">
          {parseFloat(balance).toFixed(4)} ETH
        </span>

        {/* Address pill */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-2.5 py-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[8px] font-bold text-white">
            {address.slice(2, 4).toUpperCase()}
          </div>
          <span className="text-[11px] font-bold text-slate-700">{formatAddress(address)}</span>
          <CaretIcon open={open} />
        </div>

        {/* FHE status dot */}
        <div className={`w-2 h-2 rounded-full ${cofheReady ? 'bg-emerald-400' : 'bg-amber-400'}`} title={cofheReady ? 'FHE Ready' : 'FHE Not Ready'} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                {address.slice(2, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-slate-900 truncate">{formatAddress(address)}</div>
                <div className="text-[10px] text-slate-500">Sepolia Testnet</div>
              </div>
              <button onClick={copyAddress} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors" title="Copy address">
                {copied ? <PiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <PiCopy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Balance</div>
            <div className="text-[18px] font-bold text-slate-900 mt-0.5">{parseFloat(balance).toFixed(4)} <span className="text-[12px] text-slate-400">ETH</span></div>
          </div>

          {/* Status */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">FHE Encryption</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${cofheReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`text-[10px] font-bold ${cofheReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                {cofheReady ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* View on Etherscan */}
          <button
            onClick={() => { window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank'); setOpen(false) }}
            className="w-full px-4 py-2.5 text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <span className="text-[14px]">↗</span> View on Etherscan
          </button>

        </div>
      )}
    </div>
  )
}

function CaretIcon({ open }: { open: boolean }) {
  return (
    <PiCaretDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
  )
}
