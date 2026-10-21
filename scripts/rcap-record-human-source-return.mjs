#!/usr/bin/env node
/**
 * Record bytes a person fetched, with the same rigour as a machine fetch.
 *
 * One task in the whole source backlog needs a human: an official host that
 * refuses automated acquisition. When those bytes come back they must not enter
 * on lower evidence than an ACQ receipt just because a person carried them.
 *
 * What this establishes, and what it deliberately does not:
 *
 * It computes the SHA-256, reads the page count, form technology and field
 * count from the bytes themselves, and checks the filename against the
 * registry's expected artifact URL. It does NOT confirm the address the file
 * came from or the date it was downloaded, because only the person who opened
 * the browser can state those, and inferring them from a filename would be
 * inventing provenance -- the exact defect that made the previous source queue
 * unusable.
 *
 * So an unstated URL or date is recorded as MISSING and named in the receipt.
 * The bytes are usable evidence of what the publisher serves; the receipt says
 * exactly how much of the chain is witnessed.
 *
 * The body is written under gitignored private storage. Source bodies are never
 * committed, and this does not change that.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const input = flag("--input");
const jurisdiction = flag("--jurisdiction");
const artifactId = flag("--artifact-id");
const statedUrl = flag("--stated-url");
const statedDate = flag("--stated-download-date");
const statedRevision = flag("--stated-revision");
/*
 * "The form publishes no revision line" and "nobody told me the revision line"
 * are different facts, and collapsing them would leave a settled record looking
 * unfinished forever. The Texas statement carries no "Rev." field at all; what
 * it carries is an approval marker naming the Supreme Court docket that adopted
 * it. That is the publisher's own versioning, in the publisher's own form.
 *
 * A revision date is NEVER derived -- not from the docket number, not from the
 * PDF creation or modification date, and not from the filename. printedRevision
 * stays null when none is published, and the marker is recorded as itself.
 */
const noPrintedRevision = process.argv.includes("--no-printed-revision");
const statedApprovalMarker = flag("--stated-approval-marker");
const returnedBy = flag("--returned-by") ?? "unstated";

const refuse = (why) => { console.error(`REFUSED human source return — ${why}`); process.exit(1); };
const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
if (!input || !fs.existsSync(input)) refuse("the returned file is missing");
if (!jurisdiction || !artifactId) refuse("--jurisdiction and --artifact-id are required; bytes with no identity are not a source");

const REGISTRY = "data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json";
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY), "utf8"));
const record = (reg.records ?? []).find((r) => r.jurisdiction === jurisdiction.toUpperCase() && norm(r.canonicalArtifactId) === norm(artifactId));
if (!record) refuse(`${jurisdiction} / ${artifactId} is not in the source relationship registry`);
/*
 * The guard exists so a person's bytes cannot override a classification saying
 * nobody needed to fetch anything. It must not also block improving a return
 * already made: recording the Texas file moved its record out of
 * PUBLIC_DOWNLOAD_BOT_BLOCKED, so supplying the URL and date afterwards --
 * exactly what the task asked for -- came back refused. A guard that blocks the
 * completion of the thing it was guarding is measuring the wrong state.
 */
const RECEIPTS = "data/rcap-grade-a/source-verification/human-source-returns";
const priorReceiptPath = path.join(ROOT, RECEIPTS, `${jurisdiction.toUpperCase()}__${norm(artifactId).slice(0, 48)}.receipt.json`);
const isUpdate = fs.existsSync(priorReceiptPath);
if (record.sourceState !== "PUBLIC_DOWNLOAD_BOT_BLOCKED" && !isUpdate) {
  refuse(`${artifactId} is ${record.sourceState}, which is not a human task. A person's bytes do not override a classification that says nobody needed to fetch anything.`);
}
if (isUpdate) console.log(`(updating the existing return for this artifact)`);

const bytes = fs.readFileSync(input);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const text = bytes.toString("latin1");
const looksLikePdf = bytes.subarray(0, 5).toString("latin1") === "%PDF-";
if (!looksLikePdf) refuse("the returned file is not a PDF; an HTML error page saved from a browser is the case this catches");
const observedPageCount = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
const structuralClass = /\/XFA[\s/[]/.test(text) ? "xfa" : /\/AcroForm\b/.test(text) ? "acroform" : "flat_pdf";

// Field count, read with the library the builders use rather than by regex.
let fieldCount = null;
try {
  const probe = execFileSync(process.execPath, ["--input-type=module", "-e",
    'import{PDFDocument} from "pdf-lib";import fs from "node:fs";'
    + `const d=await PDFDocument.load(fs.readFileSync(${JSON.stringify(path.resolve(input))}),{ignoreEncryption:true});`
    + "process.stdout.write(String(d.getForm().getFields().length));"], { cwd: ROOT, encoding: "utf8" });
  fieldCount = Number(probe.trim()) || null;
} catch { /* the receipt records that it could not be read */ }

/*
 * Filename against the expected address. This is corroboration, not proof: a
 * matching basename says the file is very likely the one the registry names,
 * and it does not witness where the bytes came from.
 */
const expectedBase = record.officialArtifactUrl ? decodeURIComponent(record.officialArtifactUrl.split("/").pop() ?? "") : null;
const returnedBase = path.basename(input);
const filenameMatchesExpected = Boolean(expectedBase) && norm(returnedBase).includes(norm(expectedBase).replace(/PDF$/, ""));

const OUT_DIR = path.join(ROOT, "private/human-source-returns", jurisdiction.toUpperCase());
fs.mkdirSync(OUT_DIR, { recursive: true });
const slug = `${jurisdiction.toUpperCase()}__${norm(artifactId).slice(0, 48)}`;
fs.writeFileSync(path.join(OUT_DIR, `${slug}.pdf`), bytes);

const missing = [];
if (!statedUrl) missing.push("the exact address-bar URL the file was downloaded from");
if (!statedDate) missing.push("the download date");
if (!statedRevision && !noPrintedRevision) missing.push("the form's own printed revision line, or confirmation that it publishes none");

const receipt = {
  schemaVersion: "rcap-human-source-return/v1",
  jurisdiction: jurisdiction.toUpperCase(),
  canonicalArtifactId: record.canonicalArtifactId,
  returnedBy,
  outcome: missing.length === 0 ? "returned_with_full_provenance" : "returned_bytes_provenance_incomplete",
  // Measured from the bytes.
  sha256, observedByteLength: bytes.length, looksLikePdf,
  observedPageCount, observedStructuralClass: structuralClass, observedFieldCount: fieldCount,
  storedAt: path.relative(ROOT, path.join(OUT_DIR, `${slug}.pdf`)),
  bodyCommitted: false,
  // Corroboration, distinguished from proof.
  expectedArtifactUrl: record.officialArtifactUrl,
  expectedSourcePage: record.officialSourcePage,
  returnedFilename: returnedBase,
  filenameMatchesExpectedUrl: filenameMatchesExpected,
  filenameMatchIsCorroborationNotProof: "A matching basename makes it very likely this is the artifact the registry names. It does not witness where the bytes came from.",
  // Witnessed only by the person who opened the browser.
  statedUrl: statedUrl ?? null,
  statedDownloadDate: statedDate ?? null,
  printedRevision: statedRevision ?? null,
  printedRevisionAbsentOnTheForm: noPrintedRevision && !statedRevision,
  printedApprovalMarker: statedApprovalMarker ?? null,
  revisionDateNeverDerived: "Not from the approval docket number, the PDF creation date, the PDF modification date or the filename. A version inferred from any of those would be a fact about our guess, not about the form.",
  provenanceNotSupplied: missing,
  /*
   * Currentness, decided on what the evidence actually shows. The official host
   * served exactly these bytes at exactly this address on the stated date --
   * that is what "current" means for a published form, and it does not require
   * the publisher to print a field labelled "Revision".
   */
  currentnessEstablished: Boolean(statedUrl && statedDate) && missing.length === 0,
  currentnessBasis: statedUrl && statedDate
    ? `the official host served these exact bytes (sha ${sha256.slice(0, 12)}) at ${statedUrl} on ${statedDate}`
    : "not established: the address and date the bytes were taken from are not witnessed",
  whyThatMatters: missing.length
    ? "The bytes are evidence of what the publisher serves. Without the stated address and date, nothing here witnesses WHEN or from WHERE they were taken, so this cannot yet establish currentness. Inferring those from the filename would be inventing provenance."
    : "The chain is witnessed end to end.",
  whatThisDoesNotDo: "It promotes nothing, builds no packet, releases no family and opens no commercial route. PROMO verifies and creates custody; Captain releases.",
  commercialRoutesOpened: 0,
  productionTouched: false
};

fs.mkdirSync(path.join(ROOT, RECEIPTS), { recursive: true });
fs.writeFileSync(path.join(ROOT, RECEIPTS, `${slug}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`);

console.log(`${receipt.outcome.toUpperCase()} ${jurisdiction.toUpperCase()} ${record.canonicalArtifactId}`);
console.log(`  sha256 ${sha256}`);
console.log(`  ${bytes.length} bytes · ${observedPageCount} page(s) · ${structuralClass} · ${fieldCount ?? "?"} field(s)`);
console.log(`  filename matches the expected artifact URL: ${filenameMatchesExpected}`);
console.log(`  body stored (gitignored): ${receipt.storedAt}`);
console.log(`  receipt: ${RECEIPTS}/${slug}.receipt.json`);
if (missing.length) { console.log(`  NOT WITNESSED: ${missing.join("; ")}`); }
console.log(`  unlocks (pending PROMO): ${record.uniqueFamilyCount} famil(ies)`);
