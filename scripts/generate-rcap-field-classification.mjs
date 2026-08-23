#!/usr/bin/env node
// Classifies every discovered field or measured anchor. All of them.
//
//   node scripts/generate-rcap-field-classification.mjs
//   node scripts/generate-rcap-field-classification.mjs --check
//
// An empty or partial classification file is worse than none: it looks like the
// question was asked. CR-266 was put forward with a classification carrying
// zero entries while a separate report independently asserted a signature class
// and four manual fields, so two artifacts described the same form and only one
// of them had been filled in.
//
// The rule here is arithmetic. Every field an AcroForm declares, and every
// anchor a flat overlay measures plus every caption it deliberately left
// unbound, lands in exactly one of three buckets, and the count of classified
// entries must equal the count of discovered ones. There is no "unresolved".
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/field-classification-coverage.json");
const checkOnly = process.argv.includes("--check");
// Rewriting a family's classification is a separate, explicit act.
//
// The default run used to re-derive every family's field-classification.json
// from live semantics and overwrite it. Those files are byte-pinned in 559
// places -- gate-b sidecar evidence and each family's artifact-provenance
// classificationSha256 -- and at least one of them (AK requesttosealcriminfo)
// is a hand-curated 28-caption classification carrying its own source digest
// and out-of-denominator pages. Re-deriving it produced a 6-anchor stub and
// broke every pin that named it. So the committed classifications are the
// authority here and the writer is opt-in.
const rewriteClassifications = process.argv.includes("--rewrite-classifications");

const CLASSES = {
  participant_writable: "The participant or a deterministic case fact owns this field and the factory may write it.",
  protected: "A court, clerk, prosecutor, attorney, agency or signature field. Never written, whatever anchor is supplied.",
  not_applicable: "Discovered on the form but outside this packet's participant set, so nothing is written and nothing is claimed."
};

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** Semantics decides the class, so one module governs what may ever be written. */
function classify(label, explicitFactId) {
  const decision = decideBinding(
    { name: label, pdfType: "text", effectiveLabel: label },
    { captionOnly: false, availableChargeRows: 0 }
  );
  if (!decision.writable) {
    return { class: "protected", basis: `field semantics refuses it: ${decision.category ?? decision.reason}` };
  }
  if (explicitFactId) {
    return { class: "participant_writable", basis: `bound to ${explicitFactId}` };
  }
  // Writable in principle, but this packet binds no value to it.
  return { class: "not_applicable", basis: `writable as ${decision.factId} but this form's packet binds no value to it` };
}

const unclassified = [];
const contractBreaches = [];

/** The committed classification's own numbers, in the shape the summary reports. */
function rowFromCommitted(derived, committed) {
  const entries = Array.isArray(committed.entries) ? committed.entries : [];
  const counts = { participant_writable: 0, protected: 0, not_applicable: 0 };
  for (const entry of entries) if (counts[entry.class] !== undefined) counts[entry.class] += 1;
  return {
    familyId: derived.familyId,
    jurisdiction: derived.jurisdiction,
    documentId: committed.documentId ?? derived.documentId,
    denominator: committed.denominator ?? derived.denominator,
    discoveredFieldsOrAnchors: Number(committed.discoveredFieldsOrAnchors ?? entries.length),
    classifiedFieldsOrAnchors: Number(committed.classifiedFieldsOrAnchors ?? entries.length),
    complete: committed.complete !== false,
    counts,
    entries
  };
}

/**
 * What an approved classification must still satisfy, read from its own bytes.
 *
 * Never a re-derivation compared byte for byte: these files are pinned by
 * sidecar evidence and by each family's artifact-provenance classificationSha256,
 * so the check's job is to prove the committed bytes are internally complete,
 * unambiguous, and still the bytes the approval named.
 */
function classificationBreach(familyId, file, committed, familyPath) {
  const entries = Array.isArray(committed.entries) ? committed.entries : null;
  if (!entries) return "the classification carries no entries array";
  if (entries.length === 0) return "the classification is empty; an empty classification looks like the question was asked";

  // Exactly once: a label classified twice is two answers to one question.
  const seen = new Map();
  for (const entry of entries) {
    const key = `${entry.source ?? "field"}\u0000${entry.label}`;
    if (seen.has(key)) return `${JSON.stringify(entry.label)} is classified more than once`;
    seen.set(key, entry);
    if (!CLASSES[entry.class]) return `${JSON.stringify(entry.label)} carries class ${JSON.stringify(entry.class ?? null)}, which is not one of the three`;
  }

  const discovered = Number(committed.discoveredFieldsOrAnchors ?? entries.length);
  const classified = Number(committed.classifiedFieldsOrAnchors ?? entries.length);
  if (classified !== entries.length) return `it reports ${classified} classified and carries ${entries.length} entries`;
  if (classified !== discovered) return `it classifies ${classified} of ${discovered} discovered field(s) or anchor(s); there is no unresolved bucket`;
  if (committed.complete === false) return "it declares itself incomplete";

  // Counters, where the file states them.
  if (committed.counts && typeof committed.counts === "object") {
    const tally = { participant_writable: 0, protected: 0, not_applicable: 0 };
    for (const entry of entries) if (tally[entry.class] !== undefined) tally[entry.class] += 1;
    for (const [klass, stated] of Object.entries(committed.counts)) {
      if (tally[klass] === undefined) continue;
      if (Number(stated) !== tally[klass]) return `it states ${stated} ${klass} entr(ies) and carries ${tally[klass]}`;
    }
  }

  // The approval names these exact bytes.
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const provenance = readJson(path.join(familyPath, "artifact-provenance.json"));
  if (provenance) {
    const pins = [provenance.classificationSha256, provenance.fixtureIdentity?.packageIdentity?.fieldClassificationSha256]
      .filter((pin) => typeof pin === "string" && pin.length === 64);
    for (const pin of pins) {
      if (pin !== digest) {
        return `its bytes are ${digest.slice(0, 12)} and the recorded approval pins ${pin.slice(0, 12)}`;
      }
    }
  }

  // The map or profile the classification is about is still the one on disk.
  const source = readJson(path.join(familyPath, "source-record.json"));
  if (committed.sourceSha256 && source) {
    const onDisk = source.sha256 ?? source.expectedSha256 ?? null;
    if (onDisk && committed.sourceSha256 !== onDisk) {
      return `it classifies source ${String(committed.sourceSha256).slice(0, 12)} and the source record now names ${String(onDisk).slice(0, 12)}`;
    }
  }
  return null;
}

const families = [];
for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
  const statePath = path.join(OVERLAY_DIR, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    const record = readJson(path.join(familyPath, "source-record.json"));
    if (!record) continue;
    if (fs.existsSync(path.join(familyPath, "retirement.json"))) continue;

    const profile = readJson(path.join(familyPath, "overlay-profile.json"));
    // Only families this lane has actually measured are classified here. An
    // AcroForm family whose binary is absent has no discovered field set to
    // classify, and inventing one would be the opposite of the point.
    if (!profile || !Array.isArray(profile.anchors) || profile.anchors.length === 0) continue;

    const jurisdiction = String(record.jurisdiction ?? stateDir).toUpperCase();
    const entries = [];
    for (const anchor of profile.anchors) {
      const result = classify(anchor.label, anchor.factId && !anchor.expectedOutcome ? anchor.factId : null);
      entries.push({ label: anchor.label, source: "measured_anchor", factId: anchor.factId ?? null, ...result });
    }
    for (const unbound of profile.deliberatelyUnbound ?? []) {
      const result = classify(unbound.label, null);
      entries.push({ label: unbound.label, source: "discovered_caption_deliberately_unbound", factId: null, ...result, why: unbound.why });
    }

    const discovered = (profile.anchors?.length ?? 0) + (profile.deliberatelyUnbound?.length ?? 0);
    const counts = { participant_writable: 0, protected: 0, not_applicable: 0 };
    for (const entry of entries) counts[entry.class] += 1;

    const derived = {
      familyId: `${jurisdiction}:${familyDir}`,
      jurisdiction,
      documentId: record.documentId ?? familyDir,
      denominator: "measured anchors plus deliberately unbound captions",
      discoveredFieldsOrAnchors: discovered,
      classifiedFieldsOrAnchors: entries.length,
      complete: entries.length === discovered && entries.every((e) => CLASSES[e.class]),
      counts,
      entries
    };

    /**
     * The committed classification is the answer; this derivation is only a
     * fallback for a family that has never been classified.
     *
     * Reading the committed file is what makes this a validation rather than a
     * re-derivation. A family whose classification was widened by hand -- a
     * per-page denominator, captions the anchors never measured -- must be
     * reported as it was approved, not shrunk back to what the anchor list
     * alone can see.
     */
    const committedPath = path.join(familyPath, "field-classification.json");
    const committed = readJson(committedPath);
    const row = committed ? rowFromCommitted(derived, committed) : derived;
    if (!committed) {
      unclassified.push(`${row.familyId}: measures ${discovered} field(s) or anchor(s) and carries no field-classification.json`);
    } else {
      const breach = classificationBreach(row.familyId, committedPath, committed, familyPath);
      if (breach) contractBreaches.push(`${row.familyId}: ${breach}`);
    }
    families.push(row);

    if (rewriteClassifications && !checkOnly) {
      fs.writeFileSync(path.join(familyPath, "field-classification.json"), `${JSON.stringify({
        schemaVersion: "rcap-field-classification/v2-complete",
        generatedBy: "scripts/generate-rcap-field-classification.mjs",
        rule: "Every discovered field or measured anchor carries exactly one class. classifiedFieldsOrAnchors must equal discoveredFieldsOrAnchors; there is no unresolved bucket.",
        classes: CLASSES,
        ...row
      }, null, 2)}\n`);
    }
  }
}

const incomplete = families.filter((f) => !f.complete);
const totals = {
  familiesClassified: families.length,
  familiesComplete: families.filter((f) => f.complete).length,
  familiesIncomplete: incomplete.length,
  discoveredFieldsOrAnchors: families.reduce((n, f) => n + f.discoveredFieldsOrAnchors, 0),
  classifiedFieldsOrAnchors: families.reduce((n, f) => n + f.classifiedFieldsOrAnchors, 0),
  participantWritable: families.reduce((n, f) => n + f.counts.participant_writable, 0),
  protectedFields: families.reduce((n, f) => n + f.counts.protected, 0),
  notApplicable: families.reduce((n, f) => n + f.counts.not_applicable, 0)
};

if (unclassified.length > 0) {
  console.error(`FAIL field classification — ${unclassified.length} measured family(ies) carry no classification`);
  for (const message of unclassified) console.error(`  ${message}`);
  process.exit(1);
}
if (contractBreaches.length > 0) {
  console.error(`FAIL field classification — ${contractBreaches.length} committed classification(s) break their contract`);
  for (const message of contractBreaches) console.error(`  ${message}`);
  process.exit(1);
}
if (totals.classifiedFieldsOrAnchors !== totals.discoveredFieldsOrAnchors || incomplete.length > 0) {
  console.error(`FAIL field classification — ${incomplete.length} family(ies) incomplete; classified ${totals.classifiedFieldsOrAnchors} of ${totals.discoveredFieldsOrAnchors} discovered`);
  for (const row of incomplete) console.error(`  ${row.familyId}: ${row.classifiedFieldsOrAnchors}/${row.discoveredFieldsOrAnchors}`);
  process.exit(1);
}

const payload = {
  schemaVersion: "rcap-field-classification-coverage/v1",
  generatedBy: "scripts/generate-rcap-field-classification.mjs",
  rule: "classifiedFieldsOrAnchors == discoveredFieldsOrAnchors, for every retained family this lane has measured.",
  classes: CLASSES,
  totals,
  families
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL field classification — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-field-classification.mjs`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, json);
}

console.log(`OK field classification — ${totals.familiesComplete}/${totals.familiesClassified} families complete; ${totals.classifiedFieldsOrAnchors}/${totals.discoveredFieldsOrAnchors} entries classified (${totals.participantWritable} writable, ${totals.protectedFields} protected, ${totals.notApplicable} not applicable)`);
