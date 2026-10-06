import { motion } from "framer-motion";
import type { ToothRegion } from "@/data/brushingZones";

interface ToothDiagramProps {
  activeRegions: ToothRegion[];
  hue: number;
}

/**
 * Dental arch view (top-down U-shape) with anatomically inspired tooth shapes.
 * An animated toothbrush hovers over the active zone and mimes the proper gesture.
 */

type ToothShape = {
  region: ToothRegion;
  /** SVG path for the tooth crown (top-down view) */
  d: string;
  /** Center point used to position the toothbrush */
  cx: number;
  cy: number;
};

// Upper arch (U opening downward) — y small = front of mouth (closer to lips)
// Lower arch mirrored vertically below.
// Coordinates designed for a 240x260 viewBox.
// Mirror convention: the phone faces the child like a mirror, so screen-left is
// the child's left ("upper-left" is drawn on the left of the screen).

const UPPER_TEETH: ToothShape[] = [
  // Left molars
  { region: "upper-left",  d: "M30,70 q-6,-6 -2,-16 q10,-4 18,2 q4,10 -2,18 z", cx: 38,  cy: 72 },
  { region: "upper-left",  d: "M52,52 q-4,-8 2,-16 q12,-2 18,6 q2,10 -4,16 z",  cx: 60,  cy: 56 },
  // Front teeth: canine, incisors, canine
  { region: "upper-front", d: "M76,40 q-2,-8 6,-14 q10,0 14,8 q0,8 -6,12 z",     cx: 84,  cy: 44 },
  { region: "upper-front", d: "M100,32 q0,-10 10,-12 q10,2 10,12 q-2,10 -10,12 q-8,-2 -10,-12 z", cx: 110, cy: 38 },
  { region: "upper-front", d: "M120,32 q0,-10 10,-12 q10,2 10,12 q-2,10 -10,12 q-8,-2 -10,-12 z", cx: 130, cy: 38 },
  { region: "upper-front", d: "M144,40 q-2,-8 6,-14 q10,0 14,8 q0,8 -6,12 z",    cx: 152, cy: 44 },
  // Right molars
  { region: "upper-right", d: "M168,52 q-4,-8 2,-16 q12,-2 18,6 q2,10 -4,16 z",  cx: 180, cy: 56 },
  { region: "upper-right", d: "M192,70 q-6,-6 -2,-16 q10,-4 18,2 q4,10 -2,18 z", cx: 200, cy: 72 },
];

// Lower arch — mirrored. We translate y so it sits in the lower half.
const LOWER_TEETH: ToothShape[] = UPPER_TEETH.map((t) => {
  const region = t.region.replace("upper", "lower") as ToothRegion;
  // Mirror around y=130
  const mirror = (y: number) => 260 - y;
  // Crude path mirroring: re-create simple paths for lower arch
  const dMap: Record<string, string> = {
    "lower-left-0":  "M30,190 q-6,6 -2,16 q10,4 18,-2 q4,-10 -2,-18 z",
    "lower-left-1":  "M52,208 q-4,8 2,16 q12,2 18,-6 q2,-10 -4,-16 z",
    "lower-back-0":  "M76,220 q-2,8 6,14 q10,0 14,-8 q0,-8 -6,-12 z",
    "lower-front-0": "M100,228 q0,10 10,12 q10,-2 10,-12 q-2,-10 -10,-12 q-8,2 -10,12 z",
    "lower-front-1": "M120,228 q0,10 10,12 q10,-2 10,-12 q-2,-10 -10,-12 q-8,2 -10,12 z",
    "lower-back-1":  "M144,220 q-2,8 6,14 q10,0 14,-8 q0,-8 -6,-12 z",
    "lower-right-0": "M168,208 q-4,8 2,16 q12,2 18,-6 q2,-10 -4,-16 z",
    "lower-right-1": "M192,190 q-6,6 -2,16 q10,4 18,-2 q4,-10 -2,-18 z",
  };
  const keys = ["lower-left-0","lower-left-1","lower-back-0","lower-front-0","lower-front-1","lower-back-1","lower-right-0","lower-right-1"];
  const idx = UPPER_TEETH.indexOf(t);
  return {
    region,
    d: dMap[keys[idx]],
    cx: t.cx,
    cy: mirror(t.cy),
  };
});

const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

// Tongue position
const TONGUE = { cx: 120, cy: 130, rx: 38, ry: 22 };

// "Back" zones = inner (tongue-side) surface of the front teeth, not other teeth.
const INNER_SIDE_OF: Partial<Record<ToothRegion, ToothRegion>> = {
  "upper-back": "upper-front",
  "lower-back": "lower-front",
};

// Arc drawn on the tongue side of the front teeth when a "back" zone is active.
const INNER_ARCS: Partial<Record<ToothRegion, string>> = {
  "upper-back": "M80,58 Q119,44 158,58",
  "lower-back": "M80,202 Q119,216 158,202",
};

// How far inside the arch the brush sits for "back" zones (toward the tongue).
const INNER_OFFSET = 16;

const ToothDiagram = ({ activeRegions, hue }: ToothDiagramProps) => {
  const innerRegions = activeRegions.filter((r) => INNER_SIDE_OF[r]);
  const highlighted = [...activeRegions, ...innerRegions.map((r) => INNER_SIDE_OF[r]!)];
  const isActive = (region: ToothRegion) => highlighted.includes(region);
  const activeColor = `hsl(${hue}, 70%, 55%)`;
  const activeFill = `hsl(${hue}, 85%, 92%)`;
  const toothFill = "hsl(45, 30%, 97%)";
  const toothStroke = "hsl(35, 20%, 70%)";

  // Compute toothbrush target position = average center of active teeth
  const activeTeeth = ALL_TEETH.filter((t) => isActive(t.region));
  const tongueActive = isActive("tongue");
  const innerShift = innerRegions.includes("upper-back")
    ? INNER_OFFSET
    : innerRegions.includes("lower-back")
    ? -INNER_OFFSET
    : 0;

  const target = tongueActive
    ? { x: TONGUE.cx, y: TONGUE.cy }
    : activeTeeth.length > 0
    ? {
        x: activeTeeth.reduce((s, t) => s + t.cx, 0) / activeTeeth.length,
        y: activeTeeth.reduce((s, t) => s + t.cy, 0) / activeTeeth.length + innerShift,
      }
    : { x: 120, y: 130 };

  // Determine brush motion based on active region
  const region = activeRegions[0];
  const brushMotion = getBrushMotion(region);

  return (
    <svg viewBox="0 0 240 260" className="w-48 h-52 sm:w-56 sm:h-60 drop-shadow-md">
      {/* Mouth/gum background */}
      <ellipse cx="120" cy="130" rx="115" ry="120" fill={`hsl(${hue}, 50%, 88%)`} opacity="0.5" />
      <ellipse cx="120" cy="130" rx="100" ry="105" fill="hsl(350, 50%, 70%)" opacity="0.35" />

      {/* Tongue */}
      <motion.ellipse
        cx={TONGUE.cx}
        cy={TONGUE.cy}
        rx={TONGUE.rx}
        ry={TONGUE.ry}
        fill={tongueActive ? activeFill : "hsl(350, 60%, 65%)"}
        stroke={tongueActive ? activeColor : "hsl(350, 45%, 50%)"}
        strokeWidth={tongueActive ? 2.5 : 1.5}
        animate={
          tongueActive
            ? { scale: [1, 1.06, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${TONGUE.cx}px ${TONGUE.cy}px` }}
      />
      {/* Tongue midline */}
      <path
        d={`M${TONGUE.cx},${TONGUE.cy - TONGUE.ry + 2} Q${TONGUE.cx},${TONGUE.cy} ${TONGUE.cx},${TONGUE.cy + TONGUE.ry - 2}`}
        stroke="hsl(350, 40%, 50%)"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />

      {/* Teeth */}
      {ALL_TEETH.map((tooth, i) => {
        const active = isActive(tooth.region);
        return (
          <motion.path
            key={i}
            d={tooth.d}
            fill={active ? activeFill : toothFill}
            stroke={active ? activeColor : toothStroke}
            strokeWidth={active ? 2 : 1}
            animate={
              active
                ? {
                    scale: [1, 1.08, 1],
                    filter: [
                      `drop-shadow(0 0 1px hsl(${hue}, 70%, 60%))`,
                      `drop-shadow(0 0 6px hsl(${hue}, 80%, 70%))`,
                      `drop-shadow(0 0 1px hsl(${hue}, 70%, 60%))`,
                    ],
                  }
                : { scale: 1 }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${tooth.cx}px ${tooth.cy}px` }}
          />
        );
      })}

      {/* Inner-surface marker for "back" zones */}
      {innerRegions.map((r) => (
        <motion.path
          key={r}
          d={INNER_ARCS[r]}
          fill="none"
          stroke={activeColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="2 7"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Animated toothbrush */}
      <motion.g
        animate={{ x: target.x, y: target.y }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
      >
        <motion.g
          animate={brushMotion.animate}
          transition={brushMotion.transition}
          style={{ transformOrigin: "0px 0px" }}
        >
          <Toothbrush hue={hue} />
        </motion.g>
      </motion.g>
    </svg>
  );
};

/** Returns the framer-motion animation describing how the brush should move. */
function getBrushMotion(region: ToothRegion | undefined) {
  const base = { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const };
  switch (region) {
    case "upper-front":
    case "lower-front":
      // Side-to-side horizontal sweep
      return { animate: { x: [-8, 8, -8] }, transition: base };
    case "upper-back":
    case "lower-back":
      // Small circular motion
      return {
        animate: { x: [0, 4, 0, -4, 0], y: [-4, 0, 4, 0, -4], rotate: [0, 5, 0, -5, 0] },
        transition: { ...base, duration: 1 },
      };
    case "upper-left":
    case "upper-right":
    case "lower-left":
    case "lower-right":
      // Back-and-forth scrubbing on the chewing surface of molars
      return { animate: { x: [-6, 6, -6], rotate: [-5, 5, -5] }, transition: base };
    case "tongue":
      // Long forward sweep
      return { animate: { y: [-10, 10, -10] }, transition: { ...base, duration: 0.9 } };
    default:
      return { animate: { scale: [1, 1.05, 1] }, transition: base };
  }
}

/** Cute toothbrush SVG, drawn around origin (0,0) so the parent <g> can move it. */
const Toothbrush = ({ hue }: { hue: number }) => {
  const handle = `hsl(${hue}, 70%, 50%)`;
  const handleDark = `hsl(${hue}, 70%, 40%)`;
  return (
    <g>
      {/* Handle */}
      <rect
        x="-4"
        y="-30"
        width="8"
        height="22"
        rx="3"
        fill={handle}
        stroke={handleDark}
        strokeWidth="1"
      />
      {/* Neck */}
      <rect x="-3" y="-10" width="6" height="6" rx="2" fill={handle} />
      {/* Brush head */}
      <rect
        x="-7"
        y="-6"
        width="14"
        height="10"
        rx="3"
        fill="hsl(0, 0%, 98%)"
        stroke={handleDark}
        strokeWidth="1"
      />
      {/* Bristles */}
      {[-5, -2.5, 0, 2.5, 5].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1="3"
          x2={x}
          y2="9"
          stroke="hsl(195, 60%, 70%)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      {/* Sparkle */}
      <text x="10" y="-20" fontSize="10">✨</text>
    </g>
  );
};

export default ToothDiagram;
