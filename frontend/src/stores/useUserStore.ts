import { create } from 'zustand'

interface UserState {
  address: string | null
  isConnected: boolean
  cofheReady: boolean
  balance: string
  setAddress: (addr: string | null) => void
  setConnected: (v: boolean) => void
  setCofheReady: (v: boolean) => void
  setBalance: (v: string) => void
}

export const useUserStore = create<UserState>((set) => ({
  address: null,
  isConnected: false,
  cofheReady: false,
  balance: '0',
  setAddress: (address) => set({ address }),
  setConnected: (isConnected) => set({ isConnected }),
  setCofheReady: (cofheReady) => set({ cofheReady }),
  setBalance: (balance) => set({ balance }),
}))
