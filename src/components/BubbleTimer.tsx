import { motion } from "framer-motion";
import { BRUSHING_ZONES } from "@/data/brushingZones";
import { cn } from "@/lib/utils";

interface BubbleTimerProps {
  currentZoneIndex: number;
  /** 0 → 1 inside the current zone. */
  zoneProgress: number;
  /** 0 → 1 over the whole session (for assistive tech). */
  totalProgress: number;
}

/**
 * Glanceable timer for non-readers: one bubble per zone, filling up as it's
 * brushed, leading to a star.
 */
const BubbleTimer = ({ currentZoneIndex, zoneProgress, totalProgress }: BubbleTimerProps) => {
  const allDone = totalProgress >= 1;
  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2"
      role="progressbar"
      aria-label="Progression du brossage"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(totalProgress * 100)}
      aria-valuetext={`Zone ${currentZoneIndex + 1} sur ${BRUSHING_ZONES.length}`}
    >
      {BRUSHING_ZONES.map((zone, i) => {
        const done = i < currentZoneIndex || allDone;
        const current = i === currentZoneIndex && !allDone;
        return (
          <motion.div
            key={zone.id}
            className={cn(
              "relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[2.5px] border-ink overflow-hidden flex items-center justify-center",
              done ? "bg-mint" : current ? "bg-white" : "bg-white/50 border-ink/30",
            )}
            animate={current ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 1.2, repeat: current ? Infinity : 0, ease: "easeInOut" }}
          >
            {current && (
              <motion.div
                className="absolute inset-x-0 bottom-0 bg-mint"
                animate={{ height: `${zoneProgress * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            )}
            {done && <span className="relative text-sm font-bold text-ink leading-none">✓</span>}
            {/* glossy highlight */}
            <span className="absolute top-[3px] left-[5px] w-2 h-1.5 rounded-full bg-white/80" />
          </motion.div>
        );
      })}
      <motion.span
        className={cn("text-2xl sm:text-3xl leading-none", allDone ? "" : "grayscale opacity-40")}
        animate={allDone ? { scale: [1, 1.4, 1], rotate: [0, 15, 0] } : { scale: 1 }}
        transition={{ duration: 0.6 }}
        aria-hidden
      >
        ⭐
      </motion.span>
    </div>
  );
};

export default BubbleTimer;
