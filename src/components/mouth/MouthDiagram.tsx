import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BRUSHING_ZONES } from "@/data/brushingZones";
import { playPop } from "@/lib/sounds";
import {
  ALL_TEETH,
  CAVITY_PATH,
  GERMS,
  INNER_SIDE_OF,
  LIPS_PATH,
  LOWER_GUM_PATH,
  TONGUE,
  UPPER_GUM_PATH,
  VIEW_H,
  VIEW_W,
  brushPose,
  isGermVisible,
  isInnerRegion,
  palatePatch,
  zoneIndexOfRegion,
  type BrushPose,
  type Germ,
} from "./geometry";

const INK = "hsl(var(--ink))";
const MINT = "hsl(var(--mint))";
const SUN = "hsl(var(--sunshine))";
const LIP = "#FF8FA3";
const GUM = "#FFB3C1";
const PALATE = "#FFD9E1";
const CAVITY = "#6B2340";
const TONGUE_FILL = "#FF7A9A";
const TOOTH_FILL = "#FFFDF7";
const GERM_FILL = "#9BE36D";

interface MouthDiagramProps {
  currentZoneIndex: number;
  /** 0 → 1 progress inside the current zone (drives germ popping). */
  zoneProgress: number;
}

/**
 * Front-facing "big smile": the active zone glows, germs pop as it gets brushed,
 * finished teeth sparkle, and an animated toothbrush mimes the gesture.
 * Inner surfaces ("derrière") make the front teeth see-through with the brush behind them.
 */
const MouthDiagram = ({ currentZoneIndex, zoneProgress }: MouthDiagramProps) => {
  const clipId = useId();
  const zone = BRUSHING_ZONES[currentZoneIndex];
  const region = zone.highlight[0];
  const inner = isInnerRegion(region);
  const seeThroughRegion = INNER_SIDE_OF[region];
  const pose = brushPose(region);
  const tongueActive = region === "tongue";
  const palate = palatePatch(region);

  const visibleGerms = GERMS.filter((g) => isGermVisible(g, currentZoneIndex, zoneProgress));
  const backGerms = visibleGerms.filter((g) => g.layer === "back");
  const frontGerms = visibleGerms.filter((g) => g.layer === "front");

  // "Plop" each time a germ disappears.
  const prevCount = useRef(visibleGerms.length);
  useEffect(() => {
    if (visibleGerms.length < prevCount.current) playPop();
    prevCount.current = visibleGerms.length;
  }, [visibleGerms.length]);

  return (
    // Card flip whenever we switch between the outside and the inside of the teeth.
    <motion.div
      key={inner ? "inside" : "outside"}
      className="w-full max-w-[400px]"
      initial={{ rotateY: 90, opacity: 0.3 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{ transformPerspective: 800 }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto drop-shadow-[0_8px_0_hsl(var(--ink)/0.12)]"
        role="img"
        aria-label={`Bouche : ${zone.label}`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={CAVITY_PATH} />
          </clipPath>
        </defs>

        {/* Lips */}
        <path d={LIPS_PATH} fill={LIP} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path
          d="M92,56 C116,49 140,47 166,47"
          fill="none"
          stroke="white"
          strokeOpacity={0.65}
          strokeWidth={6}
          strokeLinecap="round"
        />

        <g clipPath={`url(#${clipId})`}>
          <path d={CAVITY_PATH} fill={CAVITY} />

          {/* Tongue */}
          <motion.ellipse
            cx={TONGUE.cx}
            cy={TONGUE.cy}
            rx={TONGUE.rx}
            ry={TONGUE.ry}
            fill={TONGUE_FILL}
            stroke={tongueActive ? MINT : INK}
            strokeWidth={tongueActive ? 5 : 2.5}
            animate={tongueActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <path
            d={`M${TONGUE.cx},${TONGUE.cy - TONGUE.ry + 8} L${TONGUE.cx},${TONGUE.cy}`}
            stroke={INK}
            strokeOpacity={0.35}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Behind the teeth: inner-surface germs and the brush for "derrière" zones.
              A light palate patch keeps see-through teeth looking clean, not dark. */}
          {palate && (
            <rect x={palate.x} y={palate.y} width={palate.w} height={palate.h} rx={14} fill={PALATE} />
          )}
          <GermLayer germs={backGerms} />
          {pose.layer === "back" && <AnimatedBrush pose={pose} />}

          {/* Teeth */}
          {ALL_TEETH.map((tooth, i) => {
            const active = tooth.region === region;
            const seeThrough = tooth.region === seeThroughRegion;
            return (
              <g key={i}>
                {active && (
                  <motion.path
                    d={tooth.d}
                    fill="none"
                    stroke={MINT}
                    strokeWidth={10}
                    strokeLinejoin="round"
                    animate={{ opacity: [0.35, 0.9, 0.35] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <path
                  d={tooth.d}
                  fill={TOOTH_FILL}
                  fillOpacity={seeThrough ? 0.45 : 1}
                  stroke={seeThrough ? MINT : INK}
                  strokeWidth={seeThrough ? 3 : 2.5}
                  strokeDasharray={seeThrough ? "5 4" : undefined}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Gums cover the tooth roots */}
          <path d={UPPER_GUM_PATH} fill={GUM} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <path d={LOWER_GUM_PATH} fill={GUM} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />

          <GermLayer germs={frontGerms} />

          {/* Finished teeth sparkle */}
          {ALL_TEETH.map((tooth, i) =>
            zoneIndexOfRegion(tooth.region) < currentZoneIndex ? (
              <Sparkle
                key={i}
                x={tooth.cx + tooth.width / 4}
                y={tooth.arch === "upper" ? tooth.tipY - 9 : tooth.tipY + 9}
                delay={(i % 5) * 0.3}
              />
            ) : null,
          )}
        </g>

        <path d={CAVITY_PATH} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />

        {/* Front brush on top of everything (its handle can stick out over the lips) */}
        {pose.layer === "front" && <AnimatedBrush pose={pose} />}
      </svg>
    </motion.div>
  );
};

const GermLayer = ({ germs }: { germs: Germ[] }) => (
  <AnimatePresence>
    {germs.map((g) => (
      <GermSprite key={`${g.zoneIndex}-${g.indexInZone}`} germ={g} />
    ))}
  </AnimatePresence>
);

/** Little green germ with eyes; wobbles while alive, bursts when brushed away. */
const GermSprite = ({ germ }: { germ: Germ }) => {
  const { x, y, r } = germ;
  return (
    <motion.g
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 1.9, opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      <motion.g
        animate={{ rotate: [-8, 8, -8] }}
        transition={{ duration: 1.2 + (germ.indexInZone % 3) * 0.3, repeat: Infinity, ease: "easeInOut" }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={x + Math.cos(a) * r * 0.9}
              cy={y + Math.sin(a) * r * 0.9}
              r={r * 0.42}
              fill={GERM_FILL}
              stroke={INK}
              strokeWidth={1.6}
            />
          );
        })}
        <circle cx={x} cy={y} r={r} fill={GERM_FILL} />
        <circle cx={x - r * 0.36} cy={y - r * 0.12} r={r * 0.3} fill="white" stroke={INK} strokeWidth={1} />
        <circle cx={x + r * 0.36} cy={y - r * 0.12} r={r * 0.3} fill="white" stroke={INK} strokeWidth={1} />
        <circle cx={x - r * 0.32} cy={y - r * 0.08} r={r * 0.14} fill={INK} />
        <circle cx={x + r * 0.4} cy={y - r * 0.08} r={r * 0.14} fill={INK} />
        <path
          d={`M${x - r * 0.3},${y + r * 0.42} Q${x},${y + r * 0.62} ${x + r * 0.3},${y + r * 0.42}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </motion.g>
    </motion.g>
  );
};

const SPARKLE_PATH = "M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z";

const Sparkle = ({ x, y, delay }: { x: number; y: number; delay: number }) => (
  <g transform={`translate(${x},${y})`}>
    <motion.path
      d={SPARKLE_PATH}
      fill={SUN}
      stroke={INK}
      strokeWidth={1}
      animate={{ scale: [0.6, 1.15, 0.6], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay }}
    />
  </g>
);

const BRUSH_MOTIONS: Record<BrushPose["motion"], { animate: Record<string, number[]>; duration: number }> = {
  circles: { animate: { x: [0, 4, 0, -4, 0], y: [-4, 0, 4, 0, -4] }, duration: 0.9 }, // gentle circles
  scrub: { animate: { x: [-9, 9, -9] }, duration: 0.5 }, // back-and-forth on chewing surfaces
  flick: { animate: { y: [0, -8, 0] }, duration: 0.6 }, // vertical flicks behind the front teeth
  sweep: { animate: { y: [-8, 8, -8] }, duration: 0.9 }, // back-to-front on the tongue
};

/** Glides (spring) to each new zone, then mimes that zone's gesture. */
const AnimatedBrush = ({ pose }: { pose: BrushPose }) => {
  const m = BRUSH_MOTIONS[pose.motion];
  return (
    <motion.g
      initial={false}
      animate={{ x: pose.x, y: pose.y }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <motion.g
        key={pose.motion}
        animate={m.animate}
        transition={{ duration: m.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        <g transform={pose.orient}>
          <Toothbrush handle={pose.handle} />
        </g>
      </motion.g>
    </motion.g>
  );
};

/** Drawn horizontally: head at the origin, bristles pointing up, handle to the right. */
const Toothbrush = ({ handle }: { handle: number }) => (
  <g>
    {[-12, -7, -2, 3, 8, 13].map((bx) => (
      <rect key={bx} x={bx - 2} y={-12} width={4} height={11} rx={2} fill="#9FDDF0" stroke={INK} strokeWidth={1.5} />
    ))}
    <rect x={-16} y={-2} width={34} height={12} rx={5} fill="white" stroke={INK} strokeWidth={2.5} />
    <rect x={16} y={-1} width={handle} height={11} rx={5.5} fill={MINT} stroke={INK} strokeWidth={2.5} />
    {handle > 40 && <rect x={42} y={1.5} width={22} height={6} rx={3} fill={SUN} />}
  </g>
);

export default MouthDiagram;
