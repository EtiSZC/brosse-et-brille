import { describe, it, expect } from "vitest";
import {
  ALL_TEETH,
  GERMS,
  UPPER_TEETH,
  brushPose,
  countVisibleGerms,
  isGermVisible,
} from "./geometry";

describe("mouth geometry", () => {
  it("draws 8 teeth per arch: 2 left molars, 4 front, 2 right molars", () => {
    expect(ALL_TEETH).toHaveLength(16);
    expect(UPPER_TEETH.map((t) => t.region.replace("upper-", ""))).toEqual([
      "left", "left", "front", "front", "front", "front", "right", "right",
    ]);
  });

  it("follows the mirror convention: 'left' teeth are on the left of the screen", () => {
    const left = UPPER_TEETH.filter((t) => t.region === "upper-left");
    const right = UPPER_TEETH.filter((t) => t.region === "upper-right");
    expect(Math.max(...left.map((t) => t.cx))).toBeLessThan(Math.min(...right.map((t) => t.cx)));
  });
});

describe("germs", () => {
  it("places germs on every zone, inner surfaces on the back layer", () => {
    expect(GERMS).toHaveLength(27);
    const zone2 = GERMS.filter((g) => g.zoneIndex === 1); // "Derrière en haut"
    expect(zone2).toHaveLength(4);
    expect(zone2.every((g) => g.layer === "back")).toBe(true);
    expect(GERMS.filter((g) => g.zoneIndex === 8)).toHaveLength(3); // tongue
  });

  it("pops germs progressively through the current zone", () => {
    expect(countVisibleGerms(0, 0)).toBe(27);
    expect(countVisibleGerms(0, 0.21)).toBe(26); // first of 4 pops at 1/5
    expect(countVisibleGerms(0, 0.99)).toBe(23); // all 4 front-top germs gone
    expect(countVisibleGerms(8, 1)).toBe(0); // everything clean at the end
  });

  it("keeps future zones dirty and past zones clean", () => {
    const tongueGerm = GERMS.find((g) => g.zoneIndex === 8)!;
    const firstGerm = GERMS.find((g) => g.zoneIndex === 0)!;
    expect(isGermVisible(tongueGerm, 3, 0.5)).toBe(true);
    expect(isGermVisible(firstGerm, 3, 0.5)).toBe(false);
  });
});

describe("brush poses", () => {
  it("brushes inner surfaces from behind the teeth", () => {
    expect(brushPose("upper-back").layer).toBe("back");
    expect(brushPose("lower-back").layer).toBe("back");
    expect(brushPose("upper-front").layer).toBe("front");
  });

  it("uses the right gesture per zone", () => {
    expect(brushPose("upper-front").motion).toBe("circles");
    expect(brushPose("lower-left").motion).toBe("scrub");
    expect(brushPose("upper-back").motion).toBe("flick");
    expect(brushPose("tongue").motion).toBe("sweep");
  });

  it("points the handle out of the mouth on the molar side", () => {
    expect(brushPose("upper-left").orient).toContain("scale(-1");
    expect(brushPose("upper-right").orient).toContain("scale(1");
  });
});
