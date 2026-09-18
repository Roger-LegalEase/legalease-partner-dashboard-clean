#!/usr/bin/env node
/**
 * Read the participant's journey as a consumer would, not as code.
 *
 * The static gate (`verify-external-participant-language.mjs`) proves no
 * internal noun reaches a screen. That is necessary and nowhere near
 * sufficient. A journey can pass it word by word and still read like twelve
 * engineering modules stitched together: a heading that names no action, a
 * paragraph explaining machinery nobody asked about, the same disclaimer three
 * screens running, a sentence that is technically plain English and still
 * leaves the participant unsure what to do next.
 *
 * So the hosted journey captures the text each surface actually rendered, in
 * order, and this reviews that captured text. It reports findings in the
 * categories a person would use:
 *
 *   INTERNAL_LANGUAGE          implementation vocabulary reached a screen
 *   LEGAL_JARGON               a legal term where plain English would do
 *   CORPORATE_LANGUAGE         operations/process voice, not a consumer voice
 *   ROBOTIC_COPY               grammatical, lifeless, machine-shaped
 *   UNCLEAR_ACTION             the participant cannot tell what to do next
 *   REPETITIVE                 the same sentence across several surfaces
 *   NOT_COMMERCIALLY_POLISHED  it reads like an internal tool
 *
 * Two of these are hard failures because a machine can be certain about them:
 * INTERNAL_LANGUAGE (the static gate's own patterns, re-run against real
 * rendered text rather than source, which catches anything composed at
 * runtime) and UNCLEAR_ACTION on a surface that asks the participant to act
 * but offers no action. The rest are reported for a person to read and judge,
 * because "does this sound like a finished commercial product" is not a
 * question a regular expression gets to answer. Reporting them as advisory is
 * the honest choice; auto-failing tone would only teach us to write around the
 * checker.
 *
 * Legally significant wording is never rewritten to score better here. A
 * disclaimer that must say what it says keeps saying it; the flag exists so a
 * person can tell the difference.
 */

import { participantLanguageDefects } from "./verify-external-participant-language.mjs";

/** The surfaces a participant passes through, in the order they meet them. */
export const JOURNEY_SURFACES = [
  "preliminary_result",
  "briefcase_handoff",
  "packet_information_landing",
  "packet_information_section",
  "validation_error",
  "save_and_resume",
  "review_and_edit",
  "eligibility_confirmation",
  "checkout_cta",
  "payment_return",
  "packet_preparation",
  "packet_ready",
  "filing_next_steps"
];

/** Surfaces where the participant is expected to do something next. */
const SURFACES_REQUIRING_AN_ACTION = new Set([
  "preliminary_result",
  "briefcase_handoff",
  "packet_information_landing",
  "packet_information_section",
  "review_and_edit",
  "eligibility_confirmation",
  "checkout_cta",
  "packet_ready",
  "filing_next_steps"
]);

const LEGAL_JARGON = [
  [/\bpetitioner\b/i, "petitioner"],
  [/\baffiant\b/i, "affiant"],
  [/\bnunc pro tunc\b/i, "nunc pro tunc"],
  [/\bprae?cipe\b/i, "praecipe"],
  [/\bin forma pauperis\b/i, "in forma pauperis"],
  [/\bex parte\b/i, "ex parte"],
  [/\bhereinafter\b/i, "hereinafter"],
  [/\bheretofore\b/i, "heretofore"],
  [/\bpursuant to\b/i, "pursuant to"],
  [/\bsaid (?:petition|matter|case|offense)\b/i, "said <noun>"],
  [/\bshall be deemed\b/i, "shall be deemed"],
  [/\bwithout prejudice\b/i, "without prejudice"]
];

const CORPORATE_LANGUAGE = [
  [/\bleverage\b/i, "leverage"],
  [/\butilize[ds]?\b/i, "utilize"],
  [/\bfacilitat(?:e|es|ed|ing)\b/i, "facilitate"],
  [/\bonboard(?:ing)?\b/i, "onboarding"],
  [/\bstakeholders?\b/i, "stakeholder"],
  [/\bsolutions?\b/i, "solution"],
  [/\bworkflow\b/i, "workflow"],
  [/\bend[- ]to[- ]end\b/i, "end-to-end"],
  [/\bbest[- ]in[- ]class\b/i, "best-in-class"],
  [/\bcompliance (?:posture|framework)\b/i, "compliance posture"],
  [/\bin order to\b/i, "in order to"],
  [/\bat this time\b/i, "at this time"],
  [/\bplease be advised\b/i, "please be advised"]
];

const ROBOTIC_COPY = [
  [/\bis required\b/i, "\"is required\" — say what to do instead"],
  [/\bmust be (?:provided|completed|supplied|entered)\b/i, "\"must be provided\" — passive demand"],
  [/\bhas been (?:successfully )?(?:processed|completed|submitted|initiated)\b/i, "process-report voice"],
  [/\bplease (?:complete|provide|enter) the (?:above|following|required)\b/i, "form-letter instruction"],
  [/\bthe (?:system|application|service) (?:will|has|cannot)\b/i, "the system as the subject"],
  [/\bunable to (?:process|complete|proceed)\b/i, "\"unable to\" — say what happened"],
  [/\binvalid (?:input|value|entry|selection)\b/i, "\"invalid\" — say what is wrong"],
  [/\ban error (?:has )?occurred\b/i, "\"an error occurred\" — says nothing"]
];

/**
 * Words that mean the participant is being asked to act. A surface that asks
 * for action and offers none of these has not told them what to do.
 */
const ACTION_WORDS = /\b(?:continue|next|start|begin|review|confirm|check|save|add|edit|change|answer|choose|select|pay|open|download|print|file|sign|upload|finish|complete|go|see|read|tell|enter|create|sign in|get started)\b/i;

/**
 * Capture what one surface rendered.
 *
 * `text` is the visible text of the page region, exactly as the participant
 * met it. `headings` and `actions` are the headings and the clickable labels,
 * because "is the next action clear" is a question about those, not about the
 * paragraph.
 */
export async function captureSurface(page, surface, { selector = "main" } = {}) {
  const region = page.locator(selector).first();
  await region.waitFor({ state: "visible", timeout: 20_000 });
  const captured = await region.evaluate((node) => {
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const textOf = (element) => (element.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      text: (node.innerText ?? "").replace(/\r/g, ""),
      headings: [...node.querySelectorAll("h1, h2, h3")].filter(visible).map(textOf).filter(Boolean),
      actions: [...node.querySelectorAll("button, a, [role=button], input[type=submit]")]
        .filter(visible).filter((element) => !element.disabled)
        .map((element) => textOf(element) || element.getAttribute("aria-label") || "")
        .filter(Boolean)
    };
  });
  return { surface, url: page.url(), ...captured };
}

/** Split captured page text into the sentences a participant reads. */
function sentencesOf(text) {
  return String(text ?? "")
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 1 && /[A-Za-zÁ-ÿ]/.test(sentence));
}

/**
 * Review the captured journey.
 *
 * Returns every finding with the surface it came from and the exact sentence,
 * so a person can read the journey in order and judge the advisory flags
 * themselves. `failures` holds only what a machine can be sure of.
 */
export function reviewJourneyCopy(captures) {
  const findings = [];
  const seenSentences = new Map();
  const add = (surface, category, sentence, note) =>
    findings.push({ surface, category, sentence: sentence.slice(0, 200), note });

  for (const capture of captures) {
    const sentences = sentencesOf(capture.text);

    for (const sentence of sentences) {
      for (const defect of participantLanguageDefects(sentence)) {
        add(capture.surface, "INTERNAL_LANGUAGE", sentence, defect);
      }
      for (const [pattern, note] of LEGAL_JARGON) {
        if (pattern.test(sentence)) add(capture.surface, "LEGAL_JARGON", sentence, note);
      }
      for (const [pattern, note] of CORPORATE_LANGUAGE) {
        if (pattern.test(sentence)) add(capture.surface, "CORPORATE_LANGUAGE", sentence, note);
      }
      for (const [pattern, note] of ROBOTIC_COPY) {
        if (pattern.test(sentence)) add(capture.surface, "ROBOTIC_COPY", sentence, note);
      }

      // Repetition is a property of the journey, not of one screen: the same
      // disclaimer is fine once and wearying by the fourth time.
      const key = sentence.toLowerCase();
      if (key.length > 40) {
        const surfaces = seenSentences.get(key) ?? [];
        if (!surfaces.includes(capture.surface)) surfaces.push(capture.surface);
        seenSentences.set(key, surfaces);
      }
    }

    // A heading that names no action is how a screen ends up feeling like a
    // status page. This is where "action-oriented headings" is measurable.
    if (SURFACES_REQUIRING_AN_ACTION.has(capture.surface)) {
      const hasAction = capture.actions.some((label) => ACTION_WORDS.test(label));
      if (capture.actions.length === 0) {
        add(capture.surface, "UNCLEAR_ACTION", capture.headings[0] ?? "(no heading)",
          "the participant is expected to act and the surface offers no control");
      } else if (!hasAction) {
        add(capture.surface, "UNCLEAR_ACTION", capture.actions.join(" / "),
          "no control names an action the participant would recognise");
      }
      if (capture.headings.length === 0) {
        add(capture.surface, "NOT_COMMERCIALLY_POLISHED", "(no heading)",
          "the surface has no heading, so it has no hierarchy to read");
      }
    }
  }

  for (const [key, surfaces] of seenSentences) {
    if (surfaces.length > 2) {
      add(surfaces.join(", "), "REPETITIVE", key, `the same sentence appears on ${surfaces.length} surfaces`);
    }
  }

  // Only what a machine can be certain of blocks. Tone is reported, read and
  // judged by a person — the categories are there so that reading is quick,
  // not so a regex can pronounce the journey finished.
  const failures = findings.filter((finding) =>
    finding.category === "INTERNAL_LANGUAGE" || finding.category === "UNCLEAR_ACTION");

  return {
    surfacesCaptured: captures.map((capture) => capture.surface),
    surfacesMissing: JOURNEY_SURFACES.filter((surface) =>
      !captures.some((capture) => capture.surface === surface)),
    sentencesReviewed: captures.reduce((sum, capture) => sum + sentencesOf(capture.text).length, 0),
    findings,
    advisory: findings.filter((finding) => !failures.includes(finding)),
    failures
  };
}
