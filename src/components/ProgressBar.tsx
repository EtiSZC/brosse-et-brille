import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0 to 1
}

const ProgressBar = ({ progress }: ProgressBarProps) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="h-4 rounded-full bg-muted overflow-hidden shadow-inner">
        <motion.div
          className="h-full rounded-full gradient-progress"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-center text-sm text-muted-foreground font-body mt-1">
        {Math.round(progress * 100)}%
      </p>
    </div>
  );
};

export default ProgressBar;
