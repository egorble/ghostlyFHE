import type { IconType as LucideIcon } from 'react-icons'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 px-4 text-center', className)}>
      <div className="relative mb-3 group">
        <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl group-hover:bg-emerald-200 transition-all duration-500 scale-150"></div>
        <div className="relative w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-sm">
          <Icon className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors duration-500" />
        </div>
      </div>
      <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm font-medium text-slate-500 max-w-sm">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
