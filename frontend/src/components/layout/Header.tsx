import { PiGhost as Ghost } from 'react-icons/pi'
import { WalletButton } from '../wallet/WalletButton.tsx'

export function Header() {
  return (
    <header className="sticky top-0 z-20 px-4 py-2 pt-3">
      <div className="flex items-center justify-between">
        {/* Left: title (visible on mobile) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Ghost className="w-6 h-6 text-[#115E3E]" />
          <span className="font-bold text-slate-900 text-lg">Ghostly</span>
        </div>

        {/* Right: wallet */}
        <div className="ml-auto">
          <WalletButton />
        </div>
      </div>
    </header>
  )
}
