import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { requireMasterLibraryEnvironment } from "./lib/corpus-index-paths.mjs";
import { createCaProp64ActorVerifier, caProp64ActorInventoryProblems } from "./rcap-packet-completeness/ca-prop64-source-actors.mjs";

const base = "data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/";
const read = (name) => JSON.parse(fs.readFileSync(base + name, "utf8"));
const fieldMap = read("production-field-map.json"), census = read("field-census.census-v1.json"), receipt = read("source-receipt.json");
const instructions = fs.readFileSync(base + "participant-instructions.md", "utf8");
// Exercise the actual reader normalizer, without its CLI/full-corpus startup.
const reader = fs.readFileSync("scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "utf8");
const start = reader.indexOf("const normalizeRow = ");
assert.ok(start > 0);
const end = reader.indexOf("\n\n/**", start);
const normalize = vm.runInNewContext(`${reader.slice(start, end)}; normalizeRow;`);
const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ca-prop64-source-actors-"));
let assertions = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const mo = JSON.parse(fs.readFileSync("data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/production-field-map.json", "utf8"));
let neighboringActorRows = 0;
const visit = (value) => {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value) && Object.hasOwn(value, "completionActor")) {
    neighboringActorRows++;
    const normalized = normalize(value);
    check(["completionActor", "completionStage", "conditionDescription", "completionObligationId"].some((key) => Object.hasOwn(normalized, key)), false, "CA actor metadata must not change MO's normalized row");
  }
  for (const child of Object.values(value)) visit(child);
};
visit(mo);
assert.ok(neighboringActorRows > 0, "actual neighboring actor contract required");
try {
  // Filled companions are outputs, not official source bytes. Use the held custody.
  const corpus = requireMasterLibraryEnvironment({ repoRoot: process.cwd() });
  for (const form of ["CR-401", "CR-403"]) {
    const source = receipt.sources.find((row) => row.formNumber === form);
    const target = path.join(sourceRoot, source.pathInCorpus);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const bytes = fs.readFileSync(path.join(corpus, source.pathInCorpus));
    check(createHash("sha256").update(bytes).digest("hex"), source.pinnedSha256, `${form}: exact official source`);
    fs.writeFileSync(target, bytes);
  }
  const options = { familyId: "ca-prop64-set", fieldMap, census, receipt, instructions, sourceRoot };
  const verify = createCaProp64ActorVerifier(options);
  const service = fieldMap.refusals.filter((row) => row.completionStage === "actual_service");
  for (const raw of service) {
    const blank = normalize(raw), result = verify(blank, blank.declared);
    check(result.disposition, "PROTECTED_FIELD", raw.fieldName);
    check(result.completionActor, "actual_nonparty_adult_server");
    check(result.completionStage, "actual_service");
    check(result.completionObligationId, "cr401-service");
  }
  const time = service.find((row) => row.fieldName.endsWith(".Timeserved[0]"));
  const blank = normalize(time);
  check(verify(blank, blank.declared).fieldClass, "CA_PROP64_SOURCE_ACTOR", "service time is never court-assigned");
  check(verify(blank, { ...blank.declared, factAvailable: true }).disposition, "KNOWN_FACT_NOT_WRITTEN");
  check(caProp64ActorInventoryProblems(options.familyId, fieldMap, census), []);
  const forged = structuredClone(fieldMap);
  forged.writes.push({ ...time, disposition: "WRITE" });
  const forgedProblems = caProp64ActorInventoryProblems(options.familyId, forged, census);
  check(forgedProblems.some((row) => row.counter === "protectedWrites" && row.field === time.fieldName), true);
  check(forgedProblems.some((row) => row.counter === "unclassifiedBlanks" && row.field === time.fieldName), true, "duplicate field is also diagnosed");
  const changes = [
    ["wrong actor", (o) => { o.fieldMap.refusals.find((r) => r.fieldName === time.fieldName).completionActor = "participant"; }],
    ["missing disclosure", (o) => { o.instructions = ""; }],
    ["dropped manual signature", (o) => { o.fieldMap.completionObligations = o.fieldMap.completionObligations.filter((r) => r.id !== "cr401-service"); }],
    ["deleted obligation metadata", (o) => { delete o.fieldMap.completionObligations; }],
    ["wrong source pin", (o) => { o.receipt.sources.find((r) => r.formNumber === "CR-401").pinnedSha256 = "wrong"; }],
    ["changed geometry", (o) => { o.census.documents.find((r) => r.formNumber === "CR-401").fields[0].widgets[0].rect[0]++; }],
    ["wrong route", (o) => { o.fieldMap.routeKeys = ["unrelated"]; }],
    ["missing bytes", (o) => { o.sourceRoot = path.join(sourceRoot, "missing"); }],
  ];
  for (const [name, mutate] of changes) {
    const optionsCopy = structuredClone(options); mutate(optionsCopy);
    check(createCaProp64ActorVerifier(optionsCopy)(blank, blank.declared).disposition, "UNCLASSIFIED_BLANK", name);
  }
  for (const [key, value] of [["page", 99], ["fieldType", "/Btn"], ["flags", ["pushButton"]]]) {
    const changed = structuredClone(options);
    const row = changed.fieldMap.refusals.find((r) => r.fieldName === time.fieldName);
    row[key] = value;
    const normalized = normalize(row);
    check(createCaProp64ActorVerifier(changed)(normalized, normalized.declared).disposition, "UNCLASSIFIED_BLANK", key);
  }
  check(createCaProp64ActorVerifier({ ...options, familyId: "ca-1203-41-set" })(blank, blank.declared), null, "sibling unchanged");
  for (const raw of fieldMap.refusals.filter((row) => row.formNumber === "CR-403" && ["court_assignment", "judicial_action"].includes(row.completionStage))) {
    const normalized = normalize(raw), result = verify(normalized, normalized.declared);
    check(result.disposition, "PROTECTED_FIELD", raw.fieldName);
    check(result.completionActor, "court");
  }
  const source = receipt.sources.find((row) => row.formNumber === "CR-401");
  fs.appendFileSync(path.join(sourceRoot, source.pathInCorpus), "tampered");
  check(createCaProp64ActorVerifier(options)(blank, blank.declared).disposition, "UNCLASSIFIED_BLANK", "new audit rehashes source bytes");
  console.log(JSON.stringify({ status: "PASS", assertions, neighboringActorRows, actualNormalizer: true, sourceBytes: "HELD_OFFICIAL_CUSTODY", scope: "Actor classification, not full packet completeness or approval" }));
} finally { fs.rmSync(sourceRoot, { recursive: true, force: true }); }
