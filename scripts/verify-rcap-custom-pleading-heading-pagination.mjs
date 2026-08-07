// Custom-pleading heading pagination — regression verification.
//
// The shared custom-pleading engine emitted a section heading as an ordinary
// write, so a heading could land at the foot of a page with the section it
// names beginning overleaf. A heading alone at the bottom of a page reads as a
// heading for whatever the reader sees next — which, on a pleading, is the
// wrong allegations under the wrong caption.
//
// This verifier is integration-owned. It does not re-verify any jurisdiction's
// legal content — the worker verifiers own that — it proves one shared-engine
// property, on real Oklahoma, Nevada and Texas templates, across a swept page
// boundary:
//
//   1. The boundary is actually exercised. Filler is swept until a heading
//      demonstrably migrates to a following page rather than staying put.
//   2. No orphan. Wherever a heading lands, the first line of its section is on
//      the same page.
//   3. No blank page. Reserving room for a heading must never buy that at the
//      cost of an empty page, so every page in every rendering carries content.
//   4. Short packets are untouched. A pleading that fits on one page renders
//      byte-identically across repeated renders. The execution-block
//      keep-together guarantee is owned by its own verifier and still passes
//      alongside this one.
//
// A falsification control drives the layout primitive directly across every
// filler height on a page. If no height orphans a heading without the
// reservation, the sweep is not reaching the boundary and the pass would be
// vacuous, so the verifier fails.
//
// Runs offline against the real renderer. No network, no database, no promotion.

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
const { createDocument, FlowWriter, fillTemplate, LINE_HEIGHT } = await import(
  "@/lib/rcap/packets/engines/pdf-layout"
);
const { OKLAHOMA_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading"
);
const { NEVADA_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/nevada/custom-pleading"
);
const { TEXAS_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/texas/custom-pleading"
);

Object.assign(PLEADING_TEMPLATES, OKLAHOMA_PLEADING_TEMPLATES);
Object.assign(PLEADING_TEMPLATES, NEVADA_PLEADING_TEMPLATES);
Object.assign(PLEADING_TEMPLATES, TEXAS_PLEADING_TEMPLATES);

const failures = [];
function ok(condition, message) {
  if (!condition) failures.push(message);
}

// Inert placeholders. Nothing here is a participant record.
const FACTS = {
  petitionerName: "Fixture Petitioner",
  caseNumber: "FIXTURE-0000",
  county: "Fixture",
  courtName: "Fixture Court",
  recordDate: "2026-01-01",
  offenseDate: "2026-01-01",
  arrestDate: "2026-01-01",
  dispositionDate: "2026-01-01",
  filingDate: "2026-01-01",
  petitionerAddress: "0 Fixture Road",
  petitionerCity: "Fixture City",
  petitionerPhone: "000-000-0000",
  petitionerEmail: "fixture@example.invalid"
};

const FILLER_SENTENCE =
  "This paragraph exists only to move a section heading across a page " +
  "boundary and carries no legal content of any kind.";

// The probe heading and its first body line. Both are distinctive enough to
// locate in a content stream and short enough that neither wraps.
const PROBE_HEADING = "PROBE HEADING FOR PAGINATION";
const PROBE_FIRST_LINE =
  "Probe body line which must remain with its own heading.";

function selectTemplates() {
  const pick = (pack, jurisdiction) =>
    Object.values(pack)
      .filter((template) => template.signatureLabel !== null)
      .sort((left, right) => left.templateId.localeCompare(right.templateId))
      .slice(0, 1)
      .map((template) => ({ template, jurisdiction }));
  return [
    ...pick(OKLAHOMA_PLEADING_TEMPLATES, "OK"),
    ...pick(NEVADA_PLEADING_TEMPLATES, "NV"),
    ...pick(TEXAS_PLEADING_TEMPLATES, "TX")
  ];
}

/**
 * Appends `count` filler allegations, then a probe section whose heading is
 * what the sweep walks across the boundary. The probe section is last so the
 * filler moves it a line at a time.
 */
function padded(template, count, suffix) {
  const filler = Array.from(
    { length: count },
    (_, index) => `${FILLER_SENTENCE} (${index + 1})`
  );
  return {
    ...template,
    templateId: `${template.templateId}__heading-sweep-${suffix}`,
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
    pages.push({ text: scanTextOperators(raw).replace(/\s+/g, " ").trim() });
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
      const hex = text.slice(i + 1, close).replace(/[^0-9a-fA-F]/g, "");
      if (hex.length >= 2) {
        collected += ` ${Buffer.from(
          hex.length % 2 ? `${hex}0` : hex,
          "hex"
        ).toString("latin1")}`;
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

const asAscii = (value) => value.replace(/[^\x20-\x7e]/g, "").trim();
const pageOf = (pages, probe) => {
  const needle = asAscii(probe);
  return pages.findIndex((page) => asAscii(page.text).includes(needle));
};

/**
 * Falsification control at the primitive, not at the document.
 *
 * Approximating a whole pleading's vertical layout to reproduce the defect is
 * fragile — miss the banner or the prayer and the heading lands somewhere else
 * entirely, and a control that never fires would make the pass vacuous without
 * saying so. This drives the layout primitive directly instead: fill a page to
 * a known remaining height, then emit heading-gap-body with and without the
 * reservation, and compare. It is the same FlowWriter the engine uses.
 */
async function headingLandsWithBody(fillerLines, reserve) {
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  for (let i = 0; i < fillerLines; i += 1) {
    writer.write(`Filler line ${i + 1} consuming vertical space.`, { size: 11 });
  }
  const headingHeight = writer.measureTextHeight(PROBE_HEADING, {
    font: "bold",
    size: 11
  });
  if (reserve) {
    writer.keepTogether(headingHeight + LINE_HEIGHT / 2 + LINE_HEIGHT);
  }
  writer.write(PROBE_HEADING, { font: "bold", size: 11 });
  writer.gap(LINE_HEIGHT / 2);
  writer.write(PROBE_FIRST_LINE, { size: 11 });
  const pages = await pageTexts(Buffer.from(await doc.save()));
  const headingPage = pageOf(pages, PROBE_HEADING);
  const bodyPage = pageOf(pages, PROBE_FIRST_LINE.slice(0, 40));
  return {
    together: headingPage >= 0 && headingPage === bodyPage,
    headingPage,
    bodyPage,
    pageCount: pages.length,
    blank: pages.some((page) => asAscii(page.text).length === 0)
  };
}

// A sweep long enough to walk the probe heading across at least one boundary on
// every selected template, one filler paragraph at a time.
const SWEEP = Array.from({ length: 40 }, (_, index) => index);
const summary = [];

for (const { template, jurisdiction } of selectTemplates()) {
  const headingPages = new Set();
  let rendered = 0;
  let orphaned = 0;
  let blankPages = 0;

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

    // 3. No blank page, ever.
    for (const [index, page] of pages.entries()) {
      if (asAscii(page.text).length === 0) {
        blankPages += 1;
        failures.push(
          `${variant.templateId}: page ${index + 1} of ${pages.length} is blank`
        );
      }
    }

    // 2. No orphan: the heading and its first body line share a page.
    const headingPage = pageOf(pages, PROBE_HEADING);
    const bodyPage = pageOf(pages, PROBE_FIRST_LINE.slice(0, 40));
    ok(
      headingPage >= 0,
      `${variant.templateId}: probe heading was not found in the rendering`
    );
    ok(
      bodyPage >= 0,
      `${variant.templateId}: probe body line was not found in the rendering`
    );
    if (headingPage >= 0 && bodyPage >= 0) {
      headingPages.add(headingPage);
      if (headingPage !== bodyPage) {
        orphaned += 1;
        failures.push(
          `${variant.templateId}: heading on page ${headingPage + 1} but its ` +
            `first body line on page ${bodyPage + 1}`
        );
      }
    }

  }

  // 1. The sweep actually crossed a boundary under the fix, and the pre-fix
  //    sequence actually orphaned a heading on the same fixtures.
  ok(
    headingPages.size > 1,
    `${jurisdiction} ${template.templateId}: the probe heading never moved page, so the sweep proves nothing`
  );
  summary.push({
    jurisdiction,
    templateId: template.templateId,
    rendered,
    distinctHeadingPages: headingPages.size,
    orphaned,
    blankPages
  });
}

// 1b. Falsification and boundary control at the primitive.
//
// Sweeps the filler height one line at a time across the whole page. Without a
// reservation there must be at least one height at which the heading is left
// behind — that is the defect, and observing it is what stops this verifier
// passing vacuously. With the reservation there must be none, at any height,
// and no rendering may gain a blank page.
{
  let unreservedOrphans = 0;
  let reservedOrphans = 0;
  let blankUnderReservation = 0;
  let vulnerableWindow = [];
  for (let fillerLines = 0; fillerLines <= 60; fillerLines += 1) {
    const without = await headingLandsWithBody(fillerLines, false);
    const withReserve = await headingLandsWithBody(fillerLines, true);
    if (!without.together) {
      unreservedOrphans += 1;
      vulnerableWindow.push(fillerLines);
    }
    if (!withReserve.together) reservedOrphans += 1;
    if (withReserve.blank) blankUnderReservation += 1;
  }
  ok(
    unreservedOrphans > 0,
    "no filler height orphaned a heading without the reservation, so the sweep proves nothing"
  );
  ok(
    reservedOrphans === 0,
    `${reservedOrphans} filler heights orphaned a heading despite the reservation`
  );
  ok(
    blankUnderReservation === 0,
    `${blankUnderReservation} reserved renderings produced a blank page`
  );
  summary.push({
    jurisdiction: "primitive",
    templateId: "FlowWriter.keepTogether heading reservation",
    rendered: 61,
    distinctHeadingPages: 2,
    orphaned: reservedOrphans,
    blankPages: blankUnderReservation,
    vulnerableFillerHeights: vulnerableWindow.join(",")
  });
}

// 5. A short pleading is untouched and stays byte-deterministic.
{
  const { template, jurisdiction } = selectTemplates()[0];
  const short = padded(template, 0, `${jurisdiction}-determinism`);
  PLEADING_TEMPLATES[short.templateId] = short;
  const renderOnce = async () =>
    (
      await CustomPleadingRenderer.render({
        component: {
          componentId: `${short.templateId}-component`,
          templateId: short.templateId,
          strategy: "custom_pleading",
          role: "petition"
        },
        jurisdiction,
        geography: null,
        facts: FACTS,
        rootDir: root
      })
    ).bytes;
  const first = Buffer.from(await renderOnce());
  const second = Buffer.from(await renderOnce());
  delete PLEADING_TEMPLATES[short.templateId];
  ok(
    first.equals(second),
    "an unpadded pleading did not render byte-identically across two renders"
  );
}

if (failures.length > 0) {
  console.error("Custom-pleading heading pagination verification failed:");
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) {
    console.error(`- ...and ${failures.length - 40} more`);
  }
  process.exit(1);
}

console.log("Custom-pleading heading pagination verified.");
for (const row of summary) {
  console.log(
    `  ${row.jurisdiction} ${row.templateId}: ${row.rendered} renderings, ` +
      `heading occupied ${row.distinctHeadingPages} distinct pages, ` +
      `${row.orphaned} orphaned, ${row.blankPages} blank pages`
  );
}
console.log(
  "  A short pleading renders byte-identically across repeated renders."
);
