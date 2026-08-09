// Engine-emitted heading pagination — regression verification.
//
// The shared custom-pleading engine writes two headings of its own rather than
// taking them from the template: VERIFICATION and CERTIFICATE OF SERVICE. The
// reservation that protects a template-defined `section.heading` never reached
// either of them, so the heading could stand as the last substantive line of a
// page while the statement or the certificate it introduces began overleaf. A
// verification heading with nothing under it verifies nothing; a certificate of
// service heading with nothing under it certifies nothing, and the certificate
// overleaf is unheaded. Wyoming reproduced this independently after Mississippi
// found it, which is what made it a shared-engine question rather than a
// template one.
//
// This verifier is integration-owned. It proves shared-engine properties on
// real jurisdiction templates across swept page boundaries, and re-verifies
// nothing about any jurisdiction's legal content — the worker verifiers own
// that. Eight properties:
//
//   1. VERIFICATION cannot end a page alone.
//   2. CERTIFICATE OF SERVICE cannot end a page alone.
//   3. The substantive section cannot start on another page without its
//      heading — asserted in both directions, so neither half can drift.
//   4. Execution blocks remain intact: the signature rule, its label and every
//      line of the signature block share one page.
//   5. No blank page is introduced, and in particular no blank trailing page.
//   6. Existing template-defined heading behavior remains intact: a probe
//      section heading still travels with its own first line.
//   7. Output is deterministic across repeated renders.
//   8. A packet with sufficient space retains its prior pagination: with room
//      to spare, the reservation changes nothing at all, proven by rendering
//      the same sequence with and without it at the layout primitive.
//
// A falsification control drives the primitive across every filler height on a
// page. If no height orphans an engine-emitted heading without the
// reservation, the sweep is not reaching the boundary and a pass would be
// vacuous, so the verifier fails.
//
// Runs offline against the real renderer. No network, no database, no
// promotion, nothing enabled.

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { PDFDocument, decodePDFRawStream } = await import("pdf-lib");
const { PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { CustomPleadingRenderer } = await import(
  "@/lib/rcap/packets/engines/custom-pleading"
);
const { createDocument, fillTemplate, FlowWriter, LINE_HEIGHT } = await import(
  "@/lib/rcap/packets/engines/pdf-layout"
);
const { MS_CUSTOM_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/mississippi/custom-pleading"
);
const { OKLAHOMA_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading"
);
const { TEXAS_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/texas/custom-pleading"
);
const { DC_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading"
);
const { WV_CUSTOM_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/west-virginia/custom-pleading"
);

const failures = [];
function ok(condition, message) {
  if (!condition) failures.push(message);
}

// Inert placeholders. Nothing here is a participant record.
const FACTS = {
  petitionerName: "Fixture Petitioner",
  caseNumber: "FIXTURE-0000",
  county: "Fixture",
  countyName: "Fixture",
  courtName: "Fixture Court",
  recordDate: "2026-01-01",
  offenseDate: "2026-01-01",
  arrestDate: "2026-01-01",
  dispositionDate: "2026-01-01",
  filingDate: "2026-01-01",
  petitionerAddress: "0 Fixture Road",
  petitionerCity: "Fixture City",
  petitionerPhone: "000-000-0000",
  petitionerEmail: "fixture@example.invalid",
  movantName: "Fixture Movant",
  hiServiceBasis: "Fixture service basis stated for layout only."
};

const FILLER_SENTENCE =
  "This paragraph exists only to move an engine-emitted heading across a page " +
  "boundary and carries no legal content of any kind.";

const VERIFICATION_HEADING = "VERIFICATION";
const CERTIFICATE_HEADING = "CERTIFICATE OF SERVICE";

// Template-defined heading control for property 6.
const PROBE_HEADING = "PROBE HEADING FOR PAGINATION";
const PROBE_FIRST_LINE =
  "Probe body line which must remain with its own heading.";

/**
 * Real templates that exercise the engine-emitted headings.
 *
 * No template carries both: `verification` is a petition property and
 * `certificateOfService` is carried by its own component, so each heading is
 * swept on its own set of three families. Mississippi appears in both because
 * it is where the defect was first found; the others are families neither
 * reporting worker touched, so a pass cannot be an artifact of one template.
 *
 * Wyoming is deliberately absent. Its worker wrote VERIFICATION and CERTIFICATE
 * OF SERVICE as template-defined section headings on their own components, so
 * Wyoming does not reach the engine emission path at all and would prove
 * nothing about it. That local shape is the worker's and is preserved; this
 * verifier owns the engine.
 */
function selectFor(property) {
  const pick = (pack, jurisdiction) =>
    Object.values(pack)
      .filter((template) =>
        property === "verification"
          ? Boolean(template.verification) && template.signatureLabel !== null
          : Array.isArray(template.certificateOfService) &&
            template.certificateOfService.length > 0
      )
      .sort((left, right) => left.templateId.localeCompare(right.templateId))
      .slice(0, 1)
      .map((template) => ({ template, jurisdiction, property }));
  const selected =
    property === "verification"
      ? [
          ...pick(MS_CUSTOM_PLEADING_TEMPLATES, "MS"),
          ...pick(OKLAHOMA_PLEADING_TEMPLATES, "OK"),
          ...pick(TEXAS_PLEADING_TEMPLATES, "TX")
        ]
      : [
          ...pick(MS_CUSTOM_PLEADING_TEMPLATES, "MS"),
          ...pick(DC_PLEADING_TEMPLATES, "DC"),
          ...pick(WV_CUSTOM_PLEADING_TEMPLATES, "WV")
        ];
  ok(
    selected.length >= 3,
    `expected at least three ${property} templates, found ${selected.length}`
  );
  return selected;
}

/** Appends `count` filler allegations plus a template-heading probe section. */
function padded(template, count, suffix) {
  const filler = Array.from(
    { length: count },
    (_, index) => `${FILLER_SENTENCE} (${index + 1})`
  );
  return {
    ...template,
    templateId: `${template.templateId}__engine-heading-sweep-${suffix}`,
    sections: [
      ...template.sections,
      ...(count > 0
        ? [{ heading: "SWEEP", numbered: true, paragraphs: filler }]
        : []),
      {
        heading: PROBE_HEADING,
        numbered: false,
        paragraphs: [PROBE_FIRST_LINE]
      }
    ]
  };
}

async function pageTexts(bytes) {
  const doc = await PDFDocument.load(bytes);
  const pages = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = [];
    if (contents && typeof contents.size === "function") {
      for (let i = 0; i < contents.size(); i += 1) streams.push(contents.lookup(i));
    } else if (contents) {
      streams.push(contents);
    }
    let raw = "";
    for (const stream of streams) {
      try {
        raw += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      } catch {
        continue;
      }
    }
    pages.push({ text: scanTextOperators(raw).replace(/\s+/gu, " ").trim() });
  }
  return pages;
}

function scanTextOperators(text) {
  let collected = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "<" && text[i + 1] !== "<") {
      const close = text.indexOf(">", i);
      if (close < 0) break;
      const hex = text.slice(i + 1, close).replace(/[^0-9a-fA-F]/gu, "");
      if (hex.length >= 2) {
        collected += ` ${Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex").toString("latin1")}`;
      }
      i = close + 1;
      continue;
    }
    if (text[i] !== "(") {
      i += 1;
      continue;
    }
    let depth = 1;
    let literal = "";
    i += 1;
    while (i < text.length && depth > 0) {
      const char = text[i];
      if (char === "\\") {
        literal += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      if (depth > 0) literal += char;
      i += 1;
    }
    collected += ` ${literal}`;
  }
  return collected;
}

const asAscii = (value) => value.replace(/[^\x20-\x7e]/gu, "").trim();
const pageOf = (pages, probe) => {
  const needle = asAscii(probe);
  if (!needle) return -1;
  return pages.findIndex((page) => asAscii(page.text).includes(needle));
};

/**
 * The last page carrying a probe.
 *
 * A component titled CERTIFICATE OF SERVICE prints those words in its own
 * caption on page 1, so the first match is the title rather than the heading
 * the engine emits near the end. Matching the first occurrence made every
 * rendering look orphaned. The engine emits its heading after every section,
 * the prayer and the execution block, so the last occurrence is the one this
 * verifier is about.
 */
const lastPageOf = (pages, probe) => {
  const needle = asAscii(probe);
  if (!needle) return -1;
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    if (asAscii(pages[index].text).includes(needle)) return index;
  }
  return -1;
};

/**
 * The first line of a filled block, as it appears in the content stream.
 *
 * Long enough to be unambiguous, short enough not to have wrapped — the engine
 * writes wrapped lines separately, so a needle spanning a wrap would never be
 * found on any page and the property would pass vacuously.
 */
const needleOf = (rawText) => {
  // Fill first. A needle taken from the raw template would carry {{movantName}}
  // where the rendering carries the participant's name or the engine's blank
  // rule, and would never be found on any page — a property that can never be
  // located passes vacuously rather than failing loudly.
  const text = fillTemplate(String(rawText), FACTS).text;
  const words = text.replace(/\s+/gu, " ").trim().split(" ");
  let needle = "";
  for (const word of words) {
    const candidate = needle ? `${needle} ${word}` : word;
    if (candidate.length > 34) break;
    needle = candidate;
  }
  return needle;
};

const SWEEP = Array.from({ length: 44 }, (_, index) => index);
const summary = [];

for (const { template, jurisdiction, property } of [
  ...selectFor("verification"),
  ...selectFor("certificateOfService")
]) {
  const headingPages = new Set();
  let rendered = 0;
  let orphans = 0;
  let executionSplits = 0;
  let templateHeadingOrphans = 0;
  let blankPages = 0;

  const heading =
    property === "verification" ? VERIFICATION_HEADING : CERTIFICATE_HEADING;
  const bodyNeedle = needleOf(
    property === "verification"
      ? (template.verification ?? "")
      : (template.certificateOfService?.[0] ?? "")
  );
  const signatureLabel = template.signatureLabel;
  const signatureNeedles = (template.signatureBlock ?? [])
    .map((line) => needleOf(line))
    .filter((line) => line.length > 8 && !/_/u.test(line));

  for (const count of SWEEP) {
    const variant = padded(template, count, `${jurisdiction}-${count}`);
    PLEADING_TEMPLATES[variant.templateId] = variant;
    const result = await CustomPleadingRenderer.render({
      component: {
        componentId: `${variant.templateId}-component`,
        templateId: variant.templateId,
        strategy: "custom_pleading",
        role: "petition"
      },
      jurisdiction,
      geography: null,
      facts: FACTS,
      rootDir: root
    });
    delete PLEADING_TEMPLATES[variant.templateId];
    rendered += 1;

    const pages = await pageTexts(result.bytes);

    // 5. No blank page, anywhere, including the last.
    for (const [index, page] of pages.entries()) {
      if (asAscii(page.text).length === 0) {
        blankPages += 1;
        failures.push(
          `${variant.templateId}: page ${index + 1} of ${pages.length} is blank`
        );
      }
    }

    // 1, 2 and 3. The engine-emitted heading and the substantive content it
    //             introduces share a page. Asserted as equality, so neither the
    //             heading ending a page alone nor the content starting a page
    //             without its heading can pass.
    const headingPage = lastPageOf(pages, heading);
    const bodyPage = lastPageOf(pages, bodyNeedle);
    ok(
      headingPage >= 0,
      `${variant.templateId}: the ${heading} heading was not found in the rendering`
    );
    ok(
      bodyPage >= 0,
      `${variant.templateId}: the content under ${heading} was not found in the rendering`
    );
    if (headingPage >= 0 && bodyPage >= 0) {
      headingPages.add(headingPage);
      if (headingPage !== bodyPage) {
        orphans += 1;
        failures.push(
          `${variant.templateId}: ${heading} on page ${headingPage + 1} but the content ` +
            `it introduces on page ${bodyPage + 1}`
        );
      }
    }

    // 4. The execution block stays one unit: the label under the signature rule
    //    and every identifying line under it share a page. A proposed order and
    //    a court-signed component carry no participant rule and are skipped.
    const labelPage =
      signatureLabel === null ? -1 : pageOf(pages, needleOf(signatureLabel));
    if (labelPage >= 0) {
      for (const line of signatureNeedles) {
        const linePage = pageOf(pages, line);
        if (linePage >= 0 && linePage !== labelPage) {
          executionSplits += 1;
          failures.push(
            `${variant.templateId}: execution block split — signature label on page ` +
              `${labelPage + 1} and "${line}" on page ${linePage + 1}`
          );
        }
      }
    }

    // 6. Template-defined heading behavior is untouched.
    const probeHeadingPage = pageOf(pages, PROBE_HEADING);
    const probeBodyPage = pageOf(pages, PROBE_FIRST_LINE.slice(0, 40));
    if (probeHeadingPage >= 0 && probeBodyPage >= 0 && probeHeadingPage !== probeBodyPage) {
      templateHeadingOrphans += 1;
      failures.push(
        `${variant.templateId}: template heading on page ${probeHeadingPage + 1} but its ` +
          `first body line on page ${probeBodyPage + 1}`
      );
    }
  }

  // The sweep actually crossed a boundary. Without this the pass is vacuous.
  ok(
    headingPages.size > 1,
    `${jurisdiction} ${template.templateId}: ${heading} never moved page, so the sweep proves nothing`
  );

  summary.push({
    jurisdiction,
    templateId: template.templateId,
    heading,
    rendered,
    headingPages: headingPages.size,
    orphans,
    executionSplits,
    templateHeadingOrphans,
    blankPages
  });
}

/**
 * Falsification and pagination-stability control at the primitive.
 *
 * Approximating a whole pleading's vertical layout to reproduce the defect is
 * fragile. This drives the same FlowWriter the engine uses: fill a page to a
 * known remaining height, then emit heading-gap-body with and without the
 * reservation the engine now makes.
 *
 * Without the reservation there must be at least one height at which the
 * heading is left behind — that is the defect. With it there must be none, at
 * any height, and no rendering may gain a blank page. And at every height where
 * the unreserved sequence already kept the heading with its body, the reserved
 * sequence must produce byte-identical output: that is property 8, a packet
 * with sufficient space keeping the pagination it had.
 */
async function emitHeading(fillerLines, heading, body, reserve) {
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  for (let i = 0; i < fillerLines; i += 1) {
    writer.write(`Filler line ${i + 1} consuming vertical space.`, { size: 11 });
  }
  if (reserve) {
    const lead =
      writer.measureTextHeight(heading, { font: "bold", size: 11 }) +
      LINE_HEIGHT / 2;
    if (!writer.keepTogether(lead + writer.measureTextHeight(body, { size: 11 }))) {
      writer.keepTogether(lead + LINE_HEIGHT);
    }
  }
  writer.write(heading, { font: "bold", size: 11 });
  writer.gap(LINE_HEIGHT / 2);
  writer.write(body, { size: 11 });
  const bytes = Buffer.from(await doc.save());
  const pages = await pageTexts(bytes);
  const headingPage = pageOf(pages, heading);
  const bodyPage = pageOf(pages, needleOf(body));
  // The tail of the statement, so "the whole unit fitted" can be distinguished
  // from "the heading and the first line fitted and the rest spilled". Only the
  // first is sufficient space.
  const words = body.replace(/\s+/gu, " ").trim().split(" ");
  const tailPage = lastPageOf(pages, words.slice(-4).join(" "));
  return {
    bytes,
    together: headingPage >= 0 && headingPage === bodyPage,
    unitIntact:
      headingPage >= 0 && headingPage === bodyPage && headingPage === tailPage,
    pageCount: pages.length,
    blank: pages.some((page) => asAscii(page.text).length === 0)
  };
}

for (const [heading, body] of [
  [
    VERIFICATION_HEADING,
    "Petitioner states that the facts set out above are true and correct to the best of Petitioner's knowledge and belief."
  ],
  [
    CERTIFICATE_HEADING,
    "Petitioner will deliver a copy of this petition to the prosecuting attorney at the time of filing."
  ]
]) {
  let unreservedOrphans = 0;
  let reservedOrphans = 0;
  let blankUnderReservation = 0;
  let paginationPreserved = 0;
  let paginationDiverged = 0;
  const vulnerable = [];
  for (let fillerLines = 0; fillerLines <= 60; fillerLines += 1) {
    const without = await emitHeading(fillerLines, heading, body, false);
    const withReserve = await emitHeading(fillerLines, heading, body, true);
    if (!without.together) {
      unreservedOrphans += 1;
      vulnerable.push(fillerLines);
    } else if (without.unitIntact) {
      // Sufficient space: the whole unit already fitted where it stood, so the
      // reservation must be a no-op down to the byte.
      if (without.bytes.equals(withReserve.bytes)) paginationPreserved += 1;
      else paginationDiverged += 1;
    }
    if (!withReserve.together) reservedOrphans += 1;
    if (withReserve.blank) blankUnderReservation += 1;
  }
  ok(
    unreservedOrphans > 0,
    `${heading}: no filler height orphaned the heading without the reservation, so the sweep proves nothing`
  );
  ok(
    reservedOrphans === 0,
    `${heading}: ${reservedOrphans} filler heights orphaned the heading despite the reservation`
  );
  ok(
    blankUnderReservation === 0,
    `${heading}: ${blankUnderReservation} reserved renderings produced a blank page`
  );
  // 8. Where there was room, nothing moved.
  ok(
    paginationDiverged === 0,
    `${heading}: ${paginationDiverged} renderings with sufficient space did not keep their prior pagination`
  );
  summary.push({
    jurisdiction: "primitive",
    templateId: "FlowWriter.keepTogether reservation",
    heading,
    rendered: 122,
    headingPages: 2,
    orphans: reservedOrphans,
    executionSplits: 0,
    templateHeadingOrphans: 0,
    blankPages: blankUnderReservation,
    paginationPreserved,
    vulnerableFillerHeights: vulnerable.join(",")
  });
}

// 7. Determinism. The same input renders to the same bytes.
{
  const { template, jurisdiction } = selectFor("verification")[0];
  for (const count of [0, 26]) {
    const variant = padded(template, count, `${jurisdiction}-determinism-${count}`);
    PLEADING_TEMPLATES[variant.templateId] = variant;
    const renderOnce = async () =>
      Buffer.from(
        (
          await CustomPleadingRenderer.render({
            component: {
              componentId: `${variant.templateId}-component`,
              templateId: variant.templateId,
              strategy: "custom_pleading",
              role: "petition"
            },
            jurisdiction,
            geography: null,
            facts: FACTS,
            rootDir: root
          })
        ).bytes
      );
    const first = await renderOnce();
    const second = await renderOnce();
    delete PLEADING_TEMPLATES[variant.templateId];
    ok(
      first.equals(second),
      `${variant.templateId} did not render byte-identically across two renders`
    );
  }
}

if (failures.length > 0) {
  console.error("Custom-pleading engine heading pagination verification failed:");
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log("Custom-pleading engine-emitted heading pagination verified.");
for (const row of summary) {
  console.log(
    `  ${row.jurisdiction} ${row.templateId} [${row.heading}]: ${row.rendered} renderings, ` +
      `the heading occupied ${row.headingPages} distinct pages, ` +
      `${row.orphans} orphaned, ${row.executionSplits} split execution blocks, ` +
      `${row.templateHeadingOrphans} orphaned template headings, ` +
      `${row.blankPages} blank pages` +
      (row.paginationPreserved === undefined
        ? ""
        : `, ${row.paginationPreserved} renderings with room kept their prior pagination`)
  );
}
console.log(
  "  Engine-emitted headings render deterministically and change nothing where there was room."
);
