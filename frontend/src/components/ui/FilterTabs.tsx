import { cn } from '../../lib/utils'

interface TabItem<T> {
  key: T
  label: string
  count?: number
}

interface Props<T extends string> {
  items: TabItem<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export default function FilterTabs<T extends string>({ items, active, onChange, className }: Props<T>) {
  return (
    <div className={cn('flex flex-wrap gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/60 inline-flex', className)}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-300',
            active === item.key
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/30 border border-transparent'
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-md text-[10px]', active === item.key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/50 text-slate-400')}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
