#!/usr/bin/env node
// The census's 295 source-acquisition tasks, against the corpus already held.
//
//   node scripts/grade-a-route-obligation-census/reconcile-census-source-custody.mjs
//   node scripts/grade-a-route-obligation-census/reconcile-census-source-custody.mjs --check
//
// WHY THIS EXISTS
//
// The census reports 295 packet families needing official-source acquisition.
// Acquisition is expensive and, for a source already sitting in the verified
// private corpus, entirely wasted -- so before any of it is commissioned, each
// task is reconciled against what is already held.
//
// The corpus is NOT reacquired here and nothing is fetched. This reads the
// committed corpus index, which records 329 verified files with their state,
// form number, revision and content hash.
//
// HOW A MATCH IS DECIDED, AND WHY CONSERVATIVELY
//
// The census names sources in ten different namespaces, and only two of them
// identify a document: `source-sha256:` (an exact identity) and
// `official-form:` (a label, often not the corpus's own form number -- the
// census says "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS" where the corpus
// says "AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-FIRST-OFFENDERS-ACT-346"). The rest
// are components, compiled profiles, route contracts and reference URLs, which
// are not documents and cannot be held or missing.
//
// So matching is tiered and the tier is recorded. A loose matcher would be the
// dangerous kind of wrong: calling a source held when it is not suppresses the
// acquisition of a real gap. Only an exact hash or a strong form-number match
// within the same jurisdiction counts as held.
//
// And absence of a match is NOT reported as missing. A label this cannot
// resolve is unresolved identity, not evidence of absence; only a precise
// identity -- a content hash the corpus does not carry -- is genuinely missing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const ACQUISITION = "OFFICIAL_SOURCE_ACQUISITION_REQUIRED";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const worklist = readJson(WORKLIST);
const corpus = readJson(CORPUS_INDEX);

const normalise = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const tokens = (value) => String(value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);

const byHash = new Map(corpus.entries.map((e) => [e.sha256, e]));
const byFormNumber = new Map();
for (const entry of corpus.entries) {
  if (entry.formNumber) byFormNumber.set(normalise(entry.formNumber), entry);
}

/**
 * A corpus entry for one `official-form:` label, or null.
 *
 * Tier 1 is normalised equality with a form number.
 *
 * Tier 2 is a token subset within the same jurisdiction: every meaningful token
 * of the census label appears in the corpus form number's tokens, the label
 * carries at least three such tokens, and exactly one corpus entry satisfies it.
 * Containment of the normalised strings was tried first and is too brittle --
 * the census says "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS" where the
 * corpus says "AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-FIRST-OFFENDERS-ACT-346", and
 * one inserted "TO" defeats it. Token subset resolves that pair and still
 * refuses a two-token label like "CR-65", which could name almost anything.
 *
 * Uniqueness is required because an ambiguous match is not a match: two corpus
 * entries that both satisfy the label mean the label does not identify either.
 */
function resolveFormLabel(label, jurisdictions) {
  const key = normalise(label);
  if (byFormNumber.has(key)) return { entry: byFormNumber.get(key), tier: "exact_form_number" };
  const labelTokens = tokens(label);
  if (labelTokens.length < 3) return null;
  const candidates = corpus.entries.filter((e) => e.formNumber
    && (jurisdictions.length === 0 || jurisdictions.includes(e.state)));
  const matches = candidates.filter((entry) => {
    const entryTokens = new Set(tokens(entry.formNumber));
    return labelTokens.every((t) => entryTokens.has(t));
  });
  if (matches.length === 1) return { entry: matches[0], tier: "token_subset_same_jurisdiction" };
  return null;
}

const CLASSES = ["SOURCE_ALREADY_HELD", "SOURCE_REVISION_STALE", "SOURCE_IDENTITY_UNRESOLVED", "SOURCE_GENUINELY_MISSING"];

/**
 * Whether an unresolved label names a document identity or merely describes one.
 *
 * This is the difference between "we know exactly what to go and get and we do
 * not have it" and "we do not yet know what this is". Both need work; they need
 * different work, and reporting all of them as one number tells an acquisition
 * lane nothing.
 *
 * A form number has no spaces and carries a digit: CR-65, SCA-C907, HCJDC-159B.
 * A statute or rule citation looks the same but is not a form -- Louisiana's
 * LA-CCRP-ART-988 is a Code of Criminal Procedure article, and acquiring "it"
 * means finding whatever form the article implies, which is identity work. So
 * an article or section citation is unresolved however code-like it looks.
 */
const STATUTORY_REFERENCE = /(^|[^a-z])(art|article|sect|section|ch|chapter|stat)([^a-z]|$)/i;
function looksLikeAFormNumber(label) {
  const text = String(label).trim();
  if (/\s/.test(text)) return false;
  if (!/[0-9]/.test(text)) return false;
  if (STATUTORY_REFERENCE.test(text)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._/-]+$/.test(text);
}

const rows = [];
for (const family of worklist.packetFamilies) {
  if (!family.workTypes.includes(ACQUISITION)) continue;
  const ids = [...new Set(family.routes.flatMap((r) => r.requiredSourceIds ?? []))];
  const jurisdictions = family.jurisdictions ?? [];

  const documentSources = [];
  for (const id of ids) {
    if (id.startsWith("source-sha256:")) {
      const hash = id.slice("source-sha256:".length);
      const entry = byHash.get(hash) ?? null;
      documentSources.push({
        sourceId: id, kind: "content_hash", resolved: Boolean(entry), tier: entry ? "exact_content_hash" : null,
        heldAs: entry ? { path: entry.path, formNumber: entry.formNumber, revision: entry.revision, sha256: entry.sha256 } : null
      });
      continue;
    }
    if (id.startsWith("official-form:")) {
      const label = id.slice("official-form:".length);
      const match = resolveFormLabel(label, jurisdictions);
      documentSources.push({
        sourceId: id, kind: "form_label", resolved: Boolean(match), tier: match?.tier ?? null,
        heldAs: match ? { path: match.entry.path, formNumber: match.entry.formNumber, revision: match.entry.revision, sha256: match.entry.sha256 } : null
      });
    }
  }

  const named = documentSources.length;
  const resolved = documentSources.filter((s) => s.resolved);
  const unresolvedHashes = documentSources.filter((s) => s.kind === "content_hash" && !s.resolved);
  const unresolvedLabels = documentSources.filter((s) => s.kind === "form_label" && !s.resolved);

  // A label that names a form number we do not hold is missing; one that
  // describes a document, or cites a statute article, is unresolved identity.
  const missingByFormNumber = unresolvedLabels.filter((s) => looksLikeAFormNumber(s.sourceId.slice("official-form:".length)));
  const unresolvedIdentity = unresolvedLabels.filter((s) => !missingByFormNumber.includes(s));
  for (const source of documentSources) {
    if (source.resolved) continue;
    source.absence = source.kind === "content_hash" ? "named_content_hash_not_in_corpus"
      : missingByFormNumber.includes(source) ? "named_form_number_not_in_corpus"
        : "label_does_not_identify_a_document";
  }

  let custodyClass;
  if (named === 0) custodyClass = "SOURCE_IDENTITY_UNRESOLVED";
  else if (unresolvedIdentity.length > 0) custodyClass = "SOURCE_IDENTITY_UNRESOLVED";
  else if (unresolvedHashes.length > 0 || missingByFormNumber.length > 0) custodyClass = "SOURCE_GENUINELY_MISSING";
  else custodyClass = "SOURCE_ALREADY_HELD";
  // Revision staleness is only assertable where the census names an exact hash
  // AND the corpus holds the same form under a different one.
  if (custodyClass === "SOURCE_ALREADY_HELD") {
    const stale = resolved.filter((s) => s.kind === "content_hash"
      && s.heldAs && byFormNumber.get(normalise(s.heldAs.formNumber))?.sha256 !== s.heldAs.sha256);
    if (stale.length > 0) custodyClass = "SOURCE_REVISION_STALE";
  }

  rows.push({
    worklistGroupId: family.worklistGroupId,
    packetFamilyId: family.packetFamilyId,
    jurisdictions,
    routeCount: family.routes.length,
    custodyClass,
    documentSourcesNamed: named,
    documentSourcesResolved: resolved.length,
    nonDocumentSourceIds: ids.length - named,
    documentSources,
    commissionAcquisition: custodyClass !== "SOURCE_ALREADY_HELD",
    why: {
      SOURCE_ALREADY_HELD: "Every document-shaped source this family names resolves to a file already in the verified corpus. Acquisition is not commissioned.",
      SOURCE_REVISION_STALE: "The source is held, but under a different revision than the census names. Refresh rather than acquire.",
      SOURCE_IDENTITY_UNRESOLVED: "This family names no document-shaped source, or names one that cannot be resolved to a corpus identity. Resolve the identity before commissioning anything: absence of a match is not evidence of absence.",
      SOURCE_GENUINELY_MISSING: "The census names a document identity -- an exact content hash, or a form number -- that the verified corpus does not carry. This is a real acquisition and the target is known."
    }[custodyClass]
  });
}
rows.sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId));

const counts = Object.fromEntries(CLASSES.map((c) => [c, rows.filter((r) => r.custodyClass === c).length]));
const doc = {
  schemaVersion: "rcap-census-source-custody-reconciliation/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/reconcile-census-source-custody.mjs",
  question: "Which of the census's official-source acquisition tasks are already satisfied by the corpus we hold?",
  corpusIndex: CORPUS_INDEX,
  corpusFilesHeld: corpus.entries.length,
  corpusWasNotReacquired: "Nothing was fetched. This reads the committed index of the already-verified private corpus.",
  absenceVocabulary: {
    named_content_hash_not_in_corpus: "An exact identity we do not hold. Acquire it.",
    named_form_number_not_in_corpus: "A form number we do not hold. Acquire it; the target is known.",
    label_does_not_identify_a_document: "A prose title or a statute citation. Resolve what document it means before commissioning anything."
  },
  matchingIsConservative:
    "Only an exact content hash or a strong form-number match within the same jurisdiction counts as held. An unresolvable label is recorded as unresolved identity rather than as missing, because absence of a match is not evidence of absence -- and calling a held source missing wastes acquisition while calling a missing source held suppresses it.",
  acquisitionTasks: rows.length,
  counts,
  commissionAcquisitionFor: rows.filter((r) => r.commissionAcquisition).length,
  doNotCommissionAcquisitionFor: rows.filter((r) => !r.commissionAcquisition).length,
  rows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error(`${OUT} is stale. Run the reconciler.`); process.exit(1); }
  console.log(`source-custody reconciliation current: ${rows.length} acquisition task(s).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}`);
console.log(`  ${rows.length} acquisition task(s) against ${corpus.entries.length} held file(s)`);
for (const c of CLASSES) console.log(`  ${String(counts[c]).padStart(4)}  ${c}`);
console.log(`  commission acquisition for ${doc.commissionAcquisitionFor}; do not commission for ${doc.doNotCommissionAcquisitionFor}`);
