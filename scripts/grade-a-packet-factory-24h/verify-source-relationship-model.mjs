#!/usr/bin/env node
/**
 * The invariants that make the source queue answerable, and the ways it broke.
 *
 * Every check here exists because the previous version of this queue shipped
 * with the defect it names. That file had 232 rows and was invalid as a human
 * action list: 232 of 232 said "Form title: REQUIRES_LOOKUP", 206 issuer fields
 * were plus-joined lists of form IDs, two "official URLs" were whole CSV rows
 * with a SHA and a repository path appended, and nineteen of the top twenty
 * told a person to hunt a portal or call a clerk when zero of them justified it.
 *
 *   node scripts/grade-a-packet-factory-24h/verify-source-relationship-model.mjs
 *   node scripts/grade-a-packet-factory-24h/verify-source-relationship-model.mjs --mutations
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATIONS = process.argv.includes("--mutations");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const REGISTRY = `${DIR}/SOURCE_RELATIONSHIP_REGISTRY.json`;
const UNBLOCK = `${DIR}/ROGER_SOURCE_UNBLOCK_LIST.json`;
const VERIFICATION = "data/rcap-grade-a/source-verification/TOP20_EXTERNAL_VERIFICATION.json";
const GENERATOR = "scripts/grade-a-packet-factory-24h/generate-source-relationship-registry.mjs";

const results = [];
const check = (id, title, ok, observed) => results.push({ id, title, ok, observed });
const readJson = (rel) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); } catch { return null; } };
const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const reg = readJson(REGISTRY);
const unblock = readJson(UNBLOCK);
const verification = readJson(VERIFICATION);
if (!reg || !unblock || !verification) {
  console.error("REFUSED: the registry, the human queue or the external verification is unreadable.");
  process.exit(1);
}
const records = reg.records ?? [];
const tasks = unblock.tasks ?? [];

/* S1. Every externally verified disposition is actually applied. */
const have = new Map(records.filter((r) => r.externallyVerified).map((r) => [`${r.jurisdiction}::${norm(r.canonicalArtifactId)}`, r]));
const unapplied = (verification.rows ?? []).filter((row) => !have.has(`${row.state}::${norm(row.queue_identity)}`));
check("S1", "every externally verified Top-20 disposition is applied to the record it describes",
  unapplied.length === 0 && have.size === (verification.rows ?? []).length,
  `${have.size}/${(verification.rows ?? []).length} applied; unapplied: ${unapplied.map((r) => `${r.state} ${r.queue_identity}`).slice(0, 3).join(", ") || "none"}`);

/* S2. No issuer field is a plus-joined list of form IDs. 206 of 232 were. */
const plusJoined = records.filter((r) => /\+/.test(String(r.canonicalPublisher)));
check("S2", "no issuing-body field carries a plus-joined list of form IDs",
  plusJoined.length === 0 && records.length > 0,
  `${records.length} record(s); ${plusJoined.length} plus-joined: ${plusJoined.slice(0, 2).map((r) => r.canonicalArtifactId).join(", ")}`);

/* S3. No URL carries corpus metadata. Two were entire CSV rows. */
const URL_JUNK = /private\/source-imports|[0-9a-f]{64}|,/;
const malformed = records.filter((r) => [r.officialSourcePage, r.officialArtifactUrl]
  .some((u) => u && (URL_JUNK.test(u) || (u.match(/https?:\/\//g) ?? []).length > 1)));
check("S3", "no official URL carries a SHA, a repository path, CSV fields or a second address",
  malformed.length === 0, `${malformed.length} malformed: ${malformed.slice(0, 2).map((r) => r.canonicalArtifactId).join(", ")}`);

/* S4. A human task earns itself, or it is not emitted. */
const HUMAN_STATES = new Set(reg.humanStates ?? []);
const humanProblems = [];
for (const t of tasks) {
  if (!HUMAN_STATES.has(t.sourceState)) humanProblems.push(`${t.canonicalArtifactId} is a human task in non-human state ${t.sourceState}`);
  if (t.sourceState === "PUBLIC_DOWNLOAD_BOT_BLOCKED" && !t.officialArtifactUrl) humanProblems.push(`${t.canonicalArtifactId} is a browser download with no artifact URL to open`);
  if (t.sourceState === "HUMAN_CONTACT_REQUIRED" && !(t.humanContactTarget && t.humanContactQuestion)) humanProblems.push(`${t.canonicalArtifactId} is a contact task with no verified target or no exact question`);
  // An instruction to call a clerk, as opposed to a note saying no clerk is
  // needed. The distinction matters: five verified notes say exactly that, and
  // a scan that cannot tell them apart reports the fix as the defect.
  if (/\b(ask|contact|call|phone)\b[^.]{0,40}\bclerk\b/i.test(JSON.stringify(t))) humanProblems.push(`${t.canonicalArtifactId} instructs a clerk contact`);
}
check("S4", "every emitted human task is in a human state, with the thing it needs to act on",
  humanProblems.length === 0, `${tasks.length} task(s); ${humanProblems.length} problem(s): ${humanProblems.slice(0, 2).join(" | ")}`);

/* S5. Classes stay separate. Bundles, embedded sections, statutes and reuse
 * restrictions are never acquisition errands. */
const NEVER_HUMAN = ["BUNDLE_COMPONENT", "EMBEDDED_SECTION", "STATUTORY_CUSTOM_PLEADING", "LICENSE_PERMISSION_REVIEW"];
const misrouted = tasks.filter((t) => NEVER_HUMAN.includes(t.sourceState));
const knownPublicButAsked = records.filter((r) => r.officialSourcePage && HUMAN_STATES.has(r.sourceState) && r.sourceState !== "PUBLIC_DOWNLOAD_BOT_BLOCKED");
check("S5", "a bundle page, an embedded section, a statute and a reuse restriction are never human fetch errands",
  misrouted.length === 0 && knownPublicButAsked.length === 0,
  `${misrouted.length} misrouted; ${knownPublicButAsked.length} asked of a person while a public source is known`);

/* S6. Held bytes are not a missing source. */
const wrongMissing = records.filter((r) => r.sourceState === "MISSING_SOURCE_BINARY" && r.artifactSha256);
check("S6", "a record with held, hash-matching bytes is not called a missing source",
  wrongMissing.length === 0,
  `${records.filter((r) => r.sourceState === "CURRENTNESS_UNVERIFIED").length} held-but-unverified; ${wrongMissing.length} held bytes mislabelled missing`);

/* S7. Ranking counts unique artifacts and unique families, not repeated
 * references. The old Top 20 summed 125 references over 67 families. */
const declaredFamilies = reg.counts?.uniqueFamilies ?? -1;
const actualFamilies = new Set(records.flatMap((r) => r.uniqueFamilies ?? [])).size;
const declaredArtifacts = reg.counts?.uniqueCanonicalArtifacts ?? -1;
const dupIdentity = records.map((r) => `${r.jurisdiction}::${norm(r.canonicalArtifactId)}`)
  .filter((x, i, a) => a.indexOf(x) !== i);
check("S7", "impact is counted in unique artifacts and unique families, with no identity queued twice",
  declaredFamilies === actualFamilies && declaredArtifacts === records.length && dupIdentity.length === 0,
  `declared ${declaredArtifacts} artifact(s)/${declaredFamilies} famil(ies); actual ${records.length}/${actualFamilies}; ${dupIdentity.length} duplicate identit(ies)`);

/* S8. The state vocabulary is closed, and every record is in it. */
const vocab = new Set(reg.sourceStateVocabulary ?? []);
const undeclared = records.filter((r) => !vocab.has(r.sourceState));
const REQUIRED_STATES = ["PUBLIC_DOWNLOAD", "PUBLIC_DOWNLOAD_BOT_BLOCKED", "STANDALONE_ARTIFACT", "BUNDLE_COMPONENT",
  "EMBEDDED_SECTION", "STALE_OR_VARIANT_ID", "SOURCE_SCOPE_AND_VERSION_AMBIGUITY", "MISSING_SOURCE_BINARY",
  "MISSING_CANONICAL_RELATIONSHIP_METADATA", "CURRENTNESS_UNVERIFIED", "FAMILY_IDENTITY_AMBIGUOUS",
  "UNSUPPORTED_RELATIONSHIP", "STATUTORY_CUSTOM_PLEADING", "LICENSE_PERMISSION_REVIEW", "HUMAN_CONTACT_REQUIRED"];
const missingStates = REQUIRED_STATES.filter((s) => !vocab.has(s));
check("S8", "the source-state vocabulary is closed and carries all fifteen required states",
  undeclared.length === 0 && missingStates.length === 0,
  `${vocab.size} declared; ${missingStates.length} required state(s) absent; ${undeclared.length} record(s) outside the vocabulary`);

/* S9. The old output cannot come back. */
const oldShape = unblock.schemaVersion === "rcap-roger-source-unblock-list/v1"
  || tasks.length > 50
  || records.some((r) => String(r.canonicalArtifactTitle) === "REQUIRES_LOOKUP");
check("S9", "the withdrawn 232-row shape cannot regenerate, under this name or another",
  !oldShape && /v2/.test(String(unblock.schemaVersion)),
  `schema ${unblock.schemaVersion}; ${tasks.length} human task(s)`);

/* S10. The scope limit is stated rather than implied. 212 rows were never
 * externally checked, and presenting them as though they were is the failure
 * mode that produced the withdrawn file. */
const verifiedCount = records.filter((r) => r.externallyVerified).length;
check("S10", "the registry says how much of it was externally verified and how much was not",
  typeof reg.externalVerification?.scopeLimit === "string"
  && /not.*verified|no current-source determination|must not be presented/i.test(reg.externalVerification.scopeLimit)
  && verifiedCount < records.length,
  `${verifiedCount}/${records.length} externally verified; scope limit recorded: ${Boolean(reg.externalVerification?.scopeLimit)}`);

for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(3)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} source-model checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const rerun = () => { const o = spawnSync(process.execPath, [import.meta.filename], { cwd: ROOT, encoding: "utf8" }); return `${o.stdout ?? ""}${o.stderr ?? ""}`; };
  const cases = [
    { id: "S1", name: "dropping an externally verified disposition is caught", file: REGISTRY,
      edit: (j) => { const r = j.records.find((x) => x.externallyVerified); r.externallyVerified = false; return j; } },
    { id: "S2", name: "a plus-joined form-ID list in the issuer field is caught", file: REGISTRY,
      edit: (j) => { j.records[0].canonicalPublisher = "EXP-AD Request+EXP-AD Case List+FW-CIV-APPLICATION"; return j; } },
    { id: "S3", name: "a CSV row pasted into an official URL is caught", file: REGISTRY,
      edit: (j) => { j.records[0].officialArtifactUrl = "https://www.nccourts.gov/x,www.nccourts.gov,2026-08-02,689301e080796f9c0c9e8f15c5cd055a47b40034ab58f1fc7b91ab1143f8a484,private/source-imports/y.pdf"; return j; } },
    { id: "S3", name: "a repository path inside an official URL is caught", file: REGISTRY,
      edit: (j) => { j.records[0].officialSourcePage = "https://x.gov/private/source-imports/a.pdf"; return j; } },
    { id: "S4", name: "a browser-download task with no artifact URL is caught", file: UNBLOCK,
      edit: (j) => { j.tasks[0].officialArtifactUrl = null; return j; } },
    { id: "S4", name: "a clerk-contact instruction is caught", file: UNBLOCK,
      edit: (j) => { j.tasks[0].preciseAction = "Ask the county clerk which form the court accepts."; return j; } },
    { id: "S4", name: "a contact task with no verified target or question is caught", file: UNBLOCK,
      edit: (j) => { j.tasks.push({ ...j.tasks[0], sourceState: "HUMAN_CONTACT_REQUIRED", humanContactTarget: null, humanContactQuestion: null }); return j; } },
    { id: "S5", name: "a bundle component emitted as a human errand is caught", file: UNBLOCK,
      edit: (j) => { j.tasks.push({ ...j.tasks[0], sourceState: "BUNDLE_COMPONENT" }); return j; } },
    { id: "S5", name: "a statutory citation emitted as a fetch task is caught", file: UNBLOCK,
      edit: (j) => { j.tasks.push({ ...j.tasks[0], sourceState: "STATUTORY_CUSTOM_PLEADING" }); return j; } },
    { id: "S5", name: "a reuse restriction sent to a person instead of counsel is caught", file: UNBLOCK,
      edit: (j) => { j.tasks.push({ ...j.tasks[0], sourceState: "LICENSE_PERMISSION_REVIEW" }); return j; } },
    { id: "S6", name: "held hash-matching bytes relabelled a missing source is caught", file: REGISTRY,
      edit: (j) => { const r = j.records.find((x) => x.artifactSha256); r.sourceState = "MISSING_SOURCE_BINARY"; return j; } },
    { id: "S7", name: "a family counted twice through a duplicated identity is caught", file: REGISTRY,
      edit: (j) => { j.records.push(JSON.parse(JSON.stringify(j.records[0]))); return j; } },
    { id: "S7", name: "a declared family count that disagrees with the records is caught", file: REGISTRY,
      edit: (j) => { j.counts.uniqueFamilies = 999; return j; } },
    { id: "S8", name: "an undeclared source state is caught", file: REGISTRY,
      edit: (j) => { j.records[0].sourceState = "PROBABLY_FINE"; return j; } },
    { id: "S8", name: "dropping a required state from the vocabulary is caught", file: REGISTRY,
      edit: (j) => { j.sourceStateVocabulary = j.sourceStateVocabulary.filter((s) => s !== "BUNDLE_COMPONENT"); return j; } },
    { id: "S9", name: "regenerating the withdrawn 232-row shape is caught", file: UNBLOCK,
      edit: (j) => { j.schemaVersion = "rcap-roger-source-unblock-list/v1"; return j; } },
    { id: "S10", name: "dropping the scope limit is caught", file: REGISTRY,
      edit: (j) => { delete j.externalVerification.scopeLimit; return j; } }
  ];
  let allCaught = true;
  for (const c of cases) {
    const abs = path.join(ROOT, c.file);
    const original = fs.readFileSync(abs);
    const mutated = `${JSON.stringify(c.edit(JSON.parse(original.toString("utf8"))), null, 2)}\n`;
    if (mutated === original.toString("utf8")) { console.log(`  MISSED   [${c.id}] ${c.name} — the mutation changed nothing`); allCaught = false; continue; }
    fs.writeFileSync(abs, mutated);
    const out = rerun();
    fs.writeFileSync(abs, original);
    const restored = fs.readFileSync(abs).equals(original);
    const caught = new RegExp(`FAIL ${c.id}\\b`).test(out);
    if (!caught || !restored) allCaught = false;
    console.log(`  ${caught ? "detected" : "MISSED  "} [${c.id}] ${c.name}${restored ? "" : " — FILE NOT RESTORED"}`);
  }
  if (!allCaught) { console.error("\nFAIL source-model mutations"); process.exit(1); }
  console.log(`\nOK source-model mutations — ${cases.length} case(s), every mutation caught.`);
}

if (results.some((r) => !r.ok)) process.exit(1);
console.log("\nSOURCE_RELATIONSHIP_MODEL_HELD");
