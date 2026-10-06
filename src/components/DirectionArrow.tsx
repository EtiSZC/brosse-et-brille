import { motion } from "framer-motion";
import type { BrushingZone } from "@/data/brushingZones";

interface DirectionArrowProps {
  direction: BrushingZone["arrowDirection"];
  hue: number;
}

/**
 * Animated arrow/icon showing the brushing direction.
 * Large and obvious so non-readers understand the gesture.
 */
const DirectionArrow = ({ direction, hue }: DirectionArrowProps) => {
  const color = `hsl(${hue}, 70%, 55%)`;

  const arrowAnimations: Record<string, { y?: number[]; x?: number[]; rotate?: number[]; scale?: number[] }> = {
    up: { y: [0, -10, 0] },
    down: { y: [0, 10, 0] },
    left: { x: [0, -10, 0] },
    right: { x: [0, 10, 0] },
    rotate: { rotate: [0, 20, -20, 0] },
    tongue: { scale: [1, 1.15, 1] },
  };

  const arrowIcons: Record<string, string> = {
    up: "☝️",
    down: "👇",
    left: "👈",
    right: "👉",
    rotate: "🔄",
    tongue: "👅",
  };

  return (
    <motion.div
      className="text-5xl sm:text-6xl select-none"
      animate={arrowAnimations[direction]}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      aria-hidden
    >
      {arrowIcons[direction]}
    </motion.div>
  );
};

export default DirectionArrow;
