import { BRUSHING_ZONES, type ToothRegion } from "@/data/brushingZones";

/**
 * Front-facing "big smile" mouth, drawn on a 320x260 canvas.
 * Mirror convention: the phone faces the child like a mirror, so screen-left is
 * the child's left ("upper-left" teeth are drawn on the left of the screen).
 */

export const VIEW_W = 320;
export const VIEW_H = 260;
const CX = VIEW_W / 2;

export const LIPS_PATH = "M20,80 C60,28 260,28 300,80 C302,190 232,252 160,252 C88,252 18,190 20,80 Z";
export const CAVITY_PATH = "M36,88 C74,50 246,50 284,88 C284,182 222,236 160,236 C98,236 36,182 36,88 Z";

export const TONGUE = { cx: CX, cy: 170, rx: 72, ry: 36 };

/** Gum line of the upper teeth (teeth hang down from it). */
export const upperGumY = (x: number) => 84 + 0.0016 * (x - CX) ** 2;
/** Gum line of the lower teeth (teeth stand up from it). */
export const lowerGumY = (x: number) => 214 - 0.0022 * (x - CX) ** 2;

type Side = "left" | "front" | "right";
const SIDES: Side[] = ["left", "left", "front", "front", "front", "front", "right", "right"];

const UPPER_WIDTHS = [26, 28, 30, 34, 34, 30, 28, 26];
const UPPER_HEIGHTS = [26, 30, 34, 40, 40, 34, 30, 26];
const LOWER_WIDTHS = [21, 23, 25, 28, 28, 25, 23, 21];
const LOWER_HEIGHTS = [22, 24, 26, 30, 30, 26, 24, 22];

export interface Tooth {
  region: ToothRegion;
  arch: "upper" | "lower";
  d: string;
  /** Centre of the visible crown. */
  cx: number;
  cy: number;
  /** Biting edge (tip) y and gum-side y. */
  tipY: number;
  gumY: number;
  width: number;
}

/** Rounded-tip tooth; extends 10px into the gum so the gum can overlap it cleanly. */
function toothPath(x0: number, x1: number, gumY: number, tipY: number): string {
  const r = Math.min(9, (x1 - x0) / 2.6);
  const dir = tipY > gumY ? 1 : -1; // 1 = hangs down (upper), -1 = stands up (lower)
  const root = gumY - 10 * dir;
  return [
    `M${x0},${root}`,
    `L${x0},${tipY - r * dir}`,
    `Q${x0},${tipY} ${x0 + r},${tipY}`,
    `L${x1 - r},${tipY}`,
    `Q${x1},${tipY} ${x1},${tipY - r * dir}`,
    `L${x1},${root}`,
    "Z",
  ].join(" ");
}

function buildArch(arch: "upper" | "lower"): Tooth[] {
  const widths = arch === "upper" ? UPPER_WIDTHS : LOWER_WIDTHS;
  const heights = arch === "upper" ? UPPER_HEIGHTS : LOWER_HEIGHTS;
  const total = widths.reduce((a, b) => a + b, 0);
  let x = CX - total / 2;
  return widths.map((w, i) => {
    const x0 = x + 1;
    const x1 = x + w - 1;
    x += w;
    const cx = (x0 + x1) / 2;
    const gumY = arch === "upper" ? upperGumY(cx) : lowerGumY(cx);
    const tipY = arch === "upper" ? gumY + heights[i] : gumY - heights[i];
    return {
      region: `${arch}-${SIDES[i]}` as ToothRegion,
      arch,
      d: toothPath(x0, x1, gumY, tipY),
      cx,
      cy: (gumY + tipY) / 2,
      tipY,
      gumY,
      width: w,
    };
  });
}

export const UPPER_TEETH = buildArch("upper");
export const LOWER_TEETH = buildArch("lower");
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

/** Gum shapes: everything above/below the gum line, clipped to the cavity when drawn. */
function gumPolygon(gumY: (x: number) => number, edgeY: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= VIEW_W; x += 8) pts.push(`${x},${gumY(x).toFixed(1)}`);
  return `M0,${edgeY} L${pts.join(" L")} L${VIEW_W},${edgeY} Z`;
}
export const UPPER_GUM_PATH = gumPolygon(upperGumY, 0);
export const LOWER_GUM_PATH = gumPolygon(lowerGumY, VIEW_H);

const teethOf = (region: ToothRegion) => ALL_TEETH.filter((t) => t.region === region);
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** "back" zones = inner (tongue-side) surface of the front teeth. */
export const INNER_SIDE_OF: Partial<Record<ToothRegion, ToothRegion>> = {
  "upper-back": "upper-front",
  "lower-back": "lower-front",
};

/** Light "inside of the mouth" patch drawn behind see-through front teeth. */
export function palatePatch(region: ToothRegion): { x: number; y: number; w: number; h: number } | null {
  const inner = INNER_SIDE_OF[region];
  if (!inner) return null;
  const front = teethOf(inner);
  const x0 = Math.min(...front.map((t) => t.cx - t.width / 2)) - 4;
  const x1 = Math.max(...front.map((t) => t.cx + t.width / 2)) + 4;
  const ys = front.flatMap((t) => [t.gumY, t.tipY]);
  const y0 = Math.min(...ys) - 6;
  const y1 = Math.max(...ys) + 6;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const isInnerRegion = (region: ToothRegion | undefined) => !!region && region in INNER_SIDE_OF;

// ---------------------------------------------------------------------------
// Germs
// ---------------------------------------------------------------------------

export interface Germ {
  zoneIndex: number;
  /** Order in which germs of a zone pop. */
  indexInZone: number;
  countInZone: number;
  x: number;
  y: number;
  r: number;
  /** "back" germs sit behind the teeth (inner surfaces), visible when teeth go see-through. */
  layer: "front" | "back";
}

function germSpotsForZone(region: ToothRegion): Omit<Germ, "zoneIndex" | "indexInZone" | "countInZone">[] {
  if (region === "tongue") {
    return [
      { x: TONGUE.cx - 30, y: TONGUE.cy - 14, r: 8, layer: "front" },
      { x: TONGUE.cx, y: TONGUE.cy - 24, r: 8, layer: "front" },
      { x: TONGUE.cx + 30, y: TONGUE.cy - 14, r: 8, layer: "front" },
    ];
  }
  const inner = INNER_SIDE_OF[region];
  if (inner) {
    // Peek out between the gum and the biting edge of the front teeth.
    return teethOf(inner).map((t) => ({
      x: t.cx,
      y: t.arch === "upper" ? t.gumY + 10 : t.gumY - 10,
      r: 7,
      layer: "back" as const,
    }));
  }
  return teethOf(region).map((t) => ({
    x: t.cx,
    y: t.cy + (t.arch === "upper" ? 3 : -3),
    r: t.width > 28 ? 8 : 6.5,
    layer: "front" as const,
  }));
}

export const GERMS: Germ[] = BRUSHING_ZONES.flatMap((zone, zoneIndex) => {
  const spots = germSpotsForZone(zone.highlight[0]);
  return spots.map((spot, indexInZone) => ({
    ...spot,
    zoneIndex,
    indexInZone,
    countInZone: spots.length,
  }));
});

/**
 * Future zones keep all their germs, past zones are clean, and in the current
 * zone germ k of n pops once the zone is (k+1)/(n+1) done.
 */
export function isGermVisible(germ: Germ, currentZoneIndex: number, zoneProgress: number): boolean {
  if (germ.zoneIndex > currentZoneIndex) return true;
  if (germ.zoneIndex < currentZoneIndex) return false;
  return zoneProgress < (germ.indexInZone + 1) / (germ.countInZone + 1);
}

export const countVisibleGerms = (currentZoneIndex: number, zoneProgress: number) =>
  GERMS.filter((g) => isGermVisible(g, currentZoneIndex, zoneProgress)).length;

/** First zone that brushes this region's outer surface (used to make finished teeth sparkle). */
export const zoneIndexOfRegion = (region: ToothRegion) =>
  BRUSHING_ZONES.findIndex((z) => z.highlight.includes(region));

// ---------------------------------------------------------------------------
// Toothbrush poses
// ---------------------------------------------------------------------------

export interface BrushPose {
  x: number;
  y: number;
  /** SVG transform orienting the brush (drawn horizontally, bristles up, handle to the right). */
  orient: string;
  layer: "front" | "back";
  motion: "circles" | "scrub" | "flick" | "sweep";
  /** Visible handle length; short when the handle points at the viewer (inner surfaces). */
  handle: number;
}

export function brushPose(region: ToothRegion | undefined): BrushPose {
  if (!region || region === "tongue") {
    return { x: TONGUE.cx, y: TONGUE.cy - 14, orient: "scale(1,-1)", layer: "front", motion: "sweep", handle: 64 };
  }
  const inner = INNER_SIDE_OF[region];
  if (inner) {
    const front = teethOf(inner);
    const upper = inner.startsWith("upper");
    return {
      x: CX + 6,
      y: average(front.map((t) => (upper ? t.gumY + 14 : t.gumY - 14))),
      // Vertical brush behind the teeth, handle pointing out of the mouth.
      orient: upper ? "rotate(90)" : "rotate(-90)",
      layer: "back",
      motion: "flick",
      handle: 22,
    };
  }
  const teeth = teethOf(region);
  const upper = region.startsWith("upper");
  const side = region.endsWith("left") ? "left" : region.endsWith("right") ? "right" : "front";
  const x = average(teeth.map((t) => t.cx));

  if (side === "front") {
    return {
      x,
      y: average(teeth.map((t) => t.cy)),
      orient: upper ? "" : "scale(1,-1)",
      layer: "front",
      motion: "circles",
      handle: 64,
    };
  }
  // Molars: on the chewing surface, handle sticking out on that side of the mouth.
  const tip = average(teeth.map((t) => t.tipY));
  const flipX = side === "left" ? -1 : 1;
  const flipY = upper ? 1 : -1;
  return {
    x,
    y: upper ? tip + 8 : tip - 8,
    orient: `scale(${flipX},${flipY})`,
    layer: "front",
    motion: "scrub",
    handle: 64,
  };
}
