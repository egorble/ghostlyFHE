import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PiArrowUpRight as ArrowUpRight, PiDownloadSimple as Inbox, PiClock as Clock, PiCaretRight as ArrowRight, PiPaperPlaneRight as Send, PiMagicWand as PlusCircle, PiFingerprint as ShieldCheck, PiCheckCircle as CheckCircle, PiTrendUp as TrendUp, PiTrendDown as TrendDown } from 'react-icons/pi'
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
    <div className="bg-white rounded-[24px] border border-slate-100/60 p-5 lg:p-6 w-full h-[320px] flex flex-col relative z-10 shadow-sm">
      <div className="flex justify-between items-center mb-6 z-20 relative">
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

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-8">
      
      {/* 1. Hero Welcome Banner */}
      <div className="relative rounded-[32px] overflow-hidden bg-[#1F6E4D] bg-[url('/bg-hero.png')] bg-cover bg-center shadow-md border border-emerald-900/20">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 lg:p-10">
          <div>
            <h1 className="text-3xl lg:text-[40px] leading-tight font-extrabold tracking-tight text-white mb-2">Welcome back.</h1>
            <p className="text-emerald-50/90 font-medium text-sm max-w-md leading-relaxed">
              Your confidential invoice network is active and secure. You have <strong className="text-white">{pendingCount}</strong> pending invoices awaiting action.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button onClick={() => navigate('/invoices/create')} className="bg-white text-[#115E3E] px-5 py-3 rounded-2xl font-bold text-[13px] hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95">
              <PlusCircle className="w-4 h-4" /> Create Invoice
            </button>
            <button onClick={() => navigate('/audit')} className="bg-emerald-900/40 backdrop-blur-md text-white border border-emerald-400/20 px-5 py-3 rounded-2xl font-bold text-[13px] hover:bg-emerald-900/60 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95">
              <ShieldCheck className="w-4 h-4" /> Audit Center
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento Stats Grid (3 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Completed Invoices', value: completedCount, trend: 'Increased', up: true, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pending Invoices', value: pendingCount, trend: 'Decreased', up: false, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Received Invoices', value: receivedInvoices.length, tail: 'Awaiting Action', icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] bg-white p-5 lg:p-6 shadow-sm border border-slate-100/60 relative group cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices')}>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                   <card.icon className={`w-5 h-5 ${card.color}`} />
                 </div>
                 <span className="text-[14px] font-bold text-slate-700">{card.label}</span>
               </div>
               <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <h2 className="text-[40px] leading-none font-bold text-slate-900 mb-4 tracking-tight">
               {loading ? '...' : card.value}
            </h2>
            {card.trend && (
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                 {card.up ? <TrendUp className="w-4 h-4 text-emerald-500" /> : <TrendDown className="w-4 h-4 text-amber-500" />}
                 {card.trend} from last month
              </div>
            )}
            {card.tail && (
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 {card.tail}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. Lower Section: Activity & Invoices vs progress & security */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Col (Charts + List) */}
        <div className="xl:col-span-2 space-y-6">
          <ActivityChart invoices={all} />
          
          <div className="bg-white rounded-[24px] border border-slate-100/60 p-5 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Active Invoices</h2>
              <button onClick={() => navigate('/invoices')} className="text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {all.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 rounded-2xl">
                <EmptyState icon={Send} title="No activity yet" description="Your confidential invoices will appear here." />
              </div>
            ) : (
              <div className="space-y-2">
                {all.slice(0, 4).map((inv) => (
                  <div key={inv.id.toString()} className="relative p-4 flex items-center justify-between cursor-pointer rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/80 transition-all group overflow-hidden" onClick={() => navigate(`/invoices/${inv.id.toString()}`)}>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
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
                        <h4 className="text-[14px] font-bold text-slate-900 group-hover:text-[#115E3E] transition-colors">Invoice #{inv.id.toString()}</h4>
                        <p className="text-[12px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                          {inv.issuer.toLowerCase() === address?.toLowerCase()
                            ? <><span>To:</span> <span className="text-slate-700">{inv.buyer.slice(0, 6)}...{inv.buyer.slice(-4)}</span></>
                            : <><span>From:</span> <span className="text-slate-700">{inv.issuer.slice(0, 6)}...{inv.issuer.slice(-4)}</span></>}
                          <span className="text-slate-300">•</span>
                          <span>Due {inv.dueDate ? new Date(Number(inv.dueDate) * 1000).toLocaleDateString() : 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                        inv.status === 3 ? 'bg-emerald-50 text-emerald-700' : inv.status === 4 ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 3 ? 'bg-emerald-500' : inv.status === 4 ? 'bg-slate-400' : 'bg-amber-500'
                        }`} />
                         <span className="text-[11px] font-bold">{STATUS_LABELS[inv.status]}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#115E3E] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <InvoiceProgressGauge invoices={all} className="h-[320px] rounded-[24px] border-slate-100/60 shadow-sm" />
          
          {/* FHE Security Widget */}
          <div className="bg-slate-900 rounded-[24px] p-6 shadow-md border border-slate-800 text-white relative overflow-hidden">
             {/* decorative glowing edge */}
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
             
             <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                   <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Secured</span>
                </div>
             </div>
             
             <h3 className="text-[16px] font-bold text-white mb-2">End-to-End Encryption</h3>
             <p className="text-[12px] text-slate-400 font-medium leading-relaxed mb-6">
               All invoice amounts and sensitive financial metadata are fully encrypted on-chain using Fhenix FHE. Only explicitly authorized parties can decrypt the data.
             </p>
             
             <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Network Layer</span>
                   <span className="text-[12px] text-slate-200 font-bold">Fhenix L2</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                   <ShieldCheck className="w-4 h-4 text-slate-400" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
