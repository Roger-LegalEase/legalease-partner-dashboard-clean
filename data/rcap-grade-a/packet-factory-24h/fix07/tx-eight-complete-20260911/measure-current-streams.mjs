import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { PDFDocument, PDFDict, PDFName, PDFArray, decodePDFRawStream } from "pdf-lib";

const BASE = "334e7f4a3954a6dff64786ad326fe4a2b7185cc5";
const OUT = "data/rcap-grade-a/packet-factory-24h/fix07/tx-eight-complete-20260911";
const scope = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911/scope.json"));
const accounting = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/vf90/tx-current-stream-accounting-20260911/accounting.json"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const decode = (object) => {
  try { return Buffer.from(decodePDFRawStream(object).decode()); }
  catch { return null; }
};
const load = (bytes) => PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });

async function measurePacket(bytes, sourcePool) {
  const document = await load(bytes);
  const pages = [];
  const counts = { flattenedAppearances: 0, textAppearances: 0, blankAppearances: 0, strokeOnly: 0, exactSourceMatches: 0, unmatched: 0 };
  for (const [index, page] of document.getPages().entries()) {
    const xobjects = page.node.Resources()?.lookup(PDFName.of("XObject"));
    const allXobjectHashes = [];
    if (xobjects instanceof PDFDict) {
      for (const [name, ref] of xobjects.entries()) {
        const bytes = decode(document.context.lookup(ref));
        if (!bytes) continue;
        allXobjectHashes.push(sha256(bytes));
        if (!/^\/(FlatWidget|ExactFactOverlay)-\d+$/.test(name.toString())) continue;
        counts.flattenedAppearances++;
        const text = bytes.toString("latin1");
        const drawsText = /\bTj\b|\bTJ\b/.test(text);
        const paints = /(^|[\s\]>)])(S|s|f|F|f\*|B|B\*|b|b\*|sh)(?=[\s[<(/%]|$)/.test(text);
        if (drawsText) counts.textAppearances++;
        else if (paints) {
          counts.strokeOnly++;
          if (sourcePool.has(sha256(bytes))) counts.exactSourceMatches++;
          else counts.unmatched++;
        } else counts.blankAppearances++;
      }
    }
    let contents = page.node.Contents();
    if (!(contents instanceof PDFArray)) contents = contents ? [contents] : [];
    else contents = contents.asArray();
    const contentBytes = contents
      .map((ref) => decode(document.context.lookup(ref)))
      .filter(Boolean)
      .map((part) => part.toString("latin1").replace(/\/(FlatWidget|ExactFactOverlay)-\d+/g, "/$1-ID"));
    pages.push({
      page: index + 1,
      contentSha256: sha256(contentBytes.join("\n")),
      appearanceMultisetSha256: sha256(allXobjectHashes.sort().join("\n"))
    });
  }
  return { sha256: sha256(bytes), byteLength: bytes.length, pageCount: document.getPageCount(), pages, counts };
}

const families = [];
for (const familyId of scope.families) {
  const directory = scope.directories[familyId];
  const priorAccounting = accounting.families.find((entry) => entry.familyId === familyId);
  if (!priorAccounting) throw new Error(`missing source accounting for ${familyId}`);
  const sourcePool = new Set();
  const sources = [];
  for (const source of priorAccounting.sourceFiles) {
    const file = source.path.replace("/workspaces/legalease-partner-dashboard-clean/", `${process.cwd()}/`);
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== source.expectedSha256) throw new Error(`source changed: ${file}`);
    const document = await load(bytes);
    let appearanceStreamCount = 0;
    for (const [, object] of document.context.enumerateIndirectObjects()) {
      if (!(object?.dict instanceof PDFDict) || !object.dict.has(PDFName.of("BBox"))) continue;
      const stream = decode(object);
      if (!stream) continue;
      sourcePool.add(sha256(stream));
      appearanceStreamCount++;
    }
    sources.push({ file, sha256: sha256(bytes), byteLength: bytes.length, pageCount: document.getPageCount(), appearanceStreamCount });
  }

  const fixtures = [];
  for (const fixture of ["canonical", "boundary"]) {
    const file = `${directory}/fixtures/${fixture}.pdf`;
    const current = await measurePacket(fs.readFileSync(file), sourcePool);
    const prior = await measurePacket(execFileSync("git", ["show", `${BASE}:${file}`], { maxBuffer: 20e6 }), sourcePool);
    const changedPages = current.pages.map((page, index) => ({
      page: page.page,
      contentStreamChanged: page.contentSha256 !== prior.pages[index]?.contentSha256,
      appearanceMultisetChanged: page.appearanceMultisetSha256 !== prior.pages[index]?.appearanceMultisetSha256
    })).filter((page) => page.contentStreamChanged || page.appearanceMultisetChanged);
    fixtures.push({ fixture, file, prior: { sha256: prior.sha256, byteLength: prior.byteLength, pageCount: prior.pageCount }, current, changedPages });
  }
  families.push({ familyId, directory, sources, sourcePoolEntries: sourcePool.size, fixtures });
}

const totals = {
  sourceAppearanceStreamsExpected: families.flatMap((family) => family.fixtures).reduce((sum, fixture) => sum + fixture.current.counts.strokeOnly, 0),
  sourceAppearanceStreamsRetained: families.flatMap((family) => family.fixtures).reduce((sum, fixture) => sum + fixture.current.counts.exactSourceMatches, 0),
  unmatchedSourceAppearanceStreams: families.flatMap((family) => family.fixtures).reduce((sum, fixture) => sum + fixture.current.counts.unmatched, 0)
};
if (totals.sourceAppearanceStreamsExpected !== 546 || totals.sourceAppearanceStreamsRetained !== 546 || totals.unmatchedSourceAppearanceStreams !== 0) {
  throw new Error(`source appearance accounting changed: ${JSON.stringify(totals)}`);
}
fs.writeFileSync(`${OUT}/stream-measurements.json`, `${JSON.stringify({ schemaVersion: 1, base: BASE, totals, families }, null, 2)}\n`);
console.log(JSON.stringify(totals));
