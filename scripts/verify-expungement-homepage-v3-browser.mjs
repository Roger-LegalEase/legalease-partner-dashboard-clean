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
const EVIDENCE = path.join(ROOT, ".screenshots/expungement-ai-homepage-v3/visual-corrections");
const UPDATE_EVIDENCE = !process.argv.includes("--no-evidence");
const failures = [];
const checks = [];
const browserEvents = [];
const viewportResults = [];
let measuredCls = 0;
const heroGeometry = [];
const coverageSelections = [];
const HERO_BASELINE = {
  1440: { overlayRatio: 0.5399956597222222, copyLeft: 100, visibleVideoWidth: 662.40625 },
  1728: { overlayRatio: 0.5399938512731481, copyLeft: 244, visibleVideoWidth: 794.890625 }
};

fs.mkdirSync(EVIDENCE, { recursive: true });

function check(condition, label, detail = "") {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(detail ? `${label}: ${detail}` : label);
}

function evidencePath(name) {
  return path.join(EVIDENCE, `${name}.png`);
}

function watchPage(page, label) {
  const local = { consoleErrors: [], pageErrors: [], failedRequests: [], canceledRoutePrefetches: [], badResponses: [] };
  page.on("console", (message) => {
    if (message.type() === "error") local.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => local.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`;
    const url = new URL(request.url());
    if (request.failure()?.errorText === "net::ERR_ABORTED" && url.searchParams.has("_rsc")) {
      local.canceledRoutePrefetches.push(failure);
      return;
    }
    local.failedRequests.push(failure);
  });
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
      .filter((element) => !element.matches('[class*="srOnly"]'))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (["visible", "clip"].includes(style.overflowX) && ["visible", "clip"].includes(style.overflowY)) return false;
        return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
      })
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100));
    const screenshotWidths = [...document.querySelectorAll('#screening img, #briefcase img')].map((image) => image.getBoundingClientRect().width);
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
  else if (width > 900) check(result.videoCount === 1, `${label} mounts one semantic hero video`);
  else check(result.videoCount === 0, `${label} uses the mobile poster-only hero`);
  check(events.consoleErrors.length === 0 && events.pageErrors.length === 0 && events.failedRequests.length === 0 && events.badResponses.length === 0, `${label} has no browser or request errors`, JSON.stringify(events));
  return { context, page, result, events };
}

async function measureHero(page, width) {
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector("#homepage-v3-hero");
    const overlay = hero?.querySelector('[data-hero-overlay="true"]');
    const copy = hero?.querySelector('[data-hero-copy="true"]');
    const route = hero?.querySelector('[data-section-path="true"] path');
    const facts = hero?.querySelector('[class*="heroFacts"]');
    const control = hero?.querySelector('button[class*="videoControl"]');
    if (!hero || !overlay || !copy) return null;
    const heroRect = hero.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    const routeConflicts = { facts: 0, control: 0 };
    if (route && facts) {
      const routeLength = route.getTotalLength();
      const matrix = route.getScreenCTM();
      const obstacles = [["facts", facts], ["control", control]].filter((entry) => entry[1]);
      if (matrix) {
        for (let index = 0; index <= 240; index += 1) {
          const point = route.getPointAtLength(routeLength * index / 240).matrixTransform(matrix);
          for (const [name, obstacle] of obstacles) {
            const rect = obstacle.getBoundingClientRect();
            if (point.x >= rect.left - 24 && point.x <= rect.right + 24 && point.y >= rect.top - 24 && point.y <= rect.bottom + 24) routeConflicts[name] += 1;
          }
        }
      }
    }
    return {
      heroWidth: heroRect.width,
      overlayWidth: overlayRect.width,
      overlayRatio: overlayRect.width / heroRect.width,
      copyLeft: copyRect.left - heroRect.left,
      visibleVideoWidth: heroRect.width - overlayRect.width,
      visibleVideoRatio: (heroRect.width - overlayRect.width) / heroRect.width,
      routeConflicts
    };
  });
  check(Boolean(geometry), `${width}px hero geometry is measurable`);
  if (!geometry) return null;
  const baseline = HERO_BASELINE[width];
  const result = {
    width,
    ...geometry,
    copyShiftLeft: baseline ? baseline.copyLeft - geometry.copyLeft : null,
    visibleVideoIncrease: baseline ? geometry.visibleVideoWidth - baseline.visibleVideoWidth : null,
    visibleVideoIncreaseVw: baseline ? ((geometry.visibleVideoWidth - baseline.visibleVideoWidth) / width) * 100 : null
  };
  heroGeometry.push(result);
  if (baseline) {
    check(geometry.overlayRatio >= 0.459 && geometry.overlayRatio <= 0.491, `${width}px hero overlay stays within the accepted 46% to 49% range`, JSON.stringify(result));
    check(result.copyShiftLeft >= 40 && result.copyShiftLeft <= 72.5, `${width}px hero copy moves left by 40px to 72px`, JSON.stringify(result));
    check(result.visibleVideoIncreaseVw >= 7.9 && result.visibleVideoIncreaseVw <= 12.1, `${width}px hero reveals 8 to 12 additional viewport-width points of video`, JSON.stringify(result));
    check(geometry.routeConflicts.facts === 0 && geometry.routeConflicts.control === 0, `${width}px hero route keeps 24px clear of proof facts and the video control`, JSON.stringify(geometry.routeConflicts));
  }
  return result;
}

async function auditWilmaComposition(page, label) {
  const result = await page.evaluate(() => {
    const section = document.querySelector("#wilma");
    const index = section?.querySelector('[class*="wilmaSectionIndex"]');
    const copy = section?.querySelector('[class*="wilmaCopy"]');
    const chat = section?.querySelector('[data-wilma-conversation="true"]');
    const portrait = section?.querySelector('[class*="wilmaPortrait"]');
    const media = section?.querySelector('[class*="wilmaMedia"]');
    const copyParts = copy ? [...copy.querySelectorAll(':scope > p, :scope > h2, :scope > [class*="wilmaMedia"]')] : [];
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
    };
    const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const copyRects = copyParts.map(rect);
    const flowCollisions = [];
    for (let first = 0; first < copyRects.length; first += 1) {
      for (let second = first + 1; second < copyRects.length; second += 1) {
        if (overlaps(copyRects[first], copyRects[second])) flowCollisions.push([first, second]);
      }
    }
    return {
      indexPosition: index ? getComputedStyle(index).position : null,
      portraitPosition: portrait ? getComputedStyle(portrait).position : null,
      copyPosition: copy ? getComputedStyle(copy).position : null,
      flowCollisions,
      portraitInsideMedia: Boolean(portrait && media?.contains(portrait)),
      portraitOverlapsChat: Boolean(portrait && chat && overlaps(rect(portrait), rect(chat))),
      copyOverlapsChat: Boolean(copy && chat && overlaps(rect(copy), rect(chat))),
      conversationOrder: chat ? [...chat.querySelectorAll('[data-speaker]')].map((node) => node.getAttribute("data-speaker")) : [],
      noteInsideCard: Boolean(chat?.querySelector('[data-wilma-footer="true"]')),
      imageSource: portrait instanceof HTMLImageElement ? portrait.currentSrc || portrait.src : null
    };
  });
  check(result.indexPosition === "static" && result.copyPosition !== "absolute" && result.portraitPosition !== "absolute", `${label} Wilma labels, copy, and portrait stay in normal flow`, JSON.stringify(result));
  check(result.flowCollisions.length === 0 && !result.portraitOverlapsChat, `${label} Wilma editorial elements do not overlap`, JSON.stringify(result));
  check(result.portraitInsideMedia && result.conversationOrder.join(",") === "visitor,wilma" && result.noteInsideCard, `${label} Wilma media and conversation have a stable accessible structure`, JSON.stringify(result));
  return result;
}

async function captureElement(page, selector, name, hideHeader = true) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.evaluate((shouldHideHeader) => {
    const skipLink = document.querySelector('[data-homepage-version="v3"] > a[href="#main-content"]');
    if (skipLink instanceof HTMLElement) skipLink.style.visibility = "hidden";
    const header = document.querySelector('[data-homepage-header="true"]');
    if (shouldHideHeader && header instanceof HTMLElement) header.style.visibility = "hidden";
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, hideHeader);
  try {
    await locator.screenshot({ path: evidencePath(name), animations: "disabled" });
  } finally {
    await page.evaluate((shouldHideHeader) => {
      const skipLink = document.querySelector('[data-homepage-version="v3"] > a[href="#main-content"]');
      if (skipLink instanceof HTMLElement) skipLink.style.visibility = "";
      const header = document.querySelector('[data-homepage-header="true"]');
      if (shouldHideHeader && header instanceof HTMLElement) header.style.visibility = "";
    }, hideHeader);
  }
}

async function capturePage(page, name, options = {}) {
  await page.evaluate(() => {
    const skipLink = document.querySelector('[data-homepage-version="v3"] > a[href="#main-content"]');
    if (skipLink instanceof HTMLElement) skipLink.style.visibility = "hidden";
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  try {
    await page.screenshot({ path: evidencePath(name), animations: "disabled", ...options });
  } finally {
    await page.evaluate(() => {
      const skipLink = document.querySelector('[data-homepage-version="v3"] > a[href="#main-content"]');
      if (skipLink instanceof HTMLElement) skipLink.style.visibility = "";
    });
  }
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
  await measureHero(page, 1440);
  await auditWilmaComposition(page, "1440px");

  const startLinks = await page.locator("a").evaluateAll((links) => links
    .filter((link) => link.textContent?.replace(/\s+/g, " ").trim() === "Check my options")
    .map((link) => link.getAttribute("href")));
  check(startLinks.length >= 8 && startLinks.every((href) => href === "/expungement-ai/start"), "Every primary CTA preserves the screening destination", JSON.stringify(startLinks));
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
  if (UPDATE_EVIDENCE) await capturePage(page, "desktop-1440-full", { fullPage: true });

  const sections = [
    ["#homepage-v3-hero", "hero-1440-corrected", false],
    ["#barrier", "barrier-editorial-field"],
    ["#screening", "screening-proof"],
    ["#how-it-works", "three-step-sequence"],
    ["#briefcase", "briefcase-proof"],
    ["#what-you-get", "document-set"],
    ["#pricing", "pricing-sequence"],
    ["#privacy", "privacy-practices"],
    ["#wilma", "wilma-1440-corrected"],
    ["#faq", "faq"],
    ["main > section:last-of-type", "final-cta"],
    ['[data-homepage-version="v3"] > footer', "footer-1440-legalease"]
  ];
  if (UPDATE_EVIDENCE) for (const [selector, name, hideHeader] of sections) await captureElement(page, selector, name, hideHeader ?? true);

  const coverage = page.locator("#coverage");
  await coverage.scrollIntoViewIfNeeded();
  const stateTests = [
    ["Mississippi", "MS", 7, "coverage-mississippi"],
    ["Pennsylvania", "PA", 5, "coverage-pennsylvania"],
    ["Illinois", "IL", 12, "coverage-illinois"],
    ["California", "CA", 14, null],
    ["Tennessee", "TN", 11, null]
  ];
  const coverageRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && !request.url().includes("/api/analytics/web")) coverageRequests.push(request.url());
  });
  for (const [stateName, code, expectedCount, evidenceName] of stateTests) {
    await coverage.getByRole("option", { name: new RegExp(`^${stateName}(?:, selected)?$`) }).click();
    await page.waitForTimeout(280);
    const selectedState = await coverage.locator('[data-coverage-state]').evaluate((panel) => ({
      code: panel.getAttribute("data-coverage-state"),
      count: Number(panel.getAttribute("data-question-count")),
      heading: panel.querySelector("h3")?.textContent?.trim(),
      topics: [...panel.querySelectorAll('[data-coverage-topics="true"] li')].map((item) => item.textContent?.trim()),
      href: panel.querySelector("a")?.getAttribute("href")
    }));
    coverageSelections.push(selectedState);
    check(selectedState.code === code && selectedState.count === expectedCount && selectedState.heading === `${stateName} screening`, `${stateName} renders its derived screening count and heading`, JSON.stringify(selectedState));
    check(selectedState.topics.length >= 2 && selectedState.topics.length <= 4, `${stateName} renders two to four public profile topics`, JSON.stringify(selectedState.topics));
    check(selectedState.href === `/expungement-ai/screening/${code.toLowerCase()}`, `${stateName} CTA preserves the selected state`, selectedState.href);
    if (UPDATE_EVIDENCE && evidenceName) await captureElement(page, "#coverage", evidenceName);
  }
  const topicSignatures = new Set(coverageSelections.map((selection) => selection.topics.join("|")));
  check(topicSignatures.size === coverageSelections.length, "Five reviewed states render genuinely different topic lists", JSON.stringify(coverageSelections));
  check(new Set(coverageSelections.map((selection) => selection.count)).size >= 4, "Reviewed state question counts change with the public profiles", JSON.stringify(coverageSelections.map(({ code, count }) => ({ code, count }))));
  check(coverageRequests.length === 0, "Coverage selection makes no API request", JSON.stringify(coverageRequests));
  check(await coverage.getByRole("option").count() === 51, "Coverage grid exposes exactly 51 jurisdictions");
  const stateCodes = await coverage.getByRole("option").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-state-code")));
  check(new Set(stateCodes).size === 51, "Coverage grid contains 51 unique jurisdiction codes", JSON.stringify(stateCodes));

  await coverage.getByRole("option", { name: /^Tennessee, selected$/ }).focus();
  await page.keyboard.press("Home");
  const alabamaCell = coverage.getByRole("option", { name: /^Alabama, selected$/ });
  check(await alabamaCell.getAttribute("data-state-code") === "AL", "Coverage Home key selects the first jurisdiction");
  await alabamaCell.focus();
  await page.keyboard.press("End");
  const wyomingCell = coverage.getByRole("option", { name: /^Wyoming, selected$/ });
  check(await wyomingCell.getAttribute("data-state-code") === "WY", "Coverage End key selects the final jurisdiction");
  await wyomingCell.focus();
  await page.keyboard.press("ArrowLeft");
  check(await coverage.getByRole("option", { name: /^Wisconsin, selected$/ }).getAttribute("data-state-code") === "WI", "Coverage arrow keys update selection and focus");

  const internalCoverageText = await coverage.innerText();
  check(!/(pathway[_ -]?id|route[_ -]?id|result[_ -]?code|profile[_ -]?version|track[_ -]?count|source[_ -]?hash)/i.test(internalCoverageText), "Coverage explorer exposes no internal engine language");

  const footerBrand = await page.locator('[data-homepage-version="v3"] > footer').evaluate(() => {
    const footer = document.querySelector('[data-homepage-version="v3"] > footer');
    const link = footer?.querySelector('a[href="/legalease"]');
    const image = link?.querySelector("img");
    const rect = image?.getBoundingClientRect();
    return {
      href: link?.getAttribute("href"),
      label: link?.getAttribute("aria-label"),
      alt: image?.getAttribute("alt"),
      width: rect?.width,
      height: rect?.height,
      source: image instanceof HTMLImageElement ? image.currentSrc || image.src : null,
      footerBackground: footer ? getComputedStyle(footer).backgroundColor : null
    };
  });
  check(footerBrand.href === "/legalease" && footerBrand.label === "Visit the LegalEase homepage" && footerBrand.alt === "", "Footer uses an accessible LegalEase umbrella-brand link", JSON.stringify(footerBrand));
  check(footerBrand.width >= 130 && footerBrand.width <= 180 && footerBrand.height > 30 && footerBrand.footerBackground === "rgb(4, 20, 38)", "Official LegalEase logo is visible at the intended size on navy", JSON.stringify(footerBrand));

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
    guidedAlt: document.querySelector('#screening img')?.getAttribute("alt")
  }));
  const englishFragments = ["Check my options", "How it works", "What you get", "Trust & privacy", "No account to begin", "Selected jurisdiction", "Illustrative example."];
  check(spanishState.hero === "La ley es complicada. Su próximo paso no debería serlo." && spanishState.title.includes("Evaluación gratuita"), "Spanish hero and metadata are complete", JSON.stringify(spanishState));
  check(englishFragments.every((fragment) => !spanishState.visibleText.includes(fragment)), "Spanish DOM has no English fallback fragments", englishFragments.filter((fragment) => spanishState.visibleText.includes(fragment)).join(", "));
  check(spanishState.homeLabel === "Página principal de Expungement.ai" && spanishState.guidedAlt === "Pregunta de ejemplo de la evaluación gratuita.", "Spanish accessible names and alternatives are complete", JSON.stringify({ homeLabel: spanishState.homeLabel, guidedAlt: spanishState.guidedAlt }));
  await page.locator("#wilma").scrollIntoViewIfNeeded();
  if (UPDATE_EVIDENCE) await captureElement(page, "#wilma", "wilma-spanish-1440");
  await page.locator("#coverage").scrollIntoViewIfNeeded();
  await page.locator("#coverage").getByRole("option", { name: /^Illinois/ }).click();
  const spanishCoverage = await page.locator("#coverage").locator('[data-coverage-state="IL"]').evaluate((panel) => ({
    text: panel.textContent,
    topics: [...panel.querySelectorAll('[data-coverage-topics="true"] li')].map((item) => item.textContent?.trim()),
    href: panel.querySelector("a")?.getAttribute("href")
  }));
  check(spanishCoverage.text.includes("Evaluación de Illinois") && spanishCoverage.text.includes("Hasta 12 preguntas") && spanishCoverage.href === "/expungement-ai/screening/il", "Spanish coverage preserves the Illinois profile and CTA", JSON.stringify(spanishCoverage));
  check(spanishCoverage.topics.includes("¿Qué edad tenía cuando ocurrió?") && !spanishCoverage.topics.includes("How old were you when this happened?"), "Spanish coverage uses profile translations without English question leakage", JSON.stringify(spanishCoverage.topics));
  if (UPDATE_EVIDENCE) await captureElement(page, "#coverage", "coverage-spanish-illinois");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  if (UPDATE_EVIDENCE) await capturePage(page, "spanish-desktop-1440-full", { fullPage: true });

  const englishButton = page.locator('button[data-lang="en"]').first();
  await englishButton.click();
  await page.waitForFunction(() => document.documentElement.lang === "en");

  const entryPage = await desktop.context.newPage();
  const entryEvents = watchPage(entryPage, "start-free-entry");
  await entryPage.goto(ROUTE, { waitUntil: "networkidle" });
  await entryPage.locator("#homepage-v3-hero").getByRole("link", { name: "Check my options" }).click();
  await entryPage.waitForURL(`${BASE_URL}/expungement-ai/start`);
  check(entryPage.url() === `${BASE_URL}/expungement-ai/start` && await entryPage.getByRole("link", { name: "Check my options" }).count() >= 1, "DTC browser regression reaches the real free-screening entry");
  check(entryEvents.consoleErrors.length === 0 && entryEvents.pageErrors.length === 0 && entryEvents.failedRequests.length === 0 && entryEvents.badResponses.length === 0, "DTC free-check entry has no browser or request errors", JSON.stringify(entryEvents));
  await entryPage.close();

  const stateEntryPage = await desktop.context.newPage();
  const stateEntryEvents = watchPage(stateEntryPage, "coverage-state-entry");
  await stateEntryPage.goto(ROUTE, { waitUntil: "networkidle" });
  const stateEntryCoverage = stateEntryPage.locator("#coverage");
  await stateEntryCoverage.scrollIntoViewIfNeeded();
  await stateEntryCoverage.getByRole("option", { name: /^Mississippi/ }).click();
  await stateEntryCoverage.getByRole("link", { name: "Start the Mississippi check" }).click();
  await stateEntryPage.waitForURL(`${BASE_URL}/expungement-ai/screening/ms`);
  await stateEntryPage.getByText("Are you asking about your own record?", { exact: true }).waitFor({ state: "visible" });
  check(stateEntryPage.url() === `${BASE_URL}/expungement-ai/screening/ms`, "State-specific Coverage CTA enters the real selected-state screening");
  check(stateEntryEvents.consoleErrors.length === 0 && stateEntryEvents.pageErrors.length === 0 && stateEntryEvents.failedRequests.length === 0 && stateEntryEvents.badResponses.length === 0, "Selected-state screening entry has no browser or request errors", JSON.stringify(stateEntryEvents));
  await stateEntryPage.close();

  check(desktop.events.consoleErrors.length === 0 && desktop.events.pageErrors.length === 0 && desktop.events.failedRequests.length === 0 && desktop.events.badResponses.length === 0, "Desktop homepage interactions remain error-free", JSON.stringify(desktop.events));

  await desktop.context.close();

  for (const width of [390, 768, 1024, 1728]) {
    const audited = await auditViewport(browser, width, width === 390 ? 844 : 1000, { label: `responsive-${width}` });
    if (width === 390 && UPDATE_EVIDENCE) await capturePage(audited.page, "mobile-390-full", { fullPage: true });
    if (width === 1728) {
      await measureHero(audited.page, 1728);
      if (UPDATE_EVIDENCE) await captureElement(audited.page, "#homepage-v3-hero", "hero-1728-corrected", false);
    }
    if (width === 1024) {
      await auditWilmaComposition(audited.page, "1024px");
      if (UPDATE_EVIDENCE) await captureElement(audited.page, "#wilma", "wilma-1024-corrected");
    }
    if (width === 390) {
      await auditWilmaComposition(audited.page, "390px");
      if (UPDATE_EVIDENCE) {
        await captureElement(audited.page, "#homepage-v3-hero", "hero-390-poster", false);
        await captureElement(audited.page, "#wilma", "wilma-390-corrected");
        await audited.page.locator("#coverage").getByRole("option", { name: /^Mississippi/ }).click();
        await captureElement(audited.page, "#coverage", "coverage-390-mississippi");
        await captureElement(audited.page, '[data-homepage-version="v3"] > footer', "footer-390-legalease");
      }
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
    wilmaClip: getComputedStyle(document.querySelector('#wilma article')).clipPath,
    videoRequests: performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("expungement-ai-hero-approved.mp4"))
  }));
  check(reducedState.pathOffset === "0px" || reducedState.pathOffset === "0", "Reduced motion reveals route information immediately", JSON.stringify(reducedState));
  check(reducedState.wilmaClip === "none" || reducedState.wilmaClip === "inset(0px)" || reducedState.wilmaClip === "inset(0px 0px 0px)" || reducedState.wilmaClip === "inset(0px 0px 0px 0px)", "Reduced motion reveals Wilma messages immediately", JSON.stringify(reducedState));
  check(reducedState.videoRequests.length === 0, "Reduced motion makes no hero video request", JSON.stringify(reducedState.videoRequests));
  if (UPDATE_EVIDENCE) await captureElement(reduced.page, "#homepage-v3-hero", "hero-reduced-motion-poster", false);
  await reduced.context.close();

  const saveData = await auditViewport(browser, 1440, 1000, { label: "save-data", saveData: true, expectPosterOnly: true });
  const saveDataVideoRequests = await saveData.page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("expungement-ai-hero-approved.mp4")));
  check(saveDataVideoRequests.length === 0, "Save-Data makes no hero video request", JSON.stringify(saveDataVideoRequests));
  if (UPDATE_EVIDENCE) await captureElement(saveData.page, "#homepage-v3-hero", "hero-save-data-poster", false);
  await saveData.context.close();

  const spanishMobile = await auditViewport(browser, 390, 844, { label: "spanish-mobile", locale: "es" });
  check(spanishMobile.result.lang === "es" && (await spanishMobile.page.locator("h1").innerText()).startsWith("La ley es complicada"), "Spanish mobile composition loads without an English first-state fragment");
  if (UPDATE_EVIDENCE) await capturePage(spanishMobile.page, "spanish-mobile-390-full", { fullPage: true });
  await spanishMobile.context.close();

  const zoom = await auditViewport(browser, 720, 900, { label: "effective-200-percent-zoom", deviceScaleFactor: 2 });
  await auditWilmaComposition(zoom.page, "effective 200% zoom");
  if (UPDATE_EVIDENCE) {
    await zoom.page.evaluate(() => {
      const wilma = document.querySelector("#wilma").getBoundingClientRect();
      window.scrollTo(0, Math.max(0, wilma.bottom + window.scrollY - 300));
    });
    await zoom.page.waitForTimeout(300);
    await capturePage(zoom.page, "wilma-coverage-200-percent-zoom");
  }
  await zoom.context.close();

  const noJsContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  const noJsResponse = await noJsPage.goto(ROUTE, { waitUntil: "load", timeout: 60_000 });
  check(noJsResponse?.ok() && await noJsPage.locator("#coverage").getByRole("option").count() === 51, "No-JavaScript fallback keeps the 51-jurisdiction matrix visible");
  check(await noJsPage.locator('[data-coverage-state="PA"]').count() === 1 && await noJsPage.locator('a[href="/expungement-ai/screening/pa"]').count() === 1, "No-JavaScript fallback keeps the default state summary and route readable");
  await noJsContext.close();

  if (UPDATE_EVIDENCE) {
    await createContactSheet([
      "hero-1440-corrected", "hero-1728-corrected", "hero-390-poster", "wilma-1440-corrected", "wilma-1024-corrected",
      "wilma-390-corrected", "coverage-mississippi", "coverage-pennsylvania", "coverage-illinois", "coverage-390-mississippi",
      "footer-1440-legalease", "footer-390-legalease", "wilma-spanish-1440", "coverage-spanish-illinois", "wilma-coverage-200-percent-zoom"
    ]);
  }

  const report = {
    ok: failures.length === 0,
    baseUrl: BASE_URL,
    checks: checks.length,
    failures,
    measuredCls,
    heroGeometry,
    coverageSelections,
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
