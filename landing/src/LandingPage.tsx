import { useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { MockDashboard } from './MockDashboard'
import { PiGhost as Shield, PiFingerprint as Fingerprint, PiLockKey as Lock, PiCards as FileText, PiShareNetwork as Share2, PiChartPieSlice as PieChart } from 'react-icons/pi'
import OwlIcon from './OwlIcon'

export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const { scrollY } = useScroll()

  // Icon 1: Shield (Top Left)
  const icon1Y = useTransform(scrollY, [0, 600], [0, 800])
  const icon1X = useTransform(scrollY, [0, 600], [0, 350])
  const icon1Rotate = useTransform(scrollY, [0, 600], [-10, 45])

  // Icon 2: Lock (Middle Left)
  const icon2Y = useTransform(scrollY, [0, 600], [0, 600])
  const icon2X = useTransform(scrollY, [0, 600], [0, 450])
  const icon2Rotate = useTransform(scrollY, [0, 600], [15, -45])

  // Icon 3: Fingerprint (Top Right)
  const icon3Y = useTransform(scrollY, [0, 600], [0, 800])
  const icon3X = useTransform(scrollY, [0, 600], [0, -350])
  const icon3Rotate = useTransform(scrollY, [0, 600], [10, -60])

  // Icon 4: File (Middle Right)
  const icon4Y = useTransform(scrollY, [0, 600], [0, 600])
  const icon4X = useTransform(scrollY, [0, 600], [0, -450])
  const icon4Rotate = useTransform(scrollY, [0, 600], [-15, 45])

  return (
    <div className="min-h-screen bg-[#FDFDFE] selection:bg-[#56C288]/20 selection:text-[#115E3E] overflow-hidden font-sans relative">
      
      {/* 1. Global Background — covers entire page height */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#FAFBFE]">
        {/* Soft Glowing Blobs scattered across full height */}
        <div className="absolute top-[10%] left-[30%] w-[50vw] max-w-[700px] h-[500px] bg-[#56C288]/[0.06] rounded-full blur-[140px]"></div>
        <div className="absolute top-[20%] right-[20%] w-[40vw] max-w-[600px] h-[400px] bg-[#4F93D7]/[0.05] rounded-full blur-[120px]"></div>
        <div className="absolute top-[55%] left-[20%] w-[45vw] max-w-[650px] h-[450px] bg-[#8B5CF6]/[0.04] rounded-full blur-[150px]"></div>
        <div className="absolute top-[75%] right-[25%] w-[40vw] max-w-[550px] h-[400px] bg-[#56C288]/[0.04] rounded-full blur-[130px]"></div>

        {/* Full-height vertical thin lines via CSS */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to bottom, transparent 0%, rgba(148,163,184,0.25) 10%, rgba(148,163,184,0.25) 90%, transparent 100%)
          `,
          WebkitMaskImage: `
            linear-gradient(to right,
              transparent 0%, transparent calc(50% - 400px - 0.5px), rgba(0,0,0,0.4) calc(50% - 400px), transparent calc(50% - 400px + 0.5px),
              transparent calc(50% - 0.5px), rgba(0,0,0,0.6) 50%, transparent calc(50% + 0.5px),
              transparent calc(50% + 400px - 0.5px), rgba(0,0,0,0.4) calc(50% + 400px), transparent calc(50% + 400px + 0.5px),
              transparent 100%
            )
          `,
          maskImage: `
            linear-gradient(to right,
              transparent 0%, transparent calc(50% - 400px - 0.5px), rgba(0,0,0,0.4) calc(50% - 400px), transparent calc(50% - 400px + 0.5px),
              transparent calc(50% - 0.5px), rgba(0,0,0,0.6) 50%, transparent calc(50% + 0.5px),
              transparent calc(50% + 400px - 0.5px), rgba(0,0,0,0.4) calc(50% + 400px), transparent calc(50% + 400px + 0.5px),
              transparent 100%
            )
          `
        }}></div>

        {/* Full-height horizontal lines via CSS */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, transparent 0%, rgba(148,163,184,0.2) 15%, rgba(148,163,184,0.3) 50%, rgba(148,163,184,0.2) 85%, transparent 100%)
          `,
          WebkitMaskImage: `
            repeating-linear-gradient(to bottom,
              transparent 0px, transparent 219px, rgba(0,0,0,0.5) 220px, transparent 221px
            )
          `,
          maskImage: `
            repeating-linear-gradient(to bottom,
              transparent 0px, transparent 219px, rgba(0,0,0,0.5) 220px, transparent 221px
            )
          `
        }}></div>

        {/* Repeating star/cross markers via SVG pattern — tiles infinitely */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="starGrid" width="400" height="220" patternUnits="userSpaceOnUse">
              {/* Center cross */}
              <line x1="196" y1="110" x2="204" y2="110" stroke="#94a3b8" strokeWidth="0.7" opacity="0.4"/>
              <line x1="200" y1="106" x2="200" y2="114" stroke="#94a3b8" strokeWidth="0.7" opacity="0.4"/>
              
              {/* Top-left star (at 0,0) */}
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#94a3b8" strokeWidth="0.6" opacity="0.3"/>
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#94a3b8" strokeWidth="0.6" opacity="0.3"/>
              <line x1="-3" y1="-3" x2="3" y2="3" stroke="#94a3b8" strokeWidth="0.4" opacity="0.25"/>
              <line x1="3" y1="-3" x2="-3" y2="3" stroke="#94a3b8" strokeWidth="0.4" opacity="0.25"/>

              {/* Bottom-right star (at 400,220 = wraps to 0,0 of next tile) */}
              <line x1="396" y1="220" x2="404" y2="220" stroke="#94a3b8" strokeWidth="0.6" opacity="0.3"/>
              <line x1="400" y1="216" x2="400" y2="224" stroke="#94a3b8" strokeWidth="0.6" opacity="0.3"/>
              <line x1="397" y1="217" x2="403" y2="223" stroke="#94a3b8" strokeWidth="0.4" opacity="0.25"/>
              <line x1="403" y1="217" x2="397" y2="223" stroke="#94a3b8" strokeWidth="0.4" opacity="0.25"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#starGrid)" />
        </svg>

        {/* Curved orbit paths in hero area only */}
        <svg className="absolute left-1/2 -translate-x-1/2 top-0 w-[1600px] h-[1000px]" viewBox="0 0 1600 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 800 700 Q 500 650 280 320" stroke="#cbd5e1" strokeWidth="0.7" fill="none" strokeDasharray="6 8" opacity="0.35"/>
          <path d="M 800 700 Q 1100 650 1320 320" stroke="#cbd5e1" strokeWidth="0.7" fill="none" strokeDasharray="6 8" opacity="0.35"/>
        </svg>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
             <div className="w-8 h-8 shrink-0 rounded-[10px] bg-emerald-50 flex items-center justify-center text-[#115E3E]">
               <OwlIcon className="w-5 h-5 transition-all duration-300" />
             </div>
             <span className="text-xl font-bold text-slate-900 tracking-tight">Ghostly</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="https://app.ghostlyfhe.xyz" className="text-[14px] font-medium text-slate-800 hover:text-[#56C288] transition-colors">Start</a>
            <a href="https://app.ghostlyfhe.xyz" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Encryption Methods</a>
            <a href="https://app.ghostlyfhe.xyz" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Integrations</a>
            <a href="https://app.ghostlyfhe.xyz" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Auditors</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="https://app.ghostlyfhe.xyz" className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-full text-[14px] font-medium shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
              Launch App
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-20 lg:pt-44 lg:pb-32 px-6">
         
         {/* Center glowing mesh */}
         <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#56C288]/15 via-blue-400/5 to-transparent rounded-full blur-[100px] pointer-events-none -z-10"></div>
         <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[#1F6E4D]/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>

         {/* Decorative Node SVG Lines matching Fynex style */}
         <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none -z-10 flex justify-center">
            <svg className="w-[1400px] h-[800px] opacity-[0.2]" viewBox="0 0 1400 800" fill="none">
              <path d="M 700 800 Q 400 500 250 220" stroke="url(#arcGrad1)" strokeWidth="1.5" />
              <path d="M 700 800 Q 200 600 150 450" stroke="url(#arcGrad1)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M 700 800 Q 1000 500 1150 220" stroke="url(#arcGrad2)" strokeWidth="1.5" />
              <path d="M 700 800 Q 1200 600 1250 450" stroke="url(#arcGrad2)" strokeWidth="1.5" strokeDasharray="4 4" />
              <defs>
                <linearGradient id="arcGrad1" x1="700" y1="800" x2="250" y2="220" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1F6E4D" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#56C288" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="arcGrad2" x1="700" y1="800" x2="1150" y2="220" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1F6E4D" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#56C288" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
         </div>

         <div className="max-w-4xl mx-auto text-center relative z-10 mt-8">
            {/* Pill Badge */}
            <motion.div 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
               className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/50 shadow-sm mb-8"
            >
               <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                 <Shield className="w-3 h-3 text-slate-700" />
               </div>
               <span className="text-[13px] font-semibold text-slate-700">Fhenix FHE Powered</span>
            </motion.div>

            {/* Slogan */}
            <motion.h1 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
               className="text-[44px] sm:text-[56px] lg:text-[68px] font-medium text-slate-900 tracking-tight leading-[1.1] mb-6"
            >
              Data leaks for companies <br className="hidden sm:block" />
              who give a damn.
            </motion.h1>

            <motion.p 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
               className="text-[17px] text-slate-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              The first fully homomorphic encrypted invoice and payment platform. Keep your amounts, parties, and assets completely hidden on-chain.
            </motion.p>

            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
               className="relative inline-block mt-2"
            >
               {/* Glowing aura behind button */}
               <div className="absolute inset-0 bg-gradient-to-r from-[#1F6E4D] to-blue-500 rounded-full blur-xl opacity-40"></div>
               <a href="https://app.ghostlyfhe.xyz" className="relative inline-block bg-[#0f172a] text-white px-8 py-3.5 rounded-full text-[15px] font-medium shadow-md transition-transform hover:scale-105">
                 Launch App
               </a>
            </motion.div>

            {/* Floating Nodes */}
            <motion.div 
              className="absolute top-0 -left-12 lg:-left-24 z-0 pointer-events-none"
              style={{ y: icon1Y, x: icon1X, rotate: icon1Rotate }}
            >
               <motion.div 
                 animate={{ y: [0, -15, 0] }}
                 transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                 className="w-[88px] h-[88px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center backdrop-blur-md"
               >
                 <Shield className="w-10 h-10 text-[#56C288]" />
               </motion.div>
            </motion.div>
            
            <motion.div 
              className="absolute top-48 -left-20 lg:-left-32 z-0 pointer-events-none"
              style={{ y: icon2Y, x: icon2X, rotate: icon2Rotate }}
            >
               <motion.div 
                 animate={{ y: [0, 15, 0] }}
                 transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                 className="w-20 h-20 bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center backdrop-blur-md"
               >
                 <Lock className="w-8 h-8 text-blue-400" />
               </motion.div>
            </motion.div>

            <motion.div 
              className="absolute -top-6 -right-8 lg:-right-20 z-0 pointer-events-none"
              style={{ y: icon3Y, x: icon3X, rotate: icon3Rotate }}
            >
               <motion.div 
                 animate={{ y: [0, -12, 0] }}
                 transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 0.5 }}
                 className="w-[88px] h-[88px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center backdrop-blur-md"
               >
                 <Fingerprint className="w-10 h-10 text-emerald-600" />
               </motion.div>
            </motion.div>

            <motion.div 
              className="absolute top-40 -right-24 lg:-right-36 z-0 pointer-events-none"
              style={{ y: icon4Y, x: icon4X, rotate: icon4Rotate }}
            >
               <motion.div 
                 animate={{ y: [0, 15, 0] }}
                 transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut", delay: 1.5 }}
                 className="w-20 h-20 bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center backdrop-blur-md"
               >
                 <FileText className="w-8 h-8 text-indigo-400" />
               </motion.div>
            </motion.div>
         </div>
      </section>

      {/* Interactive Mock Dashboard Section */}
      <section className="relative z-20 px-4 sm:px-6 pb-32">
         <div className="max-w-[1280px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-white/60 backdrop-blur-xl rounded-[40px] p-2 sm:p-4 lg:p-6 shadow-[0_-20px_100px_rgba(0,0,0,0.03)] border border-slate-200/60"
            >
               {/* Browser Window Chrome */}
               <div className="w-full bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-200">
                  <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                     <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                     </div>
                     <div className="mx-auto bg-white border border-slate-200 rounded-md px-32 py-1 flex items-center gap-2 shadow-sm">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-medium text-slate-500">app.ghostly.network</span>
                     </div>
                     <div className="w-12"></div>
                  </div>
                  
                  <div className="bg-[#fcfdfd] p-4 sm:p-6 lg:p-8 relative">
                     {/* Dashboard Content */}
                     <MockDashboard />
                     
                     {/* Floating interaction hints or overlay layer if needed */}
                     <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#fcfdfd] to-transparent pointer-events-none"></div>
                  </div>
               </div>
            </motion.div>
         </div>
      </section>


      {/* Intro Text Section */}
      <section className="relative z-20 pt-32 pb-20 px-6 max-w-4xl mx-auto text-center">
         <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
         >
            <h2 className="text-3xl md:text-[40px] font-medium text-slate-900 leading-[1.3] tracking-tight">
               Ghostly brings <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1F6E4D] to-[#56C288] font-semibold">Fully Homomorphic Encryption</span> to Web3 invoicing, empowering organizations to transact on-chain while keeping transaction data, amounts, and parties strictly confidential.
            </h2>
         </motion.div>
      </section>

      {/* Feature List + Image Section */}
      <section className="relative z-20 py-20 px-6 max-w-7xl mx-auto">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
               <h3 className="text-4xl font-medium text-slate-900 tracking-tight leading-[1.1] mb-12">
                  Confidential business operations.<br/> Entirely on-chain.
               </h3>
               
               <div className="space-y-6 max-w-md">
                  {/* Feature Item 0 */}
                  <div onClick={() => setActiveFeature(0)} className={`border-l-[3px] pl-6 py-2 cursor-pointer transition-all ${activeFeature === 0 ? 'border-[#56C288] opacity-100' : 'border-transparent opacity-40 hover:opacity-80 hover:border-slate-300'}`}>
                     <h4 className="text-lg font-semibold text-slate-900 mb-2">Confidential Invoicing</h4>
                     {activeFeature === 0 && <p className="text-slate-500 leading-relaxed text-[15px] animate-in fade-in slide-in-from-top-2 duration-300">Fully encrypted invoicing protocols. Issue, track, and pay invoices without exposing details to public block explorers.</p>}
                  </div>
                  {/* Feature Item 1 */}
                  <div onClick={() => setActiveFeature(1)} className={`border-l-[3px] pl-6 py-2 cursor-pointer transition-all ${activeFeature === 1 ? 'border-[#56C288] opacity-100' : 'border-transparent opacity-40 hover:opacity-80 hover:border-slate-300'}`}>
                     <h4 className="text-lg font-semibold text-slate-900 mb-2">Encrypted Payments & Escrow</h4>
                     {activeFeature === 1 && <p className="text-slate-500 leading-relaxed text-[15px] animate-in fade-in slide-in-from-top-2 duration-300">Secure funds in encrypted escrow vaults. Release milestones and finalize payments without revealing amounts.</p>}
                  </div>
                  {/* Feature Item 2 */}
                  <div onClick={() => setActiveFeature(2)} className={`border-l-[3px] pl-6 py-2 cursor-pointer transition-all ${activeFeature === 2 ? 'border-[#56C288] opacity-100' : 'border-transparent opacity-40 hover:opacity-80 hover:border-slate-300'}`}>
                     <h4 className="text-lg font-semibold text-slate-900 mb-2">Encrypted Payment Splitters</h4>
                     {activeFeature === 2 && <p className="text-slate-500 leading-relaxed text-[15px] animate-in fade-in slide-in-from-top-2 duration-300">Automatically distribute incoming assets to multiple stakeholders using trustless math operations.</p>}
                  </div>
                  {/* Feature Item 3 */}
                  <div onClick={() => setActiveFeature(3)} className={`border-l-[3px] pl-6 py-2 cursor-pointer transition-all ${activeFeature === 3 ? 'border-[#56C288] opacity-100' : 'border-transparent opacity-40 hover:opacity-80 hover:border-slate-300'}`}>
                     <h4 className="text-lg font-semibold text-slate-900 mb-2">Zero-Knowledge Analytics</h4>
                     {activeFeature === 3 && <p className="text-slate-500 leading-relaxed text-[15px] animate-in fade-in slide-in-from-top-2 duration-300">Export comprehensive business intelligence insights without compromising underlying transaction data.</p>}
                  </div>
               </div>
            </div>
            
            <div className="bg-[#f8fafc] rounded-[32px] border border-slate-200/60 p-8 shadow-[inset_0_0_80px_rgba(0,0,0,0.02)] h-[540px] flex flex-col justify-center items-center relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-100 to-transparent z-10"></div>
               <AnimatePresence mode="wait">
                  <motion.div 
                     key={activeFeature}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     transition={{ duration: 0.3 }}
                     className="w-full max-w-[360px] h-full bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6 z-0 flex flex-col gap-4 relative -bottom-10"
                  >
                     <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#56C288] flex items-center justify-center shrink-0">
                              {activeFeature === 0 && <FileText className="w-5 h-5"/>}
                              {activeFeature === 1 && <Lock className="w-5 h-5"/>}
                              {activeFeature === 2 && <Share2 className="w-5 h-5"/>}
                              {activeFeature === 3 && <PieChart className="w-5 h-5"/>}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">
                                 {activeFeature === 0 && "Invoices"}
                                 {activeFeature === 1 && "Escrow"}
                                 {activeFeature === 2 && "Splitters"}
                                 {activeFeature === 3 && "Analytics"}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                 {activeFeature === 0 && "Total volume securely handled"}
                                 {activeFeature === 1 && "Locked funds on-chain"}
                                 {activeFeature === 2 && "Automated distributions"}
                                 {activeFeature === 3 && "Zero-knowledge proofs"}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-3 mt-2 flex-1 overflow-hidden">
                        {[1,2,3,4,5].map(i => (
                           <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                              <div className="flex gap-3 items-center">
                                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4 text-slate-500" />
                                 </div>
                                 <div className="flex flex-col gap-1.5">
                                    <div className="w-20 h-2.5 bg-slate-200 rounded-full"></div>
                                    <div className="w-12 h-2 bg-slate-100 rounded-full"></div>
                                 </div>
                              </div>
                              <div className="flex flex-col gap-1.5 items-end">
                                 <div className="w-14 h-3 bg-slate-200 rounded-full"></div>
                                 <div className="w-10 h-2 bg-[#56C288]/30 rounded-full"></div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>
      </section>

      {/* Bento Grid Section */}
      <section className="relative z-20 py-24 px-6 bg-[#0f172a] text-white rounded-[48px] max-w-[1400px] mx-auto overflow-hidden mt-10">
         {/* Background elements for the dark section */}
         <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-[#56C288]/15 rounded-full blur-[120px] pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-[800px] h-[400px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none"></div>
         
         <div className="max-w-6xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-16 text-center leading-[1.2]">
               Confidential Invoicing at <br /> the speed of Web3
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Bento 1: Large Green Card */}
               <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-[32px] p-10 flex items-start overflow-hidden relative group h-[380px]">
                  <div className="z-10 max-w-[280px]">
                     <h3 className="text-2xl font-semibold mb-3">Encrypted Escrow & Splitters</h3>
                     <p className="text-slate-400 text-[15px] leading-relaxed">Provide secure, trustless payment guarantees. Ghostly's Confidential Splitters automatically route funds to multiple stakeholders while keeping amounts private.</p>
                  </div>
                  {/* 3D Card abstract */}
                  <div className="absolute -bottom-10 -right-10 w-[420px] h-[280px] rounded-3xl bg-gradient-to-br from-[#56C288] to-[#1F6E4D] shadow-[0_20px_50px_rgba(31,110,77,0.4)] rotate-[-12deg] group-hover:rotate-[-8deg] transition-all duration-700 border border-white/20 p-8 flex flex-col justify-between hidden sm:flex">
                     <div className="flex justify-between items-start">
                        <span className="text-white font-bold text-xl tracking-wide opacity-90">Ghostly</span>
                        <Shield className="w-8 h-8 text-white/50" />
                     </div>
                     <div className="w-full">
                        <div className="font-mono text-[16px] sm:text-[18px] tracking-wider text-white/95 mb-4 drop-shadow-md break-all">0x71C7...f6d8976F</div>
                        <div className="flex justify-between items-center opacity-80 font-mono text-xs uppercase tracking-wider w-full">
                           <div>
                              <div className="text-[9px] opacity-70 mb-0.5">Network</div>
                              <div>Fhenix L2</div>
                           </div>
                           <div className="text-right">
                              <div className="text-[9px] opacity-70 mb-0.5">Status</div>
                              <div className="text-[#a7f3d0]">Encrypted</div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="absolute top-20 right-20 w-[300px] h-[200px] rounded-3xl bg-gradient-to-br from-[#4ade80] to-[#10b981] shadow-xl rotate-[10deg] group-hover:rotate-[15deg] transition-all duration-700 border border-white/20 opacity-40 blur-[2px] -z-10"></div>
               </div>

               {/* Bento 2: Invoice Sim */}
               <div className="bg-slate-800/40 border border-slate-700/50 rounded-[32px] p-8 flex flex-col relative overflow-hidden h-[380px] group">
                  <div className="z-10 bg-[#0f172a]/20 p-1 mb-8">
                     <h3 className="text-xl font-semibold mb-2">FHE Encrypted Invoices</h3>
                     <p className="text-slate-400 text-[14px]">Amounts and participants are encrypted on-chain using TFHE. Nothing is ever exposed in plaintext.</p>
                  </div>
                  <div className="w-full h-[220px] absolute -bottom-4 left-6 bg-slate-50 text-slate-900 rounded-t-xl p-5 shadow-2xl border border-slate-200 transform rotate-6 group-hover:rotate-3 transition-transform duration-500">
                     <div className="font-bold text-lg mb-4 flex justify-between items-center">
                        <span className="tracking-tight">INVOICE #1234</span>
                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                     </div>
                     <div className="space-y-3">
                        <div className="h-2.5 w-full bg-slate-200 rounded-full"></div>
                        <div className="h-2.5 w-3/4 bg-slate-200 rounded-full"></div>
                     </div>
                     <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-4">
                        <div className="h-3 w-16 bg-slate-300 rounded-full"></div>
                        <div className="px-3 py-1 bg-[#56C288]/10 text-[#115E3E] font-bold text-[10px] rounded uppercase tracking-wider">Paid In Full</div>
                     </div>
                  </div>
               </div>

               {/* Bento 3: Data Tracking */}
               <div className="bg-slate-800/40 border border-slate-700/50 rounded-[32px] p-8 h-[360px] flex flex-col group">
                  <h3 className="text-xl font-semibold mb-2">Confidential Receipts</h3>
                  <p className="text-slate-400 text-[14px] leading-relaxed mb-8">Automatically issue encrypted receipts upon payment verification, maintaining zero-knowledge proofs of settlement.</p>
                  
                  <div className="flex-1 w-full bg-slate-900/80 rounded-2xl border border-slate-700 p-4 relative overflow-hidden flex flex-col gap-3">
                     <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 border-b border-slate-700 pb-2">
                        <span>Date</span>
                        <span>Amount</span>
                     </div>
                     {[1,2,3].map((i) => (
                        <div key={i} className="flex justify-between items-center group-hover:bg-slate-800/50 p-1.5 -mx-1.5 rounded transition-colors duration-300">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                 <div className="w-2 h-2 rounded-full bg-[#56C288]"></div>
                              </div>
                              <div className="h-2 w-16 bg-slate-600 rounded-full"></div>
                           </div>
                           <div className="h-2.5 w-12 bg-slate-400 rounded-full"></div>
                        </div>
                     ))}
                     <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                  </div>
               </div>

               {/* Bento 4: Accounting Wide */}
               <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-[32px] p-10 h-[360px] flex items-center gap-6 lg:gap-12 group overflow-hidden">
                  <div className="flex-1">
                     <h3 className="text-xl font-semibold mb-3">Zero-Knowledge Analytics</h3>
                     <p className="text-slate-400 text-[15px] leading-relaxed">Collect encrypted statistics for business intelligence. Ghostly provides macro insights without ever revealing the sensitive data of individual invoices.</p>
                  </div>
                  <div className="w-[300px] lg:w-[360px] h-[280px] bg-slate-900 rounded-2xl border border-slate-700 hidden sm:flex flex-col p-6 relative gap-4 rotate-3 group-hover:rotate-0 transition-all duration-500 shadow-xl lg:translate-x-8">
                     {/* Table Mockup */}
                     <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-700 pb-2">
                        <span className="w-16">Date</span>
                        <span className="flex-1">To/From</span>
                        <span className="w-16 text-right">Amount</span>
                     </div>
                     {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex items-center text-xs border-b border-slate-800/50 pb-2">
                           <span className="w-16 text-slate-500 font-mono">Mar {24-i}</span>
                           <span className="flex-1 text-slate-300 font-medium">Ghostly Invoice</span>
                           <span className="w-16 text-right text-slate-300">****</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Security Section */}
      <section className="relative z-20 py-32 px-6 max-w-[1200px] mx-auto flex flex-col md:flex-row gap-16 md:gap-24 items-center">
         <div className="flex-1 relative w-full">
            <div className="absolute inset-0 bg-[#56C288]/15 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="w-full max-w-[480px] mx-auto aspect-square rounded-[48px] border border-slate-200 bg-white/60 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center p-10 relative overflow-hidden">
               
               <p className="text-slate-500 font-medium text-sm absolute top-10">Security you can verify.</p>
               
               {/* 3 Circular Badges in a row */}
               <div className="flex gap-4 sm:gap-6 items-center mt-6">
                  <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full border border-slate-200 bg-white shadow-md flex flex-col items-center justify-center gap-1.5 hover:-translate-y-2 transition-transform duration-300 cursor-default">
                     <Shield className="w-8 h-8 text-slate-800" />
                     <span className="text-[10px] font-bold tracking-widest uppercase">CoFHE</span>
                  </div>
                  
                  <div className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-full border-2 border-[#56C288] bg-white shadow-xl flex flex-col items-center justify-center gap-2 z-10 -mt-6 hover:-translate-y-2 transition-transform duration-300 cursor-default relative">
                     <div className="absolute -inset-1 rounded-full bg-[#56C288]/20 blur-md -z-10"></div>
                     <Lock className="w-10 h-10 text-[#56C288]" />
                     <span className="text-[10px] font-bold text-center leading-tight">Fhenix<br/>L2 Network</span>
                  </div>
                  
                  <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full border border-slate-200 bg-white shadow-md flex flex-col items-center justify-center gap-1.5 hover:-translate-y-2 transition-transform duration-300 cursor-default px-1">
                     <Fingerprint className="w-8 h-8 text-slate-800" />
                     <span className="text-[9px] font-bold tracking-wider uppercase text-center leading-[1.2]">EVM<br/>COMPATIBLE</span>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="flex-1 w-full">
            <h2 className="text-[40px] md:text-[52px] font-medium tracking-tight mb-12 leading-[1.1]">Security that goes <br/> beyond the standard.</h2>
            
            <div className="space-y-10">
               <div className="border-b border-slate-200 pb-8">
                  <h4 className="text-xl font-semibold text-slate-900 mb-3">On-chain Encrypted Computing</h4>
                  <p className="text-slate-500 text-[16px] leading-relaxed">Ghostly relies on CoFHE and Fhenix technology to perform arithmetic operations dynamically without decrypting user balances or details in the mempool.</p>
               </div>
               <div className="border-b border-slate-200 pb-8">
                  <h4 className="text-xl font-semibold text-slate-900 mb-3">Hashed Metadata & Privacy</h4>
                  <p className="text-slate-500 text-[16px] leading-relaxed">Non-computational metadata (descriptions, IDs) are hashed on-chain while plaintext is stored off-chain. Validated securely using cryptographic proofs.</p>
               </div>
               <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-3">Role-based Access Control</h4>
                  <p className="text-slate-500 text-[16px] leading-relaxed">Smart contract modifiers ensure only authorized parties (issuer, buyer, or designated auditors) can interact with or view decrypted representations of the data.</p>
               </div>
            </div>
         </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-20 py-24 px-6 bg-[#FAFBFE] border-y border-slate-200/50">
         <div className="max-w-[1400px] mx-auto">
            <h2 className="text-center text-3xl font-medium tracking-tight mb-16">Trusted by teams <br/> who move fast.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
               <div className="bg-[#0f172a] text-white p-10 rounded-[32px] shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-slate-300 text-[17px] leading-relaxed mb-10 font-medium">"Security and privacy are non-negotiable for our Web3 operations. Ghostly gives us both — without sacrificing speed. From encrypted escrows to automated payment splitters, everything is thoughtfully designed."</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg overflow-hidden border border-slate-600">
                              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Daniel`} className="w-full h-full object-cover" alt="User" />
                           </div>
                           <div>
                              <h5 className="font-semibold">Daniel Park</h5>
                              <p className="text-xs text-slate-400">CEO, Apex Studio</p>
                           </div>
                        </div>
                        <Shield className="w-8 h-8 text-[#56C288] opacity-50" />
                     </div>
                  </div>
               </div>
               <div className="bg-[#0f172a] text-white p-10 rounded-[32px] shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-slate-300 text-[17px] leading-relaxed mb-10 font-medium">"An invoicing product that is reliable, fast, and completely private on-chain is a necessity. Ghostly is exactly that. It's simply the best FHE-powered confidential invoicing tool out there right now."</p>
                     <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg overflow-hidden border border-slate-600">
                              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Alex`} className="w-full h-full object-cover" alt="User" />
                           </div>
                           <div>
                              <h5 className="font-semibold">Alex Rodriguez</h5>
                              <p className="text-xs text-slate-400">CFO, NextGen Labs</p>
                           </div>
                        </div>
                        <Lock className="w-8 h-8 text-[#56C288] opacity-50" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="relative z-20 bg-[#0f172a] text-white min-h-[500px] overflow-hidden pt-32 pb-12 mt-32 rounded-t-[48px] max-w-[1500px] mx-auto">
         {/* Green neon grid floor */}
         <div className="absolute inset-x-0 bottom-0 h-64 bg-slate-900/50 [mask-image:linear-gradient(to_top,white,transparent)] border-b border-transparent">
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
               <defs>
                  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(0) scale(1 0.4)">
                     <line x1="0" y1="0" x2="60" y2="0" stroke="#56C288" strokeWidth="1" opacity="0.3"/>
                     <line x1="0" y1="0" x2="0" y2="60" stroke="#56C288" strokeWidth="1" opacity="0.3"/>
                  </pattern>
               </defs>
               <rect width="100%" height="100%" fill="url(#grid)" className="[transform-origin:center_top] [transform:perspective(500px)_rotateX(60deg)]"/>
            </svg>
         </div>

         <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-center pb-24 border-b border-slate-800">
            <div className="max-w-xl">
               <h2 className="text-[40px] md:text-[56px] font-medium tracking-tight mb-6 leading-[1.1]">Ready to issue your first <br/> confidential invoice?</h2>
               <p className="text-slate-400 text-[17px] mb-10 leading-relaxed font-medium">Ghostly empowers DAOs and Web3 teams to manage B2B transactions with absolute privacy. Built for Fhenix, secured by math.</p>
               <div className="flex flex-wrap items-center gap-4">
                  <a href="https://app.ghostlyfhe.xyz" className="inline-block bg-[#56C288] hover:bg-[#43a16f] text-[#0f172a] px-8 py-3.5 rounded-full text-[15px] font-bold shadow-[0_0_20px_rgba(86,194,136,0.3)] transition-transform hover:scale-105 active:scale-95">
                     Launch App
                  </a>
               </div>
            </div>
         </div>

         {/* Footer Links */}
         <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-[10px] bg-[#56C288] flex items-center justify-center">
                  <OwlIcon className="w-5 h-5 text-[#0f172a]" />
               </div>
               <span className="text-2xl font-bold tracking-tight">Ghostly</span>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-4 text-[15px] text-slate-400 font-medium">
               <a href="https://app.ghostlyfhe.xyz" className="hover:text-white transition-colors">Home</a>
               <a href="https://app.ghostlyfhe.xyz" className="hover:text-white transition-colors">Pricing</a>
               <a href="https://app.ghostlyfhe.xyz" className="hover:text-white transition-colors">Blog</a>
               <a href="https://app.ghostlyfhe.xyz" className="hover:text-white transition-colors">Contact</a>
            </div>
         </div>
      </section>
    </div>
  )
}
