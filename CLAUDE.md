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

## Stack

React 18 + TypeScript, Vite 5, Tailwind 3 + shadcn/ui (only `button`, `toast`, `toaster`, `sonner`, `tooltip` are kept — add others with `npx shadcn add <name>`), framer-motion, canvas-confetti, vite-plugin-pwa. No backend, no persistence yet. Path alias `@/` → `src/`.

## Architecture

- `src/pages/Index.tsx` — state machine: `home` → `brushing` → `celebration`.
- `src/components/BathroomBackground.tsx` — shared "candy bathroom" scene (tiles, optional tint, rising bubbles, foam). Every screen renders inside it.
- `src/components/HomeScreen.tsx` — sticker title, Brillou + speech bubble, breathing 72px start button (`size="xl"`).
- `src/components/BrushingScreen.tsx` — timestamp-based timer (`Date.now()` deltas, survives pauses), zone derived via `getZoneAt()`, pause overlay (✕ and ⏸ both open it; "Arrêter" there cancels), auto-pause on `visibilitychange`, Wake Lock. Layout: small parent timer, `BubbleTimer`, `MouthDiagram`, Brillou + `SpeechBubble` with the instruction.
- `src/components/mouth/geometry.ts` — pure geometry/logic for the front-view mouth: teeth (8 per arch, `L L F F F F R R`), gums, tongue, germs (`GERMS`, `isGermVisible`), brush poses (`brushPose`). Unit-tested.
- `src/components/mouth/MouthDiagram.tsx` — renders the mouth: active teeth glow mint, germs pop (`playPop`) as the zone progresses, finished teeth sparkle, brush glides between zones. Inner ("derrière") zones: front teeth see-through over a pale palate patch, brush behind them, card-flip on entering/leaving.
- `src/components/BubbleTimer.tsx` — 9 bubbles (one per zone) filling up, then a star. `role="progressbar"`.
- `src/components/CelebrationScreen.tsx` — brand-colour confetti, fanfare, stars, restart.
- `src/components/MuteButton.tsx`, `SpeechBubble.tsx` — small shared UI.
- `src/components/ui/button.tsx` — candy 3D buttons (solid darker edge that collapses on press). Variants set colours only, sizes set dimensions.
- `src/data/brushingZones.ts` — the 9 zones (label, instruction, duration, region, hue family: upper 200 / lower 25 / tongue 340). Durations sum to 180 s.
- `src/lib/sounds.ts` — WebAudio synthesized sounds on one shared `AudioContext`; `unlockAudio()` must be called inside a user tap (iOS); mute persisted in localStorage.
- `src/hooks/use-wake-lock.ts` — Screen Wake Lock, re-requested when the page becomes visible.
- `src/index.css` — palette tokens (mint, bubblegum, sunshine, ink, tile), also exposed as Tailwind colours; `.bathroom-tiles`, `.bubble`, `.sticker-title`, squash-and-stretch `.mascot-bounce`, `.breathe`.

## Known issues

- Binary assets (mascots, favicon) can't be read through the Lovable API (they come back corrupted); fetch them from the GitHub mirror instead: `gh api -H "Accept: application/vnd.github.raw" repos/EtiSZC/quenottes/contents/<path>`.
- Tests: recent Node shadows jsdom's `localStorage`; `src/test/setup.ts` installs an in-memory one.

## Product principles (keep)

- One tap to start, 3 minutes, 9 zones in order (front, back, molars — upper then lower — then tongue).
- Guidance must work for **pre-readers**: visual and audio first, text secondary.
- Screen is **propped on the sink, ~60 cm away**: large, glanceable elements.
- Mirror convention: screen-left = child's left.
- **Privacy**: no accounts, no tracking, no third-party SDKs; all data stays on device (COPPA / GDPR-K).
- **No dark patterns**: no ads, currency, loot boxes, guilt ("Brillou est triste"), streak punishment, or extra screen time after brushing. No scoring of brushing quality.

## Roadmap (from design / PM / UX review)

1. ✅ **Foundations** (done 2026-10-06) — pause button + long-press/confirm to quit; Wake Lock; timestamp-based timer; single shared `AudioContext` unlocked on the start tap + mute toggle; contrast, reduced motion, zoom; fix canine bug.
2. ✅ **Visual overhaul** (done 2026-10-06, branch `phase-2-visual`) — front-facing "big smile" mouth (~70% width, card-flip for inner surfaces); germs that pop + teeth that shine; 9-bubble visual timer (small mm:ss for parents); "candy bathroom" art direction (mint `#3CCFB4`, bubblegum `#FF7EB6`, sunshine `#FFD23F`, ink `#1E2A4A`); chunky 3D buttons; calmer zone colours (upper blue / lower peach / tongue pink).
3. **Guidance** — Brillou voice lines per zone (fr-FR `speechSynthesis` fallback); 3-2-1 warning before zone change; side markers instead of "gauche/droite".
4. **Retention** — sun/moon weekly calendar (localStorage, per-profile data model); sticker album; forgiving streaks; end CTA "À ce soir !" instead of "Recommencer".
5. **Later** — Brillou poses (needs illustration), child profiles, gated parent corner, optional local reminders, music mode.
