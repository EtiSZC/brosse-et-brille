import { describe, it, expect, vi } from "vitest";
import { isMuted, setMuted, subscribeMuted, playFanfare, unlockAudio } from "./sounds";

describe("sounds mute setting", () => {
  it("persists to localStorage and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMuted(listener);

    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem("brosse-brille:muted")).toBe("1");
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    setMuted(false);
    expect(localStorage.getItem("brosse-brille:muted")).toBe("0");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Web Audio is unavailable (jsdom)", () => {
    expect(() => playFanfare()).not.toThrow();
  });

  it("asks iPhone Safari to play like a media app (silent switch doesn't mute)", () => {
    const audioSession = { type: "auto" };
    Object.defineProperty(navigator, "audioSession", { value: audioSession, configurable: true });
    unlockAudio();
    expect(audioSession.type).toBe("playback");
    delete (navigator as unknown as Record<string, unknown>).audioSession;
  });
});
