import { motion } from 'framer-motion'

interface Invoice {
  status: number
}

interface Props {
  invoices: Invoice[]
  className?: string
}

export default function InvoiceProgressGauge({ invoices, className = '' }: Props) {
  const completed = invoices.filter(i => i.status === 3).length
  const inProgress = invoices.filter(i => [1, 2, 4, 5].includes(i.status)).length
  const pending = invoices.filter(i => i.status === 0 || i.status === 2).length
  const total = completed + inProgress + pending

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  const r = 38
  const strokeW = 16
  const circ = 2 * Math.PI * r
  const halfCirc = circ / 2

  const lenCompleted = total === 0 ? 0 : (completed / total) * halfCirc
  const lenInProgress = total === 0 ? 0 : (inProgress / total) * halfCirc
  const lenPending = total === 0 ? 0 : (pending / total) * halfCirc

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center shadow-sm relative ${className}`}>
      <div className="w-full flex justify-start">
        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Project Progress</h3>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative flex items-center justify-center">
          {/* Gauge arc */}
          <svg viewBox="0 0 100 58" className="w-[180px] h-[100px]">
            <defs>
              <pattern id="diagonalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#b0b8c4" strokeWidth="1.8" />
              </pattern>
              <mask id="gaugeMask">
                <motion.circle
                  cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="white" strokeWidth={strokeW} strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  initial={{ strokeDashoffset: circ }}
                  whileInView={{ strokeDashoffset: circ - (lenCompleted + lenInProgress + lenPending) }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ type: "spring", bounce: 0.15, duration: 1.8 }}
                />
              </mask>
            </defs>

            {total === 0 ? (
              <motion.circle 
                cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="#f1f5f9" strokeWidth={strokeW} strokeLinecap="round" 
                strokeDasharray={`${circ} ${circ}`}
                initial={{ strokeDashoffset: circ }}
                whileInView={{ strokeDashoffset: circ - halfCirc }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ type: "spring", bounce: 0.15, duration: 1.8 }}
              />
            ) : (
              <g mask="url(#gaugeMask)">
                <circle cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="#f1f5f9" strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${lenCompleted + lenInProgress + lenPending} ${circ}`} />
                
                {pending > 0 && (
                  <circle
                    cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="url(#diagonalHatch)" strokeWidth={strokeW} strokeLinecap="round"
                    strokeDasharray={`${lenPending} ${circ}`}
                    strokeDashoffset={-(lenCompleted + lenInProgress)}
                  />
                )}
                {inProgress > 0 && (
                  <circle
                    cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="#1F6E4D" strokeWidth={strokeW} strokeLinecap="round"
                    strokeDasharray={`${lenInProgress} ${circ}`}
                    strokeDashoffset={-lenCompleted}
                  />
                )}
                {completed > 0 && (
                  <circle
                    cx="50" cy="50" r={r} transform="rotate(180 50 50)" fill="none" stroke="#10B981" strokeWidth={strokeW} strokeLinecap="round"
                    strokeDasharray={`${lenCompleted} ${circ}`}
                    strokeDashoffset={0}
                  />
                )}
              </g>
            )}
          </svg>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center text-center">
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-[32px] font-bold text-slate-900 leading-none tracking-tight"
            >
              {pct}%
            </motion.span>
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 1 }}
              className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider"
            >
              Invoices Paid
            </motion.span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full justify-center mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
          <span className="text-[10px] font-medium text-slate-600">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1F6E4D]"></div>
          <span className="text-[10px] font-medium text-slate-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full relative overflow-hidden border border-slate-200">
             <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 2px, #94a3b8 2px, #94a3b8 3px)' }}></div>
          </div>
          <span className="text-[10px] font-medium text-slate-600">Pending</span>
        </div>
      </div>
    </div>
  )
}
