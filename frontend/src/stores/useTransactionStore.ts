import { create } from 'zustand'
import type { TransactionPhase } from '../lib/types'

interface PhaseEntry {
  phase: TransactionPhase
  startedAt: number
  completedAt?: number
}

interface TxState {
  isProcessing: boolean
  progress: number
  message: string
  logs: string[]
  phase: TransactionPhase | null
  phaseHistory: PhaseEntry[]

  setProcessing: (v: boolean) => void
  setProgress: (p: number, msg?: string) => void
  addLog: (msg: string) => void
  startPhase: (phase: TransactionPhase) => void
  completePhase: () => void
  reset: () => void
}

export const useTransactionStore = create<TxState>((set) => ({
  isProcessing: false,
  progress: 0,
  message: '',
  logs: [],
  phase: null,
  phaseHistory: [],

  setProcessing: (isProcessing) => set({ isProcessing }),

  setProgress: (progress, message) =>
    set((s) => ({ progress, message: message || s.message })),

  addLog: (msg) =>
    set((s) => ({ logs: [...s.logs, `${new Date().toLocaleTimeString()} ${msg}`] })),

  startPhase: (phase) =>
    set((s) => ({
      phase,
      phaseHistory: [...s.phaseHistory, { phase, startedAt: Date.now() }],
    })),

  completePhase: () =>
    set((s) => ({
      phase: null,
      phaseHistory: s.phaseHistory.map((e, i) =>
        i === s.phaseHistory.length - 1 && !e.completedAt
          ? { ...e, completedAt: Date.now() }
          : e
      ),
    })),

  reset: () =>
    set({ isProcessing: false, progress: 0, message: '', logs: [], phase: null, phaseHistory: [] }),
}))
