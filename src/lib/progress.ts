// Brushing history, streak and stickers per child profile — stored on the device
// only (no account, nothing sent anywhere). Up to 4 profiles (first name/nickname
// + animal avatar); one or several can be "active" (brushing together).

export type Slot = "morning" | "evening";

export interface Session {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  slot: Slot;
}

export interface ProfileData {
  sessions: Session[];
  /** Sticker ids in the order they were earned. */
  stickers: string[];
}

export interface ProfileMeta {
  id: string;
  /** First name or nickname; may be empty (e.g. the profile migrated from v1). */
  name: string;
  avatar: string;
}

export interface ProgressData {
  version: 2;
  profiles: ProfileMeta[];
  data: Record<string, ProfileData>;
  /** Profiles brushing right now (several = brushing together). */
  active: string[];
}

/** v1 (single child) — read once for migration, never deleted (restore point v0.5 still finds it). */
interface ProgressDataV1 {
  version: 1;
  profiles: Record<string, ProfileData>;
}

const STORAGE_KEY = "brosse-brille:progress:v2";
const LEGACY_KEY_V1 = "brosse-brille:progress:v1";
export const DEFAULT_PROFILE = "default";
export const MAX_PROFILES = 4;
export const AVATARS = ["🦊", "🐼", "🐯", "🐰", "🐸", "🐨", "🦁", "🐧"];

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
const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // blocked or corrupted storage
  }
};

/** Random profile id, unique per install (never the legacy shared "default"). */
export const newProfileId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Keep the data usable whatever happened: ≥ 1 profile, unique ids (never the legacy
 * "default" id that every install used to share — it made the QR sync pair the wrong
 * profiles), valid active selection. Returns whether ids had to be repaired.
 */
function repair(data: ProgressData): boolean {
  let changed = false;
  if (!data.profiles.length) {
    data.profiles = [{ id: newProfileId(), name: "", avatar: AVATARS[0] }];
    changed = true;
  }
  const seen = new Set<string>();
  data.profiles = data.profiles.map((p) => {
    const duplicate = seen.has(p.id);
    if (p.id !== DEFAULT_PROFILE && !duplicate) {
      seen.add(p.id);
      return p;
    }
    // Legacy shared id, or two profiles sharing one id: give a fresh id. A duplicate gets
    // a copy of the shared history so no sticker or brushing is lost.
    const id = newProfileId();
    seen.add(id);
    data.data[id] = structuredClone(data.data[p.id] ?? emptyProfile());
    if (!duplicate) {
      delete data.data[p.id];
      data.active = data.active.map((a) => (a === p.id ? id : a));
    }
    changed = true;
    return { ...p, id };
  });
  data.active = data.active.filter((id) => seen.has(id));
  if (!data.active.length) data.active = [data.profiles[0].id];
  return changed;
}

function normalize(data: ProgressData): ProgressData {
  repair(data);
  return data;
}

export function loadProgress(): ProgressData {
  const v2 = readJson<ProgressData>(STORAGE_KEY);
  if (v2?.version === 2 && Array.isArray(v2.profiles) && v2.data) {
    // Repaired ids are saved at once, so every later read sees the same ids.
    if (repair(v2)) saveProgress(v2);
    return v2;
  }

  // First run of this version: migrate the single-child history if there is one
  // (the v1 key is left untouched, so the v0.5 app still finds it).
  const v1 = readJson<ProgressDataV1>(LEGACY_KEY_V1);
  const data: ProgressData = {
    version: 2,
    profiles: [{ id: DEFAULT_PROFILE, name: "", avatar: AVATARS[0] }],
    data: v1?.version === 1 && v1.profiles ? { ...v1.profiles } : {},
    active: [DEFAULT_PROFILE],
  };
  repair(data);
  saveProgress(data);
  return data;
}

function saveProgress(data: ProgressData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode / full): keep going without saving.
  }
}

/** Replace the whole state (used by phone-to-phone sync), repaired by `normalize()`. */
export function replaceProgress(data: ProgressData) {
  saveProgress(normalize(data));
}

/** History of one profile (the first active one by default). */
export function getProfile(profile?: string, data = loadProgress()): ProfileData {
  return data.data[profile ?? data.active[0]] ?? emptyProfile();
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const listProfiles = (): ProfileMeta[] => loadProgress().profiles;

/** Name shown on screen ("Moi" for the unnamed profile migrated from v1). */
export const displayName = (p: ProfileMeta) => p.name || "Moi";

/** "Léa", "Léa et Tom", "Léa, Tom et Zoé" — empty when nobody has a name yet. */
export function joinNames(profiles: ProfileMeta[]): string {
  const names = profiles.map((p) => p.name).filter(Boolean);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

export function getActiveProfiles(): ProfileMeta[] {
  const data = loadProgress();
  return data.active.map((id) => data.profiles.find((p) => p.id === id)!);
}

export function setActiveProfiles(ids: string[]) {
  const data = loadProgress();
  data.active = ids;
  saveProgress(normalize(data));
}

/** Returns the new profile, or null when the maximum is reached. */
export function addProfile(name: string, avatar: string): ProfileMeta | null {
  const data = loadProgress();
  if (data.profiles.length >= MAX_PROFILES) return null;
  const profile = { id: newProfileId(), name: name.trim(), avatar };
  data.profiles.push(profile);
  data.data[profile.id] = emptyProfile();
  saveProgress(data);
  return profile;
}

export function updateProfile(id: string, patch: Partial<Pick<ProfileMeta, "name" | "avatar">>) {
  const data = loadProgress();
  const profile = data.profiles.find((p) => p.id === id);
  if (!profile) return;
  if (patch.name !== undefined) profile.name = patch.name.trim();
  if (patch.avatar !== undefined) profile.avatar = patch.avatar;
  saveProgress(data);
}

const sessionKey = (s: Session) => `${s.date}|${s.slot}`;

/** Union of two histories: each brushing once (sorted), every sticker of both, no duplicate. Never removes anything. */
export function unionHistory(a: ProfileData, b: ProfileData): ProfileData {
  const known = new Set(a.sessions.map(sessionKey));
  const sessions = [...a.sessions, ...b.sessions.filter((s) => !known.has(sessionKey(s)))].sort((x, y) =>
    sessionKey(x).localeCompare(sessionKey(y)),
  );
  return { sessions, stickers: [...new Set([...a.stickers, ...b.stickers])] }; // also drops any old duplicate
}

/**
 * Two profiles that are the same child (e.g. a "Moi" that received a child's stickers
 * through an old sync, plus the same child created by hand): everything goes into `keepId`,
 * then `removeId` is deleted. Returns false if either profile is missing.
 */
export function mergeProfiles(keepId: string, removeId: string): boolean {
  const data = loadProgress();
  if (keepId === removeId || !data.profiles.some((p) => p.id === keepId) || !data.profiles.some((p) => p.id === removeId)) return false;
  data.data[keepId] = unionHistory(data.data[keepId] ?? emptyProfile(), data.data[removeId] ?? emptyProfile());
  data.profiles = data.profiles.filter((p) => p.id !== removeId);
  delete data.data[removeId];
  data.active = [...new Set(data.active.map((id) => (id === removeId ? keepId : id)))];
  saveProgress(normalize(data));
  return true;
}

/** Deletes a profile and its history. The last remaining profile can't be deleted. */
export function deleteProfile(id: string): boolean {
  const data = loadProgress();
  if (data.profiles.length <= 1 || !data.profiles.some((p) => p.id === id)) return false;
  data.profiles = data.profiles.filter((p) => p.id !== id);
  delete data.data[id];
  saveProgress(normalize(data));
  return true;
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
export function recordSession(now = new Date(), profile?: string, random = Math.random): SessionResult {
  const data = loadProgress();
  const id = profile ?? data.active[0];
  const p = getProfile(id, data);
  const session: Session = { date: toDay(now), slot: slotOf(now) };
  const alreadyFilled = p.sessions.some((s) => s.date === session.date && s.slot === session.slot);

  let newSticker: Sticker | null = null;
  if (!alreadyFilled) {
    p.sessions.push(session);
    const remaining = STICKERS.filter((s) => !p.stickers.includes(s.id));
    newSticker = remaining.length ? remaining[Math.floor(random() * remaining.length)] : null;
    if (newSticker) p.stickers.push(newSticker.id);
  }
  data.data[id] = p;
  saveProgress(data);
  return { slot: session.slot, newSticker, streak: streakOf(p.sessions, now) };
}

export interface ProfileSessionResult extends SessionResult {
  profile: ProfileMeta;
}

/** Brushing together: one session counts for each child, each with their own sticker draw. */
export function recordSessions(ids?: string[], now = new Date(), random = Math.random): ProfileSessionResult[] {
  const data = loadProgress();
  const targets = (ids ?? data.active).filter((id) => data.profiles.some((p) => p.id === id));
  return targets.map((id) => ({
    ...recordSession(now, id, random),
    profile: data.profiles.find((p) => p.id === id)!,
  }));
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
