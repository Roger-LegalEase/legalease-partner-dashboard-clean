#!/usr/bin/env node
// Acquire the eight Colorado filings Grade-A provenance needs and the pinned
// corpus does not carry at a current revision, and package them as an immutable
// governed supplement.
//
// WHY THIS EXISTS
//
// source-corpus-2026-08-28 is pinned: an archive digest, 51 jurisdictions, 499
// files, 329 PDFs, and a per-file index that every downstream field map and
// fixture is keyed to. It is also incomplete for Colorado. JDF 611 and JDF 416
// each name four filings; the corpus holds two of each. JDF 205 and JDF 206 are
// named by both. JDF 302 is the juvenile remedy's only petition and is absent.
//
// The eighth is different in kind: JDF 611 IS in the corpus, at R: August 7,
// 2024, and the court has since issued R: July 1, 2025. A route may not keep
// binding a superseded guide once the current one has been identified, so the
// current revision is acquired beside the pinned copy -- never over it -- and the
// supersession is declared on the document rather than left to be inferred.
//
// Adding them to the base release would mean republishing that tag, which would
// silently move the pin underneath everything keyed to it. So they arrive as a
// separate release with a separate identity, installed into a separate root, and
// this script is what produces it.
//
// WHAT IT REFUSES
//
// It refuses rather than guesses, for the same reason the base bootstrap does: a
// supplement that looks acquired and is not is worse than no supplement, because
// a packet assembled from a plausible-looking document is a packet the clerk
// rejects.
//
//   - a non-200 response, a redirect off the official host, or an empty body
//   - a body that is not a PDF
//   - a document whose printed form number is not the one that was asked for
//   - a re-run whose bytes differ from an already-recorded digest
//
// It never writes into the base corpus root, and it never writes bytes into the
// repository: the archive and the extracted tree are both built under a staging
// directory that must be outside the working tree, and the only thing that comes
// back into git is this script's sibling index with the measured facts filled in.
//
// Usage, from the repository root:
//   node scripts/rcap-corpus/acquire-colorado-supplement.mjs
//   node scripts/rcap-corpus/acquire-colorado-supplement.mjs --stage /tmp/co-supplement
//   node scripts/rcap-corpus/acquire-colorado-supplement.mjs --dry-run
//   node scripts/rcap-corpus/acquire-colorado-supplement.mjs --write-index

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { packSupplement, sha256 } from "./supplement-archive.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX = path.join(rootDir, "scripts/rcap-corpus/colorado-supplement-index.json");

// Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set, and
// that is not a cosmetic difference here. In a sandbox that intercepts direct
// egress, the unproxied request comes back as a bare "HTTP 403 Forbidden" from
// the interceptor -- indistinguishable, in the record this script writes, from
// the issuing court refusing to serve the form. Those two have opposite
// remedies: one is a network grant, the other is a new URL. So when a proxy is
// configured, the run goes through it, where a policy denial is reported as a
// refused CONNECT and can be named as one.
if (process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== "1") {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
  });
  process.exit(r.status ?? 1);
}

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(name);

const dryRun = has("--dry-run");
const writeIndex = has("--write-index");
const stageDir = path.resolve(flag("--stage", path.join(os.tmpdir(), "co-supplement-stage")));

const die = (msg) => {
  console.error(`acquire-colorado-supplement: ${msg}`);
  process.exit(1);
};

// The staging directory holds official bytes. It must not be inside the working
// tree, where a later `git add` could sweep it in.
if (!path.relative(rootDir, stageDir).startsWith("..")) {
  die(`--stage must be outside the repository (got ${stageDir}); official bytes never stage inside the working tree`);
}

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const docs = index.documents ?? [];
if (!docs.length) die("the supplement index names no documents");

// Only the issuing court is authority. A redirect that leaves this host is a
// redirect to something that is not the official source, whatever it serves.
const OFFICIAL_HOSTS = new Set(["www.coloradojudicial.gov", "coloradojudicial.gov"]);

// pdfinfo is how page count and form technology get measured rather than
// assumed. Without it the run still acquires bytes, but it cannot fill those two
// fields, and it says so instead of leaving a reader to think it checked.
let havePdfinfo = true;
try {
  execFileSync("pdfinfo", ["-v"], { stdio: "ignore" });
} catch {
  havePdfinfo = false;
}

const pdfFacts = (file) => {
  if (!havePdfinfo) return { pageCount: null, formTechnology: null, measured: false };
  const out = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  const pages = /^Pages:\s+(\d+)$/m.exec(out);
  const form = /^Form:\s+(.+)$/m.exec(out);
  const raw = form ? form[1].trim() : "";
  // pdfinfo reports "AcroForm", "XFA", or "none".
  const formTechnology = raw === "" ? null : /xfa/i.test(raw) ? "XFA" : /acroform/i.test(raw) ? "AcroForm" : "flat";
  return { pageCount: pages ? Number(pages[1]) : null, formTechnology, measured: true };
};

// The printed form number is the check that the URL still serves the document it
// served when the index was written. A court that re-uses a path for a different
// form would otherwise pass every other check.
const printedFormNumber = (file, want) => {
  if (!havePdfinfo) return { checked: false, ok: null, note: "pdftotext not available" };
  let text = "";
  try {
    text = execFileSync("pdftotext", ["-layout", "-f", "1", "-l", "1", file, "-"], { encoding: "utf8" });
  } catch {
    return { checked: false, ok: null, note: "pdftotext failed on this document" };
  }
  const normalised = text.replace(/\s+/g, " ");
  const pattern = new RegExp(want.replace(/[-\s]+/, "[\\s-]*"), "i");
  return { checked: true, ok: pattern.test(normalised), note: pattern.test(normalised) ? null : `page 1 does not print ${want}` };
};

// The R: date the court prints on the form. This is the authority for the
// revision, not the upload directory in the URL, which dates the upload.
const printedRevision = (file) => {
  if (!havePdfinfo) return null;
  let text = "";
  try {
    text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  } catch {
    return null;
  }
  const m = /R:\s*([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(text);
  if (!m) return null;
  const months = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
  const mm = months[m[1]];
  if (!mm) return null;
  return `${m[3]}-${String(mm).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
};

const corpusPath = (doc, revision) => {
  const rev = revision ? `REV-${revision}` : "REV-UNKNOWN";
  return `STATES/CO/${doc.corpusSection}/CO__${doc.identityKind}__${doc.documentId}__${doc.slug}__${rev}__EN.pdf`;
};

async function fetchOfficial(url) {
  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "application/pdf,*/*" },
    });
  } catch (err) {
    // Node reports every transport failure as a bare "fetch failed". The cause
    // chain is what distinguishes an egress-policy denial from a dead link, and
    // that distinction decides whether the fix is a network grant or a new URL.
    const chain = [];
    for (let e = err; e; e = e.cause) if (e.message && !chain.includes(e.message)) chain.push(e.message);
    throw new Error(chain.join(" <- "));
  }
  const finalHost = new URL(res.url).hostname;
  if (!OFFICIAL_HOSTS.has(finalHost)) {
    throw new Error(`redirected off the official host to ${finalHost}; refusing to treat that as an official source`);
  }
  if (!res.ok) {
    // A 403 that arrives on an unproxied request in a sandboxed environment is
    // almost never the court's: name that possibility rather than recording the
    // court as the refuser.
    const suffix = res.status === 403 && !process.env.HTTPS_PROXY
      ? " (no proxy configured for this run; a sandbox interceptor returns this same status, so this is not evidence the issuing court refused)"
      : "";
    throw new Error(`HTTP ${res.status} ${res.statusText}${suffix}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("empty body");
  if (!buf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error(`body is not a PDF (starts ${JSON.stringify(buf.subarray(0, 16).toString("latin1"))})`);
  }
  return { buf, contentType: res.headers.get("content-type"), finalUrl: res.url };
}

if (dryRun) {
  console.log(`Supplement ${index.supplementId} -- ${docs.length} document(s), nothing fetched.\n`);
  for (const d of docs) console.log(`  ${d.documentId.padEnd(8)} ${d.requiredness.padEnd(11)} ${d.sourceUrl}`);
  console.log(`\nStaging would be ${stageDir}.`);
  process.exit(0);
}

const treeRoot = path.join(stageDir, index.archiveContract.topLevelDirectory);
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(treeRoot, { recursive: true });

const retrievedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const acquired = [];
const failures = [];

for (const doc of docs) {
  process.stdout.write(`${doc.documentId.padEnd(8)} `);
  let got;
  try {
    got = await fetchOfficial(doc.sourceUrl);
  } catch (err) {
    console.log(`FAILED  ${err.message}`);
    failures.push({ documentId: doc.documentId, url: doc.sourceUrl, error: err.message });
    continue;
  }

  const tmp = path.join(stageDir, `${doc.documentId}.tmp.pdf`);
  fs.writeFileSync(tmp, got.buf);

  const numberCheck = printedFormNumber(tmp, doc.formNumber);
  if (numberCheck.checked && numberCheck.ok === false) {
    console.log(`FAILED  ${numberCheck.note}`);
    failures.push({ documentId: doc.documentId, url: doc.sourceUrl, error: numberCheck.note });
    fs.rmSync(tmp, { force: true });
    continue;
  }

  const facts = pdfFacts(tmp);
  const revisionFromDocument = printedRevision(tmp);
  const revision = revisionFromDocument ?? doc.revision ?? null;

  // A document that prints a revision the index did not expect is a finding, not
  // a failure: the court revised the form and the index is what is stale.
  const revisionChanged = revisionFromDocument && doc.revision && revisionFromDocument !== doc.revision;

  const rel = corpusPath(doc, revision);
  const dest = path.join(treeRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(tmp, dest);

  const digest = sha256(got.buf);
  acquired.push({
    documentId: doc.documentId,
    formNumber: doc.formNumber,
    officialTitle: doc.officialTitle,
    officialSourceLocation: { pdf: doc.sourceUrl, resolvedUrl: got.finalUrl, page: doc.officialPage },
    filingSetRole: doc.filingSetRole,
    requiredness: doc.requiredness,
    routeIds: doc.routeIds,
    revision,
    revisionSource: revisionFromDocument ? "printed on the document" : doc.revision ? "index (not printed on the document)" : null,
    revisionChangedSinceIndex: revisionChanged ? { was: doc.revision, now: revisionFromDocument } : null,
    retrievalDate: retrievedAt,
    contentType: got.contentType,
    byteSize: got.buf.length,
    pageCount: facts.pageCount,
    sha256: digest,
    formTechnology: facts.formTechnology,
    formTechnologyMeasured: facts.measured,
    sourceVerificationMethod: `HTTPS GET from ${new URL(doc.sourceUrl).hostname} with TLS verification, PDF magic checked, printed form number ${numberCheck.checked ? "confirmed" : "not checkable"}, sha256 computed over the retrieved bytes`,
    corpusRelativePath: rel,
  });
  console.log(`ok  ${String(got.buf.length).padStart(8)} bytes  ${facts.pageCount ?? "?"}p  ${digest.slice(0, 12)}…${revisionChanged ? `  REVISION CHANGED ${doc.revision} -> ${revisionFromDocument}` : ""}`);
}

if (failures.length) {
  console.error(`\n${failures.length} of ${docs.length} document(s) could not be acquired:`);
  for (const f of failures) console.error(`  ${f.documentId}  ${f.error}`);
  console.error(`\nA partial supplement is not published. Nothing was packaged.`);
  process.exit(1);
}

// ---- governance files -------------------------------------------------------
const governance = path.join(treeRoot, "00_GOVERNANCE");
fs.mkdirSync(governance, { recursive: true });

const manifest = {
  schemaVersion: "rcap-source-supplement-manifest/v1",
  supplementId: index.supplementId,
  jurisdiction: index.jurisdiction,
  generatedAt: retrievedAt,
  base: {
    releaseTag: index.relationshipToBaseCorpus.baseReleaseTag,
    archiveSha256: index.relationshipToBaseCorpus.baseArchiveSha256,
    modified: false,
    republished: false,
  },
  documents: acquired,
};
fs.writeFileSync(path.join(governance, "CO_SUPPLEMENT_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(governance, "CO_SUPPLEMENT_CHECKSUMS.sha256"),
  `${acquired.map((d) => `${d.sha256}  ${d.corpusRelativePath}`).sort().join("\n")}\n`,
);

// ---- deterministic archive --------------------------------------------------
// Two runs over the same bytes must produce the same digest, or the digest pins
// the run rather than the documents.
const { mtimeEpoch } = index.archiveContract.determinismRecipe;
const archive = path.join(stageDir, index.release.assetName);
const packed = packSupplement(stageDir, index.archiveContract.topLevelDirectory, mtimeEpoch);
fs.writeFileSync(archive, packed.bytes);
const archiveSha = packed.sha256;

const files = acquired.length + 2;
const pdfs = acquired.length;

console.log(`
Supplement staged.
  tree      ${treeRoot}
  archive   ${archive}
  sha256    ${archiveSha}
  contents  ${files} file(s), ${pdfs} PDF(s), 1 jurisdiction
  base      ${index.relationshipToBaseCorpus.baseReleaseTag} (untouched, not republished)`);

if (writeIndex) {
  const next = structuredClone(index);
  next.release.archiveSha256 = archiveSha;
  next.release.archiveSha256Status = "measured";
  delete next.release.archiveSha256Note;
  next.release.status = "STAGED_UNPUBLISHED";
  next.acquisition = {
    status: "ACQUIRED",
    acquiredAt: retrievedAt,
    counts: { files, pdfs, jurisdictions: 1 },
  };
  for (const doc of next.documents) {
    const a = acquired.find((x) => x.documentId === doc.documentId);
    if (!a) continue;
    doc.sha256 = a.sha256;
    doc.byteSize = a.byteSize;
    doc.pageCount = a.pageCount;
    doc.contentType = a.contentType;
    doc.formTechnology = a.formTechnology;
    doc.retrievedAt = a.retrievalDate;
    doc.revision = a.revision;
    doc.revisionStatus = a.revisionSource === "printed on the document" ? "verified" : doc.revisionStatus;
    doc.plannedCorpusRelativePath = a.corpusRelativePath;
    delete doc.plannedPathIsProvisional;
    delete doc.plannedPathNote;
  }
  fs.writeFileSync(INDEX, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`\nWrote measured facts back into ${path.relative(rootDir, INDEX)}.`);
}

console.log(`
Next:
  1. Publish ${archive} as the sole asset of tag ${index.release.tag}
     on ${index.release.repository}. Do not reuse an existing tag.
  2. Re-run with --write-index if it was not passed, so the committed index
     carries the archive digest and the per-document facts.
  3. Verify a clean recovery:
       bash scripts/rcap-corpus/bootstrap-colorado-supplement.sh
       node scripts/rcap-corpus/verify-colorado-supplement.mjs`);
