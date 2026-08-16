import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const ROOT = process.cwd();
const BASE_URL = (process.env.EXPUNGEMENT_HOMEPAGE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const ROUTE = `${BASE_URL}/expungement-ai`;
const EVIDENCE = path.join(ROOT, ".screenshots/expungement-ai-homepage-v3/after");
const UPDATE_EVIDENCE = !process.argv.includes("--no-evidence");
const failures = [];
const checks = [];
const browserEvents = [];
const viewportResults = [];
let measuredCls = 0;

fs.mkdirSync(EVIDENCE, { recursive: true });

function check(condition, label, detail = "") {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(detail ? `${label}: ${detail}` : label);
}

function evidencePath(name) {
  return path.join(EVIDENCE, `${name}.png`);
}

function watchPage(page, label) {
  const local = { consoleErrors: [], pageErrors: [], failedRequests: [], badResponses: [] };
  page.on("console", (message) => {
    if (message.type() === "error") local.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => local.pageErrors.push(error.message));
  page.on("requestfailed", (request) => local.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) local.badResponses.push(`${response.status()} ${response.url()}`);
  });
  browserEvents.push({ label, ...local });
  return local;
}

async function installClsObserver(context) {
  await context.addInitScript(() => {
    window.__homepageV3Cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__homepageV3Cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function openHomepage(context, label) {
  const page = await context.newPage();
  const events = watchPage(page, label);
  const response = await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
  check(response?.ok(), `${label} returns a successful document`, `${response?.status()} ${ROUTE}`);
  check(await page.locator('[data-homepage-version="v3"]').count() === 1, `${label} renders one V3 homepage`);
  return { page, events };
}

async function auditViewport(browser, width, height = 1000, options = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion ?? "no-preference"
  });
  await installClsObserver(context);
  if (options.locale) {
    await context.addInitScript((locale) => localStorage.setItem("exp_lang", locale), options.locale);
  }
  if (options.saveData) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true, effectiveType: "3g" }
      });
    });
  }
  const label = options.label ?? `${width}px`;
  const { page, events } = await openHomepage(context, label);
  const result = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const targets = [...document.querySelectorAll('a[href], button:not([disabled]), [role="tab"]')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || element.tagName,
          width: rect.width,
          height: rect.height
        };
      });
    const clippedText = [...document.querySelectorAll("h1,h2,h3,p,a,button,figcaption,dt,dd")]
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        if (["visible", "clip"].includes(style.overflowX) && ["visible", "clip"].includes(style.overflowY)) return false;
        return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
      })
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100));
    const screenshotWidths = [...document.querySelectorAll('#guided-check img, #briefcase img')].map((image) => image.getBoundingClientRect().width);
    return {
      lang: document.documentElement.lang,
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      sectionCount: document.querySelectorAll("main > section").length,
      duplicateIds: [...document.querySelectorAll("[id]")].map((element) => element.id).filter((id, index, ids) => ids.indexOf(id) !== index),
      undersizedTargets: targets.filter((target) => target.width < 43.5 || target.height < 43.5),
      clippedText,
      screenshotWidths,
      videoCount: document.querySelectorAll("#homepage-v3-hero video").length,
      testimonialCount: [...document.querySelectorAll("body *")].filter((element) => /testimonial/i.test(element.className || "")).length
    };
  });
  viewportResults.push({ label, width, ...result });
  check(result.documentWidth <= result.clientWidth && result.bodyWidth <= result.clientWidth, `${label} has no horizontal page overflow`, JSON.stringify({ documentWidth: result.documentWidth, bodyWidth: result.bodyWidth, clientWidth: result.clientWidth }));
  check(result.h1Count === 1 && result.mainCount === 1 && result.sectionCount === 12, `${label} has coherent landmarks and heading root`, JSON.stringify({ h1: result.h1Count, main: result.mainCount, sections: result.sectionCount }));
  check(result.duplicateIds.length === 0, `${label} has no duplicate IDs`, result.duplicateIds.join(", "));
  check(result.undersizedTargets.length === 0, `${label} interactive targets are at least 44px`, JSON.stringify(result.undersizedTargets.slice(0, 10)));
  check(result.clippedText.length === 0, `${label} has no clipped visible copy`, JSON.stringify(result.clippedText.slice(0, 10)));
  check(result.screenshotWidths.every((value) => value >= (width <= 640 ? 680 : 500)), `${label} product evidence stays readable`, JSON.stringify(result.screenshotWidths));
  check(result.testimonialCount === 0, `${label} contains no testimonial component`);
  if (options.expectPosterOnly) check(result.videoCount === 0, `${label} uses poster-only hero`);
  else if (width > 640) check(result.videoCount === 1, `${label} mounts one semantic hero video`);
  else check(result.videoCount === 0, `${label} uses the mobile poster-only hero`);
  check(events.consoleErrors.length === 0 && events.pageErrors.length === 0 && events.failedRequests.length === 0 && events.badResponses.length === 0, `${label} has no browser or request errors`, JSON.stringify(events));
  return { context, page, result, events };
}

async function captureElement(page, selector, name, hideHeader = true) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  if (hideHeader) await page.locator('[data-homepage-header="true"]').evaluate((element) => { element.dataset.evidenceHidden = "true"; element.style.visibility = "hidden"; });
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await locator.screenshot({ path: evidencePath(name), animations: "disabled" });
  if (hideHeader) await page.locator('[data-homepage-header="true"]').evaluate((element) => { delete element.dataset.evidenceHidden; element.style.visibility = ""; });
}

async function runAxe(page) {
  await page.addScriptTag({ path: AXE_PATH });
  const results = await page.evaluate(async () => window.axe.run(document, {
    resultTypes: ["violations"],
    rules: { region: { enabled: true } }
  }));
  const serious = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
  check(serious.length === 0, "Axe reports no critical or serious accessibility violations", JSON.stringify(serious.map(({ id, impact, help, nodes }) => ({ id, impact, help, targets: nodes.map((node) => node.target) })), null, 2));
  return results.violations;
}

async function routeCollisionAudit(page) {
  const collisions = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const all = [];
    for (const svg of document.querySelectorAll('[data-section-path="true"]')) {
      if (!visible(svg)) continue;
      const section = svg.closest("section");
      const path = svg.querySelector("path");
      if (!section || !path) continue;
      const obstacles = [...section.querySelectorAll("h1,h2,h3,p,a,button,figure")].filter(visible);
      const length = path.getTotalLength();
      const matrix = path.getScreenCTM();
      if (!matrix) continue;
      for (let index = 0; index <= 260; index += 1) {
        const point = path.getPointAtLength(length * index / 260).matrixTransform(matrix);
        for (const obstacle of obstacles) {
          const rect = obstacle.getBoundingClientRect();
          const clearance = section.id === "homepage-v3-hero" ? 24 : 2;
          if (point.x >= rect.left - clearance && point.x <= rect.right + clearance && point.y >= rect.top - clearance && point.y <= rect.bottom + clearance) {
            all.push({ section: section.id || "final-cta", obstacle: obstacle.tagName, text: obstacle.textContent?.replace(/\s+/g, " ").trim().slice(0, 70) });
            index = 261;
            break;
          }
        }
      }
    }
    return all;
  });
  check(collisions.length === 0, "Orange routes avoid copy and controls", JSON.stringify(collisions));
}

async function createContactSheet(names) {
  const cellWidth = 400;
  const cellHeight = 250;
  const labelHeight = 34;
  const gap = 14;
  const columns = 3;
  const rows = Math.ceil(names.length / columns);
  const width = columns * cellWidth + (columns + 1) * gap;
  const height = rows * (cellHeight + labelHeight) + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const left = gap + (index % columns) * (cellWidth + gap);
    const top = gap + Math.floor(index / columns) * (cellHeight + labelHeight + gap);
    const image = await sharp(evidencePath(name)).resize(cellWidth, cellHeight, { fit: "cover", position: "top" }).png().toBuffer();
    composites.push({ input: image, left, top });
    const safeLabel = name.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
    composites.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#071B33"/><text x="12" y="22" fill="#F7F4EE" font-family="monospace" font-size="12">${safeLabel}</text><rect x="${cellWidth - 20}" y="12" width="10" height="10" fill="#FF3B00"/></svg>`),
      left,
      top: top + cellHeight
    });
  }
  await sharp({ create: { width, height, channels: 4, background: "#EFE9DE" } }).composite(composites).png().toFile(evidencePath("homepage-v3-contact-sheet"));
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await auditViewport(browser, 1440, 1000, { label: "desktop-1440" });
  const page = desktop.page;

  const startLinks = await page.locator("a").evaluateAll((links) => links
    .filter((link) => link.textContent?.replace(/\s+/g, " ").trim() === "Start free")
    .map((link) => link.getAttribute("href")));
  check(startLinks.length >= 8 && startLinks.every((href) => href === "/expungement-ai/start"), "Every Start free CTA preserves the guided-check destination", JSON.stringify(startLinks));
  check(await page.locator('a[href="/expungement-ai/sign-in?mode=signin"]').count() >= 2, "Login preserves explicit sign-in destination");
  check(await page.locator('a[href="/privacy"]').count() >= 2 && await page.locator('a[href="/terms"]').count() >= 1 && await page.locator('a[href="mailto:help@expungement.ai"]').count() === 1, "Privacy, terms, and contact destinations are preserved");

  const video = page.locator("#homepage-v3-hero video");
  await video.waitFor({ state: "attached" });
  const videoState = await video.evaluate((element) => ({ muted: element.muted, loop: element.loop, playsInline: element.playsInline, controls: element.controls, paused: element.paused }));
  check(videoState.muted && videoState.loop && videoState.playsInline && !videoState.controls, "Hero video uses the approved silent-background behavior", JSON.stringify(videoState));
  const videoControl = page.locator("#homepage-v3-hero button");
  await videoControl.click();
  await page.waitForTimeout(150);
  check(await videoControl.getAttribute("aria-pressed") === "true" && await video.evaluate((element) => element.paused), "Pause control pauses video and exposes pressed state");
  await videoControl.click();
  await page.waitForTimeout(250);
  check(await videoControl.getAttribute("aria-pressed") === "false" && !await video.evaluate((element) => element.paused), "Play control resumes video and clears pressed state");

  const trigger = page.locator('[data-sample-packet-trigger="true"]').first();
  const illustrativeRequests = [];
  page.on("request", (request) => illustrativeRequests.push(request.url()));
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: /sample packet preview/i });
  await dialog.waitFor({ state: "visible" });
  check(await page.locator(".sp-modal").count() === 1 && await page.locator(".sp-tab").count() === 5, "Sample CTA opens the real sanitized five-part preview");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  check(await trigger.evaluate((element) => document.activeElement === element), "Sample dialog restores focus to its trigger");

  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const headerState = await page.locator('[data-homepage-header="true"]').evaluate((element) => ({ past: element.getAttribute("data-past-hero"), position: getComputedStyle(element).position }));
  check(headerState.past === "true" && headerState.position === "fixed", "Navigation transitions to the fixed Warm White state after the hero", JSON.stringify(headerState));
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  measuredCls = await page.evaluate(() => window.__homepageV3Cls ?? 0);
  check(measuredCls <= 0.1, "Measured cumulative layout shift stays within the good threshold", String(measuredCls));

  await routeCollisionAudit(page);
  await runAxe(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  if (UPDATE_EVIDENCE) await page.screenshot({ path: evidencePath("desktop-1440-full"), fullPage: true, animations: "disabled" });

  const sections = [
    ["#homepage-v3-hero", "desktop-hero", false],
    ["#barrier", "barrier-editorial-field"],
    ["#guided-check", "guided-check-proof"],
    ["#how-it-works", "three-step-sequence"],
    ["#briefcase", "briefcase-proof"],
    ["#what-you-get", "document-set"],
    ["#pricing", "pricing-sequence"],
    ["#privacy", "privacy-practices"],
    ["#wilma", "wilma-bounded-demo"],
    ["#coverage", "coverage-pa"],
    ["#faq", "faq"],
    ["main > section:last-of-type", "final-cta"],
    ["footer", "legal-footer"]
  ];
  if (UPDATE_EVIDENCE) for (const [selector, name, hideHeader] of sections) await captureElement(page, selector, name, hideHeader ?? true);

  const coverage = page.locator("#coverage");
  await coverage.scrollIntoViewIfNeeded();
  await coverage.getByRole("button", { name: "California", exact: true }).click();
  check((await coverage.innerText()).includes("California at a glance"), "Coverage matrix exposes the selected full state name");
  if (UPDATE_EVIDENCE) await captureElement(page, "#coverage", "coverage-california");
  await coverage.getByRole("button", { name: "District of Columbia", exact: true }).click();
  check((await coverage.innerText()).includes("District of Columbia at a glance"), "Coverage matrix supports D.C. as the 51st jurisdiction");

  const faqButtons = page.locator("#faq button");
  await faqButtons.nth(1).click();
  check(await faqButtons.nth(0).getAttribute("aria-expanded") === "false" && await faqButtons.nth(1).getAttribute("aria-expanded") === "true", "FAQ keeps one accurate expanded state");
  const unexpectedIllustrativeApis = illustrativeRequests.filter((url) => url.includes("/api/") && !url.includes("/api/analytics/web"));
  check(unexpectedIllustrativeApis.length === 0, "Illustrative homepage demos make no API calls", JSON.stringify(unexpectedIllustrativeApis));

  const spanishButton = page.locator('button[data-lang="es"]').first();
  await spanishButton.click();
  await page.waitForFunction(() => document.documentElement.lang === "es");
  const spanishState = await page.evaluate(() => ({
    title: document.title,
    hero: document.querySelector("h1")?.textContent?.trim(),
    visibleText: document.body.innerText,
    homeLabel: document.querySelector('[data-homepage-header] a[aria-label]')?.getAttribute("aria-label"),
    guidedAlt: document.querySelector('#guided-check img')?.getAttribute("alt")
  }));
  const englishFragments = ["Start free", "How it works", "What you get", "Trust & privacy", "No account to begin", "Selected jurisdiction", "Illustrative example."];
  check(spanishState.hero === "La ley es complicada. Su próximo paso no debería serlo." && spanishState.title.includes("Revisión guiada gratis"), "Spanish hero and metadata are complete", JSON.stringify(spanishState));
  check(englishFragments.every((fragment) => !spanishState.visibleText.includes(fragment)), "Spanish DOM has no English fallback fragments", englishFragments.filter((fragment) => spanishState.visibleText.includes(fragment)).join(", "));
  check(spanishState.homeLabel === "Página principal de Expungement.ai" && spanishState.guidedAlt === "Pregunta de ejemplo de la revisión guiada gratis.", "Spanish accessible names and alternatives are complete", JSON.stringify({ homeLabel: spanishState.homeLabel, guidedAlt: spanishState.guidedAlt }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  if (UPDATE_EVIDENCE) await page.screenshot({ path: evidencePath("spanish-desktop-1440-full"), fullPage: true, animations: "disabled" });

  const englishButton = page.locator('button[data-lang="en"]').first();
  await englishButton.click();
  await page.waitForFunction(() => document.documentElement.lang === "en");

  const entryPage = await desktop.context.newPage();
  const entryEvents = watchPage(entryPage, "start-free-entry");
  await entryPage.goto(ROUTE, { waitUntil: "networkidle" });
  await entryPage.locator("#homepage-v3-hero").getByRole("link", { name: "Start free" }).click();
  await entryPage.waitForURL(`${BASE_URL}/expungement-ai/start`);
  check(entryPage.url() === `${BASE_URL}/expungement-ai/start` && await entryPage.getByRole("link", { name: "Start free" }).count() >= 1, "DTC browser regression reaches the real free-check entry");
  check(entryEvents.consoleErrors.length === 0 && entryEvents.pageErrors.length === 0 && entryEvents.failedRequests.length === 0 && entryEvents.badResponses.length === 0, "DTC free-check entry has no browser or request errors", JSON.stringify(entryEvents));
  await entryPage.close();

  check(desktop.events.consoleErrors.length === 0 && desktop.events.pageErrors.length === 0 && desktop.events.failedRequests.length === 0 && desktop.events.badResponses.length === 0, "Desktop homepage interactions remain error-free", JSON.stringify(desktop.events));

  await desktop.context.close();

  for (const width of [390, 768, 1024, 1728]) {
    const audited = await auditViewport(browser, width, width === 390 ? 844 : 1000, { label: `responsive-${width}` });
    if (width === 390 && UPDATE_EVIDENCE) await audited.page.screenshot({ path: evidencePath("mobile-390-full"), fullPage: true, animations: "disabled" });
    if (width === 390) {
      const menuButton = audited.page.getByRole("button", { name: "Open menu" });
      await menuButton.click();
      const menu = audited.page.getByRole("dialog", { name: "Mobile navigation" });
      await menu.waitFor({ state: "visible" });
      await audited.page.keyboard.press("Escape");
      check(await menuButton.getAttribute("aria-expanded") === "false" && await menuButton.evaluate((element) => document.activeElement === element), "Mobile menu closes with Escape and restores focus");
    }
    await audited.context.close();
  }

  const reduced = await auditViewport(browser, 1440, 1000, { label: "reduced-motion", reducedMotion: "reduce", expectPosterOnly: true });
  const reducedState = await reduced.page.evaluate(() => ({
    pathOffset: getComputedStyle(document.querySelector('[data-section-path] path')).strokeDashoffset,
    wilmaClip: getComputedStyle(document.querySelector('#wilma article')).clipPath
  }));
  check(reducedState.pathOffset === "0px" || reducedState.pathOffset === "0", "Reduced motion reveals route information immediately", JSON.stringify(reducedState));
  check(reducedState.wilmaClip === "inset(0px)" || reducedState.wilmaClip === "inset(0px 0px 0px)" || reducedState.wilmaClip === "inset(0px 0px 0px 0px)", "Reduced motion reveals Wilma messages immediately", JSON.stringify(reducedState));
  if (UPDATE_EVIDENCE) await captureElement(reduced.page, "#homepage-v3-hero", "hero-reduced-motion-poster", false);
  await reduced.context.close();

  const saveData = await auditViewport(browser, 1440, 1000, { label: "save-data", saveData: true, expectPosterOnly: true });
  if (UPDATE_EVIDENCE) await captureElement(saveData.page, "#homepage-v3-hero", "hero-save-data-poster", false);
  await saveData.context.close();

  const spanishMobile = await auditViewport(browser, 390, 844, { label: "spanish-mobile", locale: "es" });
  check(spanishMobile.result.lang === "es" && (await spanishMobile.page.locator("h1").innerText()).startsWith("La ley es complicada"), "Spanish mobile composition loads without an English first-state fragment");
  if (UPDATE_EVIDENCE) await spanishMobile.page.screenshot({ path: evidencePath("spanish-mobile-390-full"), fullPage: true, animations: "disabled" });
  await spanishMobile.context.close();

  const zoom = await auditViewport(browser, 720, 900, { label: "effective-200-percent-zoom", deviceScaleFactor: 2 });
  if (UPDATE_EVIDENCE) await zoom.page.screenshot({ path: evidencePath("effective-200-percent-zoom"), fullPage: true, animations: "disabled" });
  await zoom.context.close();

  if (UPDATE_EVIDENCE) {
    await createContactSheet([
      "desktop-hero", "barrier-editorial-field", "guided-check-proof", "three-step-sequence", "briefcase-proof",
      "document-set", "pricing-sequence", "privacy-practices", "wilma-bounded-demo", "coverage-pa",
      "coverage-california", "faq", "final-cta", "legal-footer", "hero-reduced-motion-poster"
    ]);
  }

  const report = {
    ok: failures.length === 0,
    baseUrl: BASE_URL,
    checks: checks.length,
    failures,
    measuredCls,
    viewportResults,
    axeCriticalOrSerious: checks.find((entry) => entry.label.startsWith("Axe reports"))?.ok ?? false,
    browserEvents,
    evidenceDirectory: EVIDENCE
  };
  fs.writeFileSync(path.join(EVIDENCE, "browser-verification.json"), `${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Expungement.ai homepage V3 browser verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checks: checks.length,
  viewports: viewportResults.map(({ label, width }) => ({ label, width })),
  measuredCls,
  evidenceDirectory: EVIDENCE,
  contactSheet: UPDATE_EVIDENCE ? evidencePath("homepage-v3-contact-sheet") : null
}, null, 2));
