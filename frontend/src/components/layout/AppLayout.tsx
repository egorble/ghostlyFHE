import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '../ui/sonner'
import InvoiceAutoPoller from '../InvoiceAutoPoller'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <InvoiceAutoPoller />
      <Sidebar />
      {/* Add left padding on large screens to account for fixed sidebar */}
      <div className="lg:pl-56 flex flex-col min-h-screen transition-all duration-300">
        <Header />
        <main className="flex-1 p-3 lg:p-6 w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
