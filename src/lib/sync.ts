// Phone-to-phone sync without any server: each phone shows its state as a QR
// code, the other scans it and merges. Merging is a union (brushings and
// stickers are never removed), so syncing both ways makes the phones identical.
import {
  AVATARS,
  MAX_PROFILES,
  STICKERS,
  toDay,
  type ProfileData,
  type ProgressData,
  type Session,
} from "./progress";

export const SYNC_PREFIX = "BB1";
/** Only recent brushings travel in the QR (older ones are already shared by previous syncs). */
export const SYNC_WINDOW_DAYS = 400;

interface WireProfile {
  /** id */
  i: string;
  /** name */
  n: string;
  /** avatar index in AVATARS */
  a: number;
  /** first day of the bitmap, in days since 1970-01-01 */
  d: number;
  /** 2 bits per day (bit 0 = morning, bit 1 = evening), base64url */
  s: string;
  /** sticker bitmask (bit n = STICKERS[n]) */
  k: number;
}

interface WireState {
  v: 1;
  p: WireProfile[];
}

export interface RemoteProfile {
  id: string;
  name: string;
  avatar: string;
  sessions: Session[];
  stickers: string[];
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
const dayString = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

/** JSON with every non-ASCII character escaped, so any QR scanner reads it the same way. */
const asciiJson = (value: unknown) =>
  JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

function encodeProfile(id: string, name: string, avatar: string, history: ProfileData, fromDay: number): WireProfile {
  const days = history.sessions.map((s) => dayNumber(s.date)).filter((d) => d >= fromDay);
  const first = days.length ? Math.min(...days) : 0;
  const last = days.length ? Math.max(...days) : -1;
  const bytes = new Uint8Array(Math.ceil((last - first + 1) / 4));
  for (const s of history.sessions) {
    const d = dayNumber(s.date);
    if (d < fromDay) continue;
    const bit = (d - first) * 2 + (s.slot === "evening" ? 1 : 0);
    bytes[bit >> 3] |= 1 << (bit & 7);
  }
  const k = history.stickers.reduce((mask, id) => {
    const i = STICKERS.findIndex((s) => s.id === id);
    return i >= 0 ? mask | (1 << i) : mask;
  }, 0);
  return { i: id, n: name, a: Math.max(0, AVATARS.indexOf(avatar)), d: first, s: toBase64Url(bytes), k };
}

/** This phone's state as the text to put in the QR code. */
export function encodeState(data: ProgressData, now = new Date()): string {
  const fromDay = dayNumber(toDay(now)) - SYNC_WINDOW_DAYS;
  const wire: WireState = {
    v: 1,
    p: data.profiles.map((p) => encodeProfile(p.id, p.name, p.avatar, data.data[p.id] ?? { sessions: [], stickers: [] }, fromDay)),
  };
  return SYNC_PREFIX + asciiJson(wire);
}

/** `ok` with the profiles, or not `ok` with a message for the parent (no union: the project is not in strict mode). */
export interface DecodeResult {
  ok: boolean;
  profiles: RemoteProfile[];
  error: string;
}

const INVALID: DecodeResult = { ok: false, profiles: [], error: "Ce code ne vient pas de Brosse & Brille, ou il est abîmé." };

/** Strict reading of a scanned code: anything unexpected is refused. */
export function decodeState(text: string): DecodeResult {
  if (!text?.startsWith(SYNC_PREFIX) || text.length > 4000) return INVALID;
  let wire: WireState;
  try {
    wire = JSON.parse(text.slice(SYNC_PREFIX.length));
  } catch {
    return INVALID;
  }
  if (wire?.v !== 1 || !Array.isArray(wire.p) || wire.p.length < 1 || wire.p.length > MAX_PROFILES) return INVALID;

  const profiles: RemoteProfile[] = [];
  for (const w of wire.p) {
    const valid =
      typeof w?.i === "string" && /^[\w-]{1,40}$/.test(w.i) &&
      typeof w.n === "string" && w.n.length <= 20 &&
      Number.isInteger(w.a) && w.a >= 0 && w.a < AVATARS.length &&
      Number.isInteger(w.d) && w.d >= 0 &&
      typeof w.s === "string" && /^[\w-]{0,1000}$/.test(w.s) &&
      Number.isInteger(w.k) && w.k >= 0 && w.k < 2 ** STICKERS.length;
    if (!valid) return INVALID;

    const sessions: Session[] = [];
    let bytes: Uint8Array;
    try {
      bytes = fromBase64Url(w.s);
    } catch {
      return INVALID;
    }
    bytes.forEach((byte, i) => {
      for (let b = 0; b < 8; b++) {
        if (byte & (1 << b)) {
          const bit = i * 8 + b;
          sessions.push({ date: dayString(w.d + (bit >> 1)), slot: bit & 1 ? "evening" : "morning" });
        }
      }
    });
    const stickers = STICKERS.filter((_, i) => w.k & (1 << i)).map((s) => s.id);
    profiles.push({ id: w.i, name: w.n, avatar: AVATARS[w.a], sessions, stickers });
  }
  return { ok: true, profiles, error: "" };
}

// ---------------------------------------------------------------------------
// Matching and merging
// ---------------------------------------------------------------------------

/** "  Léa " and "lea" are the same child. */
export const normalizeName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

/** For each remote child: the local child it is, or "add" (new on this phone), or "ignore". */
export type MatchTarget = { kind: "local"; id: string } | { kind: "add" } | { kind: "ignore" };
export interface Match {
  remote: RemoteProfile;
  target: MatchTarget;
}

/** Default matching: same id (already synced before), else same name, else add if there is room. */
export function suggestMatches(local: ProgressData, remote: RemoteProfile[]): Match[] {
  const taken = new Set<string>();
  let room = MAX_PROFILES - local.profiles.length;
  const pick = (r: RemoteProfile): MatchTarget => {
    const byId = local.profiles.find((p) => p.id === r.id && !taken.has(p.id));
    const byName = local.profiles.find(
      (p) => !taken.has(p.id) && p.name && normalizeName(p.name) === normalizeName(r.name),
    );
    const found = byId ?? byName;
    if (found) {
      taken.add(found.id);
      return { kind: "local", id: found.id };
    }
    if (room > 0) {
      room--;
      return { kind: "add" };
    }
    return { kind: "ignore" };
  };
  // Id matches first, so a name match can't steal an already-synced child.
  const byIdFirst = [...remote].sort((a, b) => Number(!local.profiles.some((p) => p.id === b.id)) - Number(!local.profiles.some((p) => p.id === a.id)));
  const targets = new Map(byIdFirst.map((r) => [r.id, pick(r)]));
  return remote.map((r) => ({ remote: r, target: targets.get(r.id)! }));
}

export interface MergeSummaryItem {
  id: string;
  name: string;
  avatar: string;
  isNew: boolean;
  addedSessions: number;
  addedStickers: number;
}

const sessionKey = (s: Session) => `${s.date}|${s.slot}`;
const bySession = (a: Session, b: Session) => sessionKey(a).localeCompare(sessionKey(b));

/** Union merge (never removes anything). Returns a new state; `local` is not modified. */
export function mergeState(local: ProgressData, matches: Match[]): { data: ProgressData; summary: MergeSummaryItem[] } {
  const data: ProgressData = structuredClone(local);
  const summary: MergeSummaryItem[] = [];

  for (const { remote, target } of matches) {
    if (target.kind === "ignore") continue;

    if (target.kind === "add") {
      if (data.profiles.length >= MAX_PROFILES || data.profiles.some((p) => p.id === remote.id)) continue;
      data.profiles.push({ id: remote.id, name: remote.name, avatar: remote.avatar });
      data.data[remote.id] = { sessions: [...remote.sessions].sort(bySession), stickers: [...remote.stickers] };
      summary.push({ id: remote.id, name: remote.name, avatar: remote.avatar, isNew: true, addedSessions: remote.sessions.length, addedStickers: remote.stickers.length });
      continue;
    }

    // Same child: both phones converge on the smaller id.
    const finalId = target.id < remote.id ? target.id : remote.id;
    if (finalId !== target.id) {
      data.profiles = data.profiles.map((p) => (p.id === target.id ? { ...p, id: finalId } : p));
      data.data[finalId] = data.data[target.id] ?? { sessions: [], stickers: [] };
      delete data.data[target.id];
      data.active = data.active.map((id) => (id === target.id ? finalId : id));
    }
    const mine = data.data[finalId] ?? { sessions: [], stickers: [] };
    const known = new Set(mine.sessions.map(sessionKey));
    const newSessions = remote.sessions.filter((s) => !known.has(sessionKey(s)));
    const newStickers = remote.stickers.filter((s) => !mine.stickers.includes(s));
    data.data[finalId] = {
      sessions: [...mine.sessions, ...newSessions].sort(bySession),
      stickers: [...mine.stickers, ...newStickers],
    };
    const meta = data.profiles.find((p) => p.id === finalId)!;
    summary.push({ id: finalId, name: meta.name, avatar: meta.avatar, isNew: false, addedSessions: newSessions.length, addedStickers: newStickers.length });
  }
  return { data, summary };
}
