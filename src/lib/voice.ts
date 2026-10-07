import { QueueStrategy, TextToSpeech } from "@capacitor-community/text-to-speech";
import manifest from "@/data/voice-manifest.json";
import { isMuted, loadClip, playClip, stopClip, subscribeMuted } from "./sounds";

// Brillou's voice: pre-recorded ElevenLabs clips (public/voice, see
// scripts/generate-voice.mjs). Any sentence without a clip falls back to the
// phone's text-to-speech (native on Android; speechSynthesis in a browser).

const CLIPS: Record<string, string> = manifest;
const clipUrl = (file: string) => `${import.meta.env.BASE_URL}voice/${file}`;

// Increments on every speak/stop: only the latest request may produce sound.
let speechToken = 0;

function speakWithDevice(text: string) {
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

/** Say a sentence in French, cutting off anything Brillou was still saying. */
export function speak(text: string) {
  if (isMuted()) return;
  const token = ++speechToken;
  const file = CLIPS[text];
  if (!file) {
    speakWithDevice(text);
    return;
  }
  playClip(clipUrl(file), () => token === speechToken).then((played) => {
    if (!played && token === speechToken) speakWithDevice(text);
  });
}

export function stopSpeaking() {
  speechToken++;
  stopClip();
  try {
    TextToSpeech.stop().catch(() => {});
  } catch {
    // Nothing to stop.
  }
}

/** Load every clip ahead of time so the first sentences play without delay. */
export function preloadVoice() {
  Object.values(CLIPS).forEach((file) => void loadClip(clipUrl(file)));
}

// Muting also silences a sentence already in progress.
subscribeMuted((muted) => {
  if (muted) stopSpeaking();
});
