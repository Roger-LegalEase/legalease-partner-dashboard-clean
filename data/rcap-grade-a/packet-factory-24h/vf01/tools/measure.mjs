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
const ML = process.env.MASTER_LIBRARY_SOURCE_DIR || "/home/user/legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const R = (rel) => {
  for (const c of [path.join(ROOT, rel), path.join(MAIN, rel), path.join(ML, rel), path.join(ML, "..", rel)]) if (exists(c)) return c;
  return path.join(ROOT, rel);
};
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const setOf = (a) => JSON.stringify([...new Set(a || [])].sort());
const PAGEBREAK = "  ";

// One classifier over the several vocabularies the field maps use. A refusal counts as
// classified when the record says WHY; it counts as PROTECTED when the reason is that the
// blank belongs to a signature, a signature date, a mailing certificate, or to the court,
// the clerk, the prosecutor, an agency, a notary or an attorney rather than to the participant.
const PROTECTED_CLASSES = new Set([
  "signature_or_date_participant_completion", "court_prosecutor_clerk_or_agency_owned",
  "signature", "court", "prosecutor", "clerk", "agency", "attorney", "notary", "judge",
  "service_block", "outside_party", "government_identifier", "agency_assigned_identifier",
  "notary_only", "notary_jurat_county", "notary_jurat_date", "verification_signature_line",
  "attorney_identifier", "attorney_identity", "attorney_signature", "attorney_representation",
  "signature_and_date", "role", "protected_category",
]);
const PROTECTED_TEXT = /attorney-only|attorney\/ldp|never prefilled|never populated|court, clerk, prosecutor|court-owned|proof-of-service|mailing-certificate|certificate of mailing|signature and signature date|judge|notary|clerk completes|the court completes/i;
const classOf = (r) => r.refusalClass || r.class || r.completenessClass || r.category || r.role || null;
const dispOf = (r) => {
  const explicit = r.disposition || r.completenessDisposition || r.approvedBlankDisposition;
  if (explicit && explicit !== "REFUSE" && explicit !== "SELECT") return explicit;
  if (r._origin === "protectedFields" || r._origin === "protectedRules") return "PROTECTED_FIELD";
  const c = classOf(r);
  if (c && PROTECTED_CLASSES.has(c)) return "PROTECTED_FIELD";
  const why = [r.why, r.reason, r.reasonText, r.note].filter(Boolean).join(" ");
  if (/REQUIRED_BEFORE_FILING/.test(why) || r.requiredBeforeFiling === true) return "REQUIRED_BEFORE_FILING";
  if (c === "participant_sworn_narrative_or_legal_election" || /participant_sworn_narrative_or_legal_election/.test(why)) return "PARTICIPANT_ELECTION_GENUINE";
  if (why && PROTECTED_TEXT.test(why)) return "PROTECTED_FIELD";
  if (c === "unreadable_page_body" || /does not extract|cannot read the sentence/i.test(why)) return "UNREADABLE_CONTEXT";
  if (c === "type_guard" || c === "non_text_field_type" || /viewer ui control/i.test(why)) return "NOT_A_FILING_BLANK";
  if (c || why) return "CLASSIFIED_OTHER";
  return null;
};
// The kinds trap 1 names, measured on their own: a signature, a signature date, a mailing
// certificate, a court-only or a prosecutor-only field must carry no ink this build added.
const SIGNATURE_LIKE = /signature|sign here|date signed|notar|jurat|verification|certificate of (mailing|service)|proof of service|declarant/i;
const isProtectedKind = (r) => {
  if (dispOf(r) === "PROTECTED_FIELD") return true;
  const c = classOf(r) || ""; const t = [r._label, r.field, r.fieldName, r.sourceLabel, r.effectiveLabel, r.why, r.reason].filter(Boolean).join(" ");
  return PROTECTED_CLASSES.has(c) || SIGNATURE_LIKE.test(t);
};

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
  const f = obj.file || obj.path || obj.artifactPath || obj.pathInArchive || obj.pathInCorpus || obj.outputFile;
  if (typeof f === "string" && /\.(pdf|png|jpg|jpeg|json|md|txt)$/i.test(f) && (obj.sha256 || obj.byteLength || obj.pageCount))
    decl.push({ where, file: f, sha256: obj.sha256 ?? obj.recomputedSha256 ?? obj.pinnedSha256 ?? null, byteLength: obj.byteLength ?? obj.pinnedByteLength ?? null, pageCount: obj.pageCount ?? null, acroFieldCount: obj.acroFieldCount ?? null });
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
const pdfs = [...(ra?.pdfs || []), ...(ra?.artifacts || [])].filter(p => p.file && /\.pdf$/i.test(p.file))
  .filter((p, i, a) => a.findIndex(q => q.file === p.file) === i);
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
for (const d of [...(sr?.documents || []), ...(sr?.sources || [])]) { const rel = d.pathInArchive || d.pathInCorpus; if (!rel) continue; const abs = R(rel); if (!exists(abs)) continue;
  const key = d.documentId || d.formNumber || d.sourceId; if (!key) continue;
  try { srcInk[key] = await readInk(abs); } catch (e) { srcInk[key] = { error: String(e) }; } }
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
// Where the receipt's own page counts add up to the packet, the assembly order fixes the
// offsets exactly, and that beats guessing from text on forms that barely extract.
const receiptDocs = [...(sr?.documents || []), ...(sr?.sources || [])].map(d => ({ key: d.documentId || d.formNumber || d.sourceId, pages: d.pageCount ?? null })).filter(d => d.key && d.pages);
const receiptTotal = receiptDocs.reduce((a, d) => a + d.pages, 0);
out.offsetMethod = "text match";
for (const fx of ["canonical", "boundary"]) {
  const fk = fileFor(fx); const pk = ink[fk];
  if (!Array.isArray(pk) || !receiptDocs.length || receiptTotal !== pk.length) continue;
  let acc = 0;
  for (const d of receiptDocs) { docOffsets[`${d.key}|${fx}`] = { offset: acc, score: 1, method: "assembly order from source-receipt page counts" }; acc += d.pages; }
  out.offsetMethod = "assembly order from source-receipt page counts";
}
out.documentPageOffsets = docOffsets;
// Where a family renders one PDF per document, that PDF is the document: offset 0.
const perDocFile = {};
for (const p of pdfs) {
  const ids = [p.documentId, p.document, p.formNumber].filter(Boolean).map(String);
  for (const id of ids) perDocFile[`${id}|${p.fixture || "canonical"}`] = p.file;
}
out.perDocFile = perDocFile;
const docFileFor = (docId, fx) => perDocFile[`${docId}|${fx}`] || perDocFile[`${docId}|canonical`] || fileFor(fx);
const packetPageRaw = (docId, fx, localPage) => { const b = docOffsets[`${docId}|${fx}`]; return b && b.offset !== null && b.score >= 0.5 ? b.offset + localPage : null; };
const packetPage = (docId, fx, localPage) => {
  if (perDocFile[`${docId}|${fx}`] || perDocFile[`${docId}|canonical`]) return localPage;
  if (!docOffsets[`${docId}|${fx}`]) return localPage; // no bound source to offset against: the page is the page
  return packetPageRaw(docId, fx, localPage);
};

const pageOf = (fk, n) => Array.isArray(ink[fk]) ? ink[fk].find(x => x.page === n) : null;
const pageText = (fk, n) => { const pg = pageOf(fk, n); return pg ? norm(pg.items.map(i => i.text).join(" ")) : null; };
const allTextCache = {};
const allText = (fk) => { if (!(fk in allTextCache)) allTextCache[fk] = Array.isArray(ink[fk]) ? norm(ink[fk].map(p => p.items.map(i => i.text).join(" ")).join(PAGEBREAK)) : null; return allTextCache[fk]; };

// ---- normalise the five production-field-map shapes into one structure ----
const rectOf = (o) => {
  if (o?.rect && typeof o.rect.x === "number") return o.rect;
  if (o?.writeBox && typeof o.writeBox.x === "number") return o.writeBox;
  const w = Array.isArray(o?.widgets) ? o.widgets[0] : null;
  if (w?.rect && Array.isArray(w.rect)) return { x: w.rect[0], y: w.rect[1], width: w.rect[2] - w.rect[0], height: w.rect[3] - w.rect[1] };
  if (o?.measured && typeof o.measured.x0 === "number") {
    const m = o.measured; const y = m.baselineY ?? m.y0 ?? 0;
    return { x: m.x0, y: y - 2, width: (m.x1 ?? m.x0) - m.x0, height: (m.y1 ? m.y1 - m.y0 : 12) };
  }
  return null;
};
const pageOfEntry = (o) => o?.page ?? o?.sourcePage ?? (Array.isArray(o?.widgets) && typeof o.widgets[0]?.pageIndex === "number" ? o.widgets[0].pageIndex + 1 : null);
const labelOf = (o) => o?.printedLabel ?? o?.effectiveLabel ?? o?.sourceLabel ?? o?.semanticLabel ?? o?.printedLine ?? o?.label ?? null;
const fieldOf = (o) => o?.field ?? o?.fieldName ?? o?.fieldId ?? o?.anchor ?? null;
const valueOf = (o) => o?.value ?? o?.drawnText ?? o?.expected ?? o?.textReadFromOutputBytes ?? null;

const normDocs = [];
const rawDocs = pfm ? (pfm.maps || pfm.documents || null) : null;
if (Array.isArray(rawDocs) && rawDocs.length) {
  for (const m of rawDocs) {
    const docId = m.documentId || m.formNumber || m.documentRole || "document";
    const writes = [...(m.canonicalWrites || []), ...(m.writeBoxes || []), ...(Array.isArray(m.explicitMappings) ? m.explicitMappings : [])];
    const bwrites = [...(m.boundaryWrites || [])];
    const refusals = [
      ...(m.canonicalRefusals || []).map(x => ({ ...x, _origin: "canonicalRefusals" })),
      ...(m.refused || []).map(x => ({ ...x, _origin: "refused" })),
      ...(m.roleRefusals || []).map(x => ({ ...x, _origin: "roleRefusals" })),
      ...(m.protectedFields || []).map(x => ({ ...x, _origin: "protectedFields" })),
      ...(m.protectedRules || []).map(x => ({ ...x, _origin: "protectedRules" })),
    ];
    const brefusals = [...(m.boundaryRefusals || [])];
    normDocs.push({ documentId: docId, structuralClass: m.structuralClass || m.ownership || null, documentPolicy: m.documentPolicy || null,
      selectionControls: (m.selectionControls || []).length, fields: m.fields || null,
      writes: writes.map(w => ({ ...w, _field: fieldOf(w), _page: pageOfEntry(w), _rect: rectOf(w), _value: valueOf(w), _fixture: "canonical" })),
      boundaryWrites: bwrites.map(w => ({ ...w, _field: fieldOf(w), _page: pageOfEntry(w), _rect: rectOf(w), _value: valueOf(w), _fixture: "boundary" })),
      refusals: refusals.map(r => ({ ...r, _field: fieldOf(r), _page: pageOfEntry(r), _rect: rectOf(r), _label: labelOf(r), _fixture: "canonical" })),
      boundaryRefusals: brefusals.map(r => ({ ...r, _field: fieldOf(r), _page: pageOfEntry(r), _rect: rectOf(r), _label: labelOf(r), _fixture: "boundary" })) });
  }
} else if (pfm && (pfm.writes || pfm.refusals)) {
  const byDoc = new Map();
  const soleSourceDocId = (() => { const ds = [...(sr?.documents || []), ...(sr?.sources || [])]; return ds.length === 1 ? (ds[0].documentId || ds[0].formNumber) : null; })();
  const put = (o, kind) => { const d = o.documentId || o.formNumber || soleSourceDocId || pfm.primaryForm || pfm.familyId || "document";
    if (!byDoc.has(d)) byDoc.set(d, { documentId: d, structuralClass: "official_acroform", documentPolicy: null, selectionControls: 0, fields: null, writes: [], boundaryWrites: [], refusals: [], boundaryRefusals: [] });
    const rec = { ...o, _field: fieldOf(o), _page: pageOfEntry(o), _rect: rectOf(o), _value: valueOf(o), _label: labelOf(o), _fixture: "canonical" };
    byDoc.get(d)[kind].push(rec); };
  for (const w of (pfm.writes || [])) put(w, "writes");
  for (const r of (pfm.refusals || [])) put({ ...r, _origin: "refusals" }, "refusals");
  for (const sel of (pfm.selections || [])) put({ ...sel, _origin: "selections" }, "refusals");
  for (const [, v] of byDoc) { v.selectionControls = (pfm.selections || []).length; normDocs.push(v); }
}
out.normalisedShape = { documents: normDocs.length, writes: normDocs.reduce((a, d) => a + d.writes.length, 0), refusals: normDocs.reduce((a, d) => a + d.refusals.length, 0),
  boundaryWrites: normDocs.reduce((a, d) => a + d.boundaryWrites.length, 0), rectsOnWrites: normDocs.reduce((a, d) => a + d.writes.filter(w => w._rect).length, 0) };

// ---- refusals, dispositions, PROTECTED_FIELDS ----
const refusals = [];
for (const d of normDocs) for (const r of [...d.refusals, ...d.boundaryRefusals])
  refusals.push({ fixture: r._fixture, documentId: d.documentId, structuralClass: d.structuralClass, ...r });
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

// ---- KNOWN_PREFILLS: prove every declared write from the bytes ----
// Schema-independent collector: the reports differ family to family, so walk the tree and
// take any node that names a field and carries a value, with its nearest fixture and file.
const collectedWrites = [];
const walkWrites = (node, fixture, file, where) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n, i) => walkWrites(n, fixture, file, `${where}[${i}]`));
  const fx = node.fixture || fixture;
  const fl = node.file || node.outputFile || file;
  const fieldName = node.field ?? node.fieldName ?? node.anchor ?? null;
  const value = node.drawnText ?? node.expected ?? node.textReadFromOutputBytes ?? node.valueWritten ?? null;
  const disp = node.disposition ?? null;
  if (fieldName !== null && value !== null && disp !== "REFUSE")
    collectedWrites.push({ where, fixture: fx || "canonical", file: fl || null, document: node.document ?? node.documentId ?? null,
      field: String(fieldName), factId: node.factId ?? null, page: node.page ?? null, rect: node.rect ?? null,
      value: norm(value), declaredFound: node.foundInOutputBytes ?? null });
  for (const [k, v] of Object.entries(node)) if (v && typeof v === "object") walkWrites(v, fx, fl, `${where}.${k}`);
};
walkWrites(aw, null, null, "actual-writes");
out.collectedWriteCount = collectedWrites.length;
const proofs = [];
for (const doc of (aw?.documents || [])) {
  const fk = fileFor(doc.fixture);
  for (const w of (doc.actualWrites || [])) {
    const t = norm(w.drawnText) || norm(w.expected) || norm(w.value) || norm(w.textReadFromOutputBytes);
    const dfk = docFileFor(w.document, doc.fixture);
    const rec = { kind: "build_write", fixture: doc.fixture, document: w.document, field: w.field, factId: w.factId ?? null, page: w.page ?? null, drawnText: t, valueSource: norm(w.drawnText) ? "drawnText" : (norm(w.expected) ? "expected" : "other"), declaredFound: w.foundInOutputBytes ?? null };
    if (!t) { rec.result = "DECLARED_WRITE_WITH_NO_VALUE"; proofs.push(rec); continue; }
    rec.onDeclaredPage = w.page ? (pageText(dfk, w.page)?.includes(t) ?? null) : null;
    rec.anywhereInPdf = (allText(dfk)?.includes(t) ?? null) || (allText(fk)?.includes(t) ?? null);
    rec.inDocumentPdf = allText(dfk)?.includes(t) ?? null;
    if (w.rect && w.page) { const pg = pageOf(dfk, w.page);
      rec.inDeclaredRect = pg ? pg.items.some(i => i.nonSpaceBytes > 0 && norm(i.text).includes(t.slice(0, 24)) && i.x >= w.rect.x - 3 && i.x <= w.rect.x + w.rect.width + 3 && i.y >= w.rect.y - 4 && i.y <= w.rect.y + w.rect.height + 6) : null; }
    proofs.push(rec);
  }
  for (const w of (doc.documentAuthoredAppearances || [])) {
    const t = norm(w.drawnText);
    proofs.push({ kind: "source_authored", fixture: doc.fixture, document: w.document, field: w.field, page: w.page ?? null, drawnText: t, sourceValue: w.sourceValue ?? null,
      onDeclaredPage: w.page ? (pageText(fk, w.page)?.includes(t) ?? null) : null, anywhereInPdf: t ? (allText(fk)?.includes(t) ?? null) : null });
  }
}
// every collected write must be readable in the bytes of the artifact it names
for (const w of collectedWrites) {
  const dfk = (w.file && ink[w.file]) ? w.file : docFileFor(w.document || "", w.fixture);
  const t = w.value;
  const rec = { kind: "collected_write", where: w.where, fixture: w.fixture, document: w.document, field: w.field, factId: w.factId, page: w.page, drawnText: t, declaredFound: w.declaredFound };
  if (!t) { rec.result = "DECLARED_WRITE_WITH_NO_VALUE"; proofs.push(rec); continue; }
  rec.anywhereInPdf = (allText(dfk)?.includes(t) ?? null) || Object.keys(ink).some(k => (allText(k) || "").includes(t));
  rec.onDeclaredPage = w.page ? (pageText(dfk, w.page)?.includes(t) ?? null) : null;
  if (w.rect && w.page) { const hits = inkInRect(dfk, w.page, w.rect); rec.inDeclaredRect = hits ? hits.some(h => norm(h.text) && t.includes(norm(h.text).slice(0, 12))) || hits.some(h => norm(h.text).includes(t.slice(0, 12))) : null; }
  proofs.push(rec);
}
// and every declared write in the field map must have put ink on the page it claims
const rectWriteProofs = [];
for (const d of normDocs) for (const w of [...d.writes, ...d.boundaryWrites]) {
    if (!w._rect || !w._page) continue;
    const fx = w._fixture; const dfk = docFileFor(d.documentId, fx); const pp = packetPage(d.documentId, fx, w._page);
    if (!pp || !Array.isArray(ink[dfk])) continue;
    const all = inkInRect(dfk, pp, w._rect);
    const added = buildAddedInk(d.documentId, fx, w._page, w._rect, all);
    const val = norm(w._value);
    rectWriteProofs.push({ document: d.documentId, field: w._field, fixture: fx, page: w._page, packetPage: pp, factId: w.factId ?? null, declaredValue: val || null,
      inkInRect: (all || []).length, buildAddedInk: (added || []).map(h => h.text).filter(Boolean),
      hasInk: !!(added && added.some(h => norm(h.text))),
      valueMatches: val ? ((added || []).some(h => val.includes(norm(h.text)) || norm(h.text).includes(val.slice(0, 12))) || (pageText(dfk, pp) || "").includes(val)) : null });
  }
out.rectWriteProofs = rectWriteProofs;
out.writesWithNoInkOnPage = rectWriteProofs.filter(r => r.hasInk === false);
out.writeProofs = proofs;
out.writeProofSummary = { total: proofs.length, collected: proofs.filter(p => p.kind === "collected_write").length, rectChecked: rectWriteProofs.length, rectNoInk: out.writesWithNoInkOnPage.length, buildWrites: proofs.filter(p => p.kind === "build_write").length, sourceAuthored: proofs.filter(p => p.kind === "source_authored").length,
  notOnDeclaredPage: proofs.filter(p => p.kind !== "source_authored" && p.onDeclaredPage === false).length, notAnywhere: proofs.filter(p => p.kind !== "source_authored" && p.anywhereInPdf === false).length,
  notInDeclaredRect: proofs.filter(p => p.inDeclaredRect === false).length, emptyDeclared: proofs.filter(p => p.result === "DECLARED_WRITE_WITH_NO_VALUE").length };
out.writeProofFailures = proofs.filter(p => p.kind !== "source_authored" && (p.anywhereInPdf === false || p.result === "DECLARED_WRITE_WITH_NO_VALUE"));

const sourceAuthoredKeys = new Set((aw?.documents || []).flatMap(d => (d.documentAuthoredAppearances || []).map(a => `${a.document} ${a.field}`)));
const censusSourceValue = new Map();
for (const d of (cen?.documents || [])) for (const r of (d.rows || [])) if (r.sourceValuePresentInBlankForm) censusSourceValue.set(`${d.documentId} ${r.field}`, r.sourceValuePresentInBlankForm);
out.protectedFields = [];
for (const r of refusals) {
  if (!isProtectedKind(r)) continue;
  const key = `${r.documentId} ${(r.fieldName ?? String(r.field).split(".").pop())}`;
  const pp = packetPage(r.documentId, r.fixture, r._page);
  const allHits = r._rect && r._page && pp ? inkInRect(docFileFor(r.documentId, r.fixture), pp, r._rect) : null;
  const hits = allHits ? buildAddedInk(r.documentId, r.fixture, r._page, r._rect, allHits) : null;
  if (hits && hits.length) out.protectedFields.push({ document: r.documentId, field: r.field, fixture: r.fixture, page: r._page, packetPage: pp, class: classOf(r), ink: hits,
      sourceAuthoredDeclared: sourceAuthoredKeys.has(key), sourceValueInBlankForm: censusSourceValue.get(key) ?? null });
}
out.protectedFieldCount = refusals.filter(r => isProtectedKind(r)).length;
out.protectedByDisposition = refusals.filter(r => dispOf(r) === "PROTECTED_FIELD").length;

// A composed component has no widget rect, so measure it differently: no protected field may
// be in the write set, and no fixture value may sit on the line a protected label opens.
const writeFieldKeys = new Set((aw?.documents || []).flatMap(d => (d.actualWrites || []).map(w => `${w.document} ${w.field}`)));
out.protectedFieldsInWriteSet = refusals.filter(r => isProtectedKind(r) && writeFieldKeys.has(`${r.documentId} ${r.field}`))
  .map(r => ({ document: r.documentId, field: r.field, class: classOf(r) }));
const fixtureValues = [...new Set((aw?.documents || []).flatMap(d => (d.actualWrites || []).map(w => norm(w.drawnText) || norm(w.expected)).filter(v => v && v.length >= 4)))];
out.fixtureValues = fixtureValues;
out.protectedLabelFollowedByValue = [];
for (const r of refusals) {
  if (!isProtectedKind(r)) continue;
  if (r._rect) continue; // rect-bearing fields are measured by the rect test above
  const lab = norm(r._label); if (!lab || lab.length < 6) continue;
  const txt = allText(docFileFor(r.documentId, r.fixture)); if (!txt) continue;
  let i = txt.indexOf(lab); const found = [];
  while (i >= 0) { const after = txt.slice(i + lab.length, i + lab.length + 90);
    for (const v of fixtureValues) if (after.includes(v)) found.push({ value: v, after: after.slice(0, 90) });
    i = txt.indexOf(lab, i + 1); if (found.length) break; }
  if (found.length) out.protectedLabelFollowedByValue.push({ document: r.documentId, field: r.field, fixture: r.fixture, class: classOf(r), label: lab, hits: found.slice(0, 2) });
}

// ---- PAGE_ORDER: component blocks in the bytes, in the declared order ----
const declaredOrder = (ra?.componentSet || pfm?.componentSet || (pfm?.maps || []).map(m => m.documentId) || []);
out.pageOrder = {};
for (const fx of ["canonical", "boundary"]) {
  const fk = fileFor(fx); const pk = ink[fk]; if (!Array.isArray(pk)) continue;
  const pgTexts = pk.map(pg => norm(pg.items.map(i => i.text).join(" ")));
  const blocks = [];
  for (const docId of declaredOrder) {
    if (perDocFile[`${docId}|${fx}`]) { blocks.push({ document: docId, ownFile: true, pages: null }); continue; }
    const m = (pfm?.maps || []).find(m => m.documentId === docId);
    const labels = [...new Set([...(m?.canonicalRefusals || []), ...(m?.canonicalWrites || [])].map(x => norm(x.printedLabel || x.effectiveLabel)).filter(l => l && l.length >= 12))].slice(0, 40);
    const off = docOffsets[`${docId}|${fx}`];
    if (off && off.offset !== null && off.score >= 0.5) { const n = (srcInk[docId] || []).length; blocks.push({ document: docId, pages: [off.offset + 1, off.offset + n], via: "source page match" }); continue; }
    const hits = []; pgTexts.forEach((t, i) => { if (labels.length && labels.some(l => t.includes(l))) hits.push(i + 1); });
    blocks.push({ document: docId, pages: hits.length ? [Math.min(...hits), Math.max(...hits)] : null, via: "printed label match", labelsTried: labels.length });
  }
  const withPages = blocks.filter(b => b.pages);
  let ordered = true, overlaps = [];
  for (let i = 1; i < withPages.length; i++) {
    if (withPages[i].pages[0] < withPages[i - 1].pages[0]) ordered = false;
    if (withPages[i].pages[0] <= withPages[i - 1].pages[1]) overlaps.push([withPages[i - 1].document, withPages[i].document]);
  }
  // Component boundaries read from the bytes: a page whose top line is a heading starts a component.
  const heads = [];
  pk.forEach(pg => { const its = pg.items.filter(i => i.nonSpaceBytes > 0); if (!its.length) return;
    const top = its.slice(0, 4).filter(i => i.y > pg.height - 110);
    const t = norm(top.map(i => i.text).join("")); if (t.length < 10) return;
    const letters = t.replace(/[^A-Za-z]/g, ""); if (letters.length < 8) return;
    const upper = (t.match(/[A-Z]/g) || []).length / letters.length;
    const size = Math.max(...top.map(i => i.size || 0));
    if (upper > 0.85 || size >= 13) heads.push({ page: pg.page, size: +size.toFixed(1), heading: t.slice(0, 90) }); });
  out.pageOrder[fx] = { declaredOrder, headingsInBytes: heads, headingCount: heads.length, blocks, monotonic: ordered, blockOverlaps: overlaps, pageCount: pk.length, located: withPages.length, ofComponents: declaredOrder.length };
}
out.protectedWithUnexplainedInk = out.protectedFields.filter(p => !p.sourceAuthoredDeclared && !p.sourceValueInBlankForm);
out.protectedNote = "ink[] lists only marks present in the packet rect that are NOT present in the same rect of the blank source; source-authored ink is reported separately and is not a defect.";
out.refusedFieldsWithInkDeclared = (aw?.documents || []).flatMap(d => (d.refusedFieldsWithInk || []).map(x => ({ fixture: d.fixture, ...x })));

// ---- REQUIRED_BEFORE_FILING ----
const instrPath = path.join(D, "participant-instructions.md");
const instrRaw = exists(instrPath) ? fs.readFileSync(instrPath, "utf8") : "";
const instr = norm(instrRaw);
const rbf = (pfm?.requiredBeforeFiling && pfm.requiredBeforeFiling.length ? pfm.requiredBeforeFiling
  : (bl?.requiredBeforeFiling || refusals.filter(r => r.fixture === "canonical" && dispOf(r) === "REQUIRED_BEFORE_FILING")
      .map(r => ({ document: r.documentId, field: r._field, page: r._page, disclosureLabel: r._label ?? null, participantMustSupply: r.participantMustSupply ?? null }))));
const rbfLabel = (r) => norm(r.disclosureLabel || r.printedContext || r.label || r.effectiveLabel || r.sourceLabel || r.field || r.fieldId);
const rbfAsk = (r) => norm(r.participantMustSupply || "");
const undis = rbf.filter(r => { const l = rbfLabel(r); const a = rbfAsk(r);
  if (!l && !a) return false;
  const inInstr = (l && instr.includes(l)) || (a && instr.includes(a));
  return !inInstr; });
out.requiredBeforeFiling = { fieldMapCount: rbf.length, declaredCount: pfm?.requiredBeforeFilingCount ?? null, blanksReportCount: (bl?.requiredBeforeFiling || []).length,
  everyItemDisclosedClaim: bl?.everyRequiredBeforeFilingItemIsDisclosed ?? null, undisclosedInInstructions: undis.length, undisclosedSample: undis.slice(0, 15).map(r => ({ document: r.document ?? null, field: r.field ?? r.fieldId ?? null, label: rbfLabel(r), ask: rbfAsk(r).slice(0, 90) })),
  refusalsMarkedRBFCanonical: refusals.filter(r => dispOf(r) === "REQUIRED_BEFORE_FILING" && r.fixture === "canonical").length };
const refByKey = new Map();
for (const r of refusals) if (r.fixture === "canonical") refByKey.set(`${r.documentId} ${r._field}`, r);
out.rbfWithInk = rbf.map(r => {
  const key = `${r.document ?? r.documentId ?? ""} ${r.field ?? r.fieldId ?? ""}`;
  const ref = refByKey.get(key) || [...refByKey.values()].find(x => x._field === (r.field ?? r.fieldId));
  if (!ref?._rect || !ref?._page) return null;
  const pp = packetPage(ref.documentId, "canonical", ref._page); if (!pp) return null;
  const all = inkInRect(docFileFor(ref.documentId, "canonical"), pp, ref._rect);
  const hits = buildAddedInk(ref.documentId, "canonical", ref._page, ref._rect, all);
  const real = (hits || []).filter(h => !/^[_.\u2024\u2026\-\s:]*$/.test(h.text));
  return real.length ? { document: ref.documentId, field: ref._field, page: ref._page, packetPage: pp, ink: real.map(h => h.text) } : null;
}).filter(Boolean);

// A field cannot be both written and left blank. Where a map says both, one of the two is wrong.
out.fieldsInBothWriteAndRefusalSets = [];
for (const d of normDocs) {
  const w = new Map(d.writes.map(x => [x._field, x]));
  for (const r of d.refusals) if (w.has(r._field))
    out.fieldsInBothWriteAndRefusalSets.push({ document: d.documentId, field: r._field, refusalDisposition: dispOf(r),
      declaredWriteValue: norm(w.get(r._field)._value) || null });
}

// ---- ROUTE_OPTIONS ----
out.routeOptions = { routeSelectionsMade: pfm?.routeSelectionsMade ?? null, routeSelectionNote: pfm?.routeSelectionNote ?? null,
  selectionControlsByDoc: normDocs.map(m => ({ documentId: m.documentId, selectionControls: m.selectionControls, conditional: m.documentPolicy?.conditional ?? null, routeKey: m.documentPolicy?.routeKey ?? null, mode: m.documentPolicy?.mode ?? null })),
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
out.censusDeclared = (cen?.documents || []).map(d => ({ documentId: d.documentId, unmapped: (d.unmapped || []).length, stale: (d.staleDictionaryKeys || []).length, captionDrift: (d.captionDrift || []).length, fieldCount: Array.isArray(d.fields) ? d.fields.length : (d.fields ?? null), pageCount: d.pageCount, rows: (d.rows || []).length }));

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
        const isRule = (t) => { const c = String(t).replace(/\s/g, ""); if (!c) return true;
          const ruleChars = (c.match(/[_.\u2024\u2026\-:\u00b7]/g) || []).length; return ruleChars / c.length >= 0.8; };
        if (ov > 2 && norm(s[i].text) && norm(s[i - 1].text) && !isRule(s[i].text) && !isRule(s[i - 1].text)) overlap.push({ file: fk, page: pg.page, y, overlapPts: +ov.toFixed(1), a: s[i - 1].text.slice(0, 40), b: s[i].text.slice(0, 40) }); } }
  } }
out.clipping = { count: clip.length, sample: clip.slice(0, 20) };
out.overlap = { count: overlap.length, sample: overlap.slice(0, 20) };


// ---- FILING_DESTINATION / FEE_AND_WAIVER / SERVICE / SELF_HELP_STOP ----
// Measured against this family's own entries in the legal-design track registry.
const REGJ = regRaw ? JSON.parse(regRaw) : null;
const tracksAll = REGJ?.tracks || [];
const famTracks = tracksAll.filter(t => (fam.routeKeys || []).some(k => k.split(":").includes(t.trackId)) || (fam.routeKeys || []).some(k => k.includes(`:${t.trackId}:`) || k.endsWith(`:${t.trackId}`)));
out.registryTracks = famTracks.map(t => ({ trackId: t.trackId, jurisdiction: t.jurisdiction, legalName: t.legalName,
  venue: t.venue ?? null, destination: t.destination ?? null,
  selfHelpBoundaries: t.selfHelpBoundaries ?? null, selfHelpStopConditions: t.selfHelpStopConditions ?? null,
  participantFilingRequirements: t.participantFilingRequirements ?? null, manualCompletionItems: t.manualCompletionItems ?? null,
  packetInstructions: t.packetInstructions ?? null, postGenerationHandoffs: t.postGenerationHandoffs ?? null,
  legalDesignLimitations: t.legalDesignLimitations ?? null, scopeRestrictions: t.scopeRestrictions ?? null }));

const packetAllText = Object.keys(ink).map(k => allText(k) || "").join(" ");
const HAYSTACK = norm(instrRaw + " " + packetAllText);
const sentences = HAYSTACK.split(/(?<=[.;:!?])\s+/);
const grab = (re, max = 8) => sentences.filter(x => re.test(x)).slice(0, max);
out.legalExcerpts = {
  filingDestination: grab(/\b(file|filing|submit|mail|send|deliver|clerk|counter|e-?file|address)\b/i, 12),
  feeAndWaiver: grab(/\b(fee|fees|cost|costs|waiv|free of charge|no charge|\$\d|inability to afford|indigen)\b/i, 12),
  service: grab(/\b(serve|served|service|prosecut|district attorney|county attorney|certificate of (mailing|service)|proof of service|notice to the state|copy to)\b/i, 12),
  selfHelpStop: grab(/\b(cannot|can not|does not|will not|lawyer|attorney|counsel|hearing|self-?help|LegalEase|we do not|stop)\b/i, 16),
};
// registry stop conditions, and whether the packet says the same thing
const stops = famTracks.flatMap(t => [].concat(t.selfHelpStopConditions || [], t.selfHelpBoundaries || []))
  .map(x => typeof x === "string" ? x : (x?.condition || x?.text || x?.boundary || JSON.stringify(x))).filter(Boolean);
const STOP_WORDS = new Set("about above after again against because before being below between both cannot could during each* every from further having however itself other should their there these those through under until where which while whose would within without participant petition record records court case cases filing filed person people rather".split(/\s+/));
const distinctive = (t) => [...new Set(norm(t).toLowerCase().replace(/[^a-z0-9. ]+/g, " ").split(" ")
  .filter(w => (w.length >= 7 || /\d/.test(w)) && !STOP_WORDS.has(w)))];
out.selfHelpStopDiff = stops.map(stopText => {
  const words = distinctive(stopText); const hay = HAYSTACK.toLowerCase();
  const present = words.filter(w => hay.includes(w)); const missing = words.filter(w => !hay.includes(w));
  return { stop: stopText.slice(0, 240), distinctiveTokens: words.length, present: present.length,
    coverage: words.length ? +(present.length / words.length).toFixed(2) : null, missing: missing.slice(0, 12) };
});
out.selfHelpStopsWeaklyCovered = out.selfHelpStopDiff.filter(d => d.coverage !== null && d.coverage < 0.5);
// a hearing the registry treats as the end of self-help must not be presented as an ordinary step
const hearingStops = stops.filter(x => /hearing/i.test(x));
out.hearingLanguage = { registryStopsMentioningHearing: hearingStops.map(x => x.slice(0, 220)),
  packetSentencesMentioningHearing: grab(/hearing/i, 14) };

// ---- reported counters (for comparison only, never as proof) ----
out.builderCounters = cc?.counters ?? null; out.builderBlankDispositions = cc?.blankDispositions ?? null;
out.queueCounters = fam.counters ?? null; out.queueState = fam.state; out.buildStatusFile = bs;
out.awBlockingFindings = aw?.blockingFindings ?? null;
out.awPerDoc = (aw?.documents || []).map(d => ({ fixture: d.fixture, valuesReportedByFinalizer: d.valuesReportedByFinalizer, addedGlyphs: d.addedGlyphsReadFromOutputBytes, flattenedWidgets: d.flattenedWidgetAppearancesReadFromOutputBytes, glyphsOutsideWriteBoxes: d.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, refusedWithInk: (d.refusedFieldsWithInk || []).length, authored: (d.documentAuthoredAppearances || []).length, writes: (d.actualWrites || []).length }));
out.instructionsBytes = instrRaw.length;
out.legalInputStatus = fam.legalInputStatus ?? null;
out.sourceStatus = fam.sourceStatus ?? null;
console.log(JSON.stringify(out, null, 1));
