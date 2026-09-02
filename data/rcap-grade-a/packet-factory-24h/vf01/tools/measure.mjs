// RV-A independent measurement harness. Reads packets; writes nothing outside vf0*/ and .rva2-scratch/.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { readInk } from "./pdfink.mjs";

const ROOT = "/home/user/legalease-partner-dashboard-clean/.claude/worktrees/rva2";
const MAIN = "/home/user/legalease-partner-dashboard-clean";
const rj = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const exists = (p) => fs.existsSync(p);
const R = (rel) => { const a = path.join(ROOT, rel); return exists(a) ? a : path.join(MAIN, rel); };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const setOf = (a) => JSON.stringify([...new Set(a || [])].sort());
const PAGEBREAK = "  ";

const PROTECTED_CLASSES = new Set(["signature_or_date_participant_completion", "court_prosecutor_clerk_or_agency_owned", "prosecutor_owned", "court_owned", "clerk_owned", "agency_owned", "notary_owned", "certificate_of_mailing_owned"]);
const classOf = (r) => r.refusalClass || r.class || r.completenessClass || r.category || null;
const dispOf = (r) => r.disposition || r.completenessDisposition || (PROTECTED_CLASSES.has(classOf(r)) ? "PROTECTED_FIELD" : (classOf(r) === "participant_sworn_narrative_or_legal_election" ? "PARTICIPANT_ELECTION_GENUINE" : null));

const famId = process.argv[2];
const Q = rj(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"));
const fam = Q.families.find(f => f.familyId === famId);
if (!fam) { console.error("NO SUCH FAMILY"); process.exit(2); }
const D = path.join(ROOT, fam.directory);
const G = (f) => exists(path.join(D, f)) ? rj(path.join(D, f)) : null;
const ra = G("reports/rendered-artifacts.json"), pfm = G("production-field-map.json"), pw = G("product-wiring.json"),
      sr = G("source-receipt.json"), aw = G("reports/actual-writes.json"), bl = G("reports/blanks-left-for-the-participant.json"),
      cen = G("field-census.census-v1.json"), cc = G("reports/completeness-counters.json"), bs = G("build-status.json"), ar = G("approval-request.json");
const out = { familyId: famId, directory: fam.directory, presentFiles: exists(D) ? fs.readdirSync(D) : "DIRECTORY_ABSENT" };
out.missingCoreFiles = ["reports/rendered-artifacts.json", "production-field-map.json", "source-receipt.json", "reports/actual-writes.json", "reports/blanks-left-for-the-participant.json", "field-census.census-v1.json", "participant-instructions.md", "build-status.json"].filter(f => !exists(path.join(D, f)));

// ---- ARTIFACTS (trap 4: declared is not the same as present) ----
const decl = [];
const collect = (obj, where) => {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) return obj.forEach((o, i) => collect(o, `${where}[${i}]`));
  const f = obj.file || obj.path || obj.artifactPath || obj.pathInArchive;
  if (typeof f === "string" && /\.(pdf|png|jpg|jpeg|json|md|txt)$/i.test(f) && (obj.sha256 || obj.byteLength || obj.pageCount))
    decl.push({ where, file: f, sha256: obj.sha256 ?? null, byteLength: obj.byteLength ?? null, pageCount: obj.pageCount ?? null, acroFieldCount: obj.acroFieldCount ?? null });
  for (const [k, v] of Object.entries(obj)) if (v && typeof v === "object") collect(v, `${where}.${k}`);
};
for (const [n, o] of [["rendered-artifacts", ra], ["build-status", bs], ["source-receipt", sr], ["product-wiring", pw], ["approval-request", ar], ["MASTER_QUEUE.family", fam], ["field-census", cen]]) collect(o, n);
out.declaredRecords = decl.map(a => {
  const abs = R(a.file); const r = { ...a, present: exists(abs) };
  if (r.present) { r.actualSha256 = sha(abs); r.actualByteLength = fs.statSync(abs).size; r.shaMatch = a.sha256 ? r.actualSha256 === a.sha256 : null; r.byteMatch = a.byteLength ? r.actualByteLength === a.byteLength : null; }
  return r;
});
out.declaredRecordFailures = out.declaredRecords.filter(r => !r.present || r.shaMatch === false || r.byteMatch === false);

// ---- ROUTE_IDENTITY ----
out.routeIdentity = { masterQueue: setOf(fam.routeKeys), sourceReceipt: setOf(sr?.routeKeys), productionFieldMap: setOf(pfm?.routeKeys), productWiring: setOf(pw?.routeKeys), productWiringBinding: setOf(pw?.binding?.routeKeys) };
out.routeIdentity.allAgree = new Set(Object.values(out.routeIdentity).filter(v => v && v !== "[]")).size <= 1;
// A pin cannot prove an anchor still exists: confirm each declared routeKey is present
// in the sources that define it, read here.
const ANCHORS = {
  canonicalRouteUniverse: "data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json",
  buildWorklist: "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json",
  trackRegistry: "data/record-clearing/legal-design-track-registry.json",
};
const anchorRaw = {};
for (const [n, rel] of Object.entries(ANCHORS)) { const a = path.join(ROOT, rel); anchorRaw[n] = exists(a) ? fs.readFileSync(a, "utf8") : null; }
const regRaw = anchorRaw.trackRegistry || "";
out.routeKeyAnchors = (fam.routeKeys || []).map(k => {
  const found = Object.fromEntries(Object.entries(anchorRaw).map(([n, t]) => [n, t === null ? null : t.includes(k)]));
  return { routeKey: k, ...found, anchored: Object.values(found).some(v => v === true) };
});
out.routeKeysAllAnchored = out.routeKeyAnchors.every(a => a.anchored);

// ---- COMPONENT_SET ----
out.componentSet = { renderedArtifacts: setOf(ra?.componentSet), productionFieldMap: setOf(pfm?.componentSet), fieldMapDocs: setOf((pfm?.maps || []).map(m => m.documentId)), sourceReceiptComposed: setOf([...(sr?.composedComponentsAuthoredByThisBuild || []), ...(sr?.documents || []).map(d => d.documentId)]) };
out.componentSet.allAgree = new Set([out.componentSet.renderedArtifacts, out.componentSet.productionFieldMap, out.componentSet.fieldMapDocs, out.componentSet.sourceReceiptComposed].filter(v => v && v !== "[]")).size <= 1;

// ---- PDF ink ----
const pdfs = (ra?.pdfs || []).filter(p => p.file);
const ink = {};
for (const p of pdfs) { const abs = R(p.file); if (exists(abs)) { try { ink[p.file] = await readInk(abs); } catch (e) { ink[p.file] = { error: String(e) }; } } }
const canonicalFile = (pdfs.find(p => p.fixture === "canonical") || pdfs[0] || {}).file;
const boundaryFile = (pdfs.find(p => p.fixture === "boundary") || {}).file;
const fileFor = (fx) => fx === "boundary" ? (boundaryFile || canonicalFile) : canonicalFile;
out.pdfs = pdfs.map(p => ({ file: p.file, fixture: p.fixture, declaredPageCount: p.pageCount ?? null, observedPageCount: Array.isArray(ink[p.file]) ? ink[p.file].length : null, present: exists(R(p.file)), inkError: (ink[p.file] && ink[p.file].error) || null }));

// ---- document page offsets inside the assembled packet ----
// Field-map rects carry DOCUMENT-LOCAL page numbers; the packet is an assembly.
// Locate each official form's page block by matching its own bytes against the packet.
const srcInk = {};
for (const d of (sr?.documents || [])) { if (!d.pathInArchive) continue; const abs = R(d.pathInArchive); if (!exists(abs)) continue;
  try { srcInk[d.documentId] = await readInk(abs); } catch (e) { srcInk[d.documentId] = { error: String(e) }; } }
const toks = (t) => new Set(norm(t).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(w => w.length > 3));
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / a.size; };
const docOffsets = {};
for (const [docId, pages] of Object.entries(srcInk)) {
  if (!Array.isArray(pages)) continue;
  for (const fx of ["canonical", "boundary"]) {
    const fk = fileFor(fx); const pk = ink[fk]; if (!Array.isArray(pk)) continue;
    const srcT = pages.map(pg => toks(pg.items.map(i => i.text).join(" ")));
    const pkT = pk.map(pg => toks(pg.items.map(i => i.text).join(" ")));
    let best = { offset: null, score: -1 };
    for (let off = 0; off + pages.length <= pk.length; off++) {
      let sc = 0; for (let i = 0; i < pages.length; i++) sc += jac(srcT[i], pkT[off + i]);
      sc /= pages.length; if (sc > best.score) best = { offset: off, score: +sc.toFixed(3) };
    }
    docOffsets[`${docId}|${fx}`] = best; // document page 1 lands on packet page best.offset+1
  }
}
out.documentPageOffsets = docOffsets;
const packetPage = (docId, fx, localPage) => { const b = docOffsets[`${docId}|${fx}`]; return b && b.offset !== null && b.score >= 0.5 ? b.offset + localPage : null; };

const pageOf = (fk, n) => Array.isArray(ink[fk]) ? ink[fk].find(x => x.page === n) : null;
const pageText = (fk, n) => { const pg = pageOf(fk, n); return pg ? norm(pg.items.map(i => i.text).join(" ")) : null; };
const allTextCache = {};
const allText = (fk) => { if (!(fk in allTextCache)) allTextCache[fk] = Array.isArray(ink[fk]) ? norm(ink[fk].map(p => p.items.map(i => i.text).join(" ")).join(PAGEBREAK)) : null; return allTextCache[fk]; };

// ---- KNOWN_PREFILLS: prove every declared write from the bytes ----
const proofs = [];
for (const doc of (aw?.documents || [])) {
  const fk = fileFor(doc.fixture);
  for (const w of (doc.actualWrites || [])) {
    const t = norm(w.drawnText);
    const rec = { kind: "build_write", fixture: doc.fixture, document: w.document, field: w.field, factId: w.factId ?? null, page: w.page ?? null, drawnText: t, declaredFound: w.foundInOutputBytes ?? null };
    if (!t) { rec.result = "DECLARED_WRITE_WITH_NO_TEXT"; proofs.push(rec); continue; }
    rec.onDeclaredPage = w.page ? (pageText(fk, w.page)?.includes(t) ?? null) : null;
    rec.anywhereInPdf = allText(fk)?.includes(t) ?? null;
    if (w.rect && w.page) { const pg = pageOf(fk, w.page);
      rec.inDeclaredRect = pg ? pg.items.some(i => i.nonSpaceBytes > 0 && norm(i.text).includes(t.slice(0, 24)) && i.x >= w.rect.x - 3 && i.x <= w.rect.x + w.rect.width + 3 && i.y >= w.rect.y - 4 && i.y <= w.rect.y + w.rect.height + 6) : null; }
    proofs.push(rec);
  }
  for (const w of (doc.documentAuthoredAppearances || [])) {
    const t = norm(w.drawnText);
    proofs.push({ kind: "source_authored", fixture: doc.fixture, document: w.document, field: w.field, page: w.page ?? null, drawnText: t, sourceValue: w.sourceValue ?? null,
      onDeclaredPage: w.page ? (pageText(fk, w.page)?.includes(t) ?? null) : null, anywhereInPdf: t ? (allText(fk)?.includes(t) ?? null) : null });
  }
}
out.writeProofs = proofs;
out.writeProofSummary = { total: proofs.length, buildWrites: proofs.filter(p => p.kind === "build_write").length, sourceAuthored: proofs.filter(p => p.kind === "source_authored").length,
  notOnDeclaredPage: proofs.filter(p => p.kind === "build_write" && p.onDeclaredPage === false).length, notAnywhere: proofs.filter(p => p.kind === "build_write" && p.anywhereInPdf === false).length,
  notInDeclaredRect: proofs.filter(p => p.inDeclaredRect === false).length, emptyDeclared: proofs.filter(p => p.result === "DECLARED_WRITE_WITH_NO_TEXT").length };
out.writeProofFailures = proofs.filter(p => p.kind === "build_write" && (p.anywhereInPdf === false || p.result === "DECLARED_WRITE_WITH_NO_TEXT"));

// ---- refusals, dispositions, PROTECTED_FIELDS ----
const refusals = [];
for (const m of (pfm?.maps || [])) for (const key of ["canonicalRefusals", "boundaryRefusals", "roleRefusals"]) for (const r of (m[key] || []))
  refusals.push({ fixture: key.startsWith("boundary") ? "boundary" : "canonical", documentId: m.documentId, structuralClass: m.structuralClass, ...r });
out.refusalDispositions = refusals.reduce((a, r) => { const d = dispOf(r) || "UNCLASSIFIED"; a[d] = (a[d] || 0) + 1; return a; }, {});
out.unclassifiedRefusals = refusals.filter(r => !dispOf(r)).map(r => ({ document: r.documentId, field: r.field, fixture: r.fixture, class: classOf(r) })).slice(0, 20);
out.unclassifiedRefusalCount = refusals.filter(r => !dispOf(r)).length;

const inkInRect = (fk, page, rect) => {
  const pg = pageOf(fk, page); if (!pg || !rect) return null;
  return pg.items.filter(i => i.nonSpaceBytes > 0 && i.x + i.advance >= rect.x - 1 && i.x <= rect.x + rect.width + 1 && i.y >= rect.y - 3 && i.y <= rect.y + rect.height + 3)
    .map(h => ({ text: h.text.slice(0, 60), x: h.x, y: h.y, xobject: h.xobject, mapped: h.mapped }));
};
// Ink that is already in the BLANK source at the same rect is the form's own printing
// (rules, captions, source-authored values) - not something this build put there.
const inkInSourceRect = (docId, localPage, rect) => {
  const pages = srcInk[docId]; if (!Array.isArray(pages) || !rect) return null;
  const pg = pages.find(x => x.page === localPage); if (!pg) return null;
  return pg.items.filter(i => i.nonSpaceBytes > 0 && i.x + i.advance >= rect.x - 1 && i.x <= rect.x + rect.width + 1 && i.y >= rect.y - 3 && i.y <= rect.y + rect.height + 3)
    .map(h => norm(h.text));
};
const buildAddedInk = (docId, fx, localPage, rect, hits) => {
  if (!hits) return null;
  const blank = inkInSourceRect(docId, localPage, rect);
  if (blank === null) return hits; // no source to compare against: treat every hit as unexplained
  const bag = blank.slice();
  return hits.filter(h => { const t = norm(h.text); if (!t) return false; const i = bag.indexOf(t); if (i >= 0) { bag.splice(i, 1); return false; } return true; });
};
const sourceAuthoredKeys = new Set((aw?.documents || []).flatMap(d => (d.documentAuthoredAppearances || []).map(a => `${a.document} ${a.field}`)));
const censusSourceValue = new Map();
for (const d of (cen?.documents || [])) for (const r of (d.rows || [])) if (r.sourceValuePresentInBlankForm) censusSourceValue.set(`${d.documentId} ${r.field}`, r.sourceValuePresentInBlankForm);
out.protectedFields = [];
for (const r of refusals) {
  if (dispOf(r) !== "PROTECTED_FIELD") continue;
  const key = `${r.documentId} ${(r.fieldName ?? String(r.field).split(".").pop())}`;
  const pp = packetPage(r.documentId, r.fixture, r.page);
  const allHits = r.rect && r.page && pp ? inkInRect(fileFor(r.fixture), pp, r.rect) : null;
  const hits = allHits ? buildAddedInk(r.documentId, r.fixture, r.page, r.rect, allHits) : null;
  if (hits && hits.length) out.protectedFields.push({ document: r.documentId, field: r.field, fixture: r.fixture, page: r.page, packetPage: pp, class: classOf(r), ink: hits,
      sourceAuthoredDeclared: sourceAuthoredKeys.has(key), sourceValueInBlankForm: censusSourceValue.get(key) ?? null });
}
out.protectedFieldCount = refusals.filter(r => dispOf(r) === "PROTECTED_FIELD").length;
out.protectedWithUnexplainedInk = out.protectedFields.filter(p => !p.sourceAuthoredDeclared && !p.sourceValueInBlankForm);
out.protectedNote = "ink[] lists only marks present in the packet rect that are NOT present in the same rect of the blank source; source-authored ink is reported separately and is not a defect.";
out.refusedFieldsWithInkDeclared = (aw?.documents || []).flatMap(d => (d.refusedFieldsWithInk || []).map(x => ({ fixture: d.fixture, ...x })));

// ---- REQUIRED_BEFORE_FILING ----
const instrPath = path.join(D, "participant-instructions.md");
const instrRaw = exists(instrPath) ? fs.readFileSync(instrPath, "utf8") : "";
const instr = norm(instrRaw);
const rbf = pfm?.requiredBeforeFiling || [];
const undis = rbf.filter(r => { const l = norm(r.disclosureLabel || r.printedContext || r.field); return l && !instr.includes(l); });
out.requiredBeforeFiling = { fieldMapCount: rbf.length, declaredCount: pfm?.requiredBeforeFilingCount ?? null, blanksReportCount: (bl?.requiredBeforeFiling || []).length,
  everyItemDisclosedClaim: bl?.everyRequiredBeforeFilingItemIsDisclosed ?? null, undisclosedInInstructions: undis.length, undisclosedSample: undis.slice(0, 15).map(r => ({ document: r.document, field: r.field, label: r.disclosureLabel })),
  refusalsMarkedRBFCanonical: refusals.filter(r => dispOf(r) === "REQUIRED_BEFORE_FILING" && r.fixture === "canonical").length };
out.rbfWithInk = rbf.map(r => { const m = (pfm?.maps || []).find(m => m.documentId === r.document); const ref = (m?.canonicalRefusals || []).find(x => x.field === r.field);
  if (!ref?.rect || !ref?.page) return null; const pp = packetPage(r.document, "canonical", ref.page); if (!pp) return null;
  const all = inkInRect(canonicalFile, pp, ref.rect); const hits = buildAddedInk(r.document, "canonical", ref.page, ref.rect, all);
  return hits && hits.length ? { field: r.field, page: ref.page, packetPage: pp, ink: hits } : null; }).filter(Boolean);

// ---- ROUTE_OPTIONS ----
out.routeOptions = { routeSelectionsMade: pfm?.routeSelectionsMade ?? null, routeSelectionNote: pfm?.routeSelectionNote ?? null,
  selectionControlsByDoc: (pfm?.maps || []).map(m => ({ documentId: m.documentId, selectionControls: (m.selectionControls || []).length, conditional: m.documentPolicy?.conditional ?? null, routeKey: m.documentPolicy?.routeKey ?? null, mode: m.documentPolicy?.mode ?? null })),
  componentConditionsDeclared: Object.keys(ra?.componentConditions || {}).length, componentsDeclared: (ra?.componentSet || []).length,
  requiredOptionsMissingBuilder: cc?.counters?.requiredOptionsMissing ?? null };

// ---- REPEATING_ROWS (trap 3) ----
const stripRow = (n) => { const s = String(n); const m = s.match(/^(.*?)[\s_.:-]*(?:row)?[\s_.:-]*\(?\[?(\d{1,3})\)?\]?$/i); return m && m[1].trim().length >= 2 ? m[1].trim() : null; };
const groups = new Map();
for (const m of (pfm?.maps || [])) {
  const all = [...(m.canonicalWrites || []).map(x => ({ ...x, _t: "write" })), ...(m.canonicalRefusals || []).map(x => ({ ...x, _t: "refusal", _d: dispOf(x) }))];
  for (const f of all) { const fn = String(f.fieldName ?? String(f.field).split(".").pop());
    const base = stripRow(fn); if (!base) continue;
    const k = `${m.documentId} ${base}`; if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ fieldName: fn, type: f._t, disp: f._d ?? null, page: f.page, factId: f.factId ?? null }); }
}
const repeat = [];
for (const [k, v] of groups) { if (v.length < 2) continue; const [doc, base] = k.split(" ");
  const writes = v.filter(x => x.type === "write"), refs = v.filter(x => x.type === "refusal");
  repeat.push({ document: doc, base, rows: v.length, writes: writes.length, refusals: refs.length,
    unclassifiedRows: refs.filter(x => !x.disp).length, dispositions: [...new Set(refs.map(x => x.disp))], writtenRows: writes.map(x => x.fieldName), rowNames: v.map(x => x.fieldName).slice(0, 14) }); }
out.repeatingRowGroups = repeat;
out.repeatingRowsWithUnclassified = repeat.filter(g => g.unclassifiedRows > 0);
out.repeatingRowsUncovered = repeat.filter(g => g.writes + g.refusals < g.rows);

// ---- unclassified census blanks ----
const mapped = new Set();
for (const m of (pfm?.maps || [])) for (const key of ["canonicalWrites", "canonicalRefusals"]) for (const r of (m[key] || [])) mapped.add(`${m.documentId} ${r.fieldName ?? String(r.field).split(".").pop()}`);
const censusUnmapped = [];
for (const d of (cen?.documents || [])) for (const r of (d.rows || [])) if (!mapped.has(`${d.documentId} ${r.field}`)) censusUnmapped.push({ document: d.documentId, field: r.field, page: r.page, policy: r.policy });
out.censusUnmapped = { count: censusUnmapped.length, sample: censusUnmapped.slice(0, 25) };
out.censusDeclared = (cen?.documents || []).map(d => ({ documentId: d.documentId, unmapped: (d.unmapped || []).length, stale: (d.staleDictionaryKeys || []).length, captionDrift: (d.captionDrift || []).length, fields: d.fields, pageCount: d.pageCount, rows: (d.rows || []).length }));

// ---- CLIPPING_AND_OVERLAP ----
const clip = [], overlap = [];
for (const [fk, pages] of Object.entries(ink)) { if (!Array.isArray(pages)) continue;
  for (const pg of pages) {
    const its = pg.items.filter(i => i.nonSpaceBytes > 0);
    for (const it of its) { const right = it.x + it.advance;
      if (it.x < -2 || it.y < -2 || it.y > pg.height + 2 || it.x > pg.width + 2) clip.push({ file: fk, page: pg.page, why: "origin outside media box", x: it.x, y: it.y, text: it.text.slice(0, 50) });
      else if (right > pg.width + 1) clip.push({ file: fk, page: pg.page, why: "text runs past the page edge", x: it.x, right: +right.toFixed(1), pageWidth: pg.width, text: it.text.slice(0, 70) }); }
    const byY = new Map(); for (const it of its) { const k = Math.round(it.y * 2) / 2; if (!byY.has(k)) byY.set(k, []); byY.get(k).push(it); }
    for (const [y, arr] of byY) { if (arr.length < 2) continue; const s = arr.slice().sort((a, b) => a.x - b.x);
      for (let i = 1; i < s.length; i++) { const ov = (s[i - 1].x + s[i - 1].advance) - s[i].x;
        if (ov > 2 && norm(s[i].text) && norm(s[i - 1].text)) overlap.push({ file: fk, page: pg.page, y, overlapPts: +ov.toFixed(1), a: s[i - 1].text.slice(0, 40), b: s[i].text.slice(0, 40) }); } }
  } }
out.clipping = { count: clip.length, sample: clip.slice(0, 20) };
out.overlap = { count: overlap.length, sample: overlap.slice(0, 20) };

// ---- reported counters (for comparison only, never as proof) ----
out.builderCounters = cc?.counters ?? null; out.builderBlankDispositions = cc?.blankDispositions ?? null;
out.queueCounters = fam.counters ?? null; out.queueState = fam.state; out.buildStatusFile = bs;
out.awBlockingFindings = aw?.blockingFindings ?? null;
out.awPerDoc = (aw?.documents || []).map(d => ({ fixture: d.fixture, valuesReportedByFinalizer: d.valuesReportedByFinalizer, addedGlyphs: d.addedGlyphsReadFromOutputBytes, flattenedWidgets: d.flattenedWidgetAppearancesReadFromOutputBytes, glyphsOutsideWriteBoxes: d.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, refusedWithInk: (d.refusedFieldsWithInk || []).length, authored: (d.documentAuthoredAppearances || []).length, writes: (d.actualWrites || []).length }));
out.instructionsBytes = instrRaw.length;
out.legalInputStatus = fam.legalInputStatus ?? null;
out.sourceStatus = fam.sourceStatus ?? null;
console.log(JSON.stringify(out, null, 1));
