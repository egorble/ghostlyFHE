import { PiSpinnerGap as Loader2, PiCheck as Check, PiShield as Shield, PiWallet as Wallet, PiRadio as Radio } from 'react-icons/pi'
import { cn } from '../../lib/utils'
import type { TransactionPhase } from '../../lib/types'

interface PhaseEntry {
  phase: TransactionPhase
  startedAt: number
  completedAt?: number
}

interface Props {
  currentPhase: TransactionPhase | null
  phaseHistory: PhaseEntry[]
}

const PHASES: { key: TransactionPhase; label: string; icon: typeof Shield }[] = [
  { key: 'authorization', label: 'Authorization', icon: Wallet },
  { key: 'encryption', label: 'Encrypting', icon: Shield },
  { key: 'finalizing', label: 'Finalizing', icon: Radio },
]

export default function PaymentProgress({ currentPhase, phaseHistory }: Props) {
  const completedPhases = new Set(phaseHistory.filter((e) => e.completedAt).map((e) => e.phase))
  const allDone = PHASES.every((p) => completedPhases.has(p.key))

  const progressPct = allDone
    ? 100
    : currentPhase
      ? ((PHASES.findIndex((p) => p.key === currentPhase) + 0.5) / PHASES.length) * 100
      : 0

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              allDone ? 'bg-green-500' : currentPhase === 'finalizing' ? 'bg-green-400' : 'bg-blue-500'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-stone-600 min-w-[60px] text-right">
          {allDone ? 'Complete' : currentPhase ? PHASES.find((p) => p.key === currentPhase)?.label : 'Waiting'}
        </span>
      </div>

      {/* Phase indicators */}
      <div className="flex items-center justify-between">
        {PHASES.map((p, i) => {
          const isActive = currentPhase === p.key
          const isDone = completedPhases.has(p.key)
          const Icon = p.icon

          return (
            <div key={p.key} className="flex flex-col items-center gap-1.5 flex-1">
              {i > 0 && (
                <div
                  className={cn(
                    'absolute h-0.5 w-full -translate-y-3',
                    isDone ? 'bg-green-300' : 'bg-stone-200'
                  )}
                />
              )}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                  isDone
                    ? 'border-green-400 bg-green-50'
                    : isActive
                      ? 'border-blue-400 bg-blue-100'
                      : 'border-stone-200 bg-stone-50'
                )}
              >
                {isDone ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-stone-400" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isDone ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-stone-400'
                )}
              >
                {p.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
