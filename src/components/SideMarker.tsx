import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Big pulsing arrow on the edge of the screen for the side being brushed, so a
 * child who doesn't know left from right can follow it (mirror: screen-left = child's left).
 */
const SideMarker = ({ side }: { side: "left" | "right" }) => {
  const left = side === "left";
  return (
    <motion.div
      data-testid={`side-marker-${side}`}
      className={cn(
        "pointer-events-none absolute top-[80%] z-20 w-14 h-14 -mt-7 rounded-full bg-sunshine border-[3px] border-ink shadow-[0_5px_0_hsl(var(--ink)/0.25)] flex items-center justify-center",
        left ? "-left-2" : "-right-2",
      )}
      initial={{ scale: 0 }}
      animate={{ scale: 1, x: left ? [0, -8, 0] : [0, 8, 0] }}
      transition={{ scale: { type: "spring", stiffness: 300 }, x: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ transform: left ? "scaleX(-1)" : undefined }}>
        <path d="M4 12h13M12 5l7 7-7 7" fill="none" stroke="hsl(var(--ink))" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
};

export default SideMarker;
