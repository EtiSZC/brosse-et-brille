import { describe, it, expect } from "vitest";
import { STICKERS, getProfile, recordSession, replaceProgress, toDay, type ProgressData, type Session } from "./progress";
import { SYNC_PREFIX, decodeState, encodeState, findLosses, mergeState, normalizeName, suggestMatches } from "./sync";

const NOW = new Date(2026, 9, 11, 9);
const day = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return toDay(d);
};
const state = (profiles: { id: string; name: string; avatar?: string; sessions?: Session[]; stickers?: string[] }[]): ProgressData => ({
  version: 2,
  profiles: profiles.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar ?? "🦊" })),
  data: Object.fromEntries(profiles.map((p) => [p.id, { sessions: p.sessions ?? [], stickers: p.stickers ?? [] }])),
  active: [profiles[0].id],
});
const decode = (text: string) => {
  const r = decodeState(text);
  if (!r.ok) throw new Error(r.error);
  return r.profiles;
};
/** Phone `local` scans phone `remote` and merges with the default matches. */
const sync = (local: ProgressData, remote: ProgressData) => mergeState(local, suggestMatches(local, decode(encodeState(remote, NOW)))).data;
const history = (d: ProgressData) =>
  Object.fromEntries(
    d.profiles.map((p) => [normalizeName(p.name), { s: d.data[p.id].sessions.map((s) => `${s.date}${s.slot}`).sort(), k: [...d.data[p.id].stickers].sort() }]),
  );

describe("sync payload", () => {
  it("round-trips history, stickers and accented names", () => {
    const sessions: Session[] = [
      { date: day(-3), slot: "evening" },
      { date: day(-1), slot: "morning" },
      { date: day(0), slot: "morning" },
    ];
    const text = encodeState(state([{ id: "pabc", name: "Léa", avatar: "🐼", sessions, stickers: ["lion", "unicorn"] }]), NOW);
    expect(text.startsWith(SYNC_PREFIX)).toBe(true);
    expect(/^[\x20-\x7e]+$/.test(text)).toBe(true); // pure ASCII for any scanner
    const [p] = decode(text);
    expect(p).toMatchObject({ id: "pabc", name: "Léa", avatar: "🐼" });
    expect(p.sessions).toEqual(sessions);
    expect(p.stickers.sort()).toEqual(["lion", "unicorn"]);
  });

  it("stays small: 4 children brushing twice a day for 2 years fit in one QR", () => {
    const full: Session[] = [];
    for (let i = 0; i < 730; i++) full.push({ date: day(-i), slot: "morning" }, { date: day(-i), slot: "evening" });
    const kids = ["Léa", "Tom", "Zoé", "Noé"].map((name, i) => ({ id: `p${i}xxxxxxxx`, name, sessions: full, stickers: STICKERS.map((s) => s.id) }));
    expect(encodeState(state(kids), NOW).length).toBeLessThan(1000);
  });

  it("refuses anything that isn't a valid Brosse & Brille code", () => {
    const good = encodeState(state([{ id: "pabc", name: "Léa" }]), NOW);
    const json = JSON.parse(good.slice(SYNC_PREFIX.length));
    const tamper = (patch: (j: typeof json) => void) => {
      const j = structuredClone(json);
      patch(j);
      return SYNC_PREFIX + JSON.stringify(j);
    };
    for (const bad of [
      "https://example.com",
      SYNC_PREFIX + "{not json",
      tamper((j) => (j.v = 2)),
      tamper((j) => (j.p = [j.p[0], j.p[0], j.p[0], j.p[0], j.p[0]])),
      tamper((j) => (j.p[0].a = 99)),
      tamper((j) => (j.p[0].i = "<script>")),
      tamper((j) => (j.p[0].k = 2 ** 25)),
    ]) {
      expect(decodeState(bad).ok).toBe(false);
    }
  });
});

describe("sync merge", () => {
  const phoneA = () =>
    state([
      { id: "pzzz", name: "Léa", sessions: [{ date: day(-2), slot: "morning" }], stickers: ["unicorn"] },
      { id: "pyyy", name: "Tom", sessions: [], stickers: [] },
    ]);
  const phoneB = () =>
    state([
      { id: "paaa", name: " lea ", sessions: [{ date: day(-2), slot: "evening" }, { date: day(-2), slot: "morning" }], stickers: ["rocket"] },
      { id: "pbbb", name: "TOM", sessions: [{ date: day(-1), slot: "evening" }], stickers: ["lion"] },
    ]);

  it("matches children by name, ignoring accents, case and spaces", () => {
    const m = suggestMatches(phoneA(), decode(encodeState(phoneB(), NOW)));
    expect(m.map((x) => x.target)).toEqual([
      { kind: "local", id: "pzzz" },
      { kind: "local", id: "pyyy" },
    ]);
  });

  it("is a union: nothing is lost, stickers included", () => {
    const merged = sync(phoneA(), phoneB());
    const lea = merged.data[merged.profiles.find((p) => p.name === "Léa")!.id];
    expect(lea.sessions).toHaveLength(2);
    expect(lea.stickers.sort()).toEqual(["rocket", "unicorn"]);
  });

  it("is idempotent and gives the same history in both directions", () => {
    const a1 = sync(phoneA(), phoneB());
    expect(history(sync(a1, phoneB()))).toEqual(history(a1)); // scanning again changes nothing
    const b1 = sync(phoneB(), a1); // B scans A's updated code
    expect(history(b1)).toEqual(history(a1));
  });

  it("converges on the same ids, so the next sync matches by id", () => {
    const a1 = sync(phoneA(), phoneB());
    const b1 = sync(phoneB(), a1);
    expect(a1.profiles.map((p) => p.id).sort()).toEqual(["paaa", "pbbb"]);
    expect(b1.profiles.map((p) => p.id).sort()).toEqual(["paaa", "pbbb"]);
    expect(a1.active).toEqual(["paaa"]); // the active child follows the rename
  });

  it("keeps each phone's own names and avatars", () => {
    const a1 = sync(phoneA(), phoneB());
    expect(a1.profiles.map((p) => p.name)).toEqual(["Léa", "Tom"]);
  });

  it("adds a child that only exists on the other phone (when there is room), never beyond 4", () => {
    const remote = state([{ id: "pnew", name: "Zoé", stickers: ["bee"] }]);
    const merged = sync(phoneA(), remote);
    expect(merged.profiles.map((p) => p.name)).toEqual(["Léa", "Tom", "Zoé"]);
    const full = state(["A", "B", "C", "D"].map((n, i) => ({ id: `p${i}`, name: n })));
    expect(suggestMatches(full, decode(encodeState(remote, NOW)))[0].target).toEqual({ kind: "ignore" });
  });

  it("doesn't let a name match steal a child already synced by id", () => {
    const local = state([{ id: "p1", name: "Léa" }, { id: "p2", name: "Léa" }]);
    const remote = decode(encodeState(state([{ id: "p9", name: "Léa" }, { id: "p2", name: "Léa" }]), NOW));
    const m = suggestMatches(local, remote);
    expect(m.find((x) => x.remote.id === "p2")!.target).toEqual({ kind: "local", id: "p2" });
    expect(m.find((x) => x.remote.id === "p9")!.target).toEqual({ kind: "local", id: "p1" });
  });
});

describe("sticker safety (a sync never loses a sticker)", () => {
  const album = (d: ProgressData, name: string) => [...d.data[d.profiles.find((p) => normalizeName(p.name) === normalizeName(name))!.id].stickers].sort();
  const lea = (id: string, stickers: string[], sessions: Session[] = []) => state([{ id, name: "Léa", sessions, stickers }]);

  it("a phone that is behind catches up, and the up-to-date phone loses nothing", () => {
    const ahead = lea("pa", ["unicorn", "rocket", "lion"]);
    const behind = lea("pb", ["unicorn"]);
    expect(album(sync(behind, ahead), "Léa")).toEqual(["lion", "rocket", "unicorn"]);
    expect(album(sync(ahead, behind), "Léa")).toEqual(["lion", "rocket", "unicorn"]);
  });

  it("different albums on each phone: after both scans, both have every sticker", () => {
    const a = lea("pa", ["unicorn", "rocket"]);
    const b = lea("pb", ["lion", "bee"]);
    const a1 = sync(a, b); // A scans B
    const b1 = sync(b, a1); // B scans A's updated code ("À votre tour")
    const union = ["bee", "lion", "rocket", "unicorn"];
    expect(album(a1, "Léa")).toEqual(union);
    expect(album(b1, "Léa")).toEqual(union);
    const { summary } = mergeState(a, suggestMatches(a, decode(encodeState(b, NOW))));
    expect(summary[0].addedStickers).toBe(2);
  });

  it("same brushing on both phones with a different sticker drawn: both stickers are kept, no duplicate", () => {
    const slot: Session[] = [{ date: day(-1), slot: "morning" }];
    const a1 = sync(lea("pa", ["lion"], slot), lea("pb", ["bee"], slot));
    const k = a1.data[a1.profiles[0].id];
    expect(k.stickers.sort()).toEqual(["bee", "lion"]);
    expect(new Set(k.stickers).size).toBe(k.stickers.length);
    expect(k.sessions).toHaveLength(1); // the brushing itself counts once
  });

  it("an ignored child, or one that doesn't fit (4 profiles), leaves this phone's albums untouched", () => {
    const local = lea("pa", ["unicorn", "rocket"]);
    const remote = decode(encodeState(lea("pb", ["lion"]), NOW));
    const ignored = mergeState(local, [{ remote: remote[0], target: { kind: "ignore" } }]).data;
    expect(ignored.data).toEqual(local.data);

    const full = state(["A", "B", "C", "D"].map((n, i) => ({ id: `p${i}`, name: n, stickers: ["bee"] })));
    const zoe = decode(encodeState(state([{ id: "pz", name: "Zoé", stickers: ["fox"] }]), NOW));
    expect(sync(full, state([{ id: "pz", name: "Zoé", stickers: ["fox"] }])).data).toEqual(full.data);
    expect(suggestMatches(full, zoe)[0].target).toEqual({ kind: "ignore" });
  });

  it("a complete album (20/20) reaches the other phone, which then draws no duplicate", () => {
    const all = STICKERS.map((s) => s.id);
    const b1 = sync(lea("pb", ["unicorn", "rocket"]), lea("pa", all));
    expect(album(b1, "Léa")).toHaveLength(20);
    replaceProgress(b1);
    const id = b1.profiles[0].id;
    expect(recordSession(new Date(2026, 9, 11, 20), id).newSticker).toBeNull();
    expect(new Set(getProfile(id).stickers).size).toBe(20);
  });

  it("the safety net detects any loss (stickers, brushings, a renamed child)", () => {
    const before = lea("pb", ["unicorn", "lion"], [{ date: day(-1), slot: "evening" }]);
    const shrunk = lea("pb", ["unicorn"], []);
    expect(findLosses(before, shrunk)).toEqual(["Léa: autocollant lion", `Léa: brossage ${day(-1)} soir`]);
    const renamed = lea("pa", ["unicorn", "lion"], [{ date: day(-1), slot: "evening" }]);
    expect(findLosses(before, renamed, { pb: "pa" })).toEqual([]);
    expect(findLosses(before, renamed)).toEqual(["Léa: profil disparu"]);
  });
});
