// Brushing history, streak and stickers — stored on the device only (no account,
// nothing sent anywhere). Data is keyed by profile from day one so child profiles
// can be added later; for now everything uses the "default" profile.

export type Slot = "morning" | "evening";

export interface Session {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  slot: Slot;
}

interface ProfileData {
  sessions: Session[];
  /** Sticker ids in the order they were earned. */
  stickers: string[];
}

interface ProgressData {
  version: 1;
  profiles: Record<string, ProfileData>;
}

const STORAGE_KEY = "brosse-brille:progress:v1";
export const DEFAULT_PROFILE = "default";

/** The collection: one random not-yet-earned sticker per new morning/evening slot. Never germ-themed. */
export const STICKERS = [
  { id: "unicorn", emoji: "🦄", name: "Licorne" },
  { id: "rocket", emoji: "🚀", name: "Fusée" },
  { id: "rainbow", emoji: "🌈", name: "Arc-en-ciel" },
  { id: "whale", emoji: "🐳", name: "Baleine" },
  { id: "dino", emoji: "🦖", name: "Dino" },
  { id: "strawberry", emoji: "🍓", name: "Fraise" },
  { id: "octopus", emoji: "🐙", name: "Pieuvre" },
  { id: "butterfly", emoji: "🦋", name: "Papillon" },
  { id: "balloon", emoji: "🎈", name: "Ballon" },
  { id: "turtle", emoji: "🐢", name: "Tortue" },
  { id: "sunflower", emoji: "🌻", name: "Tournesol" },
  { id: "bee", emoji: "🐝", name: "Abeille" },
  { id: "lion", emoji: "🦁", name: "Lion" },
  { id: "icecream", emoji: "🍦", name: "Glace" },
  { id: "palette", emoji: "🎨", name: "Palette" },
  { id: "penguin", emoji: "🐧", name: "Pingouin" },
  { id: "fox", emoji: "🦊", name: "Renard" },
  { id: "planet", emoji: "🪐", name: "Planète" },
  { id: "dolphin", emoji: "🐬", name: "Dauphin" },
  { id: "trophy", emoji: "🏆", name: "Trophée" },
] as const;

export type Sticker = (typeof STICKERS)[number];

// ---------------------------------------------------------------------------
// Dates (local time)
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const slotOf = (d: Date): Slot => (d.getHours() < 14 ? "morning" : "evening");

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const emptyProfile = (): ProfileData => ({ sessions: [], stickers: [] });

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as ProgressData;
      if (data?.version === 1 && data.profiles) return data;
    }
  } catch {
    // Blocked or corrupted storage: start fresh (the app still works, just without memory).
  }
  return { version: 1, profiles: {} };
}

function saveProgress(data: ProgressData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode / full): keep going without saving.
  }
}

export function getProfile(profile = DEFAULT_PROFILE, data = loadProgress()): ProfileData {
  return data.profiles[profile] ?? emptyProfile();
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface SessionResult {
  slot: Slot;
  /** Sticker earned by this session, or null if this slot was already filled (or the album is complete). */
  newSticker: Sticker | null;
  streak: number;
}

/**
 * Record a completed 3-minute session. Brushing twice in the same slot counts once.
 * The sticker is drawn at random among those not earned yet (`random` is injectable for tests).
 */
export function recordSession(now = new Date(), profile = DEFAULT_PROFILE, random = Math.random): SessionResult {
  const data = loadProgress();
  const p = getProfile(profile, data);
  const session: Session = { date: toDay(now), slot: slotOf(now) };
  const alreadyFilled = p.sessions.some((s) => s.date === session.date && s.slot === session.slot);

  let newSticker: Sticker | null = null;
  if (!alreadyFilled) {
    p.sessions.push(session);
    const remaining = STICKERS.filter((s) => !p.stickers.includes(s.id));
    newSticker = remaining.length ? remaining[Math.floor(random() * remaining.length)] : null;
    if (newSticker) p.stickers.push(newSticker.id);
  }
  data.profiles[profile] = p;
  saveProgress(data);
  return { slot: session.slot, newSticker, streak: streakOf(p.sessions, now) };
}

/**
 * Forgiving streak: consecutive days with at least one session (one slot is
 * enough). Today not brushed yet doesn't break it — counting starts yesterday.
 */
export function streakOf(sessions: Session[], now = new Date()): number {
  const days = new Set(sessions.map((s) => s.date));
  let cursor = days.has(toDay(now)) ? new Date(now) : addDays(now, -1);
  let streak = 0;
  while (days.has(toDay(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface WeekDay {
  date: string;
  /** Short French label: L, M, M, J, V, S, D. */
  label: string;
  isToday: boolean;
  isFuture: boolean;
  morning: boolean;
  evening: boolean;
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** Current week, Monday → Sunday, with which slots were brushed. */
export function weekOf(sessions: Session[], now = new Date()): WeekDay[] {
  const mondayOffset = (now.getDay() + 6) % 7; // getDay: 0 = Sunday
  const monday = addDays(now, -mondayOffset);
  const today = toDay(now);
  return DAY_LABELS.map((label, i) => {
    const date = toDay(addDays(monday, i));
    return {
      date,
      label,
      isToday: date === today,
      isFuture: date > today,
      morning: sessions.some((s) => s.date === date && s.slot === "morning"),
      evening: sessions.some((s) => s.date === date && s.slot === "evening"),
    };
  });
}
