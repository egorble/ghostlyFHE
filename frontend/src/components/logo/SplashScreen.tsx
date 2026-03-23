import { motion, AnimatePresence } from 'framer-motion'
import OwlLogo from './OwlLogo'

interface SplashScreenProps {
  show: boolean
  onComplete: () => void
}

export default function SplashScreen({ show, onComplete }: SplashScreenProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <OwlLogo size="w-40 h-40 md:w-52 md:h-52" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
