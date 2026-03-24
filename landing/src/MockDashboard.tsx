import { motion } from 'framer-motion'
import { PiArrowUpRight as ArrowUpRight, PiDownloadSimple as Inbox, PiClock as Clock, PiCaretRight as ArrowRight, PiPaperPlaneRight as Send, PiFingerprint as ShieldCheck, PiCheckCircle as CheckCircle, PiTrendUp as TrendUp, PiMagicWand as PlusCircle, PiTrendDown as TrendDown } from 'react-icons/pi'
import InvoiceProgressGauge from './InvoiceProgressGauge'

const DummyActivityChart = () => {
  const data = [
    { label: 'Mon', value: 20, count: 2 },
    { label: 'Tue', value: 35, count: 4 },
    { label: 'Wed', value: 60, count: 7 },
    { label: 'Thu', value: 45, count: 5 },
    { label: 'Fri', value: 85, count: 12, isCurrent: true },
    { label: 'Sat', value: 30, count: 3 },
    { label: 'Sun', value: 15, count: 1 }
  ]

  const yAxisTicks = [15, 12, 9, 6, 3, 0]

  return (
    <div className="bg-white rounded-[24px] border border-slate-100/60 p-5 lg:p-6 w-full h-[320px] flex flex-col relative z-10 shadow-sm">
      <div className="flex justify-between items-center mb-6 z-20 relative">
        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Invoice Analytics</h3>
        <button className="text-[10px] sm:text-xs bg-white text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
          Week <span>▼</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col relative z-10 w-full mt-2">
        <div className="flex-1 flex relative w-full min-h-[140px]">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yAxisTicks.map((tick, i) => (
              <div key={i} className="flex items-center w-full relative">
                <span className="text-[9px] font-medium text-slate-400 w-6 text-right pr-2 absolute -left-1 -translate-y-1/2">{tick}</span>
                <div className="flex-1 border-t border-dashed border-slate-100 ml-6"></div>
              </div>
            ))}
          </div>

          <div className="flex-1 flex items-end justify-between h-full relative ml-2 sm:ml-4 mr-2" style={{ zIndex: 10 }}>
            {data.map((d, i) => {
              const solidColors = ['bg-[#1F6E4D]', 'bg-[#56C288]', 'bg-[#144b33]']
              const barColor = solidColors[i % solidColors.length]
              return (
                <div key={i} className="flex flex-col items-center justify-end h-full w-full relative group/bar">
                  <div className="relative flex justify-center items-end w-full h-full">
                    <motion.div
                      className={`w-[24px] sm:w-[32px] lg:w-[36px] rounded-full cursor-pointer relative ${barColor}`}
                      style={{ minHeight: '32px' }}
                      initial={{ height: "10px" }}
                      animate={{ height: `${d.value}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                    >
                      {d.isCurrent && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2 border-[#56C288] z-20"></div>
                      )}
                    </motion.div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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

export function MockDashboard() {
  const dummyInvoices = [
    { id: 1, type: 'sent', party: '0x4F9...A3E2', status: 3, due: '2026-03-28' },
    { id: 2, type: 'received', party: '0x88A...1Cb8', status: 2, due: '2026-03-25' },
    { id: 3, type: 'sent', party: '0x1C2...9bC4', status: 4, due: '2026-03-24' },
    { id: 4, type: 'received', party: '0xE9B...4d90', status: 3, due: '2026-03-22' },
  ]
  const pendingCount = 8;
  const completedCount = 42;
  const receivedCount = 15;

  const fakeGaugeInvoices = Array(completedCount).fill({ status: 3 }).concat(Array(pendingCount).fill({ status: 2 })).concat(Array(2).fill({ status: 4 })) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 w-full max-w-6xl mx-auto pointer-events-none select-none">
      {/* 1. Hero Welcome Banner */}
      <div className="relative rounded-[32px] overflow-hidden bg-[#1F6E4D] bg-[url('/bg-hero.png')] bg-cover bg-center shadow-md border border-emerald-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 lg:p-10">
          <div>
            <h1 className="text-3xl lg:text-[40px] leading-tight font-extrabold tracking-tight text-white mb-2">Welcome back.</h1>
            <p className="text-emerald-50/90 font-medium text-sm max-w-md leading-relaxed">
              Your confidential invoice network is active and secure. You have <strong className="text-white">{pendingCount}</strong> pending invoices awaiting action.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button className="bg-white text-[#115E3E] px-5 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm">
              <PlusCircle className="w-4 h-4" /> Create Invoice
            </button>
            <button className="bg-emerald-900/40 backdrop-blur-md text-white border border-emerald-400/20 px-5 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Audit Center
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Completed Invoices', value: completedCount, trend: 'Increased', up: true, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pending Invoices', value: pendingCount, trend: 'Decreased', up: false, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Received Invoices', value: receivedCount, tail: 'Awaiting Action', icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] bg-white p-5 lg:p-6 shadow-sm border border-slate-100/60 relative">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                   <card.icon className={`w-5 h-5 ${card.color}`} />
                 </div>
                 <span className="text-[14px] font-bold text-slate-700">{card.label}</span>
               </div>
               <ArrowUpRight className="w-4 h-4 text-slate-300" />
            </div>
            <h2 className="text-[40px] leading-none font-bold text-slate-900 mb-4 tracking-tight">
               {card.value}
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

      {/* 3. Lower Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <DummyActivityChart />
          
          <div className="bg-white rounded-[24px] border border-slate-100/60 p-5 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Active Invoices</h2>
              <button className="text-[13px] font-bold text-slate-500 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {dummyInvoices.map((inv) => (
                <div key={inv.id} className="relative p-4 flex items-center justify-between rounded-2xl border border-transparent">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                      {inv.type === 'sent' ? (
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
                      <h4 className="text-[14px] font-bold text-slate-900">Invoice #{inv.id}</h4>
                      <p className="text-[12px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                        {inv.type === 'sent' ? 
                          <><span>To:</span> <span className="text-slate-700">{inv.party}</span></> : 
                          <><span>From:</span> <span className="text-slate-700">{inv.party}</span></>}
                        <span className="text-slate-300">•</span>
                        <span>Due {inv.due}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                        inv.status === 3 ? 'bg-emerald-50 text-emerald-700' : 
                        inv.status === 4 ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 3 ? 'bg-emerald-500' : 
                          inv.status === 4 ? 'bg-slate-400' : 'bg-amber-500'
                        }`} />
                       <span className="text-[11px] font-bold">
                         {inv.status === 3 ? 'Paid' : inv.status === 2 ? 'Pending' : 'Cancelled'}
                       </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <InvoiceProgressGauge invoices={fakeGaugeInvoices} className="h-[320px] rounded-[24px] border-slate-100/60 shadow-sm" />
          
          <div className="bg-slate-900 rounded-[24px] p-6 shadow-md border border-slate-800 text-white relative overflow-hidden">
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
