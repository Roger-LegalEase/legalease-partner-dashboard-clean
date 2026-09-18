#!/usr/bin/env node
/**
 * Regression for the packet-information builder's form filler.
 *
 * It exists because the filler used to pick options by their visible text, and
 * the builder's visible text is localized display copy while the value the
 * application stores is the option's `value`. Two live questions proved it:
 * "Which county handled this matter?" and "What exactly does the certified
 * record say about how the case ended?". Both are reproduced here, along with
 * the other control shapes the builder renders, against markup copied from
 * QuestionField and OptionGroup: the option `name` is `q-<questionId>`, each
 * option's `value` is the profile's own string, and a `_or_unknown` question
 * renders an unnamed "I don't know" checkbox beside its real control.
 *
 * This is a regression, not a harness: it renders fixed markup, runs the real
 * exported `answerBuilderStep` over it, and asserts what each control ends up
 * holding. Nothing here talks to Production, Stripe, or the application.
 */

import { chromium } from "playwright";

import { answerBuilderStep, PACKET_SAFE_ANSWERS } from "./rcap-packet-builder-filler.mjs";

/** The builder shell every question is rendered inside. */
function builderPage(questionId, prompt, body) {
  return `<!doctype html><meta charset="utf-8"><body>
    <div data-packet-information-builder="active">
      <h1 id="q-${questionId}-prompt">${prompt}</h1>
      ${body}
    </div>
  </body>`;
}

/**
 * An option group as OptionGroup renders it: the question's id is the shared
 * `name`, the stored answer is the `value`, and the label is display copy that
 * deliberately does not match it.
 */
function optionGroup(questionId, type, options) {
  return options
    .map(
      ([value, label], index) => `
      <label for="q-${questionId}-${index}">
        <input id="q-${questionId}-${index}" type="${type}" name="q-${questionId}" value="${value}" />
        <span><span>${label}</span></span>
      </label>`
    )
    .join("");
}

/** The "I don't know" box a `_or_unknown` question renders: a real control's neighbour, with no name. */
const UNKNOWN_BOX = `
  <label for="q-unknown-box">
    <input id="q-unknown-box" type="checkbox" />
    <span>I don't know</span>
  </label>`;

const CASE_ENDED_PROMPT = "What exactly does the certified record say about how the case ended?";
const COUNTY_PROMPT = "Which county handled this matter?";

const CASES = [
  {
    name: "single choice, localized labels — the certified-record question",
    questionId: "statutory_disposition_category",
    prompt: CASE_ENDED_PROMPT,
    body: optionGroup("statutory_disposition_category", "radio", [
      ["Convicted", "The court entered a conviction"],
      ["Charges dropped", "The prosecutor dismissed or declined the charges"],
      ["Acquitted", "A judge or jury found me not guilty"],
      ["Not sure", "I'm not sure"]
    ]),
    async assert(page) {
      const checked = await page.locator("input[type='radio']:checked").getAttribute("value");
      equal(checked, PACKET_SAFE_ANSWERS.statutory_disposition_category, "the stored option value is selected");
    }
  },
  {
    name: "text with an 'I don't know' neighbour — the county question",
    questionId: "county",
    prompt: COUNTY_PROMPT,
    body: `<input id="q-county" type="text" />${UNKNOWN_BOX}`,
    async assert(page) {
      equal(await page.locator("#q-county").inputValue(), "Hinds County", "the county is entered");
      await unchecked(page);
    }
  },
  {
    name: "textarea with an 'I don't know' neighbour — the record-wording question",
    questionId: "disposition_record_wording",
    prompt: CASE_ENDED_PROMPT,
    body: `<textarea id="q-disposition_record_wording"></textarea>${UNKNOWN_BOX}`,
    async assert(page) {
      equal(
        await page.locator("#q-disposition_record_wording").inputValue(),
        PACKET_SAFE_ANSWERS.disposition_record_wording,
        "the record wording is entered verbatim"
      );
      await unchecked(page);
    }
  },
  {
    name: "single choice rendered as a select",
    questionId: "pending_cases",
    prompt: "Do you have any pending cases?",
    body: `<select id="q-pending_cases">
        <option value=""></option>
        <option value="Yes">Yes, one or more are pending</option>
        <option value="No">No, nothing is pending</option>
      </select>`,
    async assert(page) {
      equal(await page.locator("#q-pending_cases").inputValue(), PACKET_SAFE_ANSWERS.pending_cases, "the stored option value is selected");
    }
  },
  {
    name: "multi-select option group",
    questionId: "record_type",
    prompt: "What kind of record is this?",
    body: optionGroup("record_type", "checkbox", [
      ["Court case", "A case handled by a court"],
      ["Arrest only", "An arrest that never reached a court"]
    ]),
    async assert(page) {
      const checked = await page.locator("input[type='checkbox']:checked").getAttribute("value");
      equal(checked, "Court case", "the mapped option value is ticked");
    }
  },
  {
    name: "date question with an 'I don't know' neighbour",
    questionId: "sentence_completion_date",
    prompt: "When did you complete the sentence?",
    body: `<select id="q-sentence_completion_date-month"><option value=""></option><option value="01">January</option></select>
      <select id="q-sentence_completion_date-day"><option value=""></option><option value="15">15</option></select>
      <select id="q-sentence_completion_date-year"><option value=""></option><option value="2015">2015</option></select>
      <input type="hidden" id="q-sentence_completion_date" />${UNKNOWN_BOX}`,
    async assert(page) {
      const parts = await page.locator("select").evaluateAll((nodes) => nodes.map((node) => node.value));
      equal(parts.join("-"), "01-15-2015", "every date part is set");
      await unchecked(page);
    }
  }
];

const failures = [];

function equal(actual, expected, what) {
  if (actual === expected) return;
  failures.push(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/**
 * The refusal box is never ticked. Ticking it would answer "I don't know",
 * which is a different answer than the map holds — the filler is not allowed
 * to invent one to get the step past save.
 */
function unchecked(page) {
  return page
    .locator("#q-unknown-box")
    .isChecked()
    .then((checked) => {
      if (checked) failures.push("the \"I don't know\" box was ticked, which answers the question differently");
    });
}

const executablePath = process.env.RCAP_BROWSER_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();

for (const testCase of CASES) {
  const before = failures.length;
  try {
    await page.setContent(builderPage(testCase.questionId, testCase.prompt, testCase.body));
    await answerBuilderStep(page);
    await testCase.assert(page);
  } catch (error) {
    failures.push(`${testCase.name}: ${error.message}`);
  }
  console.log(`${failures.length === before ? "ok  " : "FAIL"} ${testCase.name}`);
}

await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`\n${CASES.length} control shapes answered from the existing map.`);
