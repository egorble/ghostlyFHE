import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PiCards as FileText, PiArrowUpRight as ArrowUpRight, PiDownloadSimple as Inbox, PiClock as Clock, PiCaretRight as ArrowRight, PiPaperPlaneRight as Send, PiMagicWand as PlusCircle, PiWallet as ReceiptIcon, PiFingerprint as ShieldCheck } from 'react-icons/pi'
import { useUserStore } from '../stores/useUserStore'
import * as InvoiceCache from '../services/InvoiceCacheService'
import { EmptyState } from '../components/ui/empty-state'
import InvoiceProgressGauge from '../components/ui/InvoiceProgressGauge'
import type { Invoice } from '../lib/types'
import { STATUS_LABELS } from '../lib/types'

const ActivityChart = ({ invoices }: { invoices: Invoice[] }) => {
  const [timeRange, setRange] = useState<'Week' | 'Month' | 'Year'>('Year');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  
  let labels: string[] = [];
  let counts: number[] = [];
  let isCurrentIndex = (_i: number) => false;
  let hasData = false;
  let fallbackData: number[] = [];

  if (timeRange === 'Year') {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    counts = new Array(12).fill(0);
    isCurrentIndex = (i) => i === currentMonth;
    fallbackData = new Array(12).fill(0);
    
    invoices.forEach(inv => {
      if (inv.createdAt) {
        const d = new Date(Number(inv.createdAt) * 1000);
        if (d.getFullYear() === currentYear) {
          counts[d.getMonth()] += 1;
          hasData = true;
        }
      }
    });
  } else if (timeRange === 'Month') {
    labels = ['W 1', 'W 2', 'W 3', 'W 4+'];
    counts = new Array(4).fill(0);
    const currWeek = Math.min(3, Math.floor((currentDate - 1) / 7));
    isCurrentIndex = (i) => i === currWeek;
    fallbackData = new Array(4).fill(0);
    
    invoices.forEach(inv => {
      if (inv.createdAt) {
        const d = new Date(Number(inv.createdAt) * 1000);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const w = Math.min(3, Math.floor((d.getDate() - 1) / 7));
          counts[w] += 1;
          hasData = true;
        }
      }
    });
  } else {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    counts = new Array(7).fill(0);
    isCurrentIndex = (i) => i === currentDay;
    fallbackData = new Array(7).fill(0);

    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay);
    monday.setHours(0,0,0,0);
    
    invoices.forEach(inv => {
      if (inv.createdAt) {
        const d = new Date(Number(inv.createdAt) * 1000);
        if (d >= monday) {
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          if (dayIdx >= 0 && dayIdx < 7) {
            counts[dayIdx] += 1;
            hasData = true;
          }
        }
      }
    });
  }

  if (!hasData) {
    counts = fallbackData;
  }

  const maxCount = Math.max(...counts, 5);
  const maxAxisValue = Math.ceil(maxCount / 5) * 5;
  const yAxisTicks = [maxAxisValue, Math.round(maxAxisValue * 0.8), Math.round(maxAxisValue * 0.6), Math.round(maxAxisValue * 0.4), Math.round(maxAxisValue * 0.2), 0];

  const data = labels.map((label, i) => {
    const prevCount = i === 0 ? 0 : counts[i-1];
    const currCount = counts[i];
    let growth = 0;
    if (prevCount === 0 && currCount > 0) growth = 100;
    else if (prevCount > 0) growth = Math.round(((currCount - prevCount) / prevCount) * 100);

    return {
      label,
      value: (currCount / maxAxisValue) * 100,
      count: currCount,
      growthLabel: growth > 0 ? `+${growth}%` : `${growth}%`,
      isCurrent: isCurrentIndex(i)
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 w-full h-[260px] flex flex-col relative z-10 shadow-sm">
      <div className="flex justify-between items-center mb-3 z-20 relative">
        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">
          Invoice Analytics
        </h3>
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className="text-[10px] sm:text-xs bg-white text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            {timeRange} <span>▼</span>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-28 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-[100]">
              {['Week', 'Month', 'Year'].map(opt => (
                <button 
                  key={opt}
                  onClick={() => { setRange(opt as any); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${timeRange === opt ? 'bg-slate-50 text-[#115E3E]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full mt-2">
        <div className="flex-1 flex relative w-full min-h-[140px]">
          {/* Y-Axis Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yAxisTicks.map((tick, i) => (
              <div key={i} className="flex items-center w-full relative">
                <span className="text-[9px] font-medium text-slate-400 w-6 text-right pr-2 absolute -left-1 -translate-y-1/2">{tick}</span>
                <div className="flex-1 border-t border-dashed border-slate-100 ml-6"></div>
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="flex-1 flex items-end justify-between h-full relative ml-2 sm:ml-4 mr-2" style={{ zIndex: 10 }}>
            {data.map((d, i) => {
              const animatedHeight = d.count === 0 ? '15%' : `${Math.max(d.value, 15)}%`;
              
              // Cyclical green colors for populated bars, hatched for empty
              const solidColors = ['bg-[#1F6E4D]', 'bg-[#56C288]', 'bg-[#144b33]'];
              const barColor = d.count === 0 
                ? 'bg-[repeating-linear-gradient(45deg,#ffffff,#ffffff_3px,#cbd5e1_3px,#cbd5e1_4px)] opacity-50' 
                : solidColors[i % solidColors.length];
                
              return (
              <div key={i} className="flex flex-col items-center justify-end h-full w-full relative group/bar">
                {/* Bar */}
                <div className="relative flex justify-center items-end w-full h-full">
                  <motion.div
                    className={`w-[24px] sm:w-[32px] lg:w-[36px] rounded-full cursor-pointer relative ${barColor}`}
                    style={{ minHeight: '32px' }}
                    initial={{ height: "10px" }}
                    animate={{ height: animatedHeight }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                  >
                    {/* Tooltip dot */}
                    {d.isCurrent && d.count > 0 && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2 border-[#56C288] z-20"></div>
                    )}
                    
                    {/* Tooltip */}
                    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md transition-all duration-200 z-50 pointer-events-none shadow-sm whitespace-nowrap opacity-0 group-hover/bar:opacity-100 group-hover/bar:-translate-y-1`}>
                      {d.count} Inv
                    </div>
                  </motion.div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between w-full ml-2 sm:ml-4 pr-2 mt-4">
          {data.map((d, i) => (
            <div key={i} className="flex justify-center w-full text-center">
              <span className="text-[10px] font-medium text-slate-300 uppercase">{d.label.charAt(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([])
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (isConnected && address) {
      // Instant: show from cache
      const cached = InvoiceCache.loadCachedInvoices(address)
      if (cached.sent.length > 0 || cached.received.length > 0) {
        setSentInvoices(cached.sent.reverse())
        setReceivedInvoices(cached.received.reverse())
      } else {
        setLoading(true)
      }
      // Background sync
      InvoiceCache.syncInvoices(address).then(changed => {
        if (changed) {
          const fresh = InvoiceCache.loadCachedInvoices(address)
          setSentInvoices(fresh.sent.reverse())
          setReceivedInvoices(fresh.received.reverse())
        }
        setLoading(false)
      })
    }
  }, [isConnected, address])

  if (!isConnected) {
    return (
      <EmptyState
        icon={Clock}
        title="Connect Your Wallet"
        description="Connect your MetaMask wallet to access the Ghostly confidential invoice system."
      />
    )
  }

  const all = [...sentInvoices, ...receivedInvoices]
  const pendingCount = all.filter((i) => i.status <= 2).length
  const completedCount = all.filter((i) => i.status === 3).length

  const quickActions = [
    { label: 'Create Invoice', icon: PlusCircle, path: '/invoices/create' },
    { label: 'View Invoices', icon: FileText, path: '/invoices' },
    { label: 'Receipts', icon: ReceiptIcon, path: '/receipts' },
    { label: 'Audit Center', icon: ShieldCheck, path: '/audit' },
  ]

  return (
    <div className="space-y-4 animate-in fade-in duration-700">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
           <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
           <p className="text-[12px] text-slate-500 mt-0.5">Create, send, and manage your confidential invoices with ease.</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Main Dark Green Card */}
        <div className="rounded-2xl bg-[#1F6E4D] p-4 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => navigate('/invoices')}>
          <div className="flex items-center justify-between mb-2 relative z-10">
             <span className="text-[11px] font-medium text-white/90">Total Published</span>
             <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <ArrowUpRight className="w-3 h-3 text-[#1F6E4D]" />
             </div>
          </div>
          <h2 className="text-[32px] leading-none font-medium text-white mb-3 relative z-10 tracking-tight">
             {loading ? '...' : sentInvoices.length}
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-100/80 relative z-10">
             <span>↑</span> Increased from last month
          </div>
        </div>

        {/* Cards 2, 3, 4: White Cards */}
        {[
          { label: 'Completed Invoices', value: completedCount, trend: 'Increased from last month', up: true },
          { label: 'Pending Invoices', value: pendingCount, trend: 'Decreased from last month', up: false },
          { label: 'Received Invoices', value: receivedInvoices.length, tail: 'Awaiting Action' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 relative group cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices')}>
            <div className="flex items-center justify-between mb-2">
               <span className="text-[11px] font-medium text-slate-700">{card.label}</span>
               <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center">
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
               </div>
            </div>
            <h2 className="text-[32px] leading-none font-medium text-slate-900 mb-3 tracking-tight">
               {loading ? '...' : card.value}
            </h2>
            {card.trend && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                 <span>{card.up ? '↑' : '↓'}</span> {card.trend}
              </div>
            )}
            {card.tail && (
              <div className="text-[10px] font-medium text-slate-500">{card.tail}</div>
            )}
          </div>
        ))}
      </div>

      {/* Row 2: Analytics Chart + Project Progress (same height) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart invoices={all} />
        </div>
        <div className="lg:col-span-1">
          <InvoiceProgressGauge invoices={all} className="h-[260px]" />
        </div>
      </div>

      {/* Row 3: Active Invoices + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Active Invoices</h2>
            <button onClick={() => navigate('/invoices')} className="text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors">View all</button>
          </div>

          {all.length === 0 ? (
            <div className="py-4 text-center">
              <EmptyState icon={Send} title="No activity yet" description="Your confidential invoices will appear here." />
            </div>
          ) : (
            <div className="space-y-1">
              {all.slice(0, 4).map((inv) => (
                <div key={inv.id.toString()} className="p-3 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-slate-50 transition-colors group" onClick={() => navigate(`/invoices/${inv.id.toString()}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center">
                      {inv.issuer.toLowerCase() === address?.toLowerCase() ? (
                        <div className="w-full h-full rounded-full bg-[#1F6E4D]/10 flex items-center justify-center">
                          <Send className="w-4 h-4 text-[#1F6E4D]" />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center">
                          <Inbox className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Invoice #{inv.id.toString()}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {inv.issuer.toLowerCase() === address?.toLowerCase()
                          ? `To: ${inv.buyer.slice(0, 6)}...${inv.buyer.slice(-4)}`
                          : `From: ${inv.issuer.slice(0, 6)}...${inv.issuer.slice(-4)}`}
                        <span className="mx-2">•</span>
                        Due {inv.dueDate ? new Date(Number(inv.dueDate) * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      inv.status === 3 ? 'bg-emerald-500' : inv.status === 4 ? 'bg-slate-300' : 'bg-amber-400'
                    }`} />
                    <span className="text-[11px] font-semibold text-slate-600">{STATUS_LABELS[inv.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <h2 className="text-[14px] font-bold text-slate-900 tracking-tight mb-2">Quick Actions</h2>
          <div className="space-y-0.5">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center group-hover:bg-[#E5F2EC] transition-colors">
                    <action.icon className="w-4 h-4 text-slate-600 group-hover:text-[#115E3E] transition-colors" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{action.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-all group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
   )
}
