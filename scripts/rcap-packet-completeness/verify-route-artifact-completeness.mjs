#!/usr/bin/env node
/**
 * Route-scoped completeness, over the route artifact's own bytes.
 *
 *   node scripts/rcap-packet-completeness/verify-route-artifact-completeness.mjs \
 *     [--family <id>]... [--route <slug>]... [--write]
 *
 * WHY THIS EXISTS SEPARATELY FROM verify-packet-completeness.mjs
 *
 * That verifier asks a family-shaped question: over every field this FAMILY's
 * production-field-map declares, was every write that was owed made? On a
 * family carrying one route the answer is also the participant's answer,
 * because the family assembly is what the participant receives.
 *
 * On a family carrying eleven routes it is not. The assembly concatenates every
 * route's components and is nobody's deliverable — the family's own
 * reports/rendered-artifacts.json says so on every row
 * (familyAssemblyIsAParticipantDeliverable: false). What a participant receives
 * is the artifact for their own route. A family PASS_COMPLETE therefore says
 * that the union of thirteen routes' components is complete; it does not say
 * that any one route's artifact is. Those are different claims, and only the
 * second one is the one a participant is handed.
 *
 * So this reads the route's OWN declared component set — production-field-map's
 * componentRoutes, which is the family's own declaration of which component
 * belongs to which route — and asks the same nine-counter question against that
 * subset alone, plus three questions the family verifier structurally cannot
 * ask:
 *
 *   1. Does the artifact on disk still hash to what the builder recorded, and
 *      does its parsed page count agree? Evidence about bytes nobody can
 *      reproduce is not evidence.
 *   2. Does the artifact carry EVERY component the route declares, and NO
 *      component belonging to another route? A route packet that leaks a
 *      neighbouring remedy's pages is the exact defect route scoping exists to
 *      end, and a missing component is a filing the participant cannot make.
 *   3. Is every value this route's components write readable back out of THIS
 *      artifact's bytes — not out of the family assembly's bytes? The builder
 *      proved it for the assembly. An artifact assembled separately has to
 *      prove it for itself.
 *
 * It writes no PDF, changes no packet content, and decides nothing about
 * PASS_COMPLETE or about any commercial route. It is a measurement, produced by
 * the same lane that is asking to have it read, and it is therefore not
 * independent verification of itself.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf } from "./completeness-contract.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { singleRouteFamilyArtifacts } from "../lib/route-artifact-scope.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes("--write");
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const OUT = "data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_COMPLETENESS.json";

const multi = (flag) => ARGS.reduce((acc, a, i) => (a === flag && ARGS[i + 1] ? [...acc, ARGS[i + 1]] : acc), []);
const ONLY_FAMILIES = multi("--family");
const ONLY_ROUTES = multi("--route");

const readIf = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const MASTER = readIf("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const ROUTE_REGISTRY = readIf("data/record-clearing/factory-v2-route-registry.json");

/* The same row normalisation the builders use for this field-map schema:
 * maps[].canonicalWrites / canonicalRefusals / roleRefusals / selectionControls. */
const asRow = (r, documentId) => ({
  id: r.field ?? r.selectionId ?? null,
  name: r.fieldName ?? r.field ?? "",
  label: r.effectiveLabel ?? r.printedLabel ?? r.regionHeading ?? r.field ?? "",
  reason: r.reason ?? r.why ?? "",
  refusalClass: Object.hasOwn(r, "completenessClass") ? r.completenessClass : (r.category ?? r.class ?? null),
  page: r.page ?? null,
  document: r.document ?? documentId,
  factId: r.factId ?? null,
  isSelectionControl: false,
  declared: {
    disposition: r.completenessDisposition ?? r.disposition ?? null,
    ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
    ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
    identity: r.identity ?? null,
    factId: r.factId ?? null
  }
});

const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The nine counters, over one route's maps only. */
function countRoute(maps, instructionsText, writeProof) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(asRow(w, m.formNumber));
    for (const r of m.canonicalRefusals ?? []) blanks.push(asRow(r, m.formNumber));
    for (const r of m.roleRefusals ?? []) blanks.push(asRow(r, m.formNumber));
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push(asRow(c, m.formNumber));
      else blanks.push({ ...asRow(c, m.formNumber), label: `${c.field} (selection)`, isSelectionControl: true });
    }
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
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
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  /* A required-before-filing blank is allowed only because the packet asks the
   * participant for it. participant-instructions.md is family-wide and carries a
   * which-pages-are-yours table per route, so the disclosure is looked for
   * there; a route whose blank is disclosed nowhere is a fact nobody asked for. */
  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md, so the participant is never asked for it" });
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
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
  }

  /* Ink, measured on THIS artifact rather than inherited from the assembly. */
  if (writeProof) {
    if (writeProof.valuesRead > 0 && writeProof.glyphs === 0) {
      note("invisibleWrites", { reportedByFinalizer: writeProof.valuesRead, glyphsInOutput: 0, why: "values were bound to this route and the artifact's own bytes carry no glyph for them" });
    }
    for (const miss of writeProof.notFound) {
      note("knownRequiredFieldsMissing", { field: miss.field, label: miss.expected, why: "the value this route's field map binds to the field is not readable from the route artifact's own bytes" });
    }
  }

  return {
    counters, findings, ledger,
    totals: {
      terminalFields: writes.length + blanks.length,
      written: writes.length,
      blank: blanks.length,
      blanksByDisposition: ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
      rowsInspected: rows.size
    }
  };
}

const families = [];
for (const state of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const stateDir = path.join(ROOT, OVERLAYS, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const entry of fs.readdirSync(stateDir)) {
    const dir = `${OVERLAYS}/${state}/${entry}`;
    const rendered = readIf(`${dir}/reports/rendered-artifacts.json`);
    if (!rendered) continue;
    const familyId = rendered.familyId ?? entry.replace(/--[a-z-]+$/, "");
    const fieldMap = readIf(`${dir}/production-field-map.json`);
    const routeArtifacts = (rendered.routeArtifacts ?? []).length > 0
      ? rendered.routeArtifacts
      : singleRouteFamilyArtifacts({ familyId, rendered, fieldMap, master: MASTER, routeRegistry: ROUTE_REGISTRY });
    if (routeArtifacts.length === 0) continue;
    families.push({ dir, familyId, routeArtifacts });
  }
}

const results = [];
for (const { dir, familyId, routeArtifacts } of families) {
  if (ONLY_FAMILIES.length > 0 && !ONLY_FAMILIES.includes(familyId)) continue;
  const fieldMap = readIf(`${dir}/production-field-map.json`);
  const rendered = readIf(`${dir}/reports/rendered-artifacts.json`);
  const actualWrites = readIf(`${dir}/reports/actual-writes.json`);
  const instructionsPath = path.join(ROOT, `${dir}/participant-instructions.md`);
  const instructions = fs.existsSync(instructionsPath) ? fs.readFileSync(instructionsPath, "utf8") : "";

  if (!fieldMap?.componentRoutes) {
    results.push({ familyId, directory: dir, result: "REFUSED_UNREADABLE", why: "the production field map declares no componentRoutes, so which component belongs to which route is not stated and cannot be inferred" });
    continue;
  }

  for (const artifact of routeArtifacts) {
    if (ONLY_ROUTES.length > 0 && !ONLY_ROUTES.includes(artifact.route)) continue;

    const findings = [];
    /* The route's components as the FAMILY declares them, never as the artifact
     * reports about itself. An artifact that names its own component set and is
     * then measured against that set has proved nothing. */
    const declared = Object.entries(fieldMap.componentRoutes)
      .filter(([, rk]) => rk === artifact.routeKey).map(([id]) => id);
    if (declared.length === 0) findings.push({ counter: "requiredComponentsMissing", why: `no component in the family's componentRoutes carries route ${artifact.routeKey}` });

    const abs = path.join(ROOT, artifact.file);
    let bytes = null;
    let parsedPages = null;
    let pageText = [];
    if (!fs.existsSync(abs)) {
      findings.push({ counter: "requiredComponentsMissing", why: `${artifact.file} is absent, so there is no artifact to measure` });
    } else {
      bytes = fs.readFileSync(abs);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      parsedPages = doc.getPageCount();
      pageText = doc.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
    }

    const observedSha = bytes ? sha256(bytes) : null;
    const bytesBind = observedSha === artifact.sha256 && bytes?.length === artifact.byteLength && parsedPages === artifact.pageCount;
    if (bytes && !bytesBind) {
      findings.push({ counter: "visualDefects", why: `the artifact on disk hashes ${observedSha} / ${bytes.length} bytes / ${parsedPages} page(s) and the build record states ${artifact.sha256} / ${artifact.byteLength} / ${artifact.pageCount}` });
    }

    /* Component set, both directions, against the page manifest AND the pages. */
    const manifest = artifact.pageManifest ?? [];
    const inManifest = new Set(manifest.map((m) => m.component));
    const missing = declared.filter((c) => !inManifest.has(c));
    const foreign = [...inManifest].filter((c) => !declared.includes(c));
    for (const c of missing) findings.push({ counter: "requiredComponentsMissing", component: c, why: "the route declares this component and no page of the route artifact carries it" });
    for (const c of foreign) findings.push({ counter: "requiredComponentsMissing", component: c, why: `the route artifact carries a component the route does not declare (it belongs to ${fieldMap.componentRoutes[c] ?? "no declared route"})` });
    if (parsedPages !== null && manifest.length !== parsedPages) {
      findings.push({ counter: "requiredComponentsMissing", why: `the page manifest describes ${manifest.length} page(s) and the artifact parses to ${parsedPages}` });
    }

    /* Read back this route's own writes from THIS artifact's own bytes. */
    const textOfComponent = new Map();
    for (const [i, m] of manifest.entries()) {
      textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${pageText[i] ?? ""}`.replace(/\s+/g, " "));
    }
    const writeProof = { valuesRead: 0, glyphs: 0, notFound: [] };
    const fixtureWrites = (actualWrites?.documents ?? []).find((d) => d.fixture === artifact.fixture)?.actualWrites ?? [];
    for (const w of fixtureWrites) {
      if (!declared.includes(w.document)) continue;
      const text = String(textOfComponent.get(w.document) ?? "");
      const value = String(w.expected ?? "");
      if (value && text.includes(value)) {
        writeProof.valuesRead += 1;
        writeProof.glyphs += value.replace(/\s+/g, "").length;
      } else {
        writeProof.notFound.push({ field: w.field, document: w.document, expected: value });
      }
    }

    const audit = countRoute((fieldMap.maps ?? []).filter((m) => declared.includes(m.formNumber)), instructions, writeProof);
    for (const f of findings) audit.counters[f.counter] += 1;
    const allFindings = [...findings, ...audit.findings];

    const failed = PASS_COUNTERS.filter((c) => audit.counters[c] > 0);
    let result = "ROUTE_PASS_COMPLETE";
    if (audit.counters.protectedWrites > 0) result = "FAIL_PROTECTED_WRITE";
    else if (audit.counters.invisibleWrites > 0 || audit.counters.visualDefects > 0) result = "FAIL_VISIBLE_APPEARANCE";
    else if (audit.counters.knownRequiredFieldsMissing > 0 || audit.counters.incompleteRows > 0 || audit.counters.requiredFactsNotCollected > 0) result = "FAIL_MISSING_REQUIRED_FACTS";
    else if (audit.counters.requiredOptionsMissing > 0) result = "FAIL_ROUTE_SELECTION";
    else if (audit.counters.unclassifiedBlanks > 0) result = "FAIL_MISSING_PREFILLS";
    else if (audit.counters.requiredComponentsMissing > 0) result = "FAIL_COMPONENT_SET";

    results.push({
      familyId, directory: dir,
      routeKey: artifact.routeKey, route: artifact.route, fixture: artifact.fixture,
      customerRouteId: artifact.customerRouteId ?? null,
      unitOfDelivery: artifact.unitOfDelivery ?? "route_artifact",
      familyAssemblyIsRouteArtifact: artifact.familyAssemblyIsRouteArtifact === true,
      equivalenceBasis: artifact.equivalenceBasis ?? null,
      file: artifact.file, result,
      bytes: {
        sha256Observed: observedSha, sha256Recorded: artifact.sha256,
        byteLengthObserved: bytes?.length ?? null, byteLengthRecorded: artifact.byteLength,
        pageCountParsed: parsedPages, pageCountRecorded: artifact.pageCount,
        bind: bytesBind
      },
      componentSet: {
        declaredByTheFamilyForThisRoute: declared,
        carriedByTheArtifact: [...inManifest],
        missingFromTheArtifact: missing,
        foreignToThisRoute: foreign,
        exact: missing.length === 0 && foreign.length === 0 && declared.length > 0
      },
      readBackFromTheseBytes: {
        valuesBoundToThisRoute: fixtureWrites.filter((w) => declared.includes(w.document)).length,
        valuesReadBack: writeProof.valuesRead,
        glyphs: writeProof.glyphs,
        notReadBack: writeProof.notFound
      },
      counters: audit.counters, failedCounters: failed,
      totals: audit.totals,
      findings: allFindings, findingsTruncated: 0
    });
  }
}

if ((ONLY_FAMILIES.length > 0 || ONLY_ROUTES.length > 0) && results.length === 0) {
  console.error("REFUSED: no route artifacts matched the explicit filter");
  process.exit(1);
}

/* A focused run replaces only the rows it was asked to measure. This lets a
 * sparse, family-scoped worktree add current evidence without deleting
 * historical rows for families it intentionally did not materialize. */
const existing = readIf(OUT);
const focused = ONLY_FAMILIES.length > 0 || ONLY_ROUTES.length > 0;
const selectedByFilters = (row) =>
  (ONLY_FAMILIES.length === 0 || ONLY_FAMILIES.includes(row.familyId))
  && (ONLY_ROUTES.length === 0 || ONLY_ROUTES.includes(row.route));
const outputResults = WRITE && focused && existing?.results
  ? [...existing.results.filter((row) => !selectedByFilters(row)), ...results]
  : results;

const doc = {
  ...(focused && existing ? existing : {}),
  schemaVersion: "rcap-route-artifact-completeness/v1",
  generatedBy: "scripts/rcap-packet-completeness/verify-route-artifact-completeness.mjs",
  whatThisMeasures: "For each route-scoped artifact: that its bytes still bind to the build record, that it carries exactly the components the family's own componentRoutes assigns to that route and no other route's, that every value bound to those components is readable back from the artifact's own bytes, and the nine completeness counters over that route's field-map rows alone.",
  whatThisIsNot: "Not independent verification, not a raster verdict, and not a promotion. This is the builder-side lane's own measurement of artifacts the same lane is submitting.",
  whichRowsTheCountersRead: "canonicalWrites and canonicalRefusals, the same rows verify-packet-completeness.mjs reads for this field-map schema, so a route counter and a family counter mean the same thing. The read-back is fixture-specific: it uses the fixture's own actualWrites and the fixture's own artifact bytes.",
  routeArtifactsMeasured: outputResults.length,
  allPass: outputResults.every((r) => r.result === "ROUTE_PASS_COMPLETE"),
  byResult: outputResults.reduce((acc, r) => { acc[r.result] = (acc[r.result] ?? 0) + 1; return acc; }, {}),
  focusedRegeneration: focused
    ? { families: ONLY_FAMILIES, routes: ONLY_ROUTES, rowsReplaced: results.length, untouchedRowsPreserved: outputResults.length - results.length }
    : null,
  packetPdfsModified: 0, packetContentChanged: false, commercialRoutesOpened: 0, productionTouched: false,
  results: outputResults
};

if (WRITE) {
  fs.mkdirSync(path.join(ROOT, path.dirname(OUT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
}

for (const r of results) {
  const mark = r.result === "ROUTE_PASS_COMPLETE" ? "ok  " : "FAIL";
  console.log(`  ${mark} ${r.familyId} · ${r.route} · ${r.fixture} — ${r.result} — ${r.componentSet.declaredByTheFamilyForThisRoute.length} component(s), ${r.readBackFromTheseBytes.valuesReadBack}/${r.readBackFromTheseBytes.valuesBoundToThisRoute} value(s) read back, ${r.totals.written}/${r.totals.terminalFields} written`);
  for (const f of r.findings.slice(0, 6)) console.log(`       ${f.counter}: ${f.why ?? f.basis ?? f.label ?? ""}`);
}
console.log(`\n  ${results.length} route artifact(s) measured this run · ${outputResults.length} total · ${Object.entries(doc.byResult).map(([k, v]) => `${v} ${k}`).join(" · ")}`);
if (WRITE) console.log(`  written: ${OUT}`);
process.exit(doc.allPass ? 0 : 1);
