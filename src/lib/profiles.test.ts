import { describe, it, expect, beforeEach } from "vitest";
import {
  AVATARS,
  MAX_PROFILES,
  addProfile,
  deleteProfile,
  getActiveProfiles,
  getProfile,
  listProfiles,
  recordSession,
  recordSessions,
  setActiveProfiles,
  updateProfile,
} from "./progress";

const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0);
const V1 = "brosse-brille:progress:v1";

describe("child profiles", () => {
  beforeEach(() => localStorage.clear());

  it("migrates the single-child v1 history into the first profile, keeping the v1 data", () => {
    const v1 = { version: 1, profiles: { default: { sessions: [{ date: "2026-10-07", slot: "morning" }], stickers: ["unicorn"] } } };
    localStorage.setItem(V1, JSON.stringify(v1));
    const [first] = listProfiles();
    expect(first).toMatchObject({ name: "", avatar: AVATARS[0] });
    expect(first.id).toMatch(/^p[0-9a-z]+$/); // unique per install, never the old shared "default"
    expect(listProfiles()[0].id).toBe(first.id); // the new id is saved: stable across reads
    expect(getProfile(first.id).stickers).toEqual(["unicorn"]);
    recordSession(at(7, 20)); // first write saves v2
    expect(JSON.parse(localStorage.getItem(V1)!)).toEqual(v1); // untouched for a rollback to v0.5
  });

  it("adds, renames and deletes profiles; max 4; the last one can't be deleted", () => {
    const lea = addProfile("  Léa ", "🦊")!;
    expect(lea.name).toBe("Léa");
    addProfile("Tom", "🐼");
    addProfile("Zoé", "🐰");
    expect(listProfiles()).toHaveLength(MAX_PROFILES);
    expect(addProfile("Trop", "🐸")).toBeNull();

    updateProfile(lea.id, { name: "Léonie", avatar: "🐯" });
    expect(listProfiles().find((p) => p.id === lea.id)).toMatchObject({ name: "Léonie", avatar: "🐯" });

    for (const p of listProfiles().slice(1)) expect(deleteProfile(p.id)).toBe(true);
    expect(listProfiles()).toHaveLength(1);
    expect(deleteProfile(listProfiles()[0].id)).toBe(false);
  });

  it("keeps each child's history separate, and deletes it with the profile", () => {
    const lea = addProfile("Léa", "🦊")!;
    const tom = addProfile("Tom", "🐼")!;
    recordSession(at(7, 8), lea.id);
    expect(getProfile(lea.id).sessions).toHaveLength(1);
    expect(getProfile(tom.id).sessions).toHaveLength(0);
    deleteProfile(lea.id);
    expect(getProfile(lea.id).sessions).toHaveLength(0);
  });

  it("brushing together gives each child their own slot and their own sticker", () => {
    const lea = addProfile("Léa", "🦊")!;
    const tom = addProfile("Tom", "🐼")!;
    const results = recordSessions([lea.id, tom.id], at(7, 20));
    expect(results.map((r) => r.profile.name)).toEqual(["Léa", "Tom"]);
    expect(results.every((r) => r.newSticker !== null && r.slot === "evening")).toBe(true);
    expect(getProfile(lea.id).stickers).toHaveLength(1);
    expect(getProfile(tom.id).stickers).toHaveLength(1);
  });

  it("remembers who is brushing, and falls back if an active child is deleted", () => {
    const lea = addProfile("Léa", "🦊")!;
    const tom = addProfile("Tom", "🐼")!;
    setActiveProfiles([lea.id, tom.id]);
    expect(getActiveProfiles().map((p) => p.name)).toEqual(["Léa", "Tom"]);
    deleteProfile(lea.id);
    deleteProfile(tom.id);
    expect(getActiveProfiles()).toHaveLength(1); // falls back to the remaining profile
  });

  it("gives a stored 'default' profile a unique id once, keeping its history, album and active selection", () => {
    localStorage.setItem("brosse-brille:progress:v2", JSON.stringify({
      version: 2,
      profiles: [{ id: "default", name: "Léa", avatar: "🦊" }, { id: "pTom", name: "Tom", avatar: "🐼" }],
      data: { default: { sessions: [{ date: "2026-10-07", slot: "morning" }], stickers: ["unicorn"] }, pTom: { sessions: [], stickers: ["lion"] } },
      active: ["default"],
    }));
    const [lea, tom] = listProfiles();
    expect(lea.id).not.toBe("default");
    expect(listProfiles()[0].id).toBe(lea.id); // saved: same id on every read
    expect(getProfile(lea.id)).toEqual({ sessions: [{ date: "2026-10-07", slot: "morning" }], stickers: ["unicorn"] });
    expect(getActiveProfiles().map((p) => p.name)).toEqual(["Léa"]);
    expect(getProfile(tom.id).stickers).toEqual(["lion"]);
  });

  it("splits two profiles sharing one id, each keeping a copy of the album (nothing lost)", () => {
    localStorage.setItem("brosse-brille:progress:v2", JSON.stringify({
      version: 2,
      profiles: [{ id: "pSame", name: "Léa", avatar: "🦊" }, { id: "pSame", name: "Tom", avatar: "🐼" }],
      data: { pSame: { sessions: [], stickers: ["unicorn", "lion"] } },
      active: ["pSame"],
    }));
    const [a, b] = listProfiles();
    expect(a.id).not.toBe(b.id);
    expect(getProfile(a.id).stickers).toEqual(["unicorn", "lion"]);
    expect(getProfile(b.id).stickers).toEqual(["unicorn", "lion"]);
  });
});
