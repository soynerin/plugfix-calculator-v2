import { ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatARS } from '@/shared/utils/formatters';

interface SmartResultBarProps {
  totalARS: number;
  onViewDetails: () => void;
}

export function SmartResultBar({ totalARS, onViewDetails }: SmartResultBarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-indigo-600 dark:bg-indigo-700 text-white shadow-2xl"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium opacity-90">Total Estimado</p>
          <p className="text-xl font-bold tabular-nums">{formatARS(totalARS)}</p>
        </div>
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors active:scale-95"
        >
          <span className="text-sm font-medium">Ver detalle</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
