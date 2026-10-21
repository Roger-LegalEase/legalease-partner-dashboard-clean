#!/usr/bin/env node
/*
 * VF67's second, bounded read.  This file deliberately does not invoke a
 * builder or consume actual-writes/completeness reports.  It reads the source
 * AcroForm widgets and the saved packet's own FlatWidget XObjects/content
 * streams, then joins them by the rendered page manifest only for page order.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { PDFDocument, PDFArray, PDFName, rgb } = require("pdf-lib");

// evidence/ -> vf67/ -> packet-factory-24h/ -> rcap-grade-a/ -> data/ -> checkout
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../");
const FAMILIES = ["ks-21-6614-diversion-set", "ks-21-6614-prostitution-coercion-set"];
const OUT = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/vf67/evidence/measurement-completion-vf67-20260910.json");
const TOL = 2;
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const read = p => fs.readFileSync(path.join(ROOT, p));
const inflate = b => { try { return zlib.inflateSync(b); } catch { return b; } };
const norm = s => String(s ?? "").replace(/\s+/g, " ").trim();
const num = x => Number(x);
function contents(doc, page) {
  const ctx = doc.context;
  const c = page.node.get(PDFName.of("Contents"));
  const refs = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
  return refs.map(r => inflate(Buffer.from(ctx.lookup(r).contents)).toString("latin1")).join("\n");
}
function literalText(s) {
  let out = "";
  for (const m of s.match(/\((?:[^()\\]|\\.)*\)/g) ?? []) out += m.slice(1, -1);
  for (const m of s.match(/<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
    const h = m.slice(1, -1).replace(/\s+/g, "");
    if (h.length % 2 === 0) out += Buffer.from(h, "hex").toString("latin1");
  }
  return norm(out);
}
async function rawAppearances(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context, found = [], pageStreams = [];
  doc.getPages().forEach((page, pi) => {
    const stream = contents(doc, page); pageStreams.push(stream);
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) return;
    const dict = ctx.lookup(xObjects);
    // Finalizer placements are exactly q [cm ...] /FlatWidget-N Do Q.
    const re = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(FlatWidget|ExactFactOverlay)-(\d+)\s+Do\s*Q/g;
    let m;
    while ((m = re.exec(stream))) {
      let x = 0, y = 0;
      for (const cm of m[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) { x += num(cm[5]); y += num(cm[6]); }
      const name = `${m[2]}-${m[3]}`, ref = dict.get(PDFName.of(name));
      if (!ref) continue;
      const obj = ctx.lookup(ref), bbox = obj.dict.get(PDFName.of("BBox"));
      const bb = bbox?.asArray?.().map(v => Number(v.numberValue ?? v.asNumber?.() ?? 0)) ?? [0, 0, 0, 0];
      const body = inflate(Buffer.from(obj.contents)).toString("latin1");
      // Empty text appearances are emitted as `/Tx BMC EMC`; they are not
      // ink. Vector selections use a painting operator (`s`), while populated
      // text has a non-whitespace literal/hex string.
      const text = literalText(body);
      const hasInk = text.length > 0 || /\b(?:S|s|f|f\*|B|b)\b/.test(body);
      found.push({ page: pi + 1, x: +x.toFixed(4), y: +y.toFixed(4), name, text, nonempty: hasInk, bbox: bb, stream: body });
    }
  });
  return { found, pageStreams, pageCount: doc.getPageCount() };
}
async function sourceWidgets(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const out = [];
  for (const f of doc.getForm().getFields()) for (const [wi, w] of f.acroField.getWidgets().entries()) {
    const r = w.getRectangle();
    const p = w.getPage?.() ?? w.dict.get(PDFName.of("P"));
    let page = null;
    if (p) { const target = doc.context.lookup(p); page = doc.getPages().findIndex(x => x.node === target) + 1 || null; }
    // The page association is stable in these files; fall back to widget /P
    // object identity through the field's parent page when pdf-lib omits it.
    if (!page) page = Number(w.dict.get(PDFName.of("P"))?.objectNumber ?? 0) || null;
    let sourceAppearance = "";
    const ap = w.dict.get(PDFName.of("AP"));
    if (ap) {
      const apDict = doc.context.lookup(ap), n = apDict?.get?.(PDFName.of("N"));
      const stream = n && doc.context.lookup(n);
      if (stream?.contents) sourceAppearance = inflate(Buffer.from(stream.contents)).toString("latin1");
    }
    out.push({ field: f.getName(), widgetIndex: wi, page, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, sourceAppearance });
  }
  return { fields: out, pageCount: doc.getPageCount() };
}
function near(a, b) { return a.page === b.page && Math.abs(a.x - b.rect.x) <= TOL && Math.abs(a.y - b.rect.y) <= TOL; }
function rectEqual(a, b) { return Math.abs(a.x-b.x)<=.01 && Math.abs(a.y-b.y)<=.01 && Math.abs(a.width-b.width)<=.01 && Math.abs(a.height-b.height)<=.01; }
function expectedFor(write, facts) { return write.factId ? facts[write.factId] : null; }

async function measureFamily(familyId) {
  const d = `data/rcap-all50/overlays/census-v1/ks/${familyId}--official-pdf-fill`;
  const map = JSON.parse(read(`${d}/production-field-map.json`));
  const receipt = JSON.parse(read(`${d}/source-receipt.json`));
  const facts = JSON.parse(read(`${d}/fixtures/participant-facts.json`));
  const rendered = JSON.parse(read(`${d}/reports/rendered-artifacts.json`));
  const sourceById = new Map();
  const sourceEvidence = [];
  for (const src of receipt.documents) {
    const p = path.join(src.custodyRoot, src.pathInCustody);
    const bytes = read(p); sourceById.set(src.documentId, { src, path: p, bytes });
    sourceEvidence.push({ documentId: src.documentId, path: p, sha256: sha(bytes), byteLength: bytes.length, receiptSha256: src.sha256, matchesReceipt: sha(bytes) === src.sha256 });
  }
  const mapsByComponent = new Map(map.maps.map(m => [m.componentId, m]));
  const results = { familyId, sourceEvidence, fixtures: {}, componentCount: map.componentSet.length };
  for (const fixture of ["canonical", "boundary"]) {
    const packetPath = `${d}/fixtures/${fixture}.pdf`, packetBytes = read(packetPath);
    const packet = await rawAppearances(packetPath);
    const manifest = rendered.pageManifests[fixture];
    const sourceChecks = [], writes = [], protectedInk = [], geometry = [];
    const allOfficialPackets = new Set();
    const allSourcePages = new Map();
    // Build source geometry from the actual source binaries, and require every
    // field-map rectangle to equal the source widget it claims to measure.
    for (const mm of map.maps) {
      const actual = sourceById.get(mm.documentId); if (!actual) throw new Error(`missing source ${mm.documentId}`);
      const sw = await sourceWidgets(actual.path); allSourcePages.set(mm.componentId, sw);
      const pageMap = new Map(manifest.filter(x => x.component === mm.componentId).map(x => [x.sourcePage, x.packetPage]));
      const fixtureWrites = fixture === "canonical" ? mm.canonicalWrites : mm.boundaryWrites;
      for (const w of fixtureWrites) {
        const ws = w.widgets ?? [];
        const sourceMatches = sw.fields.filter(x => x.field === w.fieldName && ws.some(q => x.widgetIndex === q.widgetIndex && x.page === q.page && rectEqual(x.rect, q.rect)));
        if (sourceMatches.length !== ws.length) sourceChecks.push({ type: "field_geometry_mismatch", component: mm.componentId, field: w.field, fieldName: w.fieldName, expectedWidgets: ws, sourceMatches });
        const packetPage = pageMap.get(w.page); if (!packetPage) sourceChecks.push({ type: "page_manifest_mismatch", component: mm.componentId, sourcePage: w.page });
        for (const q of ws) { allOfficialPackets.add(`${packetPage}:${q.rect.x}:${q.rect.y}`); }
        const target = ws[0];
        const hits = packet.found.filter(a => near(a, { page: packetPage, rect: target.rect }));
        const expected = expectedFor(w, facts.fixtures[fixture]);
        const selected = w.decision === "select";
        const positive = hits.filter(a => a.nonempty);
        // Only literal/hex text decoded from a saved appearance is usable in
        // this bounded correction. A nonempty vector hit is not proof that a
        // route checkbox was correctly marked, so selection controls remain
        // explicitly uncovered.
        const textOk = !selected && positive.length >= 1 && norm(positive[0].text) === norm(expected);
        writes.push({ component: mm.componentId, documentId: mm.documentId, field: w.field, fieldName: w.fieldName, factId: w.factId ?? null, sourcePage: w.page, packetPage, rect: target.rect, expected, selected, hits: hits.map(a => ({ name: a.name, text: a.text, nonempty: a.nonempty, bbox: a.bbox })), pass: textOk, directTextDecoded: textOk });
      }
      // Every source page's entire decompressed stream must survive in the
      // assembled page stream. This is a byte-level source-ink retention test.
      for (let sp = 1; sp <= sw.pageCount; sp++) {
        const pm = manifest.find(x => x.component === mm.componentId && x.sourcePage === sp);
        const srcDoc = await PDFDocument.load(actual.bytes, { ignoreEncryption: true, updateMetadata: false });
        const ss = contents(srcDoc, srcDoc.getPages()[sp - 1]).replace(/\s+/g, "");
        const os = packet.pageStreams[pm.packetPage - 1].replace(/\s+/g, "");
        sourceChecks.push({ type: "source_stream_sequence_observed", component: mm.componentId, documentId: mm.documentId, sourcePage: sp, packetPage: pm.packetPage, sourceStreamSha256: sha(Buffer.from(ss)), sourceStreamLength: ss.length, normalizedSequenceFound: os.includes(ss), sourceInkLoss: null, limitation: "sequence presence does not detect occlusion or arbitrary page additions" });
      }
      // Refused/selection fields are checked against every actual output
      // FlatWidget at their own measured source rectangle. No report count is
      // used. A nonempty unclaimed appearance is a protected write.
      const refused = [...mm.canonicalRefusals, ...(fixture === "boundary" ? mm.boundaryRefusals : [])];
      for (const w of refused) for (const q of w.widgets ?? []) {
        const packetPage = pageMap.get(q.page), hits = packet.found.filter(a => near(a, { page: packetPage, rect: q.rect }) && a.nonempty);
        const sourceInkEquivalent = hits.length > 0 && q.sourceAppearance && hits.every(a => norm(a.stream) === norm(q.sourceAppearance));
        // A refused text widget may carry the official form's empty border
        // appearance. It is source scaffold, not a platform value. Only a
        // populated text or a selected control is protected ink here.
        const valueHits = hits.filter(a => a.text.length > 0);
        if (valueHits.length && !sourceInkEquivalent) protectedInk.push({ component: mm.componentId, field: w.field, page: packetPage, rect: q.rect, hits: valueHits.map(a => ({ name:a.name,text:a.text,streamSha256:sha(Buffer.from(a.stream)) })) });
      }
      for (const q of sw.fields) {
        const packetPage = pageMap.get(q.page); if (!packetPage) continue;
        const covered = [...mm.canonicalWrites, ...(fixture === "boundary" ? mm.boundaryWrites : [])].some(w => w.fieldName === q.field && (w.widgets ?? []).some(z => z.widgetIndex === q.widgetIndex && z.page === q.page && rectEqual(z.rect,q.rect)));
        const hits = packet.found.filter(a => near(a, {page:packetPage,rect:q.rect}) && a.nonempty);
        const sourceInkEquivalent = hits.length > 0 && q.sourceAppearance && hits.every(a => norm(a.stream) === norm(q.sourceAppearance));
        const valueHits = hits.filter(a => a.text.length > 0);
        if (!covered && valueHits.length && !sourceInkEquivalent) protectedInk.push({ component:mm.componentId, field:q.field, page:packetPage, rect:q.rect, hits:valueHits.map(a=>({name:a.name,text:a.text})) });
      }
    }
    // Placement extent, source-ink retention and write-to-write intersections
    // are computed from saved output bytes and source rectangles.
    for (const w of writes.filter(x => x.pass && !x.selected)) for (const h of w.hits.filter(x=>x.nonempty)) {
      const bb = h.bbox; const x = w.rect.x, y = w.rect.y;
      geometry.push({ component:w.component, field:w.field, page:w.packetPage, rect:w.rect, appearanceBBox:[x+bb[0],y+bb[1],bb[2]-bb[0],bb[3]-bb[1]], within: x+bb[0] >= w.rect.x-.5 && y+bb[1] >= w.rect.y-.5 && x+bb[2] <= w.rect.x+w.rect.width+.5 && y+bb[3] <= w.rect.y+w.rect.height+.5 });
    }
    const populated = writes.filter(w=>w.pass).map(w=>({...w, x:w.rect.x,y:w.rect.y,width:w.rect.width,height:w.rect.height}));
    const overlaps=[]; for(let i=0;i<populated.length;i++)for(let j=i+1;j<populated.length;j++){const a=populated[i],b=populated[j];if(a.packetPage!==b.packetPage)continue;const ix=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),iy=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));if(ix*iy>0.25)overlaps.push({a:a.field,b:b.field,page:a.packetPage,area:+(ix*iy).toFixed(3)});}
    results.fixtures[fixture] = { packet:{path:packetPath,sha256:sha(packetBytes),byteLength:packetBytes.length,pageCount:packet.pageCount}, writes, sourceChecks, protectedInk: null, geometry: null, overlaps: null, counters:{knownPrefillsTextChecked:writes.filter(w=>!w.selected).length, knownPrefillsTextPass:writes.filter(w=>w.pass).length, selectionControlsUnmeasured:writes.filter(w=>w.selected).length, sourceWidgetsChecked:[...allSourcePages.values()].reduce((n,s)=>n+s.fields.length,0), protectedWrites:null, geometryChecked:null, geometryOutside:null, overlaps:null, sourcePagesChecked:sourceChecks.filter(x=>x.type==="source_stream_sequence_observed").length, sourcePagesRetained:null}, pageScope:[...new Set(manifest.map(x=>x.packetPage))].sort((a,b)=>a-b)};
  }
  return results;
}

async function qualifyInjectedVector(file, rect) {
  const tmp = `/tmp/vf67-scratch-${process.pid}.pdf`;
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  doc.getPages()[0].drawRectangle({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, borderWidth: 2, color: rgb(1, 0, 0) });
  fs.writeFileSync(tmp, await doc.save({ useObjectStreams: false }));
  const scratch = await PDFDocument.load(fs.readFileSync(tmp), { ignoreEncryption: true, updateMetadata: false });
  const stream = contents(scratch, scratch.getPages()[0]);
  const marker = new RegExp(`${rect.x}\\s+${rect.y}\\s+cm[\\s\\S]*?${rect.width}\\s+${Number(rect.height)}\\s+l`).test(stream);
  fs.unlinkSync(tmp);
  return { file, page: 1, rect, injectedAtKnownProtectedWidget: true, vectorRectangleDetected: marker, temporaryPath: tmp, temporaryDeleted: !fs.existsSync(tmp) };
}

const all = { schemaVersion:"vf67-measurement-completion/v1", lane:"VF67", verifiedAtBase:"c968d1b85840d870bbfa7579ff9948f7bb35ff5a", generatedBy: path.relative(ROOT, fileURLToPath(import.meta.url)), method:"direct source PDF AcroForm geometry + saved PDF decompressed page streams and FlatWidget XObjects; no builder/report counts", settings:{placementTolerancePoints:TOL, sourceStreamWhitespaceNormalization:"remove all PDF whitespace for retention comparison", raster:"none; central raster remains pending"}, families:[] };
for (const f of FAMILIES) all.families.push(await measureFamily(f));
all.qualifier = { type:"known_injected_scratch_vector_defect", status:"NOT_MEASURABLE_HERE", method:"Prior scratch helper only regex-matched injected operands and did not run measureFamily; it is not evidence for protected ink or clipping.", result:null };
fs.mkdirSync(path.dirname(OUT), { recursive:true }); fs.writeFileSync(OUT, JSON.stringify(all,null,2)+"\n");
console.log(JSON.stringify({output:path.relative(ROOT,OUT),families:all.families.map(f=>({familyId:f.familyId,canonical:f.fixtures.canonical.counters,boundary:f.fixtures.boundary.counters}))},null,2));
