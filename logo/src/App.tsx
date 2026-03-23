import { motion } from 'motion/react';
import OwlLogo from './components/OwlLogo';

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center overflow-hidden relative selection:bg-white/20">
      {/* Epic background glow */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          delay: 2.5, 
          duration: 3, 
          ease: "easeOut" 
        }}
      />
      
      {/* Ambient pulsing light */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20vw] h-[20vw] max-w-[300px] max-h-[300px] bg-white/10 rounded-full blur-[80px] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ 
          delay: 3.5, 
          duration: 4, 
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <OwlLogo />
      </motion.div>
      
      <motion.div
        className="mt-16 text-center relative z-10"
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 3.5, duration: 1.5, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 tracking-[0.2em] uppercase mb-4"
          initial={{ letterSpacing: "0em" }}
          animate={{ letterSpacing: "0.2em" }}
          transition={{ delay: 3.5, duration: 2, ease: "easeOut" }}
        >
          Night Owl
        </motion.h1>
        <motion.p 
          className="text-neutral-400 tracking-widest text-sm md:text-base uppercase font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.5, duration: 1 }}
        >
          See in the dark
        </motion.p>
      </motion.div>

      {/* Particles / Dust effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, Math.random() * 2 + 1, 0],
              y: [0, -Math.random() * 100 - 50]
            }}
            transition={{
              duration: Math.random() * 3 + 3,
              repeat: Infinity,
              delay: Math.random() * 5 + 3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}
