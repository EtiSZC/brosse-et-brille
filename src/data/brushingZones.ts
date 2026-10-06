export interface BrushingZone {
  id: number;
  label: string;
  emoji: string;
  instruction: string;
  durationSeconds: number;
  /** Which teeth regions to highlight on the diagram */
  highlight: ToothRegion[];
  /** Arrow direction for the mascot gesture */
  arrowDirection: "up" | "down" | "left" | "right" | "rotate" | "tongue";
  /** Background colour family (HSL hue): upper = blue 200, lower = peach 25, tongue = pink 340 */
  hue: number;
}

export type ToothRegion =
  | "upper-front"
  | "upper-back"
  | "upper-left"
  | "upper-right"
  | "lower-front"
  | "lower-back"
  | "lower-left"
  | "lower-right"
  | "tongue";

export const BRUSHING_ZONES: BrushingZone[] = [
  { id: 1, label: "Devant en haut", emoji: "⬆️", instruction: "Brosse le devant des dents du haut !", durationSeconds: 22, highlight: ["upper-front"], arrowDirection: "up", hue: 200 },
  { id: 2, label: "Derrière en haut", emoji: "🔄", instruction: "Maintenant, le derrière des dents du haut !", durationSeconds: 22, highlight: ["upper-back"], arrowDirection: "rotate", hue: 200 },
  { id: 3, label: "Molaires haut gauche", emoji: "◀️", instruction: "Frotte bien les molaires en haut à gauche !", durationSeconds: 20, highlight: ["upper-left"], arrowDirection: "left", hue: 200 },
  { id: 4, label: "Molaires haut droite", emoji: "▶️", instruction: "Et celles en haut à droite !", durationSeconds: 20, highlight: ["upper-right"], arrowDirection: "right", hue: 200 },
  { id: 5, label: "Devant en bas", emoji: "⬇️", instruction: "On passe en bas ! Devant d'abord !", durationSeconds: 22, highlight: ["lower-front"], arrowDirection: "down", hue: 25 },
  { id: 6, label: "Derrière en bas", emoji: "🔄", instruction: "Et le derrière des dents du bas !", durationSeconds: 22, highlight: ["lower-back"], arrowDirection: "rotate", hue: 25 },
  { id: 7, label: "Molaires bas gauche", emoji: "◀️", instruction: "Les molaires en bas à gauche !", durationSeconds: 20, highlight: ["lower-left"], arrowDirection: "left", hue: 25 },
  { id: 8, label: "Molaires bas droite", emoji: "▶️", instruction: "Et celles en bas à droite !", durationSeconds: 20, highlight: ["lower-right"], arrowDirection: "right", hue: 25 },
  { id: 9, label: "La langue !", emoji: "👅", instruction: "N'oublie pas de brosser ta langue !", durationSeconds: 12, highlight: ["tongue"], arrowDirection: "tongue", hue: 340 },
];

// Total = 180 seconds = 3 minutes
export const TOTAL_DURATION = BRUSHING_ZONES.reduce((sum, z) => sum + z.durationSeconds, 0);

/** Second at which each zone starts: [0, 22, 44, ...]. */
export const ZONE_STARTS = BRUSHING_ZONES.map((_, i) =>
  BRUSHING_ZONES.slice(0, i).reduce((sum, z) => sum + z.durationSeconds, 0),
);

/**
 * Zone index and seconds spent in it, derived from total elapsed seconds.
 * Returns the last zone (fully elapsed) once the session is over.
 */
export function getZoneAt(elapsedSeconds: number): { index: number; zoneElapsed: number } {
  const t = Math.max(0, elapsedSeconds);
  for (let i = BRUSHING_ZONES.length - 1; i >= 0; i--) {
    if (t >= ZONE_STARTS[i]) {
      return {
        index: i,
        zoneElapsed: Math.min(t - ZONE_STARTS[i], BRUSHING_ZONES[i].durationSeconds),
      };
    }
  }
  return { index: 0, zoneElapsed: 0 };
}
