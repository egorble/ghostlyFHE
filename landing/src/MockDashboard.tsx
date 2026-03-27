import { useEffect, useState, useRef } from 'react'
import { motion, animate, useInView } from 'framer-motion'
import { PiArrowUpRight as ArrowUpRight, PiDownloadSimple as Inbox, PiClock as Clock, PiCaretRight as ArrowRight, PiPaperPlaneRight as Send, PiFingerprint as ShieldCheck, PiCheckCircle as CheckCircle, PiTrendUp as TrendUp, PiTrendDown as TrendDown } from 'react-icons/pi'
import InvoiceProgressGauge from './InvoiceProgressGauge'

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (v) => setDisplayValue(Math.round(v))
      })
      return () => controls.stop()
    }
  }, [value, isInView])

  return <span ref={ref}>{prefix}{displayValue.toLocaleString()}{suffix}</span>
}

const DummyActivityChart = () => {
  const data = [
    { label: 'S', value: 45, type: 'lightHatch' },
    { label: 'M', value: 65, type: 'solidMidGreen', color: 'bg-[#2E794C]' },
    { label: 'T', value: 50, type: 'solidLightGreen', color: 'bg-[#58C28A]', tooltip: '72%' },
    { label: 'W', value: 85, type: 'solidDarkGreen', color: 'bg-[#144A32]' },
    { label: 'T', value: 56, type: 'lightHatch' },
    { label: 'F', value: 40, type: 'lightHatch' },
    { label: 'S', value: 50, type: 'lightHatch' }
  ]

  return (
    <div className="bg-white rounded-[24px] p-5 lg:p-6 w-full h-[320px] flex flex-col relative shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100/60 z-10">
      <div className="w-full flex justify-start mb-6 lg:mb-8">
        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Project Analytics</h3>
      </div>

      <div className="flex-1 flex flex-col w-full px-2 lg:px-6">
        <div className="flex-1 flex items-end justify-between h-full relative" style={{ zIndex: 10 }}>
          {data.map((d, i) => {
            const isHatched = d.type === 'lightHatch'
            const hatchColor = "cbd5e1" // Slate-300
            const bgClass = isHatched ? 'bg-white' : `${d.color}`
            const style = isHatched 
              ? { 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-1 7L7 -1ZM7 5L5 7ZM-1 1L1 -1Z' stroke='%23${hatchColor}' stroke-width='0.8'/%3E%3C/svg%3E")`,
                  border: `1.5px solid #${hatchColor}`
                } 
              : {}
            
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full w-[12%] relative group/bar">
                <div className="relative flex justify-center items-end w-full h-full">
                  <motion.div
                    className={`w-full max-w-[48px] rounded-full cursor-pointer relative shadow-sm ${bgClass}`}
                    style={{ ...style, minHeight: '36px' }}
                    initial={{ height: "10px", opacity: 0 }}
                    whileInView={{ height: `${d.value}%`, opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 1.2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {d.tooltip && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: i * 0.1 + 0.5, duration: 0.5 }}
                        className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
                      >
                        <div className="bg-white border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.06)] rounded-full px-2 py-0.5 relative z-10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-400 tracking-tight">{d.tooltip}</span>
                        </div>
                        <div className="w-[1.5px] h-2 bg-slate-200 -mt-[1px] pointer-events-none"></div>
                        <div className="absolute bottom-0 translate-y-[60%] w-1.5 h-1.5 bg-white border border-slate-300 rounded-full pointer-events-none z-10"></div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
                
                <div className="mt-4 flex justify-center w-full">
                  <span className="text-[12px] font-bold text-slate-300 uppercase">{d.label}</span>
                </div>
              </div>
            )
          })}
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

  const fakeGaugeInvoices = Array(completedCount).fill({ status: 3 }).concat(Array(pendingCount).fill({ status: 0 })).concat(Array(5).fill({ status: 1 })) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 w-full max-w-6xl mx-auto pointer-events-none select-none">
      {/* 2. Bento Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Completed Invoices', value: completedCount, trend: 'Increased', up: true, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pending Invoices', value: pendingCount, trend: 'Decreased', up: false, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Received Invoices', value: receivedCount, tail: 'Awaiting Action', icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((card) => (
          <div 
            key={card.label} 
            className="rounded-[24px] bg-white p-5 lg:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100/60 relative"
          >
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
               <AnimatedNumber value={card.value} />
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
          
          <div className="bg-white rounded-[24px] border border-slate-100/60 p-5 lg:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Active Invoices</h2>
              <button className="text-[13px] font-bold text-slate-500 flex items-center gap-1 hover:text-slate-800 transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {dummyInvoices.map((inv) => (
                <div key={inv.id} className="relative p-4 flex items-center justify-between rounded-2xl border border-transparent hover:bg-slate-50 transition-colors">
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
          <div>
             <InvoiceProgressGauge invoices={fakeGaugeInvoices} className="h-[320px] rounded-[24px] border border-slate-100/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)]" />
          </div>
          
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
