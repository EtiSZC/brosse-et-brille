import { describe, it, expect, beforeEach } from "vitest";
import { STICKERS, getProfile, recordSession, slotOf, streakOf, weekOf, type Session } from "./progress";

// Local-time dates (month is 0-based): Wednesday 7 October 2026.
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0);

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("splits the day into morning (before 2 pm) and evening", () => {
    expect(slotOf(at(7, 7))).toBe("morning");
    expect(slotOf(at(7, 13))).toBe("morning");
    expect(slotOf(at(7, 19))).toBe("evening");
  });

  it("awards one sticker per new slot, in collection order", () => {
    const first = recordSession(at(7, 7));
    expect(first).toMatchObject({ slot: "morning", newSticker: STICKERS[0] });
    const second = recordSession(at(7, 20));
    expect(second.newSticker).toEqual(STICKERS[1]);
    expect(getProfile().stickers).toEqual([STICKERS[0].id, STICKERS[1].id]);
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
    expect(recordSession(at(7, 7)).newSticker).toEqual(STICKERS[0]);
  });
});
