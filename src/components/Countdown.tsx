import { AnimatePresence, motion } from "framer-motion";

/** Big 3-2-1 badge announcing the next step (decorative: the voice and chime carry it too). */
const Countdown = ({ value }: { value: number | null }) => (
  <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center z-20" aria-hidden>
    <AnimatePresence mode="popLayout">
      {value !== null && (
        <motion.div
          key={value}
          data-testid="countdown"
          className="w-16 h-16 rounded-full bg-sunshine border-[3px] border-ink shadow-[0_5px_0_hsl(var(--ink)/0.25)] flex items-center justify-center font-display font-bold text-4xl text-ink"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          {value}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default Countdown;
