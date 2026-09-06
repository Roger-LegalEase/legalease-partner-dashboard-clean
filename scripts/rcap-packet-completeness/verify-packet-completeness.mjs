#!/usr/bin/env node
// Does this packet contain everything a filing needs?
//
//   node scripts/rcap-packet-completeness/verify-packet-completeness.mjs [--family <id>] [--write] [--mutations]
//
// The build verifiers ask whether every write was correct. This asks whether
// every write that was owed was made. Those are different questions, and only
// the second one catches a CR-180 that carries a case number, a defendant name,
// and five empty offence rows.
//
// A packet returns PASS only when all nine counters are zero. There is no
// partial credit and no "mostly complete": a filing with a blank offence code is
// not 97 percent filable, it is unfilable.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, RESULT_CLASSES, REFUSAL_CLASSES, classifyField, classifyBlank, rowKeyOf } from "./completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes("--write");
const MUTATIONS = ARGS.includes("--mutations");
const ONLY = ARGS.includes("--family") ? ARGS[ARGS.indexOf("--family") + 1] : null;
const OUT = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";

const readIf = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };

/*
 * The refusal class a row DECLARES, which is not the same as the first truthy
 * thing on it.
 *
 * A row that states `completenessClass: null` is saying "no approved refusal
 * class applies here; this blank is carried to the participant instead". Reading
 * that null as "unstated" and falling through to the row's `kind` invented a
 * refusal class out of a row shape -- `boxed_entry_control` is a kind of box,
 * not a reason a blank is allowed -- and the invented class then failed closed
 * against the vocabulary it was never part of. Absent and null are different
 * answers, and only absent means "ask the next field".
 */
const declaredRefusalClass = (row, ...fallbacks) => {
  if (Object.hasOwn(row, "completenessClass")) return row.completenessClass;
  for (const f of fallbacks) if (f !== undefined && f !== null) return f;
  return null;
};

/** Both field-map shapes reduced to one row: an id, a label, a name, a reason. */
const normalizeRow = (row, document = null) => ({
  id: row.fieldId ?? row.fieldName ?? row.field ?? row.id ?? null,
  name: row.fieldName ?? row.field ?? row.fieldId ?? "",
  label: row.effectiveLabel ?? row.semanticLabel ?? row.sourceLabel ?? row.printedLine ?? row.label ?? row.field ?? "",
  reason: row.reason ?? row.refusalReason ?? "",
  refusalClass: row.refusalClass ?? null,
  role: row.role ?? null,
  page: row.page ?? row.widgets?.[0]?.page ?? row.widgets?.[0]?.pageIndex ?? null,
  document: row.documentId ?? row.formNumber ?? document,
  factId: row.factId ?? row.fact ?? null,
  printedLabel: row.printedLabel ?? null,
  sectionHeading: row.sectionHeading ?? null,
  sourceIdentity: row.selectionId ?? row.field ?? row.fieldName ?? row.fieldId ?? null,
  /*
   * Whether this row is a CHECKBOX rather than a place to write a fact. Read
   * from the schema where it says so, and otherwise from the printed caption: a
   * caption carrying an empty bracket pair, or ending in "(selection)", is a
   * control the reader marks, not a blank the platform fills.
   */
  isSelectionControl: row.kind === "boxed_entry_control"
    ? false
    : (row.isSelectionControl === true
      || row.kind === "selection_control"
      || /\[\s*\]/.test(String(row.effectiveLabel ?? row.printedLabel ?? row.label ?? ""))),
  /*
   * What the row DECLARES, kept separate from what it says.
   *
   * REQUIRED_BEFORE_FILING is the one disposition a build must claim explicitly,
   * so the claim travels as typed data and never as prose. A legacy row declares
   * nothing and `declared` carries no boolean, which is how the contract tells a
   * row that says nothing from a row that says false.
   */
  declared: {
    sourcePresentation: row.sourcePresentation ? { ...row.sourcePresentation, verified: false } : null,
    disposition: row.completenessDisposition ?? null,
    ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
    routeDetermined: row.routeDetermined === true,
    /*
     * Forwarded for the same reason as the two keys below, and found the same
     * way. The contract refuses a declared required-before-filing field when
     * `dec.factAvailable === true` -- "an available fact is not an unavailable
     * one" -- and that guard was unreachable from a packet, because this reader
     * never passed the key. A structural check over every `dec.*` the contract
     * reads caught it; the case-determined keys were only the instance somebody
     * happened to be standing on.
     */
    factAvailable: row.factAvailable === true,
    /*
     * The named route condition, forwarded for exactly the reason the comment
     * above gives. NOT_APPLICABLE_ON_THIS_ROUTE gained a declared channel in the
     * contract, and classifyBlank enters it only when this key is present -- so
     * a row declaring the disposition landed on UNCLASSIFIED_BLANK and the
     * channel was inert from the day it was written. A Rhode Island build lane
     * found it by reading the reader rather than trusting the contract, which
     * is the second time this reader has silently dropped a key the contract
     * decides on. The structural check below is so there is not a third.
     */
    routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable ?? null,
    /*
     * The case-determined exception, forwarded to the contract that decides it.
     *
     * `classifyBlank` grew this exception and it is pinned in both directions by
     * verify-case-determined-exception.mjs, but this reader built `declared`
     * from a fixed list of keys and these two were not on it. The declaration
     * was therefore dropped between the field map and the contract: a family
     * that declared both keys measured EXACTLY as before -- ten
     * requiredOptionsMissing on ca-1203-41-set, tested here before this line was
     * written -- so the exception was reachable from the unit test and from no
     * packet at all.
     *
     * Nothing is decided here. Both values are passed through verbatim and
     * every gate stays in the contract: the reason must be non-empty, an
     * explicit routeDetermined still refuses, and a fact the packet holds is
     * still KNOWN_FACT_NOT_WRITTEN. A row that declares neither key is
     * unchanged, which is why the corpus counters do not move until a family
     * opts in.
     */
    determinedByTheCaseNotTheRoute: row.determinedByTheCaseNotTheRoute === true,
    whyTheRouteCannotDetermineIt: row.whyTheRouteCannotDetermineIt ?? null,
    factId: row.factId ?? row.fact ?? null,
    identity: row.field ?? row.blankId ?? row.fieldId ?? row.fieldName ?? null
  }
});

/**
 * FIVE field-map schemas exist across 43 families, all in one return.
 *
 *   writes[] + refusals[]                          -- measured overlay and AcroForm
 *   documents[].fields[] with a decision word      -- New Jersey, New York
 *   documents[].writableAnchors[] + withheld[]     -- Washington
 *   maps[].canonicalWrites[] + canonicalRefusals[] -- West Virginia
 *
 * This is WEC-5 at fleet scale, and it is the reason nothing could check
 * completeness before: no single reader could see what any family had written.
 * Reading only the first shape reported twenty-one families as having zero
 * terminal fields, which would have passed them for having nothing to get
 * wrong. An unread schema is REFUSED as unauditable, never read as empty.
 */
function readFieldRows(fieldMap) {
  if (Array.isArray(fieldMap.writes) || Array.isArray(fieldMap.refusals)) {
    return {
      writes: (fieldMap.writes ?? []).map((r) => normalizeRow(r)),
      blanks: (fieldMap.refusals ?? []).map((r) => normalizeRow(r)),
      schema: "writes-and-refusals"
    };
  }
  if (Array.isArray(fieldMap.documents)) {
    const writes = []; const blanks = [];
    let shape = null;
    for (const doc of fieldMap.documents) {
      const id = doc.documentId ?? doc.formNumber ?? null;
      // decision-per-field (New Jersey, New York)
      for (const f of doc.fields ?? []) {
        shape = "documents-and-decisions";
        const row = normalizeRow(f, id);
        const decision = String(f.decision ?? "").toLowerCase();
        if (decision === "refuse" || decision === "") blanks.push(row);
        else writes.push(row);
      }
      // anchors-and-withheld (Washington)
      for (const a of doc.writableAnchors ?? []) {
        shape = shape ?? "anchors-and-withheld";
        writes.push(normalizeRow({ fieldId: a.blankId, label: a.label ?? a.printedCaption, page: a.page }, id));
      }
      for (const w of doc.withheld ?? []) {
        shape = shape ?? "anchors-and-withheld";
        blanks.push(normalizeRow({ ...w, fieldId: w.blankId, label: w.printedCaption ?? w.label, reason: w.reason, refusalClass: declaredRefusalClass(w, w.category), page: w.page }, id));
      }
    }
    if (shape) return { writes, blanks, schema: shape };
  }
  // maps-with-canonical-and-boundary (West Virginia)
  if (Array.isArray(fieldMap.maps)) {
    const writes = []; const blanks = [];
    for (const map of fieldMap.maps) {
      const id = map.formNumber ?? null;
      for (const w of map.canonicalWrites ?? []) writes.push(normalizeRow({ fieldId: w.field, label: w.field, ...w }, id));
      for (const r of map.canonicalRefusals ?? []) blanks.push(normalizeRow({ ...r, fieldId: r.field, label: r.regionHeading ? `${r.regionHeading} ${r.field}` : r.field, reason: r.reason, refusalClass: declaredRefusalClass(r, r.category) }, id));
      for (const r of map.roleRefusals ?? []) blanks.push(normalizeRow({ ...r, fieldId: r.field, label: r.field, reason: r.why, refusalClass: declaredRefusalClass(r, r.class) }, id));
      for (const c of map.selectionControls ?? []) {
        if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push(normalizeRow({ fieldId: c.selectionId, label: c.field }, id));
        // Living in the selectionControls array does not make a row a checkbox.
        // A boxed_entry_control is a place to WRITE, and calling it an election
        // excuses a blank the filing needs -- which is the whole failure this
        // contract exists to catch, arriving through the reader instead. The
        // other kinds are decided by the printed caption, because a family may
        // name the kind after the refusal class rather than after the control.
        else blanks.push(normalizeRow({ ...c, fieldId: c.selectionId, label: `${c.field} (selection)`, reason: c.reason, refusalClass: declaredRefusalClass(c, c.category, c.class, c.kind) }, id));
      }
    }
    return { writes, blanks, schema: "maps-with-canonical-and-boundary" };
  }
  return { writes: [], blanks: [], schema: null };
}

/** Validate an opt-in source presentation against the independently rebuilt
 * census and receipt. A declaration is never its own evidence. */
export function verifySourcePresentation(blank, { census, receipt, fieldMap, actualWrites, rendered, root = ROOT }) {
  const claim = blank.declared.sourcePresentation;
  if (!claim) return null;
  const fail = (failure) => ({ ...claim, verified: false, failure });
  const doc = census?.documents?.find((d) => d.formNumber === blank.document);
  const source = receipt?.documents?.find((d) => d.formNumber === blank.document);
  if (!doc || !source || !/^[a-f0-9]{64}$/.test(claim.sourceSha256 ?? "")
    || source.sha256 !== claim.sourceSha256 || doc.sourceSha256 !== claim.sourceSha256) return fail("source presentation does not bind the exact census and source receipt");
  const identity = claim.sourceField;
  if (identity !== blank.sourceIdentity) return fail("source presentation names a different field");
  const measured = doc.documentPolicy?.sourceFieldEvidence?.[identity];
  const terminal = (doc.fields ?? []).find((f) => f.name === identity || f.selectionId === identity);
  const map = fieldMap.maps?.find((m) => m.formNumber === blank.document);
  const ok = (basis) => ({ ...claim, verified: true, basis });
  if (claim.kind === "instruction_reference") {
    if (!doc.documentPolicy?.referenceOnly || doc.documentPolicy?.documentAcceptsFill !== false
      || !/instructions/i.test(source.pathInArchive ?? "") || !terminal) return fail("reference declaration lacks a measured instruction-only source element");
    return ok("measured element of an exact-source instruction component, not a filing blank");
  }
  if (!terminal || !measured || !Array.isArray(measured.annotationFlags) || !measured.annotationFlags.length) return fail("source presentation lacks first-hand widget evidence");
  if (terminal.protectCategory) return fail("a source-protected field cannot be excused as presentation");
  if (claim.kind === "viewer_button" && measured.pdfType === "PDFButton") return ok("exact-source push button, not a participant fact field");
  if (claim.kind === "hidden_widget" && measured.annotationFlags.every((f) => (f & 2) === 2)) return ok("every widget is hidden in the exact source; no printed participant blank");
  if (claim.kind === "nonprinting_panel" && measured.annotationFlags.every((f) => (f & 4) === 0)
    && doc.documentPolicy?.nonprintingSourceControls?.includes(identity)) return ok("measured nonprinting source UI panel control");

  const companion = claim.representedByField;
  const companionSource = doc.documentPolicy?.sourceFieldEvidence?.[companion];
  if (claim.kind === "caption_template") {
    if (!measured.readOnly || !String(measured.sourceValue ?? "").trim() || !companionSource) return fail("caption template lacks read-only source text or its companion field");
    // A manual caption remains owed: the exact companion must be disclosed as
    // required before filing. A read-only widget alone never excuses a fact.
    if (claim.manualCompanion === true) {
      const pending = map?.canonicalRefusals?.find((r) => r.field === companion && r.requiredBeforeFiling === true);
      if (!pending || !(fieldMap.requiredBeforeFiling ?? []).some((r) => r.field === companion && r.document === blank.document)) return fail("caption's manual companion is not a disclosed required filing blank");
      return ok("source caption template represents the separately disclosed, still-required manual companion");
    }
  } else if (claim.kind === "materialized_control") {
    const binding = doc.documentPolicy?.sourceChoiceCaption;
    if (!binding || binding.factId !== claim.factId || binding.displayField !== companion
      || !doc.documentPolicy?.completedCaptionFields?.includes(identity)) return fail("screen control lacks an exact source calculation/companion binding");
  } else return fail("unrecognised or unsupported source presentation kind");

  if (!claim.factId || !companionSource || !companionSource.annotationFlags.every((f) => (f & 4) === 4 && (f & 3) === 0)) return fail("companion is not a current printable source field for the same fact");
  const artifacts = rendered?.artifacts ?? [];
  if (!artifacts.length || actualWrites?.derivedFromArtifactBytes !== true) return fail("companion has no artifact-derived write evidence");
  for (const artifact of artifacts) {
    const mapWrites = map?.[`${artifact.fixture}Writes`] ?? [];
    if (!mapWrites.some((w) => w.field === companion && w.factId === claim.factId && ["fit", "shrunk"].includes(w.outcome))) return fail(`missing same-fact companion map write for ${artifact.fixture}`);
    const proof = actualWrites.documents?.find((d) => d.fixture === artifact.fixture && d.formNumber === blank.document && d.sourceSha256 === claim.sourceSha256);
    const write = proof?.actualWrites?.find((w) => w.field === companion && w.factId === claim.factId);
    if (!write || write.visibleInArtifactBytes !== true || write.everyWidgetVisibleInArtifactBytes !== true
      || !String(write.expected ?? "").trim() || write.drawnText !== write.expected) return fail(`missing complete visible same-fact companion write for ${artifact.fixture}`);
    if (claim.kind === "materialized_control" && write.expected !== doc.documentPolicy.sourceChoiceCaption.exportedCaption) return fail("printable companion text differs from the source option export");
    if (!artifact.pageManifest?.some((p) => p.formNumber === blank.document && p.sourceSha256 === claim.sourceSha256)) return fail("artifact does not contain the bound source component");
    try {
      const bytes = fs.readFileSync(path.resolve(root, artifact.file));
      if (createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) return fail("companion evidence belongs to stale artifact bytes");
    } catch { return fail("companion artifact is missing"); }
  }
  return ok("same fact is visibly written at its exact-source printable companion in every current fixture");
}

export function auditFamily(dir, familyId) {
  const fieldMap = readIf(`${dir}/production-field-map.json`);
  const actualWrites = readIf(`${dir}/reports/actual-writes.json`);
  const rendered = readIf(`${dir}/reports/rendered-artifacts.json`);
  const receipt = readIf(`${dir}/source-receipt.json`);
  const census = readIf(`${dir}/field-census.census-v1.json`);
  const approval = readIf(`${dir}/approval-request.json`);

  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  if (!fieldMap) {
    return {
      familyId, directory: dir, result: "FAIL_COMPONENT_SET", counters,
      totals: { terminalFields: 0, written: 0, blank: 0, blanksByDisposition: {}, rowsInspected: 0 },
      findings: [{ counter: "requiredComponentsMissing", why: "the family has no production-field-map.json, so nothing states what it was supposed to write" }],
      auditable: false
    };
  }

  const { writes, blanks, schema } = readFieldRows(fieldMap);
  if (schema === null) {
    return {
      familyId, directory: dir, result: "FAIL_COMPONENT_SET", counters,
      totals: { terminalFields: 0, written: 0, blank: 0, blanksByDisposition: {}, rowsInspected: 0 },
      findings: [{ counter: "requiredComponentsMissing", why: `the field map uses a schema this verifier does not read (${Object.keys(fieldMap).join(", ")}); it is refused rather than read as empty` }],
      auditable: false
    };
  }

  // ---- what the platform actually holds for this family --------------------------
  //
  // "The platform does not hold this fact" is the whole justification for a
  // required-before-filing blank, so it is measured rather than believed. A fact
  // this packet writes anywhere -- on any document, in either fixture -- is a
  // fact the platform holds, and refusing it on another field is a missing known
  // fact wearing a disclosure.
  const availableFacts = new Set();
  for (const w of writes) if (w.factId) availableFacts.add(String(w.factId));
  for (const doc of actualWrites?.documents ?? []) {
    for (const w of doc.actualWrites ?? []) {
      const value = String(w.drawnText ?? w.expected ?? "").trim();
      if (w.factId && value) availableFacts.add(String(w.factId));
    }
  }
  for (const [factId, value] of Object.entries(fieldMap?.factMap ?? fieldMap?.availableFacts ?? {})) {
    if (String(value ?? "").trim()) availableFacts.add(String(factId));
  }
  /*
   * A fact the platform does not hold has no fact id -- that is what not holding
   * it means -- so a fact id alone cannot decide availability without making
   * REQUIRED_BEFORE_FILING unreachable again. The printed label decides the rest:
   * a blank whose own printed label is written somewhere else in this packet is
   * a fact the packet demonstrably holds, whatever the row calls it.
   */
  // Scoped to the DOCUMENT, because a PDF field name repeats across the forms in
  // one packet and means something different on each. `citystatezip` on the
  // petition is the participant's address; `citystatezip` on the certificate of
  // service is the prosecutor's. Matching them across documents reported six
  // correctly-declared blanks as facts the packet already held.
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    // A footer/section heading is shared page context, not a fact identity.
    // Exact field names, specific printed labels and fact ids still bind.
    const specificLabel = normLabel(w.label) !== normLabel(w.sectionHeading) ? w.label
      : normLabel(w.printedLabel) !== normLabel(w.sectionHeading) ? w.printedLabel : null;
    for (const key of [normLabel(specificLabel), normLabel(w.name)]) {
      if (key.length >= 4) writtenInDocument.get(doc).add(key);
    }
  }
  const writtenBeside = (blank) => {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    return here.has(normLabel(blank.label)) || here.has(normLabel(blank.name));
  };

  // ---- every blank earns its blankness ------------------------------------------
  const blankLedger = [];
  for (const blank of blanks) {
    const declared = {
      ...blank.declared,
      sourcePresentation: verifySourcePresentation(blank, { census, receipt, fieldMap, actualWrites, rendered }),
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || writtenBeside(blank)
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    blankLedger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") {
      note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    } else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") {
      note("requiredOptionsMissing", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    } else {
      note("unclassifiedBlanks", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    }
  }

  // The last condition: a required-before-filing blank is allowed only because the
  // packet tells the participant to supply it. The disclosure is the entire
  // difference between a fact the participant will bring and a fact nobody asked
  // for, so a missing instructions file makes every one of them uncollected --
  // and it is checked here, where the packet's own files can be read, rather than
  // in the contract, which sees one row at a time.
  const instructionsPath = path.join(ROOT, `${dir}/participant-instructions.md`);
  const hasInstructions = fs.existsSync(instructionsPath);
  const instructions = hasInstructions ? fs.readFileSync(instructionsPath, "utf8") : "";
  const declaredRequired = blankLedger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
  const namedInInstructions = (b) => {
    if (!instructions.trim()) return false;
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    return needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)));
  };
  for (const b of declaredRequired) {
    if (namedInInstructions(b)) continue;
    note("requiredFactsNotCollected", {
      field: b.id, label: b.label, factId: b.factId ?? null,
      why: hasInstructions
        ? "classified required-before-filing and not named in participant-instructions.md, so the participant is never asked for it"
        : "classified required-before-filing and the packet carries no participant-instructions.md, so nothing asks the participant for it"
    });
  }

  // ---- rows are complete or they are not rows -----------------------------------
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    const anyWritten = cells.some((c) => c.written);
    if (!anyWritten) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) {
      note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6), why: "the row carries written cells beside required cells left blank, which reads as a finished row that is not one" });
    }
  }

  // ---- a write with no ink is not a write ---------------------------------------
  for (const artifact of actualWrites?.artifacts ?? []) {
    const reported = artifact.valuesReportedByFinalizer ?? artifact.finalizerWritten ?? null;
    const glyphs = artifact.addedGlyphsReadFromOutputBytes ?? null;
    const appearances = artifact.flattenedWidgetAppearancesReadFromOutputBytes ?? null;
    const visible = (typeof glyphs === "number" ? glyphs : 0) + (typeof appearances === "number" ? appearances : 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) {
      note("invisibleWrites", { fixture: artifact.fixture, reportedByFinalizer: reported, glyphsInOutput: glyphs, appearancesInOutput: appearances, why: "the finalizer reported values but the output bytes carry no glyph and no flattened appearance" });
    }
    const outsideBoxes = artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes;
    if (typeof outsideBoxes === "number" && outsideBoxes > 0) {
      note("visualDefects", { fixture: artifact.fixture, glyphsOutsideMeasuredBoxes: outsideBoxes, why: "ink landed outside every measured write box, which is an overlap or a stray mark" });
    }
    for (const refused of artifact.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: artifact.fixture, field: refused.fieldId ?? refused, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  // ---- the component set ---------------------------------------------------------
  // A component the packet MAPS but never RENDERS is the missing-companion-form
  // defect: the field map knows the document exists and the participant never
  // receives it. Checked in that direction, from the map to the render, because
  // the map is what claims the document belongs in the packet.
  const renderedText = JSON.stringify(rendered ?? {}).toLowerCase()
    + JSON.stringify((rendered?.packets ?? []).flatMap((p) => p.documents ?? [])).toLowerCase();
  const mappedDocuments = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  const receiptDocuments = new Set([...(receipt?.sources ?? []), ...(receipt?.documents ?? [])]
    .map((d) => d.documentId ?? d.formNumber).filter(Boolean));
  const renderedFileNames = fs.existsSync(path.join(ROOT, `${dir}/fixtures`))
    ? fs.readdirSync(path.join(ROOT, `${dir}/fixtures`), { recursive: true }).join(" ").toLowerCase() : "";
  const componentAppears = (id) => {
    const needle = String(id).toLowerCase();
    const loose = needle.replace(/[^a-z0-9]/g, "");
    return renderedText.includes(needle) || renderedFileNames.includes(needle)
      || renderedText.replace(/[^a-z0-9]/g, "").includes(loose)
      || renderedFileNames.replace(/[^a-z0-9]/g, "").includes(loose);
  };
  if (rendered && (rendered.packets ?? []).length > 0 && (rendered.packets ?? []).every((p) => (p.documents ?? []).length === 0)) {
    note("requiredComponentsMissing", { why: "the family reports rendered packets with no documents in them" });
  }
  for (const docId of new Set([...mappedDocuments, ...receiptDocuments])) {
    if (!componentAppears(docId)) {
      note("requiredComponentsMissing", { component: docId, why: "the field map or source receipt names this document as part of the packet, and it appears in no rendered artifact" });
    }
  }

  // ---- currentness ---------------------------------------------------------------
  //
  // Two receipt schemas: sources[] with allSourcesExact, and documents[] with a
  // per-document sha256. A first pass treated the ABSENT flag on the second
  // schema as a failure and reported 32 families defective for using a different
  // record shape -- absent is not false, and reading it that way would have
  // buried the real findings under noise. Currentness now resolves from whichever
  // shape is present, and only a receipt that states nothing about its sources is
  // reported as unknown.
  let currentness = "UNKNOWN";
  if (receipt) {
    if (typeof receipt.allSourcesExact === "boolean") {
      currentness = receipt.allSourcesExact ? "EXACT" : "NOT_EXACT";
    } else if (Array.isArray(receipt.documents) && receipt.documents.length > 0) {
      currentness = receipt.documents.every((d) => typeof d.sha256 === "string" && d.sha256.length === 64) ? "EXACT" : "NOT_EXACT";
    } else if (Array.isArray(receipt.sources) && receipt.sources.length > 0) {
      currentness = receipt.sources.every((d) => d.sha256Exact === true) ? "EXACT" : "NOT_EXACT";
    }
  }
  if (currentness === "NOT_EXACT") {
    note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });
  }

  const failed = PASS_COUNTERS.filter((c) => counters[c] > 0);
  let result = "PASS_COMPLETE";
  if (counters.protectedWrites > 0) result = "FAIL_PROTECTED_WRITE";
  else if (counters.invisibleWrites > 0 || counters.visualDefects > 0) result = "FAIL_VISIBLE_APPEARANCE";
  else if (counters.knownRequiredFieldsMissing > 0 || counters.incompleteRows > 0 || counters.requiredFactsNotCollected > 0) result = "FAIL_MISSING_REQUIRED_FACTS";
  else if (counters.requiredOptionsMissing > 0) result = "FAIL_ROUTE_SELECTION";
  else if (counters.unclassifiedBlanks > 0) result = "FAIL_MISSING_PREFILLS";
  else if (counters.requiredComponentsMissing > 0) result = "FAIL_COMPONENT_SET";
  else if (currentness !== "EXACT") result = "FAIL_CURRENTNESS";

  return {
    familyId, directory: dir, result, auditable: true,
    counters, failedCounters: failed,
    totals: {
      terminalFields: writes.length + blanks.length,
      written: writes.length,
      blank: blanks.length,
      blanksByDisposition: blankLedger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
      rowsInspected: rows.size,
      fieldMapSchema: schema
    },
    outputApprovalStatus: approval?.status ?? null,
    sourceCurrentness: currentness,
    // Not truncated. A completeness record that elides findings is the same
    // failure it exists to catch: the reader sees a short list and assumes the
    // list is the problem. The repair specification needs every field.
    findings,
    findingsTruncated: 0
  };
}

// ---- enumerate ---------------------------------------------------------------------
if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
const families = [];
for (const state of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const stateDir = path.join(ROOT, OVERLAYS, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const entry of fs.readdirSync(stateDir)) {
    const dir = `${OVERLAYS}/${state}/${entry}`;
    if (!fs.existsSync(path.join(ROOT, dir, "approval-request.json"))) continue;
    const familyId = readIf(`${dir}/approval-request.json`)?.familyId ?? entry.replace(/--[a-z-]+$/, "");
    families.push({ dir, familyId });
  }
}

/*
 * What counts as built, and why this is no longer only C11's answer.
 *
 * This audited exactly the families C11_RETURN_REVIEW.json classified BUILT.
 * That file is a frozen snapshot from an earlier wave, so every family built
 * after it was written was invisible here forever -- and that broke the whole
 * closed loop downstream: no audit means no counters in MASTER_QUEUE, no
 * counters means the raster queue rejects the family as "no completeness
 * audit", and a family that can never enter the raster queue can never earn a
 * RASTER_PASS or become PASS_COMPLETE. Nine families built in this shift sat in
 * exactly that state while the queue reported 321 not eligible.
 *
 * The snapshot is kept, not discarded: C11's classifications still admit every
 * family they always did. A family is ALSO audited when the tree itself shows
 * it is built -- an approval request, a production field map and at least one
 * fixture PDF. That is evidence about the family rather than a record of who
 * looked at it once, and it cannot go stale.
 */
const c11 = readIf("data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json");
const built = new Set((c11?.families ?? []).filter((f) => f.classification === "BUILT").map((f) => f.familyId));
const looksBuilt = (dir) => {
  const fixtures = path.join(ROOT, dir, "fixtures");
  if (!fs.existsSync(path.join(ROOT, dir, "production-field-map.json"))) return false;
  if (!fs.existsSync(fixtures)) return false;
  return fs.readdirSync(fixtures, { recursive: true }).some((f) => String(f).endsWith(".pdf"));
};
const auditable = families.filter((f) => built.has(f.familyId) || looksBuilt(f.dir));
const targets = auditable.filter((f) => !ONLY || f.familyId === ONLY);

/*
 * A named family that matches nothing is a refusal, not a pass. --family with a
 * typo used to print "0 famil(ies) audited" with every counter zero and exit 0,
 * which reads exactly like a clean audit of a real family.
 */
if (ONLY && targets.length === 0) {
  console.error(`REFUSED: --family ${ONLY} matches no auditable family. ${auditable.length} are auditable at this head.`);
  process.exit(2);
}
if (targets.length === 0) {
  console.error("REFUSED: no auditable family found; an audit over an empty set proves nothing");
  process.exit(2);
}

const results = targets.map((t) => auditFamily(t.dir, t.familyId))
  .sort((a, b) => a.familyId.localeCompare(b.familyId));

const byResult = results.reduce((acc, r) => { acc[r.result] = (acc[r.result] ?? 0) + 1; return acc; }, {});
const totals = Object.fromEntries(PASS_COUNTERS.map((c) => [c, results.reduce((n, r) => n + (r.counters[c] ?? 0), 0)]));

const doc = {
  schemaVersion: "rcap-packet-completeness-matrix/v1",
  generatedBy: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
  contract: "scripts/rcap-packet-completeness/completeness-contract.mjs",
  question: "Does every built packet contain everything a filing needs, or only everything the build chose to write?",
  whatTheOldPassProved:
    "That every write was correct: bound to exact source bytes, inside a measured box, off every protected field. It never asked what was owed, so a family could pass having written 6 of 187 fields.",
  passRule: `A family returns PASS_COMPLETE only when all ${PASS_COUNTERS.length} counters are zero: ${PASS_COUNTERS.join(", ")}.`,
  resultClasses: RESULT_CLASSES,
  familiesAudited: results.length,
  byResult,
  counterTotals: totals,
  results
};

const outPath = path.join(ROOT, OUT);
for (const r of results) {
  const mark = r.result === "PASS_COMPLETE" ? "ok  " : "FAIL";
  console.log(`  ${mark} ${r.familyId.padEnd(46)} ${r.result.padEnd(28)} ${r.totals.written}/${r.totals.terminalFields} written`);
}
console.log(`\n  ${results.length} famil(ies) audited · ${byResult.PASS_COMPLETE ?? 0} PASS_COMPLETE`);
for (const [k, v] of Object.entries(byResult).filter(([k]) => k !== "PASS_COMPLETE")) console.log(`  ${String(v).padStart(3)} ${k}`);
console.log(`\n  counters: ${PASS_COUNTERS.map((c) => `${c} ${totals[c]}`).join(" · ")}`);

if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n");
  console.log(`\nWrote ${OUT}`);
}

if (MUTATIONS) {
  console.log("\nmutations — each injects a defect the old PASS definition accepted:");
  /*
   * THE SAMPLE MUST HAVE THE SHAPE THE MUTATIONS MUTATE.
   *
   * This took `targets[0]` and pushed onto `m.writes` and `m.refusals`. Nine of
   * the hundred and eighty committed field maps carry those arrays at the top
   * level; a hundred and thirty-eight nest them under `maps[]`, because the
   * newer build hosts emit one map per document rather than one per family. So
   * whenever the first audited family was a newer one, every mutation threw
   * `Cannot read properties of undefined (reading 'push')` and the whole
   * mutation suite died before its first case — a gate with a hole in it,
   * reported by a lane that reproduced the crash at its own base with its own
   * directories removed.
   *
   * Picking a sample that has the shape is the honest fix: it changes nothing
   * about what the suite proves, and the suite runs. Refusing outright when no
   * family has the shape is the other half — a mutation suite that silently
   * tests nothing is worse than one that says it could not run.
   */
  const hasFlatShape = (t) => {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, `${t.dir}/production-field-map.json`), "utf8"));
      return Array.isArray(m.writes) && Array.isArray(m.refusals);
    } catch { return false; }
  };
  const sample = targets.find(hasFlatShape);
  if (!sample) {
    console.log("  REFUSED: no audited family carries a top-level writes[]/refusals[] field map, which is the shape every mutation below injects into.");
    console.log("  This is not a pass. The mutation suite proves the counters CATCH injected defects, and it proved nothing on this run.");
    console.log(`  ${targets.length} family(ies) audited; none has the shape. Point --family at one that does, or teach the cases the nested maps[] shape.`);
    process.exit(1);
  }
  if (sample !== targets[0]) {
    console.log(`  sample: ${sample.familyId} — the first audited family does not carry a top-level writes[]/refusals[] field map, so the suite runs against the first that does.`);
  }
  const original = fs.readFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`));
  const originalWrites = fs.existsSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`))
    ? fs.readFileSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`)) : null;
  const cases = [
    { name: "a missing participant name is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-name", effectiveLabel: "DEFENDANT:", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing mailing address is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-addr", effectiveLabel: "MAILING ADDRESS:", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing court identity is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-court", effectiveLabel: "SUPERIOR COURT OF CALIFORNIA, COUNTY OF", reason: "never prefilled by this build" }); return m; } },
    { name: "an incomplete offence row is caught", counter: "incompleteRows", mutate: (m) => { m.writes.push({ fieldId: "mut-row-a", fieldName: "Item9[0].Row7[0].CaseNo[0]", effectiveLabel: "CASE NUMBER:" }); m.refusals.push({ fieldId: "mut-row-b", fieldName: "Item9[0].Row7[0].Section[0]", effectiveLabel: "Section", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing route checkbox is caught", counter: "requiredOptionsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-route", effectiveLabel: "Eligible for reduction to misdemeanor under Penal Code, § 17(b) (yes or no)", reason: "Legal election or conditional choice not established by this evidence variant" }); return m; } },
    { name: "a missing companion form is caught", counter: "requiredComponentsMissing", mutate: (m) => { m.writes.push({ fieldId: "mut-comp", effectiveLabel: "CASE NUMBER:", documentId: "MUT-COMPANION-FORM-NOT-RENDERED" }); return m; } },
    { name: "a protected write is caught", counter: "protectedWrites", mutate: (m) => { m.writes.push({ fieldId: "mut-sig", effectiveLabel: "Petitioner's Signature" }); return m; } },
    { name: "an unexplained blank is caught", counter: "unclassifiedBlanks", mutate: (m) => { m.refusals.push({ fieldId: "mut-blank", effectiveLabel: "Zzqx unmatched terminal", reason: "" }); return m; } }
  ];
  const writeCases = originalWrites ? [
    { name: "an invisible field value is caught", counter: "invisibleWrites", mutate: (a) => { a.artifacts[0].valuesReportedByFinalizer = 12; a.artifacts[0].addedGlyphsReadFromOutputBytes = 0; a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes = 0; return a; } },
    { name: "an unintended graphic outside every write box is caught", counter: "visualDefects", mutate: (a) => { a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes = 4; return a; } }
  ] : [];
  /*
   * The required-before-filing group.
   *
   * Every case here is the SAME row with one condition broken, and the group
   * opens with a control that shows the unbroken row is actually accepted. That
   * control is the point: REQUIRED_BEFORE_FILING sat in the vocabulary with no
   * path returning it, so "an unavailable fact is caught" was true for a reason
   * that had nothing to do with the check -- it was caught because the
   * disposition was unreachable. A negative test whose subject cannot exist
   * proves nothing, so the control proves it can.
   */
  const RBF_LABEL = "ARRESTING AGENCY:";
  const rbfRow = (over = {}) => ({
    fieldId: "mut-rbf", fieldName: "mut-rbf", field: "mut-rbf",
    effectiveLabel: RBF_LABEL,
    reason: "the arresting agency is a case fact the participant holds from the record they screened with",
    requiredBeforeFiling: true,
    factId: "mut.arresting_agency",
    ...over
  });
  const instructionsPath = path.join(ROOT, `${sample.dir}/participant-instructions.md`);
  const hadInstructions = fs.existsSync(instructionsPath);
  const originalInstructions = hadInstructions ? fs.readFileSync(instructionsPath) : null;
  const INSTRUCTIONS = `# Before you file\n\nSupply these before filing:\n\n- ${RBF_LABEL} the agency that arrested or cited you, from your record.\n`;
  const anyWrittenFactId = (() => {
    const map = JSON.parse(original.toString("utf8"));
    const w = (map.writes ?? []).find((x) => x.factId);
    return w?.factId ?? null;
  })();
  const sameDocumentWrite = (() => {
    const map = JSON.parse(original.toString("utf8"));
    // Whatever this family's schema calls the label, normalizeRow reads it the
    // same way; the mutation reuses the row's own surfaces rather than assuming a
    // shape, so it runs on every schema instead of skipping on most of them.
    const w = (map.writes ?? []).find((x) => x.fieldName ?? x.field ?? x.fieldId);
    if (!w) return null;
    return {
      name: w.fieldName ?? w.field ?? w.fieldId,
      label: w.effectiveLabel ?? w.semanticLabel ?? w.sourceLabel ?? w.printedLine ?? w.label ?? null,
      document: w.documentId ?? w.formNumber ?? null
    };
  })();
  const rbfCases = [
    { name: "CONTROL — a properly declared, disclosed, unavailable fact IS accepted", control: true,
      mutate: (m) => { m.refusals.push(rbfRow()); return m; } },
    { name: "a required-before-filing claim over an available fact is caught", counter: "knownRequiredFieldsMissing",
      skipIf: () => anyWrittenFactId === null,
      mutate: (m) => { m.refusals.push(rbfRow({ factId: anyWrittenFactId })); return m; } },
    { name: "a required-before-filing claim the participant is never asked for is caught", counter: "requiredFactsNotCollected",
      withoutInstructions: true, mutate: (m) => { m.refusals.push(rbfRow()); return m; } },
    { name: "a route election mislabelled required-before-filing is caught", counter: "requiredOptionsMissing",
      mutate: (m) => { m.refusals.push(rbfRow({ effectiveLabel: "Eligible for reduction to misdemeanor under Penal Code, § 17(b) (yes or no)" })); return m; } },
    { name: "a required-before-filing claim made only in prose is caught", counter: "knownRequiredFieldsMissing",
      mutate: (m) => { const r = rbfRow({ reason: "this fact is required before filing and must be supplied by the participant" }); delete r.requiredBeforeFiling; m.refusals.push(r); return m; } },
    { name: "a disposition outside the closed vocabulary is caught", counter: "unclassifiedBlanks",
      mutate: (m) => { m.refusals.push(rbfRow({ completenessDisposition: "PROBABLY_FINE" })); return m; } },
    { name: "a required-before-filing claim with no field identity is caught", counter: "unclassifiedBlanks",
      mutate: (m) => { m.refusals.push(rbfRow({ fieldId: null, fieldName: null, field: null })); return m; } },
    /*
     * The selection-control rule and the document-scoped availability rule, both
     * of which can fail in two directions: excusing a blank that is not excusable,
     * and inventing a defect that is not there. One case each way.
     */
    { name: "CONTROL — a service-method checkbox is NOT a missing participant fact", expectNoRise: true,
      mutate: (m) => { m.refusals.push({ fieldId: "mut-sel", fieldName: "mut-sel", field: "mut-sel", kind: "selection_control", effectiveLabel: "[ ] E-mail", reason: "a sworn assertion or legal election the route does not determine", refusalClass: "participant_sworn_narrative_or_legal_election" }); return m; } },
    { name: "a TEXT field with the same caption as that checkbox is still caught", counter: "knownRequiredFieldsMissing",
      mutate: (m) => { m.refusals.push({ fieldId: "mut-txt", fieldName: "mut-txt", field: "mut-txt", effectiveLabel: "E-mail address", reason: "a sworn assertion or legal election the route does not determine", refusalClass: "participant_sworn_narrative_or_legal_election" }); return m; } },
    { name: "a required-before-filing claim beside the same fact written on the same document is caught", counter: "knownRequiredFieldsMissing",
      skipIf: () => sameDocumentWrite === null,
      mutate: (m) => { m.refusals.push(rbfRow({ fieldId: "mut-dup", fieldName: sameDocumentWrite.name, field: sameDocumentWrite.name, effectiveLabel: sameDocumentWrite.label ?? sameDocumentWrite.name, documentId: sameDocumentWrite.document, factId: null })); return m; } }
  ];

  const baseline = auditFamily(sample.dir, sample.familyId);
  let undetected = 0;
  const run = (file, originalBuf, testCase) => {
    if (testCase.skipIf?.()) { console.log(`  skipped   ${testCase.name}`); return; }
    if (testCase.withoutInstructions && fs.existsSync(instructionsPath)) fs.rmSync(instructionsPath);
    fs.writeFileSync(file, JSON.stringify(testCase.mutate(JSON.parse(originalBuf.toString("utf8"))), null, 2) + "\n");
    const after = auditFamily(sample.dir, sample.familyId);
    fs.writeFileSync(file, originalBuf);
    // Compared against the state this case actually starts from: the plain tree
    // for the original cases, the tree with the disclosure present for the
    // required-before-filing group. Comparing a disclosed run against an
    // undisclosed baseline would credit every case with the disclosure's effect.
    const before = testCase.baselineOverride ?? baseline;
    let caught;
    if (testCase.expectNoRise) {
      caught = PASS_COUNTERS.every((c) => after.counters[c] <= before.counters[c]);
    } else if (testCase.control) {
      const accepted = (after.totals.blanksByDisposition?.REQUIRED_BEFORE_FILING ?? 0)
        > (before.totals.blanksByDisposition?.REQUIRED_BEFORE_FILING ?? 0);
      const noNewDefect = PASS_COUNTERS.every((c) => after.counters[c] <= before.counters[c]);
      caught = accepted && noNewDefect;
    } else {
      caught = after.counters[testCase.counter] > before.counters[testCase.counter];
    }
    const verb = testCase.control || testCase.expectNoRise ? "accepted " : "detected ";
    console.log(`  ${caught ? verb : "MISSED   "} ${testCase.name}`);
    if (!caught) undetected += 1;
  };
  try {
    for (const c of cases) run(path.join(ROOT, `${sample.dir}/production-field-map.json`), original, c);
    for (const c of writeCases) run(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`), originalWrites, c);
    // The whole group runs with the disclosure present except the case that
    // removes it, so every failure below is the condition it names and not a
    // missing instructions file standing in for all of them.
    fs.writeFileSync(instructionsPath, INSTRUCTIONS);
    const withDisclosure = auditFamily(sample.dir, sample.familyId);
    for (const c of rbfCases) {
      if (!c.withoutInstructions) fs.writeFileSync(instructionsPath, INSTRUCTIONS);
      run(path.join(ROOT, `${sample.dir}/production-field-map.json`), original, { ...c, baselineOverride: withDisclosure });
    }
  } finally {
    fs.writeFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`), original);
    if (originalWrites) fs.writeFileSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`), originalWrites);
    if (hadInstructions) fs.writeFileSync(instructionsPath, originalInstructions);
    else if (fs.existsSync(instructionsPath)) fs.rmSync(instructionsPath);
  }
  const restored = fs.readFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`)).equals(original)
    && (hadInstructions ? fs.readFileSync(instructionsPath).equals(originalInstructions) : !fs.existsSync(instructionsPath));
  console.log(`\n  sample family: ${sample.familyId}`);
  console.log(`  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the completeness verifier proves less than it claims."); process.exit(1); }
  console.log(`\nOK completeness mutations — ${cases.length + writeCases.length + rbfCases.length} case(s), every injected defect caught and the accepted path proved reachable.`);
}
}
