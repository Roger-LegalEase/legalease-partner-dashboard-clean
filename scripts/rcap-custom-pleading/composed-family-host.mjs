#!/usr/bin/env node
/**
 * The composed custom-pleading family host.
 *
 * One host for census-v1 families whose sourceStatus is
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT: no official form exists for the route,
 * the MASTER_QUEUE row binds no corpus bytes, and every composed page is
 * grounded on the family's own committed legal-design records — the
 * legal-design intake memo and the packet-set manifest — which this host hashes
 * into the source receipt so the composition sources travel with the family.
 *
 * The pattern is the working va_exp_identity_used_by_another-set builder
 * (scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs), with the
 * bound-reference machinery removed because these families bind no reference
 * binary, and with the family content supplied declaratively by the per-family
 * build script that imports this host.
 *
 * INVARIANTS, IDENTICAL TO THE WORKING PATTERN
 *
 *  - Only facts the platform holds about the participant are written. Every
 *    case fact is a labelled dotted blank declared REQUIRED_BEFORE_FILING and
 *    disclosed by its printed label in participant-instructions.md, with a
 *    checkable authority named for each.
 *  - No signature, signature date, notary, judicial, clerk, prosecutor or
 *    court-date field is ever written.
 *  - Every created PDF goes through stampDeterministic() and is saved with
 *    useObjectStreams:false, updateMetadata:false, so two builds are
 *    byte-identical.
 *  - Every written value is read back from the extracted text of the saved
 *    packet bytes, never from the builder's intent.
 *  - The builder counts the nine completeness counters with the repository's
 *    own contract functions; that count is a self-check, never a verdict.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this host issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "../rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "../rcap-packet-completeness/completeness-contract.mjs";
import { preserveIdentityRefresh } from "../rcap-packet-completeness/identity-refresh.mjs";
import { stripMarkdownEmphasis, assertNoMarkdownDelimitersOnDeliveredPages } from "./composed-page-markdown.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./split-token.mjs";

const thisFile = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(thisFile), "../..");
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

export const SIGNATURE = "signature_or_date_participant_completion";
export const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
export const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

export const DOTS = (n = 84) => ".".repeat(n);

/*
 * A block that must stand whole on one page.
 *
 * The renderer below flows text and starts a new page when it runs out of
 * room, which is right for a narrative page and wrong for a block whose parts
 * only mean anything together: a verification, its jurat and its notarial
 * certificate split across two sheets is a notarial act the notary cannot
 * complete on the page the oath is on. FIX107 needed one for the Mississippi
 * petition's VERIFICATION section.
 *
 * Emitting this as its own line in a composed body means two things: start a
 * new page here, and everything from here to the next such line or to the end
 * of the document must fit on that page. If it does not fit, the build stops
 * rather than delivering a split block. The assertion is what makes it worth
 * having: a page count cannot say it, because the same block sits on a
 * different page number in the canonical and the boundary fixture whenever a
 * longer name pushes the pages before it along.
 *
 * It is opt-in and inert. The only new branch is an equality test against a
 * line built from a Unicode private-use codepoint, so no committed record's
 * text and no composed body that does not emit it can reach the branch, and
 * every family that does not use it renders exactly the bytes it rendered
 * before. sanitizePdfText leaves the codepoint alone, and the test runs on the
 * same sanitized string the drawing loop reads.
 */
export const KEEP_ON_ONE_PAGE = "PAGE-BREAK";

/* Source markup a PDF page cannot render is removed before the normalisations
 * below, on the same footing as the characters they normalise away: emphasis
 * delimiters are markdown in participant-instructions.md and four black
 * asterisks on a composed page. See composed-page-markdown.mjs. A string that
 * carries no closed emphasis pair passes through unchanged. */
export function sanitizePdfText(text) {
  return stripMarkdownEmphasis(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

/* ---- field-map row helpers, per component --------------------------------------- *
 * The same row shapes the working pattern emits, in the
 * maps-with-canonical-and-boundary schema the shared completeness contract
 * reads. Every write names the fact it binds; every blank earns its blankness
 * against the closed vocabulary; every REQUIRED_BEFORE_FILING row is declared
 * as typed data with its printed label and disclosed by that label in
 * participant-instructions.md.
 */
export function mapHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    courtBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    electionBox: (id, label, why) => ({
      ...base(id, label),
      reason: "a sworn assertion or legal election the route does not determine",
      category: ELECTION_CLASS, completenessClass: ELECTION_CLASS, class: ELECTION_CLASS,
      kind: "selection_control", isSelectionControl: true,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why) => ({
      ...base(id, label),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

export function composedMapOf(componentId, family, writes, refusals) {
  const component = family.components.find((c) => c.id === componentId);
  return {
    formNumber: componentId, documentId: componentId, documentRole: component?.role ?? componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: family.route.routeKeys[0],
      ...(component?.condition ? { conditional: true, conditionDescription: component.condition } : {})
    },
    structuralClass: "composed_document",
    composedFrom: family.composedFrom,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- the composed renderer -------------------------------------------------------- */
async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  /* Set while a KEEP_ON_ONE_PAGE block is open. An automatic page break inside
   * one is the failure the sentinel exists to catch, so it is recorded here
   * and asserted once the whole document has been laid out. */
  let keepBlockOpen = null;
  let keepBlockOverflowed = null;
  let keepBlockRows = 0;
  let keepBlockRowsThatFit = 0;
  const draw = (line) => {
    if (y < margin) {
      if (keepBlockOpen !== null && keepBlockOverflowed === null) {
        keepBlockOverflowed = keepBlockOpen;
        keepBlockRowsThatFit = keepBlockRows;
      }
      page = pdf.addPage([width, height]); y = height - margin;
    }
    if (keepBlockOpen !== null) keepBlockRows += 1;
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  /* A token too wide for the 468pt column breaks at its OWN separators -- the
   * colons and hyphens a route key is built from -- and never mid-word. The
   * private character-accumulating splitter this replaces printed
   * "...-conviction-expungemen" / "t-99-19-71-1" on five delivered pages per
   * fixture, severing the word the route is named for. The shared module is
   * scripts/rcap-custom-pleading/split-token.mjs; the same move FIX21 made for
   * the Georgia and Kentucky hosts and FIX35 for Rhode Island. hardSplits is
   * asserted zero per composed document below, so a future key with no
   * separator to break on fails the build rather than shipping chopped. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  /* The sentinel starts a new page unless the current one is already empty, so
   * a block asking to stand alone never leaves a blank sheet in front of it,
   * and it opens a block whose overflow is a build failure. */
  const atTopOfPage = () => y === height - margin;
  const lines = sanitizePdfText(fullText).split("\n");
  for (const [index, raw] of lines.entries()) {
    if (raw === KEEP_ON_ONE_PAGE) {
      if (!atTopOfPage()) { page = pdf.addPage([width, height]); y = height - margin; }
      keepBlockOpen = index;
      continue;
    }
    for (const row of wrap(raw)) draw(row);
  }
  assert.equal(keepBlockOverflowed, null,
    `${title}: the block that must stand whole on one page does not fit on it. It begins at composed line `
    + `${(keepBlockOverflowed ?? 0) + 1}, needs ${keepBlockRows} rendered rows and the page holds `
    + `${keepBlockRowsThatFit}, so ${keepBlockRows - keepBlockRowsThatFit} row(s) would be delivered on a second `
    + "sheet. Shorten the block by that many rows; do not relax the check.");
  assert.equal(splitToken.hardSplits, 0,
    `${title}: a token was chopped mid-word to fit the column; it has no separator to break on and must not ship broken`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- byte proof of the composed writes --------------------------------------------- *
 * Read back from the saved packet bytes, never from the builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  /* No delivered page may print markup. Read from the saved bytes, so it holds
   * whatever the markup arrived from -- a component body, a fixture value, or a
   * future edit to either. */
  assertNoMarkdownDelimitersOnDeliveredPages(textOfPage, fixtureName);
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ------------------------------------ *
 * The same counting the independent verifier performs, with the same contract
 * functions, so the builder fails fast on the defect classes the verifier
 * would find. Selection-control detection mirrors the verifier's normalizeRow:
 * an explicit kind, an explicit flag, or a printed caption carrying an empty
 * bracket pair.
 */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const isSelection = (r) => r.kind === "boxed_entry_control"
    ? false
    : (r.isSelectionControl === true || r.kind === "selection_control"
      || /\[\s*\]/.test(String(r.effectiveLabel ?? r.printedLabel ?? r.label ?? "")));

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: isSelection(r),
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs -------------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function requiredBeforeFilingItems(family, maps) {
  const order = Object.fromEntries(family.components.map((c, i) => [c.id, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function hashFile(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length };
}


/* ---- the specification the route binds, measured against the delivered pages -------- *
 * OPT-IN, and silent for a family that does not declare it: a family with no
 * `packetSpecification` gets exactly the records it got before, byte for byte.
 *
 * WHY IT EXISTS. VF06 failed ms-nonconv-set on COMPONENT_SET at b3467e894 for a
 * defect no counter could see. The packet specification the route binds names
 * five documents; the build declared five components of its own, rendered all
 * five, compared the delivered pages against its OWN declaration, and reported
 * 5/5. One of the specification's five documents -- the required order-1 cover
 * and contents page -- had no component at all, so the omission was invisible to
 * requiredComponentsMissing by construction. A component set measured only
 * against the build's own report of itself cannot fail; measured against the
 * server-owned specification, it can.
 *
 * So a declaring family states, per specification document, either which of its
 * components render it or an explicit disposition saying why nothing does. A
 * specification document that is neither rendered nor dispositioned stops the
 * build. A rendered binding must name components this family actually has AND
 * that actually reach a page in every fixture, so a component that stops being
 * rendered stops the build too.
 */
function specificationConformance(family, artifacts, componentIds) {
  const declared = family.packetSpecification;
  if (!declared) return null;
  const rel = declared.path;
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `packet specification missing: ${rel}`);
  const identity = hashFile(rel);
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  const specDocuments = Array.isArray(spec.documents) ? spec.documents : [];
  assert.ok(specDocuments.length > 0, `${rel}: the specification names no documents`);

  const binding = declared.documentBinding ?? {};
  for (const documentId of Object.keys(binding)) {
    assert.ok(specDocuments.some((d) => d.documentId === documentId),
      `packetSpecification.documentBinding names ${documentId}, which is not a document of ${rel}`);
  }

  /* Which components actually reach a page, read from each fixture's own page
   * manifest rather than from the component list the build intended. */
  const renderedComponentsPerFixture = artifacts.map((a) => new Set(a.pageManifest.map((p) => p.component)));

  const documents = specDocuments
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((d) => {
      const bound = binding[d.documentId];
      assert.ok(bound, `${rel}: specification document ${d.documentId} (${d.requirement ?? "unspecified"}) is neither rendered nor dispositioned by ${family.buildScript}`);
      const renderedBy = Array.isArray(bound.renderedBy) ? bound.renderedBy : [];
      if (renderedBy.length === 0) {
        assert.ok(typeof bound.disposition === "string" && bound.disposition.length > 0,
          `${rel}: specification document ${d.documentId} renders nothing and carries no disposition`);
        assert.ok(typeof bound.why === "string" && bound.why.length > 0,
          `${rel}: specification document ${d.documentId} carries a disposition with no stated reason`);
        return {
          documentId: d.documentId, role: d.role ?? null, order: d.order ?? null,
          requirement: d.requirement ?? null, title: d.title ?? null,
          rendered: false, renderedByComponents: [],
          disposition: bound.disposition, why: bound.why,
          pages: {}
        };
      }
      for (const componentId of renderedBy) {
        assert.ok(componentIds.includes(componentId),
          `${rel}: specification document ${d.documentId} binds component ${componentId}, which this family does not declare`);
        for (const [i, rendered] of renderedComponentsPerFixture.entries()) {
          assert.ok(rendered.has(componentId),
            `${rel}: specification document ${d.documentId} binds component ${componentId}, which reaches no page of the ${artifacts[i].fixture} fixture`);
        }
      }
      return {
        documentId: d.documentId, role: d.role ?? null, order: d.order ?? null,
        requirement: d.requirement ?? null, title: d.title ?? null,
        rendered: true, renderedByComponents: renderedBy,
        disposition: null, why: null,
        pages: Object.fromEntries(artifacts.map((a) => [
          a.fixture,
          a.pageManifest.filter((p) => renderedBy.includes(p.component)).map((p) => p.packetPage)
        ]))
      };
    });

  const rendered = documents.filter((d) => d.rendered).length;
  assert.equal(rendered + documents.filter((d) => !d.rendered).length, specDocuments.length,
    `${rel}: every specification document must be accounted for exactly once`);

  return {
    specification: identity.path,
    specificationSha256: identity.sha256,
    specificationByteLength: identity.byteLength,
    specificationId: spec.specificationId ?? null,
    specificationVersion: spec.specificationVersion ?? null,
    packetFamily: spec.packetFamily ?? null,
    measuredAgainst: "the specification the route binds, not this build's own componentSet",
    documentsTheSpecificationNames: specDocuments.length,
    documentsRendered: rendered,
    documentsDispositionedWithoutRendering: specDocuments.length - rendered,
    everySpecificationDocumentRendersOrIsDispositioned: true,
    documents,
    ...(declared.manifestGaps ? { manifestGaps: declared.manifestGaps } : {}),
    ...(declared.openLegalQuestions ? { openLegalQuestions: declared.openLegalQuestions } : {}),
    /* A question that used to be open and has since been answered is carried
     * here with its answer and the record that settled it, so an emptied
     * openLegalQuestions reads as "answered, and here is by what" rather than
     * as "nobody ever asked". Optional: a family that declares none emits
     * none, exactly as before. */
    ...(declared.resolvedLegalQuestions ? { resolvedLegalQuestions: declared.resolvedLegalQuestions } : {}),
    grantsNothing: "Conformance to the specification's document set is a build assertion. It is not independent verification, not a raster acceptance and not an approval."
  };
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runComposedFamily(family, argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  const checkOnly = argv.includes("--check");
  const OUT = family.outDir;
  const componentIds = family.components.map((c) => c.id);

  // The composition sources must exist and hash before anything is composed:
  // a codified-text family with no readable design record has nothing to
  // compose from, and stops.
  const compositionSources = family.compositionSources.map((rel) => {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `composition source missing: ${rel}`);
    return hashFile(rel);
  });

  const maps = family.maps();
  assert.deepEqual(maps.map((m) => m.formNumber), componentIds, "one map per component, in component order");

  if (checkOnly) {
    return {
      familyId: family.familyId, status: "CHECK_ONLY", components: componentIds,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = family.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${family.route.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const component of family.components) {
      const body = family.composedBody(component.id, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${component.id}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, component.title);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: component.id, documentId: component.id, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(component.id);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: componentIds
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });
  }

  /* Measured after both fixtures are assembled, so it reads the page manifests
   * the packets actually produced rather than the component list intended. */
  const conformance = specificationConformance(family, artifacts, componentIds);

  const rbf = requiredBeforeFilingItems(family, maps);
  const instructionsText = family.participantInstructions(rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  const componentConditions = Object.fromEntries(
    family.components.filter((c) => c.condition).map((c) => [c.id, c.condition]));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: family.familyId, worklistGroupId: family.familyId,
    jurisdiction: family.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no official form exists for this route and the MASTER_QUEUE row binds no corpus bytes; every composed page "
      + "is grounded on the family's committed legal-design records, hashed below at build time",
    routeKeys: family.route.routeKeys, statutoryAuthority: family.route.statutes,
    legalName: family.route.legalName,
    allSourcesExact: true,
    compositionSources,
    formIdentityNote: family.formIdentityNote,
    composedComponentsAuthoredByThisBuild: componentIds,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: family.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: family.familyId,
    routeKeys: family.route.routeKeys, renderStrategy: "composed_pleading",
    jurisdiction: family.jurisdiction, statute: family.route.statutes.join("; "), legalName: family.route.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    componentSet: componentIds,
    componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade: [],
    routeSelectionNote: family.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: family.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: componentIds,
    componentConditions,
    ...(conformance ? { specificationConformance: conformance } : {}),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: family.familyId, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: family.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: family.familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: family.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: family.buildScript,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: family.familyId, blocking: [],
    findings: family.buildFindings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: family.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: family.counselQuestions,
    mattersForTheReviewersAttention: family.reviewerAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: family.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    components: componentIds,
    ...(conformance ? {
      specificationConformance: {
        specification: conformance.specification,
        specificationSha256: conformance.specificationSha256,
        documentsTheSpecificationNames: conformance.documentsTheSpecificationNames,
        documentsRendered: conformance.documentsRendered,
        documentsDispositionedWithoutRendering: conformance.documentsDispositionedWithoutRendering
      }
    } : {}),
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

export function runIfMain(family, moduleUrl) {
  const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(moduleUrl));
  if (invoked) {
    runComposedFamily(family)
      .then((r) => { console.log(JSON.stringify(r, null, 2)); })
      .catch((e) => { console.error(e); process.exit(1); });
  }
}
