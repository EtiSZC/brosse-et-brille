// Phone-sized screenshots of key app states, using the local Chrome install.
// Usage: start the dev server (npm run dev), then: node scripts/screenshots.mjs
// Runs in real time (~30 s): Playwright's fake clock desyncs framer-motion's
// AnimatePresence, so zone transitions would not render.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(BASE_URL);
await page.waitForTimeout(1500);
await shot("1-home");

await page.getByRole("button", { name: /C'est parti/ }).click();
await page.waitForTimeout(3000);
await shot("2-zone1-front-top");

// Zone 2 starts at 22 s: "Derrière en haut" (inner side of the upper front teeth)
await page.waitForTimeout(21000);
await shot("3-zone2-back-top");

await page.getByRole("button", { name: "Pause" }).click();
await page.waitForTimeout(1500);
await shot("4-pause");

await browser.close();
console.log(`Saved screenshots to ${OUT}/`);
