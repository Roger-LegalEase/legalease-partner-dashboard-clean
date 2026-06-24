/**
 * Visual smoke test for the public frontend surfaces.
 *
 * This is NOT a curl-200 check. It launches a real Chromium via Playwright, renders each surface at
 * desktop and mobile widths, captures screenshots, and asserts the required visible elements named
 * in docs/FRONTEND_SOURCE_OF_TRUTH.md. "No screenshot, no done."
 *
 * Surfaces:
 *   - /legalease                      (desktop)
 *   - /expungement-ai                 (desktop + mobile)
 *   - /expungement-ai/screening       (desktop + mobile)  app header + state picker
 *   - /expungement-ai/screening/CA    (desktop + mobile)  progress / question / answers / Wilma
 *
 * Usage:
 *   npm run build && npm run verify:frontend-surfaces
 *
 * Env:
 *   FRONTEND_SURFACES_BASE_URL   test an already-running server instead of spawning one
 *   FRONTEND_SURFACES_PORT       port to start `next start` on (default 4123)
 *   FRONTEND_SURFACES_KEEP       "1" to leave the spawned server running on exit (debugging)
 *
 * Screenshots land in artifacts/frontend-surfaces/.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const root = process.cwd();
const PORT = Number(process.env.FRONTEND_SURFACES_PORT ?? 4123);
const EXTERNAL_BASE = process.env.FRONTEND_SURFACES_BASE_URL?.replace(/\/+$/, "");
const BASE = EXTERNAL_BASE ?? `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(root, "artifacts", "frontend-surfaces");

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

const failures = [];
const screenshots = [];
const fail = (surface, msg) => failures.push(`[${surface}] ${msg}`);

// Console / network noise that is not a "core" failure (favicons, OG cards, manifest, analytics).
const IGNORABLE_RESOURCE = /favicon|apple-touch-icon|og-card|\/og|manifest|robots\.txt|sitemap|analytics|gtag|\.map(\?|$)/i;
const isCoreAsset = (url) =>
  /\.(css|js)(\?|$)/i.test(url) || /hero-\d+|wilma-avatar/i.test(url);

function attachDiagnostics(page, surface, sink) {
  page.on("pageerror", (err) => sink.pageErrors.push(String(err?.message ?? err)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORABLE_RESOURCE.test(text)) return;
    sink.consoleErrors.push(text);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (isCoreAsset(url) && !IGNORABLE_RESOURCE.test(url)) sink.failedCore.push(`${url} (${req.failure()?.errorText ?? "failed"})`);
  });
  page.on("response", (res) => {
    const url = res.url();
    if (res.status() >= 400 && isCoreAsset(url) && !IGNORABLE_RESOURCE.test(url)) {
      sink.failedCore.push(`${url} (HTTP ${res.status()})`);
    }
  });
}

function reportDiagnostics(surface, sink) {
  for (const e of sink.pageErrors) fail(surface, `uncaught page error: ${e}`);
  for (const e of sink.consoleErrors) fail(surface, `console error: ${e}`);
  for (const e of sink.failedCore) fail(surface, `core asset request failed: ${e}`);
}

async function shoot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(path.relative(root, file));
  return file;
}

async function newPage(context, surface) {
  const sink = { pageErrors: [], consoleErrors: [], failedCore: [] };
  const page = await context.newPage();
  attachDiagnostics(page, surface, sink);
  return { page, sink };
}

async function visibleText(page) {
  return (await page.evaluate(() => document.body.innerText)) ?? "";
}

// ---------------------------------------------------------------------------
// Surface checks
// ---------------------------------------------------------------------------

async function checkLegalease(context) {
  const surface = "legalease:desktop";
  const { page, sink } = await newPage(context, surface);
  try {
    await page.setViewportSize(DESKTOP);
    const resp = await page.goto(`${BASE}/legalease`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || resp.status() >= 400) fail(surface, `navigation returned HTTP ${resp?.status() ?? "none"}`);
    await shoot(page, "legalease-desktop");

    const text = await visibleText(page);
    if (text.replace(/\s+/g, "").length < 400) fail(surface, "page looks blank (very little visible text) — possible app-shell regression");
    for (const brand of ["Expungement.ai", "RCAP", "Record Shield", "StartApart", "ClaimCoach", "Fresh Start Network"]) {
      if (!text.includes(brand)) fail(surface, `missing required suite brand: "${brand}"`);
    }
    reportDiagnostics(surface, sink);
  } catch (err) {
    fail(surface, `threw: ${err?.message ?? err}`);
  } finally {
    await page.close();
  }
}

async function checkExpungementLanding(context, viewport, label) {
  const surface = `expungement-ai:${label}`;
  const { page, sink } = await newPage(context, surface);
  try {
    await page.setViewportSize(viewport);
    const resp = await page.goto(`${BASE}/expungement-ai`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || resp.status() >= 400) fail(surface, `navigation returned HTTP ${resp?.status() ?? "none"}`);

    // Header / logo / nav
    if (!(await page.locator("#nav").count())) fail(surface, "landing nav (#nav) missing");
    const brand = page.locator("#nav a.brand");
    if (!(await brand.count())) fail(surface, "branded logo (a.brand) missing from nav");
    else if (!(await brand.first().isVisible())) fail(surface, "branded logo present but not visible");
    if (!(await page.locator("#nav .logomark, #nav svg").count())) fail(surface, "polished SVG logomark missing (would mean plain-text fallback logo)");

    // Hero image not broken
    const heroOk = await page.evaluate(() => {
      const img = document.querySelector("img.hero-bg");
      return img ? img.complete && img.naturalWidth > 0 : false;
    });
    if (!heroOk) fail(surface, "hero background image failed to load (broken image)");

    // How it works: three step cards must be visible (the core regression).
    const steps = page.locator("#how-it-works .jstep");
    const stepCount = await steps.count();
    if (stepCount !== 3) fail(surface, `expected 3 How-it-works step cards, found ${stepCount}`);
    for (let i = 0; i < stepCount; i++) {
      const step = steps.nth(i);
      const vis = await step.isVisible();
      const box = await step.boundingBox();
      const opacity = await step.evaluate((el) => getComputedStyle(el).opacity);
      const stepText = (await step.innerText()).replace(/\s+/g, "");
      if (!vis || !box || box.height < 10) fail(surface, `How-it-works step ${i + 1} not visibly rendered (the lone-gray-line regression)`);
      if (Number(opacity) === 0) fail(surface, `How-it-works step ${i + 1} is opacity:0 (reveal JS/CSS fallback failed)`);
      if (stepText.length < 10) fail(surface, `How-it-works step ${i + 1} has no text content`);
    }

    // No giant blank gap: the how-it-works section should be mostly filled by its three steps.
    const blank = await page.evaluate(() => {
      const sec = document.getElementById("how-it-works");
      const steps = sec ? sec.querySelectorAll(".jstep") : [];
      if (!sec || steps.length === 0) return true;
      const secH = sec.getBoundingClientRect().height;
      let stepsH = 0;
      steps.forEach((s) => (stepsH += s.getBoundingClientRect().height));
      // Steps (plus padding/heading) should occupy a real share of the section height.
      return secH > 200 && stepsH / secH < 0.25;
    });
    if (blank) fail(surface, "How-it-works section is mostly empty space (giant blank section regression)");

    const text = await visibleText(page);
    for (const needle of ["How it works", "Pricing", "Start free"]) {
      if (!text.includes(needle)) fail(surface, `landing missing required text: "${needle}"`);
    }
    const signInPresent = /sign in|log in/i.test(text);
    if (!signInPresent) fail(surface, "landing missing Sign in / Log in");

    await shoot(page, `expungement-ai-${label}`);

    // Mobile menu open/close
    if (label === "mobile") {
      const toggle = page.locator("#navtoggle");
      if (await toggle.count()) {
        await toggle.click();
        await sleep(400);
        const opened = await page.evaluate(() => document.getElementById("nav")?.classList.contains("open") ?? false);
        if (!opened) fail(surface, "mobile menu did not open on toggle click");
        await shoot(page, "expungement-ai-mobile-menu-open");
        // Close with a single toggle click (the toggle flips open<->closed).
        await toggle.click();
        await sleep(400);
        const closed = await page.evaluate(() => !(document.getElementById("nav")?.classList.contains("open") ?? false));
        if (!closed) fail(surface, "mobile menu did not close");
      } else {
        fail(surface, "mobile nav toggle (#navtoggle) missing");
      }
    }

    reportDiagnostics(surface, sink);
  } catch (err) {
    fail(surface, `threw: ${err?.message ?? err}`);
  } finally {
    await page.close();
  }
}

async function assertAppHeader(page, surface) {
  const header = page.locator("header").first();
  if (!(await header.count())) {
    fail(surface, "app header (<header>) missing");
    return;
  }
  const headerText = await header.innerText();
  // Polished logo, not plain fallback
  if (!/Expungement\.ai/.test(headerText)) fail(surface, "app header missing Expungement.ai logo/wordmark");
  if (!(await header.locator("svg").count())) fail(surface, "app header missing polished SVG logomark (plain-text fallback)");
  const logoLink = header.locator('a[href="/expungement-ai"]').first();
  if (!(await logoLink.count())) fail(surface, "app header logo does not link to /expungement-ai");
  // Must NOT contain marketing nav or Start free
  for (const banned of ["Start free", "How it works", "Pricing"]) {
    if (headerText.includes(banned)) fail(surface, `app/screening header must not show "${banned}"`);
  }
}

async function checkScreeningPicker(context, viewport, label) {
  const surface = `screening-picker:${label}`;
  const { page, sink } = await newPage(context, surface);
  try {
    await page.setViewportSize(viewport);
    const resp = await page.goto(`${BASE}/expungement-ai/screening`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || resp.status() >= 400) fail(surface, `navigation returned HTTP ${resp?.status() ?? "none"}`);
    await assertAppHeader(page, surface);

    // State picker content
    const list = page.locator("[data-state-count]");
    if (!(await list.count())) fail(surface, "state picker list missing");
    else {
      const count = Number(await list.first().getAttribute("data-state-count"));
      if (!(count >= 50)) fail(surface, `state picker shows ${count} jurisdictions (expected >= 50)`);
    }
    // Header must not cover the screening content (content starts below the fixed header).
    const overlap = await page.evaluate(() => {
      const header = document.querySelector("header");
      const heading = document.querySelector("h1");
      if (!header || !heading) return false;
      return heading.getBoundingClientRect().top < header.getBoundingClientRect().bottom - 2;
    });
    if (overlap) fail(surface, "fixed header overlaps the screening content (heading hidden under header)");

    await shoot(page, `expungement-ai-screening-${label}`);
    reportDiagnostics(surface, sink);
  } catch (err) {
    fail(surface, `threw: ${err?.message ?? err}`);
  } finally {
    await page.close();
  }
}

async function checkScreeningFlow(context, viewport, label) {
  const surface = `screening-flow:${label}`;
  const { page, sink } = await newPage(context, surface);
  try {
    await page.setViewportSize(viewport);
    const resp = await page.goto(`${BASE}/expungement-ai/screening/CA`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || resp.status() >= 400) fail(surface, `navigation returned HTTP ${resp?.status() ?? "none"}`);

    await assertAppHeader(page, surface);

    // Progress bar
    const progress = page.locator('[role="progressbar"]').first();
    try {
      await progress.waitFor({ state: "visible", timeout: 15000 });
    } catch {
      fail(surface, "progress bar did not appear (screening card failed to load)");
    }

    // Question prompt
    const prompt = page.locator('[id^="q-"][id$="-prompt"]').first();
    if (!(await prompt.count())) fail(surface, "question prompt not rendered");
    else if (!(await prompt.isVisible())) fail(surface, "question prompt not visible");

    // Answer choices (radiogroup/group options, or a typed-answer control)
    const choices = page.locator(
      '[role="radiogroup"], [role="group"], input[type="radio"], input[type="checkbox"], input[type="text"], input[type="number"], input[type="date"]'
    );
    if (!(await choices.count())) fail(surface, "no answer choices / answer input rendered");

    // Wilma bubble
    const wilma = page.locator('[data-wilma-bubble="true"]').first();
    if (!(await wilma.count())) fail(surface, "Wilma bubble missing");
    else if (!(await wilma.isVisible())) fail(surface, "Wilma bubble not visible");

    // Screening card visible
    const card = page.getByText(/screening/i).first();
    if (!(await card.count())) fail(surface, "screening card label missing");

    // No giant blank: meaningful visible text present
    const text = await visibleText(page);
    if (text.replace(/\s+/g, "").length < 200) fail(surface, "screening page looks blank");

    await shoot(page, `expungement-ai-screening-flow-${label}`);
    reportDiagnostics(surface, sink);
  } catch (err) {
    fail(surface, `threw: ${err?.message ?? err}`);
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error(`server did not become ready at ${url}`));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let server = null;
  if (!EXTERNAL_BASE) {
    if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) {
      console.error("No production build found (.next/BUILD_ID missing). Run `npm run build` first.");
      process.exit(2);
    }
    console.log(`Starting next start on port ${PORT} ...`);
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (d) => process.env.FRONTEND_SURFACES_VERBOSE && process.stdout.write(`[next] ${d}`));
    server.stderr.on("data", (d) => process.env.FRONTEND_SURFACES_VERBOSE && process.stderr.write(`[next] ${d}`));
    try {
      await waitForServer(`${BASE}/expungement-ai`, 60000);
    } catch (err) {
      console.error(String(err?.message ?? err));
      server.kill("SIGTERM");
      process.exit(2);
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  try {
    await checkLegalease(context);
    await checkExpungementLanding(context, DESKTOP, "desktop");
    await checkExpungementLanding(context, MOBILE, "mobile");
    await checkScreeningPicker(context, DESKTOP, "desktop");
    await checkScreeningPicker(context, MOBILE, "mobile");
    await checkScreeningFlow(context, DESKTOP, "desktop");
    await checkScreeningFlow(context, MOBILE, "mobile");
  } finally {
    await context.close();
    await browser.close();
    if (server && process.env.FRONTEND_SURFACES_KEEP !== "1") server.kill("SIGTERM");
  }

  console.log("\nScreenshots:");
  for (const s of screenshots) console.log(`  - ${s}`);

  if (failures.length) {
    console.error(`\nFrontend-surfaces verifier FAILED with ${failures.length} issue(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  console.log(`\nFrontend-surfaces verifier PASSED. ${screenshots.length} screenshots captured in ${path.relative(root, OUT_DIR)}/.`);
}

main().catch((err) => {
  console.error("Frontend-surfaces verifier crashed:", err);
  process.exit(2);
});
