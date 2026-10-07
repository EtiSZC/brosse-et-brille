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

Built APKs are copied to `releases/` (git-ignored, kept locally) as `brosse-et-brille-vX.Y-debug.apk` + a `.sha256` checksum:

| File | Built from | Content |
|---|---|---|
| `releases/brosse-et-brille-v0.5-debug.apk` | `main` @ `d54f1cd` (code of `f719fab`), 2026-10-07 | Phases 1–4: spotlight mouth, Lily voice, calendar, random stickers. Debug-signed: install with `adb install -r <file>` (or copy to the phone and allow installs from unknown sources). |
| `releases/brosse-et-brille-v0.6-debug.apk` | `main` @ `25c2490` (code of `2b2e162`), 2026-10-07 | v0.5 + child profiles (up to 4, picker, brushing together, parents screen behind a 2 s hold), plural Lily line. |

Icons and splash are generated from `assets/logo.png` (Brillou) with `npx @capacitor/assets generate --android --iconBackgroundColor '#DFF7F0' --splashBackgroundColor '#DFF7F0'`. Fonts are bundled via `@fontsource` (no network needed at runtime).

## Brillou's voice (ElevenLabs)

Clips are generated once and bundled (offline, nothing sent at runtime). Voice **Lily** (`pFZP5JQG7iQjIQuC4Bku`), model `eleven_multilingual_v2`, stability 0.45 / similarity 0.8 / style 0.35 — chosen by the user on 2026-10-07.

```bash
node scripts/generate-voice.mjs   # after editing any instruction / line; only new or changed sentences are generated
```

- API keys in `.env.local` (`ELEVENLABS_API_KEY` for TTS, `ELEVENLABS_MUSIC_API_KEY`; git-ignored, never bundled — no `VITE_` prefix). The Music API needs a paid plan (HTTP 402 on free), so the music mode is synthesized in code instead.
- Account is on the **free plan** (10,000 chars/month; the 12 lines ≈ 500 chars). Free plan: only default voices via API, and **no commercial use** — upgrade and regenerate before publishing the app.
- A test fails if a sentence in `VOICE_LINES` has no clip (forgot to run the script).
- Write non-breaking spaces as `\u00A0` in code (French typography before "!"); a raw NBSP character fails lint (`no-irregular-whitespace`).

## Stack

React 18 + TypeScript, Vite 5, Tailwind 3 + shadcn/ui (only `button`, `toast`, `toaster`, `sonner`, `tooltip` are kept — add others with `npx shadcn add <name>`), framer-motion, canvas-confetti, vite-plugin-pwa. No backend, no persistence yet. Path alias `@/` → `src/`.

## Architecture

- `src/pages/Index.tsx` — state machine: `who` (picker, start screen when ≥ 2 profiles) → `home` → `brushing` → `celebration`, plus `album` and `parents`. On completion it calls `recordSessions()` (one entry per active child) and passes the results to the celebration.
- `src/components/BathroomBackground.tsx` — shared "candy bathroom" scene (tiles, optional tint, rising bubbles, foam). Every screen renders inside it.
- `src/components/HomeScreen.tsx` — sticker title, Brillou + speech bubble, `WeekCalendar` + streak, 📒 album button (top right, sticker-count badge), breathing 72px start button (`size="xl"`).
- `src/components/BrushingScreen.tsx` — timestamp-based timer (`Date.now()` deltas, survives pauses), zone via `getZoneAt()` and phase via `getPhaseAt()` (fractional seconds), pause overlay (✕ and ⏸ both open it; "Arrêter" there cancels), auto-pause on `visibilitychange`, Wake Lock. At 3:00 shows "Bravo, tout brille !" + sparkle wave for 1.8 s, then `onComplete` (once). Layout: small parent timer, `BubbleTimer`, `MouthDiagram` + `MiniMap`, Brillou + `SpeechBubble` with the phase instruction.
- `src/components/mouth/geometry.ts` — pure, unit-tested logic: smile view (10 teeth per arch: 3 molars, 4 front, 3 molars; molars have cusps), top-down arch view (`ARCH_TEETH`), `targetIndices`, `spotlightWindow`, `zoomViewBox` (1.9× on molars for "side" phases), `brushPlan`/`brushPosition` (ping-pong path across every target tooth, molars back→front), `isSurfaceShiny` (matte → shiny when the brush's first pass reaches a tooth).
- `src/components/mouth/MouthDiagram.tsx` — renders a step: `SmileView` (front / inside with see-through teeth and brush behind / zoomed molar side, zoom = animated SVG `viewBox`) or `ArchView` (top-down chewing surfaces); spotlight = ink veil 30% clipped to the mouth with a sliding window + sunshine corner frame; target teeth mint outline + glow + one "boing"; card-flip when the drawing changes; sparkle wave when finished.
- `src/lib/voice.ts` — Brillou's voice: `speak()` plays the pre-recorded ElevenLabs clip for that sentence (via `playClip` on the shared, tap-unlocked `AudioContext`); sentences without a clip fall back to `@capacitor-community/text-to-speech` (native Android TTS / browser `speechSynthesis`, fr-FR). Only the latest request may speak (`speechToken`); follows mute; `preloadVoice()` decodes all clips when brushing starts.
- `src/data/voiceLines.ts` — every sentence Brillou says (derived from the zone instructions + finish/celebration lines). `src/data/voice-manifest.json` maps each sentence to its clip in `public/voice/`.
- `src/components/Countdown.tsx` — 3-2-1 badge over the mouth during the last 3 s of each step/view (with `playTick`).
- `src/components/SideMarker.tsx` — pulsing sunshine arrow on the edge of the screen for the side being brushed (back-teeth steps).
- `src/components/mouth/MiniMap.tsx` — tiny 2×3 map of the mouth showing the current area (dashed row = inside, ▲ = top).
- `src/components/BubbleTimer.tsx` — 8 bubbles in 2 groups of 4 (blue upper / peach lower) filling up, then a star. `role="progressbar"`.
- `src/components/CelebrationScreen.tsx` — brand-colour confetti, fanfare, Lily's "Bravo", new-sticker card (or stars + kind note if the slot was already filled), CTA "☀️ À ce soir !" (morning) / "🌙 À demain !" (evening) back to home, "📒 Mon album".
- `src/lib/progress.ts` — on-device history per child (localStorage `brosse-brille:progress:v2`: `profiles` [{id, name, avatar}], `data` per profile, `active` ids). Migrates the v1 single-child key on first run **without deleting it** (so the v0.5 APK still finds its data). Profiles: `addProfile` (max 4, 8 animal `AVATARS`), `updateProfile`, `deleteProfile` (never the last one), `setActiveProfiles`, `recordSessions` (brushing together: one slot + one sticker draw per child), `displayName` / `joinNames`. `recordSession` (morning < 14 h ≤ evening; one session and one random not-yet-earned sticker per slot), forgiving `streakOf` (≥ 1 slot per day; today not done yet doesn't break it), `weekOf` (Monday → Sunday), 20 `STICKERS` (never germ-themed). Unit-tested.
- `src/components/ProfilePicker.tsx` — "Qui se brosse les dents ?": one tap = one child; "Brosser ensemble" = multi-select; parents gate.
- `src/components/ParentsScreen.tsx` — add / rename / avatar / delete (with confirmation) profiles. Reached only through `LongPressButton` (hold 2 s; touch, mouse and keyboard).
- Home: active-profile chip (≥ 2 profiles), greeting with the name, one compact line per child when brushing together, "⚙︎ Parents" gate at the bottom. Album: one tab per child. Celebration: "Bravo Léa et Tom !", one sticker card per child, plural voice line.
- `src/components/WeekCalendar.tsx` — ☀️/🌙 per day for the current week, today outlined, streak chip ("🔥 3 jours de suite !").
- `src/components/StickerAlbum.tsx` — 4-column grid of the 20 stickers (earned vs dashed "?"), counter, back button.
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
- **Privacy**: no accounts, no tracking, no third-party SDKs; all data stays on device (COPPA / GDPR-K). Child profiles hold only a first name/nickname and an emoji avatar — no photo, age or surname.
- **No dark patterns**: no ads, currency, loot boxes, guilt ("Brillou est triste"), streak punishment, or extra screen time after brushing. No scoring of brushing quality. Brushing twice in the same slot never earns an extra sticker; the end of a session points back to the next brushing ("À ce soir !"), not to more screen time.

## Restore points (git tags)

| Tag | State |
|---|---|
| `v0.2-phone-test` | Phase 1 + Phase 2 (front-view mouth with germs, 9 zones incl. tongue, bubble timer, candy bathroom) + Android app (Capacitor, bundled fonts, Brillou icon). The version tested on the Galaxy A55 on 2026-10-07. |
| `v0.3-spotlight` | Phase 2b on top of v0.2: 8 steps (no tongue), spotlight + corner frame, brush travelling across every target tooth, matte → shiny teeth (no germs), 3 molars per side with zoomed cheek-side view and top-down chewing view, mini-map, 8-bubble timer. Installed on the Galaxy A55 on 2026-10-07. Last version before Phase 3 (voice guidance). |
| `v0.4-voice` | Phase 3 on top of v0.3: Brillou speaks every instruction with pre-recorded ElevenLabs clips (voice Lily, device TTS fallback), 3-2-1 countdown badge + tick, side arrows for back-teeth steps. Validated on the Galaxy A55 on 2026-10-07. Last version before Phase 4 (calendar, stickers, streaks). |
| `v0.5-stickers` | Phase 4 on top of v0.4: on-device history, sun/moon weekly calendar, forgiving streak, random stickers (20) + album, "À ce soir !" / "À demain !". Single child (one `default` profile). APK: `releases/brosse-et-brille-v0.5-debug.apk`. Validated on the Galaxy A55 on 2026-10-07. Last version before Phase 5 (child profiles). |
| `v0.6-profiles` | Phase 5 on top of v0.5: up to 4 child profiles (name + animal emoji), "Qui se brosse les dents ?" picker, brushing together, parents screen behind a 2 s hold, per-child calendar/streak/album. APK: `releases/brosse-et-brille-v0.6-debug.apk`. Validated on the Galaxy A55 on 2026-10-07. Last version before the music mode. |

To go back to a restore point:

```bash
git switch -c restore-v0.6 v0.6-profiles      # new branch from a tag (keeps main untouched); or v0.5-stickers, v0.4-voice, v0.3-spotlight, v0.2-phone-test
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
3. ✅ **Guidance** (done 2026-10-07, merged; voice = pre-recorded ElevenLabs Lily clips) — Brillou speaks each instruction (pre-recorded Lily clips, device TTS fallback), stops on pause and repeats on resume, "Bravo" at the end; 3-2-1 badge + tick before each step/view change; pulsing side arrow for back-teeth steps (words kept in the bubble for parents).
4. ✅ **Retention** (done 2026-10-07, merged; validated on the phone) — sun/moon weekly calendar on home; forgiving day streak; one random sticker per new morning/evening slot (20 emoji stickers, never twice the same; album screen); celebration CTA "À ce soir !" / "À demain !" instead of "Recommencer". All on device, per-profile data model ready for child profiles.
5. ✅ **Child profiles** (done 2026-10-07, merged; validated on the phone) — up to 4 profiles (name + animal emoji), "Qui se brosse les dents ?" picker when ≥ 2, brushing together (each child gets their slot and sticker), per-child calendar/streak/album, parents screen behind a 2 s long press. Names shown on screen, never spoken or sent anywhere.
6. **Later** — Brillou poses (needs illustration), parent corner with history/tips, optional local reminders, music mode, signed release build for Google Play (+ paid ElevenLabs plan and regenerated clips for commercial use).
