import { describe, it, expect } from "vitest";
import { BRUSHING_ZONES, TOTAL_DURATION, ZONE_STARTS, getZoneAt } from "./brushingZones";

describe("brushingZones", () => {
  it("lasts exactly 3 minutes", () => {
    expect(TOTAL_DURATION).toBe(180);
  });

  it("computes zone start times", () => {
    expect(ZONE_STARTS[0]).toBe(0);
    expect(ZONE_STARTS[1]).toBe(22);
    expect(ZONE_STARTS[BRUSHING_ZONES.length - 1]).toBe(180 - 12);
  });

  it("finds the zone for a given second, including boundaries", () => {
    expect(getZoneAt(0)).toEqual({ index: 0, zoneElapsed: 0 });
    expect(getZoneAt(21)).toEqual({ index: 0, zoneElapsed: 21 });
    expect(getZoneAt(22)).toEqual({ index: 1, zoneElapsed: 0 });
    expect(getZoneAt(170)).toEqual({ index: 8, zoneElapsed: 2 });
  });

  it("clamps after the end and before the start", () => {
    expect(getZoneAt(999)).toEqual({ index: 8, zoneElapsed: 12 });
    expect(getZoneAt(-5)).toEqual({ index: 0, zoneElapsed: 0 });
  });
});
