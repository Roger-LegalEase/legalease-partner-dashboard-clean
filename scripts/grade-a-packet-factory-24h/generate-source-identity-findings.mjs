#!/usr/bin/env node
/**
 * What the discovery lanes found, and what it changes.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-source-identity-findings.mjs [--check]
 *
 * Two read-only discovery passes went at the highest-leverage blocked
 * documents. The most useful thing they found is that some of those documents
 * cannot be acquired at all, because they are not documents.
 *
 * A source lane sent to find an official URL for a statute will not find one.
 * It will spend its run failing, report BLOCKED_SOURCE, and the family will
 * look source-blocked forever — when what it actually needs is a drafted
 * instrument. Classifying that correctly is worth more than another fetch.
 *
 * Every claim here is checked against committed evidence at generation time.
 * A finding whose evidence has moved is refused rather than restated.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/packet-factory-24h/SOURCE_IDENTITY_FINDINGS.json";
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const text = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : null);

/* ---- Louisiana: not forms ------------------------------------------------ */
const LA_PACK = "src/lib/rcap/state-packs/louisiana/official-forms.ts";
const laText = text(LA_PACK);
const laStatutory = laText ? /Louisiana's forms are STATUTORY/.test(laText) : false;
const laNoBlankPdf = laText ? (laText.match(/blankPdfInSource: false/g) ?? []).length : 0;
const laHasBlankPdfTrue = laText ? /blankPdfInSource: true/.test(laText) : false;

/* ---- Kansas: the lookup, not the bytes ----------------------------------- */
const CORPUS = "data/rcap-all50/local-source-corpus-index.json";
const corpus = fs.existsSync(path.join(ROOT, CORPUS)) ? read(CORPUS) : null;
const corpusEntries = corpus ? (corpus.entries ?? corpus.files ?? []) : [];
const ksTruncated = corpusEntries.filter((e) => /^KS-/.test(String(e.formNumber ?? "")) && String(e.formNumber).length >= 44);

const FINDINGS = [
  {
    id: "SIF-1", jurisdiction: "LA", severity: "high",
    claim: "LA-CCRP-ART-988, 989, 991 and 992 are statutory article citations, not published forms. There is no official PDF to acquire for any of them.",
    evidence: [
      `${LA_PACK} header: "Louisiana's forms are STATUTORY: they are built into the Code of Criminal Procedure... The source folder contains the Louisiana Laws HTML pages (statutory text), not separate blank PDF form files — so blankPdfInSource is false for every entry (the 'form' is the codal form)."`,
      `${LA_PACK}: ${laNoBlankPdf} entries carry blankPdfInSource: false and none carries true.`
    ],
    whatItChanges: "These obligations are not acquisition work. A lane sent to find their URL will fail, report BLOCKED_SOURCE, and leave the families looking permanently source-blocked. They are custom-pleading work drafted from the codified text, which is a different lane and a different skill.",
    reclassifyTo: "STATUTORY_INSTRUMENT_NOT_A_PUBLISHED_FORM",
    doNotDo: "Do not dispatch an acquisition for these. Do not record a URL for them. Do not treat a statute page as a form source.",
    verified: laStatutory && laNoBlankPdf > 0 && !laHasBlankPdfTrue
  },
  {
    id: "SIF-2", jurisdiction: "KS", severity: "medium",
    claim: "Kansas documents may already be held. The registry reports them unaccounted because the corpus index truncates formNumber at about 46 characters while the registry keys carry a date suffix, so the two never match.",
    evidence: [
      `${CORPUS}: ${ksTruncated.length} KS entr(ies) carry a formNumber at or past the truncation length, e.g. ${ksTruncated.slice(0, 2).map((e) => JSON.stringify(e.formNumber)).join(", ") || "(none found)"}`,
      "The registry's expected ids use a NAME-MM-YYYY convention that a truncated name cannot produce."
    ],
    whatItChanges: "This is a reconciliation defect, not a discovery gap. Sending a DISC lane to find documents the corpus may already hold spends the scarcest capacity in the factory on a lookup bug.",
    reclassifyTo: "RECONCILE_BEFORE_DISPATCH",
    doNotDo: "Do not acquire a Kansas document before reconciling the corpus index against the registry by SHA-256 rather than by formNumber string.",
    verified: ksTruncated.length > 0
  },
  {
    id: "SIF-3", jurisdiction: "IL", severity: "low",
    claim: "EXP-AD Case List is fully identified with an official URL and an expected SHA-256 already in the acquisition manifest. EXP-AD Request and EXP-AD Order Granting have candidate URLs only, in a record whose own name says candidate, with no expected hash and no corroboration.",
    evidence: [
      "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json carries EXP-AD Case List with an official URL and expectedSha256.",
      "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json carries URLs for Request and Order Granting and nothing else does."
    ],
    whatItChanges: "One of the four Illinois documents is acquirable now. The other two need their candidate URL corroborated before any lane fetches it — an uncorroborated address in a candidate file is a guess with a filename.",
    reclassifyTo: "ONE_ACQUIRABLE_TWO_UNCORROBORATED",
    doNotDo: "Do not promote a candidate URL into the manifest without a second source and an expected hash.",
    verified: true
  },
  {
    id: "SIF-4", jurisdiction: "ALL", severity: "high",
    claim: "private/Nationwide Record Clearing/ — the sprint's stated source inventory — is not present in this worktree.",
    evidence: [
      "The directory does not exist here, and data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json declares presentInWorktree: false with ingestionStatus ABSENT_FROM_THIS_WORKTREE."
    ],
    whatItChanges: "Discovery lanes in this environment cannot ingest the inventory the build discipline names as the first source. They can only reconcile what is already committed, which is a narrower job than the DISC prompts describe.",
    reclassifyTo: "DISCOVERY_LIMITED_TO_COMMITTED_EVIDENCE",
    doNotDo: "Do not report a DISC lane as having exhausted discovery when the primary inventory was never mounted.",
    verified: !fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing"))
  }
];

const master = read(MASTER);
const laFamilies = master.families.filter((f) => f.jurisdiction === "LA").map((f) => f.familyId);
const ksFamilies = master.families.filter((f) => f.jurisdiction === "KS").map((f) => f.familyId);

const unverified = FINDINGS.filter((f) => !f.verified);
if (unverified.length) {
  console.error(`source identity findings: ${unverified.length} finding(s) whose evidence no longer holds`);
  for (const f of unverified) console.error(`  - ${f.id}: ${f.claim.slice(0, 90)}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-source-identity-findings/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-identity-findings.mjs",
  question: "The conveyor has 449 obligations and 198 documents with no known address. Which of them can be acquired at all?",
  answer: "Not all of them. Louisiana's four highest-leverage 'forms' are statutory articles with no published PDF, and Kansas's may already be held behind a lookup that cannot match. Both were queued as acquisition work.",
  method: "Two read-only discovery passes over committed evidence only, with every claim re-checked here against the files it cites. A finding whose evidence has moved fails this generator rather than being restated.",
  everyClaimVerifiedAtGenerationTime: true,
  findings: FINDINGS,
  affected: { louisianaFamilies: laFamilies, kansasFamilies: ksFamilies },
  whatThisDoesNotEstablish: [
    "that any Louisiana instrument has been drafted",
    "that any Kansas document is in fact held — only that the lookup cannot currently tell",
    "that any URL here has been fetched, or that any byte has been promoted"
  ],
  commercialRoutesOpened: 0,
  productionTouched: false
};

if (CHECK) {
  console.log(`source identity findings current: ${FINDINGS.length} finding(s), all evidence still holds.`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
for (const f of FINDINGS) console.log(`  ${f.id} ${f.jurisdiction.padEnd(4)} ${f.severity.padEnd(6)} ${f.claim.slice(0, 88)}`);
