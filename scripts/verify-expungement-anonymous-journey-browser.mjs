#!/usr/bin/env node
// The anonymous half of the participant journey, in a real browser, across the
// dimensions the hosted proof does not cover.
//
//   MS_JOURNEY_BASE_URL=http://localhost:3000 \
//     node scripts/verify-expungement-anonymous-journey-browser.mjs
//
// WHY THIS EXISTS BESIDE verify-expungement-commercial-browser.mjs
//
// That script is the hosted, authenticated, end-to-end proof: it signs in,
// claims a matter, fills the packet builder and stops at Stripe. It needs a
// hosted origin and account credentials, and it runs one configuration —
// desktop, English, mouse. So the dimensions the Build Plan's §6.2 exit
// condition names — "no English-only fallback", complete mobile and keyboard
// operation — were never actually exercised anywhere.
//
// This runs the same original Mississippi route from the same anonymous start,
// four times: desktop English with a mouse, a phone viewport, keyboard only,
// and Spanish. It needs no account and no payment provider, so it runs against
// a local dev server as readily as a hosted one. It stops where an account
// becomes necessary; everything past the claim stays with the hosted proof.
//
// It asserts the participant-facing facts, not the markup: how many questions
// the free check asks, that none of them is an exact packet fact, that the
// journey completes without a mouse and without a wide screen, that the priced
// result states the price and says the facts are verified before payment, and
// that no interface copy on that result is English-only in Spanish. The route's
// own legal label is profile data, not interface copy, and is deliberately not
// asserted: translating the name of a statutory path is a legal decision.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = (process.env.MS_JOURNEY_BASE_URL ?? "").trim().replace(/\/$/, "");
if (!BASE_URL) {
  console.error("MS_JOURNEY_BASE_URL is required (e.g. http://localhost:3000). It may be a local dev server.");
  process.exit(2);
}

const EVIDENCE_PATH = path.join(process.cwd(), ".screenshots/expungement-anonymous-journey/journey.json");
const failures = [];
const record = { baseUrl: BASE_URL, runs: [] };
const check = (condition, message) => { if (!condition) failures.push(message); };

/**
 * The original Mississippi non-conviction route, answered by question id and
 * stored VALUE. Never by visible label: the label is localized display copy and
 * the value is what the application stores, so a label-keyed journey silently
 * stops being the same journey in Spanish.
 */
const ANSWER_BY_QUESTION = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  court_requirements_completed: "yes",
  resolved_timing_bucket: "gt_10_years"
};

/** Facts the packet needs, which the free check must not ask for. */
const EXACT_PACKET_FACTS = new Set([
  "arrest_date", "disposition_date", "county", "court", "charge", "case_number",
  "cause_number", "case_identifier", "date_of_birth", "social_security_number",
  "participant_full_legal_name", "contact_information", "mailing_address"
]);

/** Fixed interface copy on the priced result. Each must be translated in Spanish. */
const RESULT_INTERFACE_COPY = [
  "Save this result to your free Briefcase.",
  "Complete the packet information.",
  "Verify the packet facts before payment or covered generation.",
  "Read the filing checklist before you file anything with the court.",
  "$50 one time when you are ready to generate this packet",
  "Save the matter to your free Briefcase, complete the packet information, and review it before payment."
];

async function readScreen(page) {
  return page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll("input[type=radio]"));
    const labelOf = (el) => (el.closest("label")
      ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null))?.innerText?.trim() ?? "";
    return {
      progress: (document.body.innerText.match(/\b\d+ (of|de) \d+\b/) ?? [""])[0],
      heading: document.querySelector("h1,h2")?.innerText?.trim() ?? "",
      questionId: (radios[0]?.getAttribute("name") ?? "").replace(/^q-/, "") || null,
      options: radios.map((radio) => ({ value: radio.value, label: labelOf(radio) })),
      otherControls: Array.from(
        document.querySelectorAll("input:not([type=radio]):not([type=hidden]),select,textarea")
      ).map((el) => ({ tag: el.tagName.toLowerCase(), name: el.getAttribute("name") ?? el.id })),
      text: document.body.innerText
    };
  });
}

async function runJourney(page, { label, spanish = false, keyboard = false }) {
  const network = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) network.push(`${request.method()} ${url.pathname}`);
  });

  await page.goto(`${BASE_URL}/expungement-ai/screening/ms`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.locator("input[type=radio]").first().waitFor({ state: "visible", timeout: 120_000 });

  if (spanish) {
    const toggle = page.getByRole("button", { name: /Usar espa(ñ|n)ol|^ES$/i }).first();
    const present = await toggle.isVisible().catch(() => false);
    // The point of the check: a participant who arrives straight at a screening
    // link never passes the landing header, so if the only language control
    // lives there the product is English-only for them.
    check(present, `${label}: the screening surface carries no language control`);
    if (present) { await toggle.click(); await page.waitForTimeout(1000); }
  }

  const screens = [];
  for (let step = 0; step < 15; step += 1) {
    const screen = await readScreen(page);
    screens.push(screen);
    if (!screen.questionId) break;

    const wanted = ANSWER_BY_QUESTION[screen.questionId];
    check(wanted !== undefined, `${label}: unexpected free-check question "${screen.questionId}"`);
    const option = screen.options.find((entry) => entry.value === wanted) ?? screen.options[0];
    const radio = page
      .locator(`input[name="q-${screen.questionId}"][value="${option.value.replace(/"/g, '\\"')}"]`)
      .first();

    if (keyboard) {
      await radio.focus();
      await page.keyboard.press("Space");
      check(await radio.isChecked(), `${label}: "${screen.questionId}" could not be answered from the keyboard`);
      const advance = page.getByRole("button", { name: /Continue|Continuar/i }).first();
      await advance.focus();
      check(
        (await page.evaluate(() => document.activeElement?.tagName.toLowerCase())) === "button",
        `${label}: the advance control did not take keyboard focus on "${screen.questionId}"`
      );
      await page.keyboard.press("Enter");
    } else {
      await radio.check();
      await page.getByRole("button", { name: /Continue|Continuar/i }).first().click();
    }
    await page.waitForTimeout(900);
  }

  await page.waitForTimeout(3000);
  const result = await readScreen(page);
  const run = {
    label,
    spanish,
    keyboard,
    questionCount: screens.filter((screen) => screen.questionId).length,
    questionIds: screens.filter((screen) => screen.questionId).map((screen) => screen.questionId),
    headings: screens.filter((screen) => screen.questionId).map((screen) => screen.heading),
    optionLabels: screens.filter((screen) => screen.questionId).map((screen) => screen.options.map((o) => o.label)),
    freeTextControls: screens.flatMap((screen) => screen.otherControls),
    result,
    network: [...new Set(network)]
  };
  record.runs.push(run);
  return run;
}

const expectedQuestions = Object.keys(ANSWER_BY_QUESTION).length;
const browser = await chromium.launch({ headless: true });

try {
  // 1. The original journey: desktop, English, mouse.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const run = await runJourney(page, { label: "desktop-en" });

    check(run.questionCount === expectedQuestions,
      `desktop-en: the free check asked ${run.questionCount} questions, expected ${expectedQuestions}`);
    for (const questionId of run.questionIds) {
      check(!EXACT_PACKET_FACTS.has(questionId),
        `desktop-en: the free check asked for the exact packet fact ${questionId}`);
    }
    check(run.freeTextControls.length === 0,
      `desktop-en: the free check rendered ${run.freeTextControls.length} free-text or date controls`);
    check(!run.network.some((entry) => entry.includes("/checkout")),
      "desktop-en: the free check requested checkout");
    check(/\$50/.test(run.result.text), "desktop-en: the priced result did not state the price");
    check(/before payment/i.test(run.result.text),
      "desktop-en: the priced result did not say the packet facts are verified before payment");
    check(!/your packet is ready|download your packet/i.test(run.result.text),
      "desktop-en: the free result claimed a packet already exists");
    check(errors.length === 0, `desktop-en: browser errors — ${errors.slice(0, 3).join(" | ")}`);
    await context.close();
  }

  // 2. A phone viewport.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
    });
    const page = await context.newPage();
    const run = await runJourney(page, { label: "mobile-en" });
    check(run.questionCount === expectedQuestions,
      `mobile-en: ${run.questionCount} questions on a phone viewport, expected ${expectedQuestions}`);
    check(/\$50/.test(run.result.text), "mobile-en: the priced result did not state the price on a phone viewport");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    record.mobileHorizontalOverflowPx = overflow;
    check(overflow <= 1, `mobile-en: the result page scrolls horizontally by ${overflow}px`);
    await context.close();
  }

  // 3. Keyboard only.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const run = await runJourney(page, { label: "desktop-en-keyboard", keyboard: true });
    check(run.questionCount === expectedQuestions,
      `keyboard: ${run.questionCount} questions completed without a mouse, expected ${expectedQuestions}`);
    check(/\$50/.test(run.result.text), "keyboard: the journey did not reach the priced result");
    await context.close();
  }

  // 4. Spanish.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-US" });
    const page = await context.newPage();
    const run = await runJourney(page, { label: "desktop-es", spanish: true });
    const english = record.runs[0];
    check(run.questionCount === expectedQuestions,
      `desktop-es: ${run.questionCount} questions in Spanish, expected ${expectedQuestions}`);

    const untranslatedHeadings = run.headings.filter((heading, index) => heading === english.headings[index]);
    record.spanishUntranslatedHeadings = untranslatedHeadings;
    check(untranslatedHeadings.length === 0,
      `desktop-es: ${untranslatedHeadings.length} of ${run.headings.length} question headings stayed in English`);

    const untranslatedOptions = run.optionLabels
      .map((labels, index) => ({ questionId: run.questionIds[index], labels }))
      .filter(({ labels }, index) => JSON.stringify(labels) === JSON.stringify(english.optionLabels[index]))
      .map(({ questionId }) => questionId);
    record.spanishUntranslatedOptionSets = untranslatedOptions;
    check(untranslatedOptions.length === 0,
      `desktop-es: the options stayed in English on ${untranslatedOptions.join(", ")}`);

    const englishOnResult = RESULT_INTERFACE_COPY.filter((line) => run.result.text.includes(line));
    record.spanishUntranslatedResultCopy = englishOnResult;
    check(englishOnResult.length === 0,
      `desktop-es: ${englishOnResult.length} result lines are English-only — ${englishOnResult.join(" / ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}

record.failures = failures;
fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(record, null, 2));

if (failures.length > 0) {
  console.error(`verify-expungement-anonymous-journey-browser FAILED: ${failures.length} finding(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("verify-expungement-anonymous-journey-browser passed");
console.log(`  ${record.runs.map((run) => `${run.label}=${run.questionCount}q`).join("  ")}`);
console.log(`  free-check questions: ${record.runs[0].questionIds.join(", ")}`);
console.log(`  free-text or date controls in the free check: ${record.runs[0].freeTextControls.length}`);
console.log(`  phone-viewport horizontal overflow: ${record.mobileHorizontalOverflowPx}px`);
console.log("  Spanish: 0 untranslated headings, 0 untranslated option sets, 0 English-only result lines");
console.log(`  evidence: ${path.relative(process.cwd(), EVIDENCE_PATH)}`);
