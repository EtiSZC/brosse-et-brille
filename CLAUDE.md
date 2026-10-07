# Brosse & Brille

A playful PWA that guides children (ages 3–8) through a 3-minute tooth-brushing session with the mascot **Brillou**. UI language is **French**. Originally scaffolded in Lovable (project `5e07ab90-e764-4e9b-8721-6225fc74815b`, "Sparkle Brush Buddy"), mirrored to the private GitHub repo `EtiSZC/quenottes`; now developed locally.

**Git:** this project's repo is `EtiSZC/brosse-et-brille` (private, remote `origin`). Never push to or add `EtiSZC/quenottes` as a remote — it is only a read-only source for binary assets.

## Commands

```bash
npm install
npm run dev       # http://localhost:8080
npm run build     # production build + PWA service worker (dist/)
npm test          # vitest (jsdom)
npm run lint
node scripts/screenshots.mjs [--quick]   # with dev server running: phone screenshots of every zone → screenshots/ (real time: ~3 min, --quick ~35 s)
```

Don't use Playwright's fake clock (`page.clock`) for visual checks: it desyncs framer-motion's `AnimatePresence`, so zone changes and the pause overlay don't render. Unit tests use vitest fake timers and are fine. The start button "breathes", so Playwright must click it with `{ force: true }`.

## Android app (Capacitor)

`android/` is a Capacitor 8 native project (app id `com.etiszc.brosseetbrille`, portrait only) that packages `dist/` into an APK. Toolchain on this Mac: Java 21 (`brew openjdk@21`, keg-only) and the Android SDK at `/opt/homebrew/share/android-commandlinetools` (platform 36, build-tools 36). Target phone: Samsung Galaxy A55 (Android 16), connected over USB with debugging on.

```bash
npm run android   # build web → cap sync → gradle assembleDebug → adb install → launch
```

Icons and splash are generated from `assets/logo.png` (Brillou) with `npx @capacitor/assets generate --android --iconBackgroundColor '#DFF7F0' --splashBackgroundColor '#DFF7F0'`. Fonts are bundled via `@fontsource` (no network needed at runtime).

## Brillou's voice (ElevenLabs)

Clips are generated once and bundled (offline, nothing sent at runtime). Voice **Lily** (`pFZP5JQG7iQjIQuC4Bku`), model `eleven_multilingual_v2`, stability 0.45 / similarity 0.8 / style 0.35 — chosen by the user on 2026-10-07.

```bash
node scripts/generate-voice.mjs   # after editing any instruction / line; only new or changed sentences are generated
```

- API key in `.env.local` (`ELEVENLABS_API_KEY`, git-ignored, never bundled — no `VITE_` prefix). The key lacks the "Voices: Read" permission.
- Account is on the **free plan** (10,000 chars/month; the 12 lines ≈ 500 chars). Free plan: only default voices via API, and **no commercial use** — upgrade and regenerate before publishing the app.
- A test fails if a sentence in `VOICE_LINES` has no clip (forgot to run the script).
- Write non-breaking spaces as `\u00A0` in code (French typography before "!"); a raw NBSP character fails lint (`no-irregular-whitespace`).

## Stack

React 18 + TypeScript, Vite 5, Tailwind 3 + shadcn/ui (only `button`, `toast`, `toaster`, `sonner`, `tooltip` are kept — add others with `npx shadcn add <name>`), framer-motion, canvas-confetti, vite-plugin-pwa. No backend, no persistence yet. Path alias `@/` → `src/`.

## Architecture

- `src/pages/Index.tsx` — state machine: `home` → `brushing` → `celebration`.
- `src/components/BathroomBackground.tsx` — shared "candy bathroom" scene (tiles, optional tint, rising bubbles, foam). Every screen renders inside it.
- `src/components/HomeScreen.tsx` — sticker title, Brillou + speech bubble, breathing 72px start button (`size="xl"`).
- `src/components/BrushingScreen.tsx` — timestamp-based timer (`Date.now()` deltas, survives pauses), zone via `getZoneAt()` and phase via `getPhaseAt()` (fractional seconds), pause overlay (✕ and ⏸ both open it; "Arrêter" there cancels), auto-pause on `visibilitychange`, Wake Lock. At 3:00 shows "Bravo, tout brille !" + sparkle wave for 1.8 s, then `onComplete` (once). Layout: small parent timer, `BubbleTimer`, `MouthDiagram` + `MiniMap`, Brillou + `SpeechBubble` with the phase instruction.
- `src/components/mouth/geometry.ts` — pure, unit-tested logic: smile view (10 teeth per arch: 3 molars, 4 front, 3 molars; molars have cusps), top-down arch view (`ARCH_TEETH`), `targetIndices`, `spotlightWindow`, `zoomViewBox` (1.9× on molars for "side" phases), `brushPlan`/`brushPosition` (ping-pong path across every target tooth, molars back→front), `isSurfaceShiny` (matte → shiny when the brush's first pass reaches a tooth).
- `src/components/mouth/MouthDiagram.tsx` — renders a step: `SmileView` (front / inside with see-through teeth and brush behind / zoomed molar side, zoom = animated SVG `viewBox`) or `ArchView` (top-down chewing surfaces); spotlight = ink veil 30% clipped to the mouth with a sliding window + sunshine corner frame; target teeth mint outline + glow + one "boing"; card-flip when the drawing changes; sparkle wave when finished.
- `src/lib/voice.ts` — Brillou's voice: `speak()` plays the pre-recorded ElevenLabs clip for that sentence (via `playClip` on the shared, tap-unlocked `AudioContext`); sentences without a clip fall back to `@capacitor-community/text-to-speech` (native Android TTS / browser `speechSynthesis`, fr-FR). Only the latest request may speak (`speechToken`); follows mute; `preloadVoice()` decodes all clips when brushing starts.
- `src/data/voiceLines.ts` — every sentence Brillou says (derived from the zone instructions + finish/celebration lines). `src/data/voice-manifest.json` maps each sentence to its clip in `public/voice/`.
- `src/components/Countdown.tsx` — 3-2-1 badge over the mouth during the last 3 s of each step/view (with `playTick`).
- `src/components/SideMarker.tsx` — pulsing sunshine arrow on the edge of the screen for the side being brushed (back-teeth steps).
- `src/components/mouth/MiniMap.tsx` — tiny 2×3 map of the mouth showing the current area (dashed row = inside, ▲ = top).
- `src/components/BubbleTimer.tsx` — 8 bubbles in 2 groups of 4 (blue upper / peach lower) filling up, then a star. `role="progressbar"`.
- `src/components/CelebrationScreen.tsx` — brand-colour confetti, fanfare, stars, restart.
- `src/components/MuteButton.tsx`, `SpeechBubble.tsx` — small shared UI.
- `src/components/ui/button.tsx` — candy 3D buttons (solid darker edge that collapses on press). Variants set colours only, sizes set dimensions.
- `src/data/brushingZones.ts` — 8 zones, each with `phases[]` (`view`: front / inside / side / top, duration, instruction). Molar zones = side 11 s + top 12 s. Hue family upper 200 / lower 25. Durations sum to 180 s. Instructions use a non-breaking space before "!".
- `src/lib/sounds.ts` — WebAudio synthesized sounds on one shared `AudioContext`; `unlockAudio()` must be called inside a user tap (iOS); mute persisted in localStorage.
- `src/hooks/use-wake-lock.ts` — Screen Wake Lock, re-requested when the page becomes visible.
- `src/index.css` — palette tokens (mint, bubblegum, sunshine, ink, tile), also exposed as Tailwind colours; `.bathroom-tiles`, `.bubble`, `.sticker-title`, squash-and-stretch `.mascot-bounce`, `.breathe`.

## Known issues

- Binary assets (mascots, favicon) can't be read through the Lovable API (they come back corrupted); fetch them from the GitHub mirror instead: `gh api -H "Accept: application/vnd.github.raw" repos/EtiSZC/quenottes/contents/<path>`.
- Tests: recent Node shadows jsdom's `localStorage`; `src/test/setup.ts` installs an in-memory one.

## Product principles (keep)

- One tap to start, 3 minutes, 8 steps in order per arch: outside → inside → back teeth left (cheek side, then top) → back teeth right; upper then lower. No tongue step.
- Guidance must work for **pre-readers**: visual and audio first, text secondary.
- Screen is **propped on the sink, ~60 cm away**: large, glanceable elements.
- Mirror convention: screen-left = child's left.
- **Privacy**: no accounts, no tracking, no third-party SDKs; all data stays on device (COPPA / GDPR-K).
- **No dark patterns**: no ads, currency, loot boxes, guilt ("Brillou est triste"), streak punishment, or extra screen time after brushing. No scoring of brushing quality.

## Restore points (git tags)

| Tag | State |
|---|---|
| `v0.2-phone-test` | Phase 1 + Phase 2 (front-view mouth with germs, 9 zones incl. tongue, bubble timer, candy bathroom) + Android app (Capacitor, bundled fonts, Brillou icon). The version tested on the Galaxy A55 on 2026-10-07. |
| `v0.3-spotlight` | Phase 2b on top of v0.2: 8 steps (no tongue), spotlight + corner frame, brush travelling across every target tooth, matte → shiny teeth (no germs), 3 molars per side with zoomed cheek-side view and top-down chewing view, mini-map, 8-bubble timer. Installed on the Galaxy A55 on 2026-10-07. Last version before Phase 3 (voice guidance). |

To go back to a restore point:

```bash
git switch -c restore-v0.3 v0.3-spotlight     # new branch from a tag (keeps main untouched); or v0.2-phone-test
npm install
npm run dev        # web
npm run android    # rebuild + reinstall on the phone
```

## Roadmap (from design / PM / UX review)

1. ✅ **Foundations** (done 2026-10-06) — pause button + confirm to quit; Wake Lock; timestamp-based timer; single shared `AudioContext` unlocked on the start tap + mute toggle; contrast, reduced motion, zoom; fix canine bug.
2. ✅ **Visual overhaul** (done 2026-10-06, tag `v0.2-phone-test`) — front-facing "big smile" mouth (card-flip for inner surfaces); germs that pop + teeth that sparkle; 9-bubble visual timer (small mm:ss for parents); "candy bathroom" art direction (mint `#3CCFB4`, bubblegum `#FF7EB6`, sunshine `#FFD23F`, ink `#1E2A4A`); chunky 3D buttons; zone tints (upper blue / lower peach / tongue pink).
2b. ✅ **Phone-test feedback** (done 2026-10-07, tag `v0.3-spotlight`):
   - **No germs.** Teeth go from matte cream `#F2EBDD` to shiny white + glint as the brush passes; sparkle wave over the whole mouth at the end.
   - **Spotlight** on target teeth: ink veil ~30% with a window around them, other teeth at 55% opacity, target bright white + solid 4px mint outline + glow, sunshine `#FFD23F` 4-corner frame, one-time "boing"; window slides between steps; no pulsing.
   - **Brush covers the whole zone**: travels across every target tooth (ping-pong) with the gesture on top — circles (front), flicks gum→tip (inner), scrub (molar cheek side), flat slide (molar tops).
   - **Molars visible**: 3 molars per side in the front view (wider cavity); molar steps zoom ~1.9× on that side, then card-flip to a top-down view of the molars; mini-map of the mouth in a corner.
   - **No tongue step** (tongue drawn as neutral anatomy only).
   - **8 steps / 180 s**, same order per arch: Devant 22 s → Derrière (front + molars, inner side) 22 s → Fond gauche 23 s (cheek side 11 s, then top 12 s) → Fond droite 23 s; upper then lower. BubbleTimer: 8 bubbles in 2 groups of 4.
3. ✅ **Guidance** (done 2026-10-07, branch `phase-3-guidance`; awaiting phone test) — Brillou speaks each instruction (native TTS on Android), stops on pause and repeats on resume, "Bravo" at the end; 3-2-1 badge + tick before each step/view change; pulsing side arrow for back-teeth steps (words kept in the bubble for parents).
4. **Retention** — sun/moon weekly calendar (localStorage, per-profile data model); sticker album (not germ-themed); forgiving streaks; end CTA "À ce soir !" instead of "Recommencer".
5. **Later** — Brillou poses (needs illustration), child profiles, gated parent corner, optional local reminders, music mode, signed release build for Google Play.
