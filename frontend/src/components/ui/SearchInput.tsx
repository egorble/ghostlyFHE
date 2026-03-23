import { useEffect, useRef, useState } from 'react'
import { PiMagnifyingGlass as Search } from 'react-icons/pi'
import { cn } from '../../lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className }: Props) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLocal(value)
  }, [value])

  const handleChange = (v: string) => {
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 300)
  }

  return (
    <div className={cn('relative group', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all"
      />
    </div>
  )
}
