// Phone-sized screenshots of key app states, using the local Chrome install.
// Usage: start the dev server (npm run dev), then: node scripts/screenshots.mjs [--quick]
// Runs in real time: Playwright's fake clock desyncs framer-motion's AnimatePresence,
// so zone transitions would not render. Full run ≈ 3 min 10 s; --quick stops after zone 2.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = "screenshots";
const QUICK = process.argv.includes("--quick");
mkdirSync(OUT, { recursive: true });

// Seconds after "C'est parti" → file name (a few seconds into each zone).
const ZONE_SHOTS = [
  [8, "zone1-devant-haut"],
  [30, "zone2-derriere-haut"],
  [52, "zone3-molaires-haut-gauche"],
  [72, "zone4-molaires-haut-droite"],
  [94, "zone5-devant-bas"],
  [116, "zone6-derriere-bas"],
  [138, "zone7-molaires-bas-gauche"],
  [158, "zone8-molaires-bas-droite"],
  [174, "zone9-langue"],
];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(BASE_URL);
await page.waitForTimeout(2000);
await shot("0-home");

await page.getByRole("button", { name: /C'est parti/ }).click({ force: true }); // the button "breathes", so it is never "stable"
const startedAt = Date.now();
const waitUntil = (s) => page.waitForTimeout(Math.max(0, startedAt + s * 1000 - Date.now()));

for (const [i, [at, name]] of ZONE_SHOTS.entries()) {
  if (QUICK && i > 1) break;
  await waitUntil(at);
  await shot(`${i + 1}-${name}`);
}

if (QUICK) {
  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(1200);
  await shot("pause");
} else {
  await waitUntil(184);
  await shot("10-celebration");
}

await browser.close();
console.log(`Saved screenshots to ${OUT}/`);
