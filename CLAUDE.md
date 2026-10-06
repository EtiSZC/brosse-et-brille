# Brosse & Brille

A playful PWA that guides children (ages 3–8) through a 3-minute tooth-brushing session with the mascot **Brillou**. UI language is **French**. Originally scaffolded in Lovable (project `5e07ab90-e764-4e9b-8721-6225fc74815b`, "Sparkle Brush Buddy"), mirrored to the private GitHub repo `EtiSZC/quenottes`; now developed locally.

## Commands

```bash
npm install
npm run dev       # http://localhost:8080
npm run build     # production build + PWA service worker (dist/)
npm test          # vitest (jsdom)
npm run lint
node scripts/screenshots.mjs   # with dev server running: phone screenshots → screenshots/ (real time, ~30 s)
```

Don't use Playwright's fake clock (`page.clock`) for visual checks: it desyncs framer-motion's `AnimatePresence`, so zone changes and the pause overlay don't render. Unit tests use vitest fake timers and are fine.

## Stack

React 18 + TypeScript, Vite 5, Tailwind 3 + shadcn/ui (only `button`, `toast`, `toaster`, `sonner`, `tooltip` are kept — add others with `npx shadcn add <name>`), framer-motion, canvas-confetti, vite-plugin-pwa. No backend, no persistence yet. Path alias `@/` → `src/`.

## Architecture

- `src/pages/Index.tsx` — state machine: `home` → `brushing` → `celebration`.
- `src/components/HomeScreen.tsx` — mascot, title, start button.
- `src/components/BrushingScreen.tsx` — timestamp-based timer (`Date.now()` deltas, survives pauses), zone derived via `getZoneAt()`, pause overlay (✕ and ⏸ both open it; "Arrêter" there cancels), auto-pause on `visibilitychange`, Wake Lock.
- `src/components/ToothDiagram.tsx` — top-down SVG dental arch (16 teeth + tongue) and an animated toothbrush that mimes the gesture per region. "Back" zones highlight the front teeth plus a dashed inner arc, brush placed on the tongue side.
- `src/components/MuteButton.tsx` — 🔊/🔇 toggle synced through `subscribeMuted`.
- `src/hooks/use-wake-lock.ts` — Screen Wake Lock, re-requested when the page becomes visible.
- `src/components/CelebrationScreen.tsx` — confetti, fanfare, 3 stars, restart.
- `src/data/brushingZones.ts` — the 9 zones (label, instruction, duration, highlighted regions, hue). Durations sum to 180 s.
- `src/lib/sounds.ts` — WebAudio synthesized tones on one shared `AudioContext`; `unlockAudio()` must be called inside a user tap (iOS); mute persisted in localStorage.
- `src/index.css` — design tokens (HSL CSS variables), Fredoka (display) + Nunito (body), gradients, keyframes.
- `src/components/DirectionArrow.tsx` — currently unused.

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
2. **Visual overhaul** — front-facing "big smile" mouth (~70% width, card-flip for inner surfaces); germs that pop + teeth that shine; 9-bubble visual timer (small mm:ss for parents); "candy bathroom" art direction (mint `#3CCFB4`, bubblegum `#FF7EB6`, sunshine `#FFD23F`, ink `#1E2A4A`); chunky 3D buttons; calmer zone colours (upper blue / lower peach / tongue pink).
3. **Guidance** — Brillou voice lines per zone (fr-FR `speechSynthesis` fallback); 3-2-1 warning before zone change; side markers instead of "gauche/droite".
4. **Retention** — sun/moon weekly calendar (localStorage, per-profile data model); sticker album; forgiving streaks; end CTA "À ce soir !" instead of "Recommencer".
5. **Later** — Brillou poses (needs illustration), child profiles, gated parent corner, optional local reminders, music mode.
