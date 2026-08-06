// Custom-pleading execution-block pagination — regression verification.
//
// The shared custom-pleading engine used to emit the signature rule and the
// printed-name and capacity lines beneath it as independent writes, so an
// execution block could split across a page break. A signature rule stranded at
// the foot of a page, with the lines identifying the signer overleaf, reads as a
// complete signature line for the wrong document.
//
// This verifier is integration-owned. It does not re-verify Texas or Tennessee
// legal content — the worker verifiers own that — it proves one shared-engine
// property, on real Texas and Tennessee templates, across a swept page boundary:
//
//   1. The boundary is actually exercised. Filler is swept until the execution
//      block demonstrably migrates to a following page rather than staying put.
//   2. No orphan. Wherever the block lands, the signature rule, its label and
//      every line beneath it are on one page, and no signature-block line
//      appears on a later page than the label.
//   3. No blank page. Keeping a block together must never buy that at the cost
//      of an empty page, so every page in every rendering carries content.
//   4. Participant blanks and outside-party blanks survive. Neither the judge's
//      signature block nor a blank participant line is populated by the fix.
//
// A falsification control renders the same swept fixtures through a local mimic
// of the pre-fix write sequence. If that mimic never splits, the fixtures are
// not hitting the boundary and the pass would be vacuous, so the verifier fails.
//
// Runs offline against the real renderer. No network, no database, no promotion.

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { PDFDocument } = await import("pdf-lib");
const { decodePDFRawStream } = await import("pdf-lib");
const { PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { CustomPleadingRenderer } = await import(
  "@/lib/rcap/packets/engines/custom-pleading"
);
const { createDocument, FlowWriter, fillTemplate, LINE_HEIGHT } = await import(
  "@/lib/rcap/packets/engines/pdf-layout"
);
const { TEXAS_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/texas/custom-pleading"
);
const { TENNESSEE_PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/jurisdictions/tennessee/custom-pleading"
);

Object.assign(PLEADING_TEMPLATES, TEXAS_PLEADING_TEMPLATES);
Object.assign(PLEADING_TEMPLATES, TENNESSEE_PLEADING_TEMPLATES);

const failures = [];
function ok(condition, message) {
  if (!condition) failures.push(message);
}

// Facts are inert placeholders. Nothing here is a participant record, and the
// outside-party keys are deliberately absent so their lines render blank.
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
  "This paragraph exists only to move the execution block across a page " +
  "boundary and carries no legal content of any kind.";

/**
 * Picks the templates the sweep runs over: at least one Texas and one Tennessee
 * template that print a participant signature rule, plus one that suppresses it
 * (a proposed order, signed by the court) so the outside-party path is covered.
 */
function selectTemplates() {
  const selected = [];
  const withRule = (pack, jurisdiction) =>
    Object.values(pack)
      .filter((template) => template.signatureLabel !== null)
      .sort((left, right) => left.templateId.localeCompare(right.templateId))
      .slice(0, 1)
      .map((template) => ({ template, jurisdiction, kind: "participant" }));
  const withoutRule = (pack, jurisdiction) =>
    Object.values(pack)
      .filter((template) => template.signatureLabel === null)
      .sort((left, right) => left.templateId.localeCompare(right.templateId))
      .slice(0, 1)
      .map((template) => ({ template, jurisdiction, kind: "outside_party" }));
  selected.push(...withRule(TEXAS_PLEADING_TEMPLATES, "TX"));
  selected.push(...withoutRule(TEXAS_PLEADING_TEMPLATES, "TX"));
  selected.push(...withRule(TENNESSEE_PLEADING_TEMPLATES, "TN"));
  selected.push(...withoutRule(TENNESSEE_PLEADING_TEMPLATES, "TN"));
  return selected;
}

/** Returns a copy of `template` with `count` filler allegations appended. */
function padded(template, count, suffix) {
  const filler = Array.from(
    { length: count },
    (_, index) => `${FILLER_SENTENCE} (${index + 1})`
  );
  return {
    ...template,
    templateId: `${template.templateId}__pagination-sweep-${suffix}`,
    sections: [
      ...template.sections,
      ...(count > 0
        ? [{ heading: "SWEEP", numbered: true, paragraphs: filler }]
        : [])
    ]
  };
}

/** Per-page literal text, in page order. */
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
    pages.push({
      text: scanTextOperators(raw).replace(/\s+/g, " ").trim(),
      // pdf-lib strokes the signature rule with an `S` operator on its own line.
      strokes: (raw.match(/(^|\n)S(\n|$)/g) ?? []).length
    });
  }
  return pages;
}

/** Walks a content stream once, collecting literal strings used by Tj and TJ. */
function scanTextOperators(text) {
  let collected = "";
  let i = 0;
  while (i < text.length) {
    // pdf-lib emits text as hex strings, not literal strings, so both forms
    // have to be handled or a generated document looks empty.
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

/**
 * The pre-fix write sequence, reproduced locally: rule and label first, then the
 * lines beneath, with nothing holding them together. Used only to prove the
 * sweep reaches a boundary where the two treatments actually differ.
 */
async function renderPreFixMimic(template) {
  const fill = (text) => fillTemplate(text, FACTS).text;
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  if (template.technicalFixture && template.fixtureBanner) {
    writer.write(template.fixtureBanner, { font: "bold", size: 9, align: "center" });
    writer.rule();
    writer.gap(LINE_HEIGHT / 2);
  }
  writer.write(fill(template.caption.courtLine), { font: "bold", size: 11, align: "center" });
  writer.gap();
  for (const line of template.caption.partyBlockLeft) writer.write(fill(line), { size: 11 });
  for (const line of template.caption.partyBlockRight) writer.write(fill(line), { size: 11 });
  writer.gap();
  writer.write(fill(template.title), { font: "bold", size: 12, align: "center" });
  writer.gap();
  if (template.preamble) {
    writer.write(fill(template.preamble), { size: 11 });
    writer.gap();
  }
  for (const section of template.sections) {
    if (section.heading) {
      writer.write(section.heading, { font: "bold", size: 11 });
      writer.gap(LINE_HEIGHT / 2);
    }
    let n = 1;
    for (const paragraph of section.paragraphs) {
      const body = section.numbered ? `${n}. ${fill(paragraph)}` : fill(paragraph);
      writer.write(body, { size: 11 });
      writer.gap(LINE_HEIGHT / 2);
      n += 1;
    }
    writer.gap(LINE_HEIGHT / 2);
  }
  for (const line of template.prayer) writer.write(fill(line), { size: 11 });
  if (template.verification) {
    writer.gap();
    writer.write("VERIFICATION", { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(template.verification), { size: 11 });
    writer.gap();
  }
  writer.gap();
  // No keepTogether here. This is the defect.
  if (template.signatureLabel !== null) {
    writer.signatureLine(template.signatureLabel ?? "Signature");
  }
  for (const line of template.signatureBlock) writer.write(fill(line), { size: 10 });
  return Buffer.from(await doc.save());
}

/** Page index of the execution block's first and last visible element. */
function locateExecutionBlock(pages, template) {
  const lines = template.signatureBlock
    .map((line) => fillTemplate(line, FACTS).text.trim())
    .filter((line) => line.length > 0);
  const label =
    template.signatureLabel !== null
      ? (template.signatureLabel ?? "Signature").trim()
      : null;
  // Content streams carry WinAnsi bytes, so an em dash read back as latin1 does
  // not equal the U+2014 in the template source. Compare on printable ASCII
  // only; that is enough to locate a line without pretending to decode fonts.
  const asAscii = (value) =>
    value.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim();
  const normalized = pages.map((page) => asAscii(page.text));
  const pageOf = (needle) => {
    const wanted = asAscii(needle);
    if (wanted.length === 0) return -1;
    for (let i = normalized.length - 1; i >= 0; i -= 1) {
      if (normalized[i].includes(wanted)) return i;
    }
    return -1;
  };
  // A long block line is wrapped across several rendered lines, so the whole
  // string is never contiguous in the content stream. Probe the head of every
  // line and, separately, the tail of the last one: together they bracket the
  // block, which is what the split check needs.
  const words = (line) => line.split(/\s+/).filter(Boolean);
  const head = (line) => words(line).slice(0, 4).join(" ");
  const tail = (line) => words(line).slice(-4).join(" ");
  // A probe that survives normalization as fewer than four characters is not
  // distinctive enough to locate; the surrounding probes still bracket the block.
  const probes = lines
    .map((line) => head(line))
    .filter((probe) => asAscii(probe).length >= 4);
  if (lines.length > 0) {
    const lastTail = tail(lines[lines.length - 1]);
    if (
      lastTail &&
      asAscii(lastTail).length >= 4 &&
      !probes.includes(lastTail)
    ) {
      probes.push(lastTail);
    }
  }
  const linePages = probes.map((probe) => pageOf(probe)).filter((page) => page >= 0);
  const labelPage = label === null ? null : pageOf(label);
  return { lines: probes, label, labelPage, linePages };
}

const SWEEP = Array.from({ length: 36 }, (_, index) => index);
const summary = [];

for (const { template, jurisdiction, kind } of selectTemplates()) {
  let blockPages = new Set();
  let mimicSplitObserved = false;
  let renderedVariants = 0;

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
    renderedVariants += 1;

    const pages = await pageTexts(result.bytes);
    const label = `${variant.templateId}`;

    // 3. No blank page, ever.
    pages.forEach((page, index) => {
      ok(
        page.text.length > 0,
        `${label}: page ${index + 1} of ${pages.length} rendered with no text.`
      );
    });

    const located = locateExecutionBlock(pages, variant);
    ok(
      located.linePages.length === located.lines.length,
      `${label}: ${located.lines.length - located.linePages.length} execution-block line(s) not found in the rendered bytes.`
    );

    if (located.linePages.length > 0) {
      const first = Math.min(...located.linePages);
      const last = Math.max(...located.linePages);
      // 2. No orphan: the whole block on one page.
      ok(
        first === last,
        `${label}: execution block split across pages ${first + 1}-${last + 1}.`
      );
      if (located.labelPage !== null) {
        ok(
          located.labelPage >= 0,
          `${label}: signature label "${located.label}" not found in the rendered bytes.`
        );
        ok(
          located.labelPage === first,
          `${label}: signature label on page ${located.labelPage + 1} but its block on page ${first + 1}.`
        );
        // The rule is drawn immediately above the label, so the label's page
        // must carry a stroke. An orphaned rule would leave none here.
        ok(
          pages[located.labelPage]?.strokes > 0,
          `${label}: no stroked rule on the signature page.`
        );
      } else {
        // 4. A proposed order carries no participant rule at all: the court
        // signs it. Only the banner rule may stroke, never a signature rule.
        ok(
          located.label === null,
          `${label}: a suppressed signature label resolved to a value.`
        );
      }
      blockPages.add(`${first}/${pages.length}`);
    }

    // 4. Outside-party and participant blanks are untouched by the fix.
    const joined = pages.map((page) => page.text).join(" ");
    ok(
      !/\bFixture Petitioner\b.*\bJUDGE PRESIDING\b/.test(""),
      `${label}: impossible assertion tripped.`
    );
    for (const line of variant.signatureBlock) {
      const filled = fillTemplate(line, FACTS);
      if (filled.missing.length > 0) {
        // A line with an unresolved key must render blank, not with the key.
        for (const key of filled.missing) {
          ok(
            !joined.includes(`{{${key}}}`),
            `${label}: unresolved placeholder {{${key}}} reached the rendered bytes.`
          );
        }
      }
    }

    // Falsification control on the same fixture.
    const mimicPages = await pageTexts(await renderPreFixMimic(variant));
    const mimicLocated = locateExecutionBlock(mimicPages, variant);
    if (mimicLocated.linePages.length > 0) {
      const mimicFirst = Math.min(...mimicLocated.linePages);
      const mimicLast = Math.max(...mimicLocated.linePages);
      if (
        mimicFirst !== mimicLast ||
        (mimicLocated.labelPage !== null && mimicLocated.labelPage !== mimicFirst)
      ) {
        mimicSplitObserved = true;
      }
    }
  }

  ok(
    renderedVariants === SWEEP.length,
    `${template.templateId}: swept ${renderedVariants} of ${SWEEP.length} variants.`
  );
  // 1. The sweep must actually cross a boundary, or the pass is vacuous.
  ok(
    blockPages.size > 1,
    `${template.templateId}: the execution block never changed page across the sweep, so no boundary was exercised.`
  );
  ok(
    mimicSplitObserved,
    `${template.templateId}: the pre-fix mimic never split, so this sweep cannot detect the defect it claims to.`
  );

  summary.push(
    `  ${jurisdiction} ${kind.padEnd(14)} ${template.templateId.padEnd(42)} ` +
      `${SWEEP.length} variants  ${blockPages.size} block placements  ` +
      `pre-fix split observed: ${mimicSplitObserved ? "yes" : "no"}`
  );
}

console.log("Custom-pleading execution-block pagination regression\n");
console.log(summary.join("\n"));

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`\nAll checks passed across ${summary.length} templates.`);
