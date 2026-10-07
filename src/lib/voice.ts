import { QueueStrategy, TextToSpeech } from "@capacitor-community/text-to-speech";
import { isMuted, subscribeMuted } from "./sounds";

// Brillou's voice. On Android this uses the phone's native text-to-speech engine
// (the WebView has no speechSynthesis); in a browser the plugin falls back to it.

/** Say a sentence in French, cutting off anything Brillou was still saying. */
export function speak(text: string) {
  if (isMuted()) return;
  try {
    TextToSpeech.speak({
      text: text.replace(/\u00A0/g, " "),
      lang: "fr-FR",
      rate: 0.95,
      pitch: 1.15,
      volume: 1,
      queueStrategy: QueueStrategy.Flush,
    }).catch(() => {});
  } catch {
    // No speech engine available: the app keeps working without voice.
  }
}

export function stopSpeaking() {
  try {
    TextToSpeech.stop().catch(() => {});
  } catch {
    // Nothing to stop.
  }
}

// Muting also silences a sentence already in progress.
subscribeMuted((muted) => {
  if (muted) stopSpeaking();
});
