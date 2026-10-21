import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BathroomBackgroundProps {
  /** Translucent colour laid over the background (CSS colour). */
  tint?: string;
  className?: string;
  children: ReactNode;
}

// Fixed (not random) so every render looks the same. left %, size px, durations s (negative delay =
// already on screen at load), top = height where it pops (vh, negative = up), rest = resting height
// when motion is reduced (vh), sway = side drift px.
const BUBBLES = [
  { left: 73, size: 28, duration: 19, delay: -15, top: -88, rest: -63, sway: 8, swayDuration: 4.4, wobble: 1.5, spin: 6 },
  { left: 52, size: 21, duration: 19, delay: -10, top: -91, rest: -38, sway: 11, swayDuration: 3.5, wobble: 2.5, spin: 10 },
  { left: 94, size: 16, duration: 14, delay: -1, top: -78, rest: -30, sway: 16, swayDuration: 4.0, wobble: 2.4, spin: 7 },
  { left: 25, size: 13, duration: 15, delay: -9, top: -96, rest: -57, sway: 6, swayDuration: 4.3, wobble: 1.8, spin: 5 },
  { left: 11, size: 37, duration: 13, delay: -7, top: -63, rest: -79, sway: 11, swayDuration: 2.5, wobble: 1.5, spin: 7 },
  { left: 87, size: 24, duration: 18, delay: -15, top: -82, rest: -82, sway: 20, swayDuration: 2.7, wobble: 2.2, spin: 7 },
  { left: 4, size: 32, duration: 13, delay: -1, top: -84, rest: -46, sway: 11, swayDuration: 2.4, wobble: 2.3, spin: 7 },
  { left: 66, size: 13, duration: 15, delay: -4, top: -88, rest: -18, sway: 17, swayDuration: 2.8, wobble: 1.7, spin: 10 },
  { left: 18, size: 43, duration: 11, delay: -6, top: -91, rest: -29, sway: 12, swayDuration: 3.4, wobble: 2.5, spin: 9 },
  { left: 80, size: 37, duration: 13, delay: -13, top: -57, rest: -26, sway: 20, swayDuration: 2.8, wobble: 2.4, spin: 9 },
  { left: 38, size: 31, duration: 18, delay: -17, top: -68, rest: -18, sway: 8, swayDuration: 4.3, wobble: 1.5, spin: 7 },
  { left: 31, size: 28, duration: 17, delay: -7, top: -52, rest: -81, sway: 7, swayDuration: 3.5, wobble: 2.6, spin: 6 },
  { left: 45, size: 46, duration: 20, delay: -12, top: -66, rest: -18, sway: 17, swayDuration: 4.2, wobble: 2.1, spin: 8 },
  { left: 59, size: 26, duration: 16, delay: -8, top: -76, rest: -21, sway: 13, swayDuration: 3.9, wobble: 1.7, spin: 7 },
];

/**
 * "Bain moussant" scene shared by every screen: soft mint gradient, optional colour tint,
 * iridescent soap bubbles that sway, wobble and pop, and a foam wave along the bottom edge.
 */
const BathroomBackground = ({ tint, className, children }: BathroomBackgroundProps) => (
  <div className={cn("relative min-h-screen overflow-hidden bubble-bath", className)}>
    <div
      className="absolute inset-0 transition-colors duration-700 pointer-events-none"
      style={{ backgroundColor: tint ?? "transparent" }}
      aria-hidden
    />

    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={
            {
              left: `calc(${b.left}% - ${b.size / 2}px)`,
              "--size": `${b.size}px`,
              "--dur": `${b.duration}s`,
              "--delay": `${b.delay}s`,
              "--top": `${b.top}vh`,
              "--rest": `${b.rest}vh`,
              "--sway": `${b.sway}px`,
              "--sway-dur": `${b.swayDuration}s`,
              "--sway-delay": `${-b.swayDuration * (i % 3) / 3}s`,
              "--wobble-dur": `${b.wobble}s`,
              "--spin-dur": `${b.spin}s`,
            } as CSSProperties
          }
        >
          <span className="bubble-sway">
            <span className="bubble-pop">
              <span className="bubble-wobble">
                <span className="bubble-film" />
                <span className="bubble-rim" />
                <span className="bubble-shine" />
              </span>
            </span>
          </span>
        </span>
      ))}
    </div>

    <svg
      className="absolute bottom-0 left-0 w-full h-20 pointer-events-none"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0,38 C30,22 55,22 80,34 C105,46 130,18 160,30 C190,42 215,20 245,32 C275,44 300,18 330,30 C355,40 380,26 400,32 L400,80 L0,80 Z"
        fill="white"
        fillOpacity="0.8"
      />
      {[20, 70, 125, 185, 240, 300, 360].map((x, i) => (
        <circle key={x} cx={x} cy={34 - (i % 2) * 6} r={8 + (i % 3) * 3} fill="white" fillOpacity="0.85" />
      ))}
    </svg>

    {/* Safe areas: keep content clear of the iPhone notch and home bar (0 elsewhere). */}
    <div className="relative z-10 flex flex-col min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  </div>
);

export default BathroomBackground;
