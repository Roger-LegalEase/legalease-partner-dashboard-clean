#!/usr/bin/env node
/*
 * Two families may not deliver the same document.
 *
 * WHY THIS EXISTS. A receipt lane admitting run 34403364607 found that
 * al-felony-nonconviction-90-set and al-pardoned-felony-set render page images
 * that are byte-identical to each other, page for page. Their PDFs share a
 * 577-byte prefix, differ only in the /Title metadata string, and are otherwise
 * the same file. Both carried a clean RASTER_PASS with zero problems and nine
 * green counters, because every existing gate asks its question of ONE family
 * at a time. Nothing in the factory had ever compared two families to each
 * other, so two petitions distinguishable only by metadata no filer ever sees
 * were on their way to being admitted separately.
 *
 * WHAT IT MEASURES. The extracted text of every fixture PDF, which is what a
 * clerk and a judge actually read. Comparing raw bytes would miss this exact
 * case -- the metadata difference changes the file digest while changing
 * nothing on the page. Text extraction is the honest level: if two families'
 * documents say the same words in the same order, they are the same filing.
 *
 * WHAT IT DOES NOT DECIDE. A collision is not automatically a defect. Two
 * route variants of ONE family sharing a component is expected and is not
 * reported: this only compares across DIFFERENT familyIds. Across families it
 * still may be legitimate -- a shared statewide cover sheet, say -- so this
 * refuses and names the group rather than deleting or rewriting anything. A
 * human or a lane decides which of the two owed a different document.
 *
 * It sets no verdict, promotes nothing and admits nothing.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const WRITE = process.argv.includes("--write");
const OUT = "data/rcap-grade-a/packet-factory-24h/CLONED_FAMILY_PACKETS.json";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

/* pdftotext -layout keeps column structure, so two documents that differ only
 * in where a value sits do not collapse into the same reading. */
const textOf = (file) => {
  try {
    return execFileSync("pdftotext", ["-layout", "-q", file, "-"], { maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

/*
 * A BLIND SPOT THIS CHECK HAD, AND THE ONE IT WAS BUILT TO CATCH.
 *
 * VF07 found it on Oregon. Three set-aside motions share one extracted text and
 * differ only in WHICH ROUTE BOX IS TICKED -- and on that form a tick is two
 * diagonal PATH STROKES, not glyphs. pdftotext sees nothing, so three documents
 * that are three different filings read as one. On this form the route election
 * IS the filing.
 *
 * That is exactly the defect this file exists to report, arriving as a false
 * positive instead. So the identity of a delivered document is its extracted
 * text AND the marks drawn on it: the page number and rounded position of every
 * path-painting operator in the content streams. Two documents whose words match
 * but whose marks differ are two documents.
 *
 * Rounding is to 0.1pt. A tick is a deliberate mark at a deliberate place; it
 * does not wander by a tenth of a point between builds, and rounding keeps a
 * float printed as 130.50000000000001 from reading as a difference.
 */
const marksOf = (file) => {
  try {
    return execFileSync("python3", ["scripts/rcap-packet-completeness/read-page-marks.py", file],
      { maxBuffer: 256 * 1024 * 1024 }).toString("utf8");
  } catch { return null; }
};

const fixtures = [];
for (const state of fs.readdirSync(OVERLAYS)) {
  const sdir = path.join(OVERLAYS, state);
  if (!fs.statSync(sdir).isDirectory()) continue;
  for (const fam of fs.readdirSync(sdir)) {
    const fdir = path.join(sdir, fam, "fixtures");
    if (!fs.existsSync(fdir)) continue;
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".pdf")) fixtures.push({ familyDir: `${state}/${fam}`, file: p });
      }
    };
    walk(fdir);
  }
}

const byText = new Map();
let unreadable = 0;
let marksUnreadable = 0;
for (const f of fixtures) {
  const t = textOf(f.file);
  if (t === null) { unreadable += 1; continue; }
  /* Whitespace is normalised because a reflowed line break is not a different
   * filing, and an empty extraction is not evidence of anything -- a scanned
   * form carries no text layer -- so those are counted, never compared. */
  const norm = t.toString("utf8").replace(/\s+/g, " ").trim();
  if (!norm) { unreadable += 1; continue; }
  /* Words AND marks. A document whose words match another's but whose ticks are
   * in different places is a different filing, and on a route-election form the
   * tick is the whole difference. */
  const marks = marksOf(f.file);
  if (marks === null) marksUnreadable += 1;
  const key = sha(Buffer.from(`${norm}\u0000${marks ?? "MARKS_NOT_READ"}`, "utf8"));
  if (!byText.has(key)) byText.set(key, []);
  byText.get(key).push({ ...f, bytes: fs.statSync(f.file).size, fileSha256: sha(fs.readFileSync(f.file)) });
}

/*
 * TWO QUESTIONS, and only one of them is a defect.
 *
 * A single shared DOCUMENT across families is ordinary: a statewide fee-waiver
 * form or cover sheet belongs in many packets and its bytes should be the same
 * everywhere. Reporting that as a collision buries the real finding -- the
 * first pass here flagged 35 groups, almost all of them exactly that.
 *
 * The defect is a shared DELIVERABLE: two families whose whole canonical
 * fixture set reads identically. That is two petitions that are the same
 * filing, and it is what the Alabama pair turned out to be.
 */
const packetOf = new Map();
for (const [key, members] of byText) {
  for (const m of members) {
    const fixture = /boundary/i.test(path.basename(m.file)) ? "boundary" : "canonical";
    const id = `${m.familyDir}::${fixture}`;
    if (!packetOf.has(id)) packetOf.set(id, { familyDir: m.familyDir, fixture, docs: [], files: [] });
    packetOf.get(id).docs.push(key);
    packetOf.get(id).files.push({ file: m.file, bytes: m.bytes, fileSha256: m.fileSha256 });
  }
}
const byPacket = new Map();
for (const p of packetOf.values()) {
  const key = sha(Buffer.from(p.docs.slice().sort().join("|"), "utf8"));
  if (!byPacket.has(key)) byPacket.set(key, []);
  byPacket.get(key).push(p);
}
const clonedDeliverables = [];
for (const [key, members] of byPacket) {
  const families = [...new Set(members.map((m) => m.familyDir))];
  if (families.length < 2) continue;
  clonedDeliverables.push({
    packetTextSha256: key,
    fixture: members[0].fixture,
    documentCount: members[0].docs.length,
    familyCount: families.length,
    families: families.sort(),
    identicalFileBytes: new Set(members.flatMap((m) => m.files.map((f) => f.fileSha256))).size === members[0].docs.length,
    members: members.map((m) => ({ familyDir: m.familyDir, fixture: m.fixture, files: m.files }))
  });
}
clonedDeliverables.sort((a, b) => b.familyCount - a.familyCount || a.families[0].localeCompare(b.families[0]));

const sharedDocuments = [];
for (const [key, members] of byText) {
  const families = new Set(members.map((m) => m.familyDir));
  if (families.size < 2) continue;
  sharedDocuments.push({ textSha256: key, familyCount: families.size, families: [...families].sort(),
    identicalFileBytes: new Set(members.map((m) => m.fileSha256)).size === 1 });
}
sharedDocuments.sort((a, b) => b.familyCount - a.familyCount);

const doc = {
  schemaVersion: "rcap-cloned-family-packets/v1",
  question: "Do two different families deliver a document that reads identically?",
  measuredBy: "pdftotext -layout over every fixture PDF, whitespace-normalised, PLUS the page positions of every path-placing operator read from the decompressed content streams, grouped by the SHA-256 of the pair",
  whyNotRawBytes: "The case that prompted this differs only in the /Title metadata string. Raw-byte comparison reports two distinct files and misses that the pages are the same.",
  fixturesRead: fixtures.length,
  fixturesWithNoReadableText: unreadable,
  fixturesWithNoReadableMarks: marksUnreadable,
  whyMarksAreRead: "VF07 found three Oregon motions sharing one extracted text and differing only in which route box is ticked -- and a tick there is two diagonal path strokes, not glyphs. Text alone read three different filings as one, which is the exact defect this file exists to report arriving as a false positive.",
  clonedDeliverableGroups: clonedDeliverables.length,
  familiesDeliveringACloneOfAnother: [...new Set(clonedDeliverables.flatMap((g) => g.families))].sort(),
  sharedDocumentGroups: sharedDocuments.length,
  theDifference: "clonedDeliverables is the finding: two families whose WHOLE fixture set reads identically, which means two petitions that are the same filing. sharedDocuments is an observation: one document appearing in several families, which is ordinary for a statewide cover sheet or fee-waiver form and is not by itself a defect.",
  whatThisDoesNotDecide: "A clone names a question, not its answer. It says two families deliver the same document; it does not say which of them owed a different one. Nothing here is deleted, rewritten or promoted.",
  clonedDeliverables,
  sharedDocuments
};

if (WRITE) { fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`); console.log(`Wrote ${OUT}`); }
console.log(`${fixtures.length} fixture PDF(s) read · ${unreadable} with no readable text`);
console.log(`${clonedDeliverables.length} cloned deliverable group(s) · ${sharedDocuments.length} shared-document group(s)`);
for (const g of clonedDeliverables) console.log(`  CLONE  ${g.fixture}, ${g.documentCount} doc(s)${g.identicalFileBytes ? ", identical file bytes" : ""}: ${g.families.join(", ")}`);
process.exit(clonedDeliverables.length ? 1 : 0);
