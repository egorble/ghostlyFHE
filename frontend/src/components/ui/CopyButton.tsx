import { useState } from 'react'
import { PiCopy as Copy, PiCheck as Check } from 'react-icons/pi'
import { cn, copyToClipboard } from '../../lib/utils'

interface Props {
  text: string
  className?: string
  size?: 'sm' | 'md'
}

export default function CopyButton({ text, className, size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors',
        className
      )}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? (
        <Check className={cn(iconSize, 'text-green-500')} />
      ) : (
        <Copy className={iconSize} />
      )}
    </button>
  )
}
