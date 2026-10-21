import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BathroomBackgroundProps {
  /** Translucent colour laid over the tiles (CSS colour). */
  tint?: string;
  className?: string;
  children: ReactNode;
}

// Fixed (not random) so every render looks the same: left %, size px, duration s, delay s.
const BUBBLES = [
  { left: 6, size: 18, duration: 14, delay: 0 },
  { left: 16, size: 34, duration: 19, delay: 6 },
  { left: 27, size: 14, duration: 12, delay: 3 },
  { left: 38, size: 24, duration: 17, delay: 10 },
  { left: 51, size: 12, duration: 11, delay: 1 },
  { left: 61, size: 30, duration: 20, delay: 8 },
  { left: 72, size: 16, duration: 13, delay: 4 },
  { left: 81, size: 40, duration: 22, delay: 12 },
  { left: 90, size: 20, duration: 15, delay: 2 },
  { left: 96, size: 12, duration: 12, delay: 7 },
];

/**
 * "Candy bathroom" scene shared by every screen: tiled wall, optional colour tint,
 * rising soap bubbles and a foam wave along the bottom edge.
 */
const BathroomBackground = ({ tint, className, children }: BathroomBackgroundProps) => (
  <div className={cn("relative min-h-screen overflow-hidden bathroom-tiles", className)}>
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
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
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
