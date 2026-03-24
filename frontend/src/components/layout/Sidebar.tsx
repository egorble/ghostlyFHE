import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PiDiamondsFour as LayoutDashboard, PiCards as FileText, PiMagicWand as PlusCircle, PiWallet as Receipt, PiGhost as Shield, PiFingerprint as ShieldCheck } from 'react-icons/pi'
import OwlIcon from '../logo/OwlIcon'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/invoices/create', icon: PlusCircle, label: 'Create' },
  { to: '/receipts', icon: Receipt, label: 'Receipts' },
  { to: '/audit', icon: Shield, label: 'Audit Center' },
  { to: '/audit/verify', icon: ShieldCheck, label: 'Verify Audit' },
]


export function Sidebar() {
  const location = useLocation()

  const checkIsActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/invoices') return location.pathname === '/invoices' || (location.pathname.startsWith('/invoices/') && !location.pathname.startsWith('/invoices/create'))
    if (path === '/audit') return location.pathname === '/audit' || (location.pathname.startsWith('/audit/') && !location.pathname.startsWith('/audit/verify'))
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <>
      {/* Sidebar - Desktop and Tablet */}
      <aside
        className={cn(
          'hidden md:flex fixed left-0 top-0 h-full bg-white z-40 flex-col transition-all duration-200 shadow-[2px_0_20px_rgba(0,0,0,0.02)]',
          'w-20 lg:w-56'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-0 lg:px-4 py-3 cursor-default lg:cursor-pointer transition-all justify-center lg:justify-start">
          <div className="w-8 h-8 shrink-0 rounded-[10px] bg-emerald-50 flex items-center justify-center text-[#115E3E]">
             <OwlIcon className="w-5 h-5 transition-all duration-300" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 hidden lg:block">Ghostly</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto w-full no-scrollbar mt-4">
          <p className="px-4 mb-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase hidden lg:block">Menu</p>
          <nav className="px-3 lg:px-4 space-y-1 mb-3">
            {navItems.map((item) => {
              const isActive = checkIsActive(item.to)
              return (
              <NavLink
                key={item.to}
                to={item.to}
                className={() =>
                  cn(
                    'flex items-center gap-4 px-0 lg:px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group relative justify-center lg:justify-start',
                    isActive
                      ? 'text-slate-900 font-bold'
                      : 'text-slate-500 font-medium hover:bg-slate-50/80 hover:text-slate-900',
                  )
                }
                title={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute -left-3 lg:-left-4 inset-y-0 my-auto w-1.5 h-10 bg-[#115E3E] rounded-r-md pointer-events-none hidden md:block"
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110 relative z-10", isActive ? 'text-[#115E3E]' : 'text-slate-400 group-hover:text-slate-600')} />
                <span className="relative z-10 hidden lg:block">{item.label}</span>
              </NavLink>
              )
            })}
          </nav>
        </div>
        <div className="px-4 py-4 pb-6 mx-auto w-full hidden lg:block">
           <div className="bg-[url('/bg-new.png')] bg-cover bg-center bg-no-repeat rounded-[24px] p-4 text-white relative overflow-hidden group shadow-lg border-[0.5px] border-emerald-900/20">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl group-hover:bg-emerald-400/30 transition-all"></div>
             
             <div className="w-8 h-8 rounded-full bg-white text-[#115E3E] flex items-center justify-center mb-2">
               <OwlIcon className="w-[18px] h-[18px]" />
             </div>
             
             <h4 className="font-bold text-sm mb-0.5 leading-tight">Ghostly Secure</h4>
             <p className="text-[10px] text-emerald-100/80 leading-relaxed mb-3">
               Powered by Fhenix FHE
             </p>
             
             <button onClick={() => window.open('https://fhenix.io', '_blank')} className="w-full py-2 bg-[#1A8A5A] hover:bg-[#209C69] text-[11px] font-bold rounded-full transition-colors">
               Learn More
             </button>
           </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 px-2 py-3 z-50 flex items-center justify-around pb-[calc(12px+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = checkIsActive(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-xl transition-all relative',
                isActive ? 'text-[#115E3E]' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-active-indicator"
                  className="absolute inset-0 bg-[#115E3E]/10 rounded-xl pointer-events-none"
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                />
              )}
              <item.icon className={cn("w-6 h-6 relative z-10", isActive ? 'scale-110' : '')} strokeWidth={isActive ? 2 : 1.5} />
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
