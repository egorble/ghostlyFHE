import { PiClock as Clock, PiCheckCircle as CheckCircle, PiXCircle as XCircle, PiWarning as AlertTriangle, PiPaperPlaneRight as Send, PiDownloadSimple as Download } from 'react-icons/pi'
import { cn } from '../../lib/utils.ts'
import { STATUS_LABELS } from '../../lib/types.ts'

const badgeConfig: Record<number, { className: string; icon: typeof Clock }> = {
  0: { className: 'badge-pending', icon: Clock },         // Created
  1: { className: 'badge-pending', icon: Send },          // Sent
  2: { className: 'badge-pending', icon: Clock },         // PartiallyPaid
  3: { className: 'badge-paid', icon: CheckCircle },      // Paid
  4: { className: 'badge-expired', icon: AlertTriangle }, // Overdue
  5: { className: 'badge-expired', icon: AlertTriangle }, // Disputed
  6: { className: 'badge-cancelled', icon: XCircle },     // Cancelled
}

interface StatusBadgeProps {
  status: number
  role?: 'seller' | 'buyer'
  className?: string
}

export function StatusBadge({ status, role, className }: StatusBadgeProps) {
  // For buyer, "Sent" status means "Received"
  let label = STATUS_LABELS[status] ?? 'Unknown'
  let config = badgeConfig[status] ?? { className: 'badge-cancelled', icon: Clock }

  if (status === 1 && role === 'buyer') {
    label = 'Received'
    config = { className: 'badge-pending', icon: Download }
  }

  const Icon = config.icon

  return (
    <span className={cn(config.className, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}
