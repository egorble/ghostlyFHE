import { motion, useScroll, useTransform } from 'framer-motion'
import { MockDashboard } from './MockDashboard'
import { Shield, Fingerprint, Lock, FileText } from 'lucide-react'

export function LandingPage() {
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
      
      {/* 1. Global Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#slate-800_1px,transparent_1px),linear-gradient(to_bottom,#slate-800_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.03] pointer-events-none z-0"></div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1F6E4D] to-[#56C288] flex items-center justify-center text-white font-bold text-lg shadow-sm">
               <Shield className="w-4 h-4 text-white" />
             </div>
             <span className="text-xl font-bold text-slate-900 tracking-tight">Ghostly</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#start" className="text-[14px] font-medium text-slate-800 hover:text-[#56C288] transition-colors">Start</a>
            <a href="#methods" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Encryption Methods</a>
            <a href="#lists" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Integrations</a>
            <a href="#marketplace" className="text-[14px] font-medium text-slate-500 hover:text-[#56C288] transition-colors">Auditors</a>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-[14px] font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
              Log In
            </button>
            <button className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-full text-[14px] font-medium shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
              Sign up
            </button>
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
               <button className="relative bg-[#0f172a] text-white px-8 py-3.5 rounded-full text-[15px] font-medium shadow-md transition-transform hover:scale-105">
                 Join Ghostly
               </button>
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
    </div>
  )
}
