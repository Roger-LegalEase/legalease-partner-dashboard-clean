#!/usr/bin/env node
/**
 * What a participant actually does in packet information, measured from the
 * real browser.
 *
 * "57 screens became 8 sections" is not evidence of a good experience. Eight
 * sections that each present a wall of fields is the same defect wearing a
 * different shape, and a grouped builder makes it very easy for a browser test
 * to go green while the participant's workload is unchanged. So this measures
 * the journey in participant terms and holds it to invariants that a false
 * green cannot satisfy:
 *
 *   - every section is measured BEFORE the filler touches it, so the counts
 *     describe what the participant met, not what the filler left behind;
 *   - a fact asked twice anywhere in the journey is a duplicate, not just a
 *     fact asked twice on one screen;
 *   - facts the guided check already settled never come back as empty
 *     controls; prefilled, read-only or behind an explicit Edit is fine,
 *     because correcting a wrong screening answer must stay possible;
 *   - facts the route derives must create no participant work at all;
 *   - conditional controls are counted only where they were actually rendered,
 *     and at least one conditional branch must be shown to reveal its
 *     dependants;
 *   - a section that becomes an unreasonable wall of fields is flagged for a
 *     human, not silently passed and not automatically failed.
 *
 * Nothing here writes an answer. It observes.
 */

export function createPacketUxMeasurement({ expectedReusedFactIds = [], expectedDerivedFactIds = [] } = {}) {
  const sections = [];
  /** factId -> how many separate sections asked the participant for it. */
  const askedOn = new Map();
  const conditionalRevealed = [];

  return {
    /** Record one section exactly as it rendered, before any value is entered. */
    record(screen) {
      sections.push(screen);
      for (const factId of screen.factIds ?? []) {
        askedOn.set(factId, (askedOn.get(factId) ?? 0) + 1);
      }
    },

    /**
     * Note that answering a gate fact revealed its dependants. Proving one
     * branch really opens is the difference between "conditional" as a
     * classification and conditional as behaviour.
     */
    recordConditionalReveal(entry) {
      conditionalRevealed.push(entry);
    },

    /** The journey in participant terms, with the invariant verdicts attached. */
    summary() {
      const total = (key) => sections.reduce((sum, section) => sum + (section[key] ?? 0), 0);
      const duplicates = [...askedOn.entries()]
        .filter(([, count]) => count > 1)
        .map(([factId, count]) => ({ factId, askedOnSections: count }));

      const askedFactIds = new Set(askedOn.keys());

      /**
       * Never ask twice — while still letting somebody fix a wrong answer.
       *
       * A fact the guided check already settled must not come back as an
       * empty control the participant has to fill: that is asking twice, and
       * it is the defect. Showing it prefilled, or read-only, or behind an
       * explicit Edit, is not asking twice — it is showing them what we have
       * and letting them correct it. So the rule is about the control's
       * state, not its presence.
       */
      const stateOf = (factId) => {
        for (const section of sections) {
          const state = section.factStates?.[factId];
          if (state) return state;
        }
        return null;
      };
      const reusedStillAsked = expectedReusedFactIds.filter((factId) => {
        const state = stateOf(factId);
        return state ? state.editable && !state.answered : false;
      });
      const reusedShownPrefilled = expectedReusedFactIds.filter((factId) => {
        const state = stateOf(factId);
        return state ? state.answered || !state.editable : false;
      });

      // A derived fact is different: the route computes it, so any control at
      // all is work we created for no reason.
      const derivedStillAsked = expectedDerivedFactIds.filter((factId) => askedFactIds.has(factId));

      const tallest = sections.reduce(
        (worst, section) => {
          const ratio = section.viewportHeightPx > 0 ? section.screenHeightPx / section.viewportHeightPx : 0;
          return ratio > worst.ratio ? { ratio, sectionId: section.sectionId, heading: section.heading } : worst;
        },
        { ratio: 0, sectionId: null, heading: null }
      );
      const busiest = sections.reduce(
        (worst, section) => (section.questions > worst.questions
          ? { questions: section.questions, sectionId: section.sectionId, heading: section.heading }
          : worst),
        { questions: 0, sectionId: null, heading: null }
      );

      // A flag, not a failure. Whether a tall section is a wall of fields or a
      // naturally long one is a judgement a person makes; the number is what
      // they need to make it.
      const wallOfFields = sections
        .filter((section) => {
          const ratio = section.viewportHeightPx > 0 ? section.screenHeightPx / section.viewportHeightPx : 0;
          return ratio > 2.5 || section.questions > 12;
        })
        .map((section) => ({
          sectionId: section.sectionId,
          heading: section.heading,
          questions: section.questions,
          viewportRatio: Number(((section.screenHeightPx || 0) / (section.viewportHeightPx || 1)).toFixed(2))
        }));

      const failures = [];
      if (duplicates.length > 0) {
        failures.push(`the participant is asked for ${duplicates.length} fact(s) more than once: ${duplicates.map((entry) => entry.factId).join(", ")}`);
      }
      if (reusedStillAsked.length > 0) {
        failures.push(`${reusedStillAsked.length} fact(s) the guided check already answered come back as empty controls the participant must fill again: ${reusedStillAsked.join(", ")}`);
      }
      if (derivedStillAsked.length > 0) {
        failures.push(`${derivedStillAsked.length} deterministically derived fact(s) create participant work: ${derivedStillAsked.join(", ")}`);
      }
      if (sections.length === 0) failures.push("no packet-information section was measured");

      return {
        sectionsVisited: sections.length,
        newManualValuesEntered: total("questions"),
        textEntries: total("textInputs"),
        choiceDecisions: total("choiceDecisions"),
        selects: total("selects"),
        conditionalControlsShown: total("conditionalControls"),
        screeningFactsReused: expectedReusedFactIds.length - reusedStillAsked.length,
        screeningFactsReusedIds: expectedReusedFactIds.filter((factId) => !reusedStillAsked.includes(factId)),
        screeningFactsShownPrefilledOrReadOnly: reusedShownPrefilled,
        derivedFactsRequiringNoInput: expectedDerivedFactIds.length - derivedStillAsked.length,
        derivedFactsRequiringNoInputIds: expectedDerivedFactIds.filter((factId) => !askedFactIds.has(factId)),
        fieldsAlreadyPopulatedOnArrival: total("prefilledFields"),
        duplicateAsks: duplicates,
        maximumControlsOnOneSection: busiest,
        tallestSectionViewportRatio: tallest,
        wallOfFieldsFlags: wallOfFields,
        conditionalBranchesProven: conditionalRevealed,
        sections,
        failures
      };
    }
  };
}

/**
 * Read one section's shape from the rendered DOM, before it is answered.
 *
 * `conditionalControls` counts only what this branch actually rendered, which
 * is the point of conditionality: a fact that does not apply to this matter is
 * not work the participant did.
 */
export async function readBuilderScreen(page, builderSelector, conditionalFactIds = []) {
  const builder = page.locator(builderSelector);
  await builder.waitFor({ state: "visible", timeout: 20_000 });
  return builder.evaluate((node, conditionalIds) => {
    const onScreen = (element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const usable = (element) => !element.disabled && onScreen(element);
    // Disabled and read-only controls are collected too, not skipped. A
    // screening-carried fact shown read-only is a correct design; a
    // screening-carried fact shown as an empty control the participant must
    // fill is the defect. Telling those apart needs both in view.
    const all = [...node.querySelectorAll("input, select, textarea")].filter(onScreen);
    const controls = all.filter(usable);
    const isNamed = (control) => (control.getAttribute("name") ?? control.id ?? "").startsWith("q-");
    const named = controls.filter(isNamed);
    const factOf = (control) => (control.getAttribute("name") ?? control.id ?? "")
      .replace(/^q-/, "").replace(/-(month|day|year|unknown|prompt|helper|error)$/, "");
    const hasValue = (control) => {
      if (control.tagName === "SELECT") return Boolean(control.value);
      if (control.type === "radio" || control.type === "checkbox") return control.checked;
      return Boolean(String(control.value ?? "").trim());
    };
    const factIds = new Set();
    for (const control of named) {
      const id = factOf(control);
      if (id) factIds.add(id);
    }

    // Per-fact state, which is what the screening-carry rule is judged on.
    // A fact counts as answered when ANY of its controls holds a value (a
    // radio group is answered by one of its options), and as editable when
    // ANY of them can still be changed.
    const factStates = {};
    for (const control of all.filter(isNamed)) {
      const id = factOf(control);
      if (!id) continue;
      const state = factStates[id] ?? (factStates[id] = { editable: false, answered: false, present: true });
      if (usable(control) && !control.readOnly) state.editable = true;
      if (hasValue(control)) state.answered = true;
    }
    const textInputs = named.filter((control) =>
      control.tagName === "TEXTAREA"
      || (control.tagName === "INPUT" && ["text", "number", "email", "tel"].includes(control.type)));
    const choiceGroups = new Set(
      named.filter((control) => control.type === "radio" || control.type === "checkbox")
        .map((control) => control.getAttribute("name") ?? control.id)
    );
    const prefilled = named.filter(hasValue);
    return {
      factStates,
      sectionId: node.querySelector("[data-packet-section]")?.getAttribute("data-packet-section") ?? null,
      status: node.querySelector("[data-packet-section-status]")?.getAttribute("data-packet-section-status") ?? null,
      heading: node.querySelector("h2")?.textContent?.trim() ?? node.querySelector("h1")?.textContent?.trim() ?? "",
      factIds: [...factIds],
      questions: factIds.size,
      textInputs: textInputs.length,
      choiceDecisions: choiceGroups.size,
      selects: named.filter((control) => control.tagName === "SELECT").length,
      conditionalControls: [...factIds].filter((id) => conditionalIds.includes(id)).length,
      prefilledFields: prefilled.length,
      screenHeightPx: Math.round(node.getBoundingClientRect().height),
      viewportHeightPx: window.innerHeight
    };
  }, conditionalFactIds);
}
