import { describe, it, expect, beforeEach } from "vitest";
import { HALLOWEEN_STICKERS, STICKERS, getProfile, isHalloweenSeason, recordSession, slotOf, streakOf, weekOf, type Session } from "./progress";

// Local-time dates (month is 0-based): Wednesday 7 October 2026.
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0);

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("splits the day into morning (before 2 pm) and evening", () => {
    expect(slotOf(at(7, 7))).toBe("morning");
    expect(slotOf(at(7, 13))).toBe("morning");
    expect(slotOf(at(7, 19))).toBe("evening");
  });

  it("awards one random, not-yet-earned sticker per new slot", () => {
    const first = recordSession(at(7, 7), undefined, () => 0.99); // last of the 20
    expect(first).toMatchObject({ slot: "morning", newSticker: STICKERS[19] });
    const second = recordSession(at(7, 20), undefined, () => 0); // first of the remaining 19
    expect(second.newSticker).toEqual(STICKERS[0]);
    expect(getProfile().stickers).toEqual([STICKERS[19].id, STICKERS[0].id]);
  });

  it("never gives the same sticker twice, and stops once the album is complete", () => {
    for (let day = 1; day <= 10; day++) {
      recordSession(at(day, 8));
      recordSession(at(day, 20));
    }
    const earned = getProfile().stickers;
    expect(earned).toHaveLength(20);
    expect(new Set(earned).size).toBe(20);
    expect(recordSession(at(11, 8)).newSticker).toBeNull();
  });

  it("counts brushing twice in the same slot only once (no extra sticker)", () => {
    recordSession(at(7, 7));
    const again = recordSession(at(7, 8));
    expect(again.newSticker).toBeNull();
    expect(getProfile().sessions).toHaveLength(1);
  });

  it("keeps a forgiving streak: one slot a day is enough, today not done yet doesn't break it", () => {
    const sessions: Session[] = [
      { date: "2026-10-04", slot: "evening" },
      { date: "2026-10-05", slot: "morning" },
      { date: "2026-10-06", slot: "evening" },
    ];
    expect(streakOf(sessions, at(7, 7))).toBe(3); // nothing yet today
    expect(streakOf([...sessions, { date: "2026-10-07", slot: "morning" }], at(7, 8))).toBe(4);
    expect(streakOf([{ date: "2026-10-04", slot: "morning" }], at(7, 7))).toBe(0); // a full day missed
  });

  it("builds the current week from Monday to Sunday", () => {
    const week = weekOf([{ date: "2026-10-07", slot: "evening" }], at(7, 21));
    expect(week.map((d) => d.date)).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(week[2]).toMatchObject({ label: "M", isToday: true, morning: false, evening: true });
    expect(week[3].isFuture).toBe(true);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("brosse-brille:progress:v1", "{not json");
    expect(recordSession(at(7, 7), undefined, () => 0).newSticker).toEqual(STICKERS[0]);
  });
});

describe("Halloween stickers (only during the season)", () => {
  beforeEach(() => localStorage.clear());
  const date = (month: number, day: number, hour = 8) => new Date(2026, month, day, hour);
  const allClassics = () => {
    for (let d = 1; d <= 10; d++) {
      recordSession(date(8, d, 8)); // September: classics only
      recordSession(date(8, d, 20));
    }
    expect(getProfile().stickers).toHaveLength(STICKERS.length);
  };

  it("the season runs from 15 October to 2 November, every year", () => {
    expect(isHalloweenSeason(date(9, 14, 23))).toBe(false);
    expect(isHalloweenSeason(date(9, 15, 0))).toBe(true);
    expect(isHalloweenSeason(date(9, 31))).toBe(true);
    expect(isHalloweenSeason(date(10, 2, 23))).toBe(true);
    expect(isHalloweenSeason(date(10, 3, 0))).toBe(false);
    expect(isHalloweenSeason(new Date(2027, 9, 20))).toBe(true);
  });

  it("a child with every classic gets a Halloween sticker in season, nothing after it", () => {
    allClassics();
    const october = recordSession(date(9, 20), undefined, () => 0);
    expect(october.newSticker).toEqual(HALLOWEEN_STICKERS[0]);
    expect(recordSession(date(10, 10)).newSticker).toBeNull();
    expect(getProfile().stickers).toContain(HALLOWEEN_STICKERS[0].id); // kept after the season
  });

  it("in season, Halloween stickers come first, then the classics once all are won", () => {
    for (let i = 0; i < HALLOWEEN_STICKERS.length; i++) {
      const r = recordSession(date(9, 15 + Math.floor(i / 2), i % 2 ? 20 : 8));
      expect(HALLOWEEN_STICKERS.some((h) => h.id === r.newSticker?.id)).toBe(true);
    }
    expect(new Set(getProfile().stickers).size).toBe(HALLOWEEN_STICKERS.length);
    const next = recordSession(date(9, 31, 20));
    expect(STICKERS.some((c) => c.id === next.newSticker?.id)).toBe(true);
  });

  it("outside the season only classics are drawn; once all 35 are won, nothing more", () => {
    for (let i = 0; i < STICKERS.length; i++) {
      const r = recordSession(date(8, 1 + Math.floor(i / 2), i % 2 ? 20 : 8));
      expect(STICKERS.some((c) => c.id === r.newSticker?.id)).toBe(true);
    }
    for (let i = 0; i < HALLOWEEN_STICKERS.length; i++) recordSession(date(9, 15 + Math.floor(i / 2), i % 2 ? 20 : 8));
    expect(getProfile().stickers).toHaveLength(STICKERS.length + HALLOWEEN_STICKERS.length);
    expect(recordSession(date(10, 1, 20)).newSticker).toBeNull();
  });

  it("brushing twice in the same slot still earns a single sticker", () => {
    recordSession(date(9, 20, 8));
    expect(recordSession(date(9, 20, 9)).newSticker).toBeNull();
    expect(getProfile().stickers).toHaveLength(1);
  });
});
