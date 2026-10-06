// Simple sound synthesis - no external dependencies needed.
// A single shared AudioContext is used: browsers (Safari especially) cap how many
// can exist, and iOS only lets a context play once it was resumed inside a user tap.

const MUTE_KEY = "brosse-brille:muted";

let ctx: AudioContext | null = null;
let muted = readMuted();
const muteListeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCtx(): AudioContext | null {
  if (!ctx) {
    // Older Safari only exposes the prefixed constructor.
    const AudioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture (tap) so later, timer-driven sounds are allowed on iOS. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  // Playing a silent one-sample buffer inside the gesture fully unlocks iOS Safari.
  const buffer = c.createBuffer(1, 1, 22050);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(0);
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode): keep the in-memory value only.
  }
  muteListeners.forEach((listener) => listener(value));
}

export function subscribeMuted(listener: (muted: boolean) => void) {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', startTime = 0) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0.15, c.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + startTime + duration);

  osc.start(c.currentTime + startTime);
  osc.stop(c.currentTime + startTime + duration);
}

export function playFanfare() {
  // A cheerful ascending fanfare
  const notes = [
    { freq: 523.25, time: 0, dur: 0.15 },    // C5
    { freq: 659.25, time: 0.15, dur: 0.15 },  // E5
    { freq: 783.99, time: 0.3, dur: 0.15 },   // G5
    { freq: 1046.5, time: 0.45, dur: 0.4 },   // C6 (long)
  ];

  notes.forEach(n => playTone(n.freq, n.dur, 'triangle', n.time));
}

export function playStarSound() {
  // A twinkling star sound
  playTone(1200, 0.1, 'sine', 0);
  playTone(1600, 0.1, 'sine', 0.08);
  playTone(2000, 0.15, 'sine', 0.15);
}

export function playZoneComplete() {
  // Short happy chime for zone transition
  playTone(800, 0.1, 'triangle', 0);
  playTone(1000, 0.15, 'triangle', 0.1);
}

export function playStartSound() {
  // Playful start sound
  playTone(400, 0.1, 'square', 0);
  playTone(500, 0.1, 'square', 0.1);
  playTone(600, 0.1, 'square', 0.2);
  playTone(800, 0.2, 'square', 0.3);
}
