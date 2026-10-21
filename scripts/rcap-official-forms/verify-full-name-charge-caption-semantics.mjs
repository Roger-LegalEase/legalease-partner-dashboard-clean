#!/usr/bin/env node
// The charge-caption correction, held in place.
//
//   node scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs
//
// Three things are checked, and they fail for different reasons.
//
//   1. The captions themselves. A blank whose caption says it holds a charge no
//      longer takes the participant's name; a blank that asks for a name still
//      does. These are stated as the exact strings committed in the corpus, so
//      the check is about this repository rather than about a regex.
//   2. The blast radius. Both projections are recomputed over every censused
//      blank in every family, and the set of fields that move must be exactly
//      the set the committed diff records -- no more, and no fewer.
//   3. The protect rules. None may be removed or weakened by this work, so the
//      rule vocabulary is compared against the base commit's, term for term.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifiedAlCaptionChanges } from "../../data/rcap-grade-a/packet-factory-24h/pf07/al-misd-nonconviction-90/shared-semantics-expectations.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const BASE_SHA = "15a30fa412bcfa92a4c9cf72918dee31649af2ef";
const DIFF = "data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const NAME_FACT = "participant.full_legal_name";
const RULE_VOCABULARY = /\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\b/i;

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const semantics = await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);
const { descriptorsMatching, captionDescribesChargeValue, PROTECT_RULES } = semantics;

console.log("full-name charge-caption semantics\n");

// ---- 1. the captions ---------------------------------------------------------
const bindsTheName = (subject) => descriptorsMatching(subject)[0]?.factId === NAME_FACT;

// Committed captions, quoted from the corpus rather than paraphrased.
const REFUSES = [
  ["Oregon: the charge table heading", "Name of Charges"],
  ["Oregon: the citation/arrest offence table heading", "Name of Citation/Arrest Offenses"],
  ["Arkansas: convicted of the offence(s) of", "2.The defendant was convicted of the offense(s) of"],
  ["Arkansas: pending felony charges", "8. [_]The Defendant has no pending felony charges in any sta"],
  ["Arkansas: said charges against the Defendant", "said charges against the Defendant; or"],
  ["Kentucky: the above-named Defendant and offence(s)", "regarding the above-named Defendant and offense(s): ________"],
  ["North Carolina: charged with multiple offences", "3. (if the defendant was charged with multiple offenses, che"]
];
for (const [what, caption] of REFUSES) check(`${what} does not bind the participant's name`, !bindsTheName(caption), caption);

const KEEPS = [
  ["a name caption that mentions the offence", "Name of Defendant charged with the offense"],
  ["Defendant", "Defendant"], ["Petitioner", "Petitioner"], ["Applicant", "Applicant"],
  ["Movant", "Movant"], ["Print Your Name", "Print Your Name"],
  ["Full Legal Name", "Full Legal Name"], ["Printed Name", "Printed Name"]
];
for (const [what, caption] of KEEPS) check(`${what} still binds the participant's name`, bindsTheName(caption), caption);

check("the predicate is exported and separately callable",
  typeof captionDescribesChargeValue === "function"
  && captionDescribesChargeValue("the defendant was convicted of the offense(s) of") === true
  && captionDescribesChargeValue("Name of Defendant charged with the offense") === false
  && captionDescribesChargeValue("Defendant") === false);

// ---- 2. the blast radius -----------------------------------------------------
function familyDirectories() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === "field-census.json") found.push(dir);
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort();
}
const FAMILIES = familyDirectories();
const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};

function project(mod) {
  const rows = new Map();
  for (const familyDir of FAMILIES) {
    for (const field of readJson(`${familyDir}/field-census.json`)?.fields ?? []) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = mod.decideBinding(
        { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
      );
      rows.set(`${familyDir}|${field.name}`, {
        familyDirectory: familyDir, fieldName: field.name, effectiveLabel: field.effectiveLabel ?? null,
        subjectFirstDescriptor: mod.descriptorsMatching(subject)[0]?.factId ?? null,
        byNameDescriptors: mod.descriptorsMatching(field.name).map((d) => d.factId),
        byLabelDescriptors: field.effectiveLabel ? mod.descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [],
        protectCategory: mod.protectCategoryOf(subject) ?? mod.protectCategoryOf(field.name) ?? null,
        bindingWritable: decision.writable === true,
        bindingFactId: decision.factId ?? null,
        bindingReason: decision.reason ?? null
      });
    }
  }
  return rows;
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "charge-caption-verify-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const baseModule = await import(pathToFileURL(basePath).href);
const before = project(baseModule);
const after = project(semantics);
fs.rmSync(stage, { recursive: true, force: true });

const movedKeys = [...before.keys()]
  .filter((k) => JSON.stringify(before.get(k)) !== JSON.stringify(after.get(k))).sort();
const diffRecord = readJson(DIFF);
const alExpectedKeys = verifiedAlCaptionChanges({
  projection: "charge", baseCommit: BASE_SHA, before, after,
  baseline: baseModule, semantics, check
});
const expectedKeys = [...(diffRecord?.expectedChangeKeys ?? []), ...alExpectedKeys].sort();

check("the committed diff exists and names an expected-change set", (diffRecord?.expectedChangeKeys?.length ?? 0) > 0, DIFF);
const unexpected = movedKeys.filter((k) => !expectedKeys.includes(k));
const missing = expectedKeys.filter((k) => !movedKeys.includes(k));
check("no field outside the expected-change set moves", unexpected.length === 0,
  unexpected.slice(0, 6).join("; "));
check("every field in the expected-change set actually moves", missing.length === 0,
  missing.slice(0, 6).join("; "));
check("the recorded field and family totals are the corpus's own",
  diffRecord?.totalFieldsScannedBefore === before.size && diffRecord?.familiesScanned === FAMILIES.length,
  `${diffRecord?.totalFieldsScannedBefore} of ${before.size} across ${diffRecord?.familiesScanned} of ${FAMILIES.length}`);

const offending = (rows) => [...rows.values()].filter((r) => r.bindingWritable && r.bindingFactId === NAME_FACT
  && [r.fieldName, r.effectiveLabel].filter(Boolean).some((t) => RULE_VOCABULARY.test(String(t))));
const offendingBefore = offending(before), offendingAfter = offending(after);
check("the correction had something to correct", offendingBefore.length > 0, `${offendingBefore.length} before`);
check("no field binds a writable participant name into a charge blank",
  offendingAfter.length === 0,
  offendingAfter.map((r) => `${r.familyDirectory}|${r.fieldName}`).slice(0, 6).join("; "));

// ---- 3. the protect rules ----------------------------------------------------
const baseCategories = baseModule.PROTECT_RULES.map(([c]) => c);
const nowCategories = PROTECT_RULES.map(([c]) => c);
check("no protect category is removed",
  baseCategories.every((c) => nowCategories.includes(c)),
  baseCategories.filter((c) => !nowCategories.includes(c)).join(", "));
const weakened = [];
for (const [category, pattern] of baseModule.PROTECT_RULES) {
  const now = PROTECT_RULES.find(([c]) => c === category);
  // A rule may gain terms and may not lose them: every alternative the base
  // rule carried has to still be present in the current one.
  if (!now) { weakened.push(`${category} (missing)`); continue; }
  const baseTerms = pattern.source.split("|");
  const nowSource = now[1].source;
  const lost = baseTerms.filter((t) => !nowSource.includes(t));
  if (lost.length) weakened.push(`${category} lost ${lost.join(", ")}`);
}
check("no protect rule is weakened", weakened.length === 0, weakened.join("; "));

console.log("");
if (failures.length) {
  console.error(`full-name charge-caption semantics: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`full-name charge-caption semantics: ${FAMILIES.length} families, ${before.size} fields, ${movedKeys.length} moved exactly as recorded, ${offendingBefore.length} -> 0 offending.`);
