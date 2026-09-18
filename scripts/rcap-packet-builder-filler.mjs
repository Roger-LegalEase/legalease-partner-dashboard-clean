#!/usr/bin/env node
/**
 * The packet-information builder's form filler, as one importable unit.
 *
 * It sits beside the probe rather than inside it so it can be exercised
 * against real markup without running a Production journey. It is deliberately
 * NOT under scripts/lib: that path belongs to the worker-source gate, and this
 * is probe tooling with no bearing on the packet the worker renders.
 *
 * It answers questions; it never decides them. Every value it enters comes
 * from the answer map below, which is the map the probe has always used.
 */

/**
 * The answers this probe gives, unchanged.
 *
 * The Mississippi non-conviction packet re-checks these route facts before it
 * will verify (mississippiNonConvictionPacketSafety). A first-option or
 * placeholder answer makes the review unsafe and withholds the verify action,
 * so these values are the run's factual position and not a convenience — they
 * are entered as written or the step refuses.
 */
export const PACKET_SAFE_ANSWERS = Object.freeze({
  pending_cases: "No",
  trafficking_status: "No",
  prior_relief: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  nonadjudication_or_diversion: "No",
  open_co_defendant_matter: "No",
  actual_arrest: "Yes",
  release_confirmed: "Yes",
  disposition_record_wording: "Charges dropped",
  statutory_disposition_category: "Charges dropped"
});
export const PACKET_ISO_DATE = "2015-01-15";
export const PACKET_BUILDER = "[data-packet-information-builder='active']";

export function packetFieldValue(id, prompt) {
  if (PACKET_SAFE_ANSWERS[id]) return PACKET_SAFE_ANSWERS[id];
  if (/_date$|_date_/.test(id) || /\bdate\b/i.test(prompt)) return PACKET_ISO_DATE;
  const known = {
    participant_full_legal_name: "Acceptance Participant",
    full_legal_name: "Acceptance Participant",
    contact_information: "100 Acceptance Way, Jackson, MS 39201",
    county: "Hinds County",
    court: "Hinds County Circuit Court",
    court_name: "Hinds County Circuit Court",
    charge: "Acceptance test misdemeanor charge",
    record_type: "Court case",
    residency_or_location: "Jackson, Mississippi",
    age_at_offense: "30"
  };
  if (known[id]) return known[id];
  if (/name/i.test(prompt)) return "Acceptance Participant";
  if (/number|docket|case/i.test(prompt)) return "25-CR-000123";
  if (/county/i.test(prompt)) return "Hinds County";
  if (/court/i.test(prompt)) return "Hinds County Circuit Court";
  if (/age|year/i.test(prompt)) return "30";
  return "Acceptance test information";
}

/**
 * The question this step is asking, by the identity the application gives it.
 *
 * Every control the builder renders carries `q-<questionId>`: text, textarea
 * and date controls as `id`, option groups as the `name` their inputs share.
 * That is a stable key and the visible prompt is not — the prompt is localized
 * display text, and so is every option label. Answers are therefore chosen by
 * question id and by an option's `value`, never by what is painted on screen.
 */
export async function builderQuestionId(builder) {
  const identified = builder.locator("[id^='q-']:visible, [name^='q-']:visible").first();
  if (!(await identified.count())) return null;
  const raw = (await identified.getAttribute("name")) ?? (await identified.getAttribute("id")) ?? "";
  // A date control's parts are `q-<id>-month` and siblings, so the trailing
  // part name is removed to leave the question's own id.
  return raw.replace(/^q-/, "").replace(/-(month|day|year|unknown|prompt|helper|error)$/, "") || null;
}

/**
 * Which of the offered options carries this run's existing answer.
 *
 * The map's value is matched against each option's `value` attribute, which is
 * the profile's own option string rather than the localized label. Nothing new
 * is invented here: where the map has no entry the generic value is used, and
 * where neither names a real option the first option that does not decline to
 * answer is taken, exactly as before.
 */
export function chooseOption(questionId, prompt, optionValues) {
  const safe = PACKET_SAFE_ANSWERS[questionId] ?? packetFieldValue(questionId, prompt);
  const wanted = String(safe).toLowerCase();
  const exact = optionValues.find((value) => value.toLowerCase() === wanted);
  if (exact) return exact;
  const prefixed = optionValues.find((value) => value.toLowerCase().startsWith(wanted));
  if (prefixed) return prefixed;
  return optionValues.find((value) => !/not sure|prefer not|unknown|don'?t know/i.test(value)) ?? null;
}

/**
 * Answers whichever control the builder is showing, as a participant would. A
 * prefilled value is the participant's own answer projected into the packet and
 * is never overwritten.
 *
 * Each branch sets its control through Playwright's own interaction — fill,
 * check, selectOption — which dispatches the input and change events React
 * listens for, and then reads the control back. A control still holding no
 * value has not been answered, and that throws here naming the question id, the
 * control type and the options it offered, rather than letting the builder
 * refuse at save with "Please answer this question to continue" and leave the
 * failure to be guessed at from a screenshot.
 */
/**
 * Answers a whole builder screen.
 *
 * The builder used to render one question per screen. It now renders one
 * packet-information SECTION per screen, so a screen may carry several
 * controls and every unanswered one has to be filled before Continue. Each is
 * answered by the same identity-based rules as before; nothing about how a
 * single control is recognised or set has changed.
 */
/**
 * What a participant actually meets on one builder screen.
 *
 * Page count is not the measure of a good experience: several sections that
 * each present a wall of fields is the same defect wearing a different shape.
 * This records the real shape of each screen from the rendered DOM, before it
 * is answered, so the reference route can be judged on what a participant
 * sees rather than on how many times they press Continue.
 *
 * `prefilled` is the honest count of fields that already carry a value when
 * the screen opens: information the participant gave in the guided check, or
 * that this route derived, and does not have to type again.
 */
export async function measureBuilderScreen(page) {
  const builder = page.locator(PACKET_BUILDER);
  await builder.waitFor({ state: "visible", timeout: 20_000 });
  return builder.evaluate((node) => {
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const controls = [...node.querySelectorAll("input, select, textarea")].filter(visible);
    const named = controls.filter((control) => (control.getAttribute("name") ?? control.id ?? "").startsWith("q-"));
    const questionIds = new Set();
    const duplicated = [];
    for (const control of named) {
      const raw = control.getAttribute("name") ?? control.id ?? "";
      const id = raw.replace(/^q-/, "").replace(/-(month|day|year|unknown|prompt|helper|error)$/, "");
      if (!id) continue;
      if (questionIds.has(id) && control.type !== "radio" && control.type !== "checkbox") duplicated.push(id);
      questionIds.add(id);
    }
    const textInputs = named.filter((control) =>
      control.tagName === "TEXTAREA"
      || (control.tagName === "INPUT" && ["text", "number", "email", "tel"].includes(control.type)));
    const choiceGroups = new Set(
      named.filter((control) => control.type === "radio" || control.type === "checkbox")
        .map((control) => control.getAttribute("name") ?? control.id)
    );
    const selects = named.filter((control) => control.tagName === "SELECT");
    const prefilled = named.filter((control) => {
      if (control.tagName === "SELECT") return Boolean(control.value);
      if (control.type === "radio" || control.type === "checkbox") return control.checked;
      return Boolean(String(control.value ?? "").trim());
    });
    const heading = node.querySelector("h2")?.textContent?.trim() ?? node.querySelector("h1")?.textContent?.trim() ?? "";
    return {
      heading,
      status: node.querySelector("[data-packet-section-status]")?.getAttribute("data-packet-section-status") ?? null,
      sectionId: node.querySelector("[data-packet-section]")?.getAttribute("data-packet-section") ?? null,
      questions: questionIds.size,
      textInputs: textInputs.length,
      choiceDecisions: choiceGroups.size,
      selects: selects.length,
      prefilledFields: prefilled.length,
      duplicateAsks: duplicated,
      // A screen taller than roughly two viewports is a wall of fields, whatever
      // its heading says.
      screenHeightPx: Math.round(node.getBoundingClientRect().height),
      viewportHeightPx: window.innerHeight
    };
  });
}

export async function answerBuilderStep(page, options = {}) {
  const builder = page.locator(PACKET_BUILDER);
  await builder.waitFor({ state: "visible", timeout: 20_000 });
  // Every question on this screen, by the id the application gives it.
  const questionIds = await builder.evaluate((node) => {
    const ids = new Set();
    for (const control of node.querySelectorAll("[id^='q-'], [name^='q-']")) {
      const raw = control.getAttribute("name") ?? control.getAttribute("id") ?? "";
      const id = raw.replace(/^q-/, "").replace(/-(month|day|year|unknown|prompt|helper|error)$/, "");
      if (id) ids.add(id);
    }
    return [...ids];
  });
  if (questionIds.length <= 1) return answerOneControl(page, options);
  for (const questionId of questionIds) {
    await answerOneControl(page, { ...options, questionId });
  }
}

async function answerOneControl(page, { redact = (value) => value, questionId: only } = {}) {
  const builder = page.locator(PACKET_BUILDER);
  // The screen's own heading is an h1 when one question owns the screen and an
  // h2 when a section does; the question's own prompt is an h3 inside a
  // section. Whichever is present is read, so the refusal below can quote it.
  const prompt = await builder.locator(only ? `[id='q-${only}-prompt']` : "h1, h2").first().innerText().catch(() => "");
  const questionId = only ?? (await builderQuestionId(builder)) ?? "detail";
  // When a section screen names the question, every selector below is scoped to
  // that question's own controls. Without a name the screen carries one
  // question and the unscoped selectors mean the same thing.
  const named = only ? `[name='q-${only}']` : "[name^='q-']";
  const identified = only ? `[id='q-${only}']` : "";
  const refuse = (kind, detail) => {
    throw new Error(
      `packet-information control not answerable: question ${JSON.stringify(questionId)}`
        + ` renders a ${kind} control${detail ? ` (${detail})` : ""}; prompt ${JSON.stringify(redact(prompt))}`
    );
  };

  // Option groups come first: they are the shape the visible-text matcher used
  // to miss. They are scoped by `name`, which is what separates a real option
  // from the "I don't know" checkbox that text and date questions render beside
  // their control: OptionGroup gives every option the question's name, and the
  // unknown box has none. That box is a refusal to answer and is never ticked,
  // which also keeps this filler from inventing an answer the map never made.
  const radios = builder.locator(`input[type='radio']${named}:visible:enabled`);
  if (await radios.count()) {
    if (await builder.locator(`input[type='radio']${named}:visible:checked`).count()) return;
    const values = await radios.evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));
    const chosen = chooseOption(questionId, prompt, values);
    if (!chosen) refuse("single-choice", `options ${JSON.stringify(values)}`);
    await builder.locator(`input[type='radio']${named}[value=${JSON.stringify(chosen)}]`).first().check();
    if (!(await builder.locator(`input[type='radio']${named}:visible:checked`).count())) {
      refuse("single-choice", `selecting ${JSON.stringify(chosen)} left nothing checked`);
    }
    return;
  }

  const checkboxes = builder.locator(`input[type='checkbox']${named}:visible:enabled`);
  if (await checkboxes.count()) {
    if (await builder.locator(`input[type='checkbox']${named}:visible:checked`).count()) return;
    const values = await checkboxes.evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));
    const chosen = values.length ? chooseOption(questionId, prompt, values) : null;
    const target = chosen
      ? builder.locator(`input[type='checkbox']${named}[value=${JSON.stringify(chosen)}]`).first()
      : checkboxes.first();
    await target.check();
    if (!(await builder.locator(`input[type='checkbox']${named}:visible:checked`).count())) {
      refuse("multi-select", `options ${JSON.stringify(values)}`);
    }
    return;
  }

  const text = builder.locator(only
    ? `input${identified}[type='text']:visible:enabled, input${identified}[type='number']:visible:enabled`
    : "input[type='text']:visible:enabled, input[type='number']:visible:enabled").first();
  if (await text.count()) {
    const current = (await text.inputValue().catch(() => "")).trim();
    if (!current) {
      await text.fill(packetFieldValue(questionId, prompt));
      if (!(await text.inputValue().catch(() => "")).trim()) refuse("text", "the value did not stick");
    }
    return;
  }

  const textarea = builder.locator(only ? `textarea${identified}:visible:enabled` : "textarea:visible:enabled").first();
  if (await textarea.count()) {
    const current = (await textarea.inputValue().catch(() => "")).trim();
    if (!current) {
      await textarea.fill(packetFieldValue(questionId, prompt));
      if (!(await textarea.inputValue().catch(() => "")).trim()) refuse("textarea", "the value did not stick");
    }
    return;
  }

  const selects = builder.locator(only
    ? `select[id^='q-${only}']:visible:enabled`
    : "select:visible:enabled");
  const selectCount = await selects.count();
  if (selectCount === 3) {
    await selects.nth(0).selectOption("01");
    await selects.nth(1).selectOption("15");
    const years = await selects.nth(2).locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    await selects.nth(2).selectOption(years.includes("2015") ? "2015" : years.at(-1) ?? "2000");
    const parts = await selects.evaluateAll((nodes) => nodes.map((node) => node.value));
    if (parts.some((part) => !part)) refuse("date", `parts ${JSON.stringify(parts)}`);
    return;
  }
  if (selectCount === 1) {
    const select = selects.first();
    if (await select.inputValue().catch(() => "")) return;
    const values = await select.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    const chosen = chooseOption(questionId, prompt, values);
    if (!chosen) refuse("select", `options ${JSON.stringify(values)}`);
    await select.selectOption(chosen);
    if (!(await select.inputValue().catch(() => ""))) refuse("select", `selecting ${JSON.stringify(chosen)} left it empty`);
    return;
  }

  refuse("unrecognised", "no text, textarea, select, or named option control is visible");
}
