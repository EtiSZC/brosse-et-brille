import { describe, it, expect, vi, beforeEach } from "vitest";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { speak } from "./voice";
import { setMuted } from "./sounds";

vi.mock("@capacitor-community/text-to-speech", () => ({
  QueueStrategy: { Flush: 0, Add: 1 },
  TextToSpeech: { speak: vi.fn(() => Promise.resolve()), stop: vi.fn(() => Promise.resolve()) },
}));

describe("voice", () => {
  beforeEach(() => {
    setMuted(false);
    vi.mocked(TextToSpeech.speak).mockClear();
    vi.mocked(TextToSpeech.stop).mockClear();
  });

  it("speaks French and turns non-breaking spaces into normal ones", () => {
    speak("Bravo\u00A0!");
    expect(TextToSpeech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: "Bravo !", lang: "fr-FR" }));
  });

  it("stays silent when muted and cuts off speech when muting", () => {
    setMuted(true);
    expect(TextToSpeech.stop).toHaveBeenCalled();
    speak("Coucou");
    expect(TextToSpeech.speak).not.toHaveBeenCalled();
  });
});
