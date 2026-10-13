import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { CA_PROP64_FAMILY, CA_PROP64_COMPLETION_OBLIGATIONS, caProp64RefusalDisposition } from "../lib/ca-prop64-form-ownership.mjs";

// Independently checked official CR-400/401/403 and their existing measured
// field inventories. A mutable map cannot grant itself source/actor authority.
const SOURCES = Object.freeze({
  "CR-400": { source: "d325bb75f5a90b7864eab8fa43a905db7f2a9c233bb89fe412f609dee9ab35a1", fields: "8310e24e3b4718b673ec89b03b31d36a2d9ec954c95fc0c05abad366ec4e286f" },
  "CR-401": { source: "394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01", fields: "53b89a507f032a92b1b27aa031c43adb393250ecd42be9622be3780c4815446b" },
  "CR-403": { source: "b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff", fields: "f4d1db3eeca6879160dadb8658a45620c23c61824749d353cc298944d17a9c71" },
});
const ROUTES = [
  "obligation:track-pathway:CA:ca-prop64:prop-64-completed-sentence-application-11361-8",
  "obligation:track-pathway:CA:ca-prop64:prop-64-currently-serving-petition-11361-8",
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const stages = new Set(["court_assignment", "judicial_action", "actual_service", "actual_signing", "explicit_optional_election", "not_an_answer"]);
const fail = (basis) => ({ disposition: "UNCLASSIFIED_BLANK", fieldClass: "CA_PROP64_SOURCE_ACTOR", basis });

/** Per-audit cache only; every subsequent audit re-reads source bytes. */
export function createCaProp64ActorVerifier({ familyId, fieldMap, census, receipt, instructions, sourceRoot }) {
  const enabled = familyId === CA_PROP64_FAMILY;
  const measured = new Map();
  return (blank, declared) => {
    if (!enabled) return null;
    try {
      if (fieldMap.familyId !== familyId || census?.familyId !== familyId || receipt?.familyId !== familyId
          || !same([...fieldMap.routeKeys].sort(), ROUTES)
          || !same(fieldMap.completionObligations, CA_PROP64_COMPLETION_OBLIGATIONS)) throw Error("family, route or manual completion obligations changed");
      const rawRows = fieldMap.refusals.filter((row) => row.fieldName === blank.name);
      if (rawRows.length !== 1) throw Error("field must appear exactly once in refusal inventory");
      const raw = rawRows[0];
      const pin = SOURCES[raw.formNumber];
      if (!pin) throw Error("unregistered Prop64 source form");
      const documents = census.documents.filter((document) => document.formNumber === raw.formNumber);
      const sources = receipt.sources.filter((source) => source.formNumber === raw.formNumber);
      if (documents.length !== 1 || sources.length !== 1) throw Error("source form must appear exactly once");
      const document = documents[0], source = sources[0];
      if (document.pinnedOfficialSha256 !== pin.source || source.pinnedSha256 !== pin.source
          || sha(JSON.stringify(document.fields)) !== pin.fields) throw Error("official source or measured field inventory changed");
      const field = document.fields.find((row) => row.name === blank.name);
      if (!field || !same(raw.widgets, field.widgets) || blank.document !== document.documentId
          || blank.label !== field.tooltip || raw.fieldType !== field.fieldType || !same(raw.flags, field.flags)
          || blank.page !== (field.widgets[0]?.page ?? field.widgets[0]?.pageIndex ?? null)
          || blank.isSelectionControl !== (field.fieldType === "/Btn" && !field.flags?.includes("pushButton")))
        throw Error("field identity, label, page, type, flags or geometry changed");
      const expected = caProp64RefusalDisposition(field, { familyId, formNumber: raw.formNumber });
      for (const key of ["completionActor", "completionStage", "conditionDescription", "completionObligationId"])
        if (raw[key] !== expected[key] || blank[key] !== expected[key]) throw Error(`source actor metadata changed or was dropped: ${key}`);
      if (raw.requiredBeforeFiling !== expected.requiredBeforeFiling || raw.routeDetermined !== false
          || declared.requiredBeforeFiling !== expected.requiredBeforeFiling || declared.routeDetermined !== false)
        throw Error("completion flags conflict with source actor");
      if (!stages.has(expected.completionStage)) return null; // Known caption/record bindings remain owed.
      if (!measured.has(raw.formNumber)) {
        if (!sourceRoot || !path.isAbsolute(sourceRoot)) throw Error("source root unavailable");
        if (typeof source.pathInCorpus !== "string" || path.isAbsolute(source.pathInCorpus)
            || source.pathInCorpus.split(/[\\/]/).includes("..")) throw Error("unsafe source path");
        const root = fs.realpathSync(sourceRoot);
        const file = fs.realpathSync(path.join(root, source.pathInCorpus));
        if (!file.startsWith(root + path.sep) || sha(fs.readFileSync(file)) !== pin.source) throw Error("actual official source bytes do not match");
        measured.set(raw.formNumber, true);
      }
      if (declared.factAvailable === true || raw.factAvailable === true) return { disposition: "KNOWN_FACT_NOT_WRITTEN", fieldClass: "CA_PROP64_SOURCE_ACTOR", basis: "A source actor declaration cannot excuse an actual available fact." };
      if (expected.completionStage !== "not_an_answer"
          && (!instructions.includes(blank.name) || !instructions.includes(expected.completionActor)
            || (expected.conditionDescription && !instructions.includes(expected.conditionDescription))))
        throw Error("exact field, actor or conditional completion is not disclosed");
      return {
        disposition: expected.completionStage === "explicit_optional_election" ? "PARTICIPANT_ELECTION_GENUINE"
          : expected.completionStage === "not_an_answer" ? "NOT_APPLICABLE_ON_THIS_ROUTE" : "PROTECTED_FIELD",
        fieldClass: "CA_PROP64_SOURCE_ACTOR", completionActor: expected.completionActor,
        completionStage: expected.completionStage, conditionDescription: expected.conditionDescription ?? null,
        completionObligationId: expected.completionObligationId ?? null,
        sourceSha256: pin.source,
        basis: `Exact ${raw.formNumber} source bytes and measured field: ${expected.reason}`,
      };
    } catch (error) { return fail(error instanceof Error ? error.message : String(error)); }
  };
}

export function caProp64ActorInventoryProblems(familyId, fieldMap, census) {
  if (familyId !== CA_PROP64_FAMILY) return [];
  const problems = [];
  if (!same(fieldMap.completionObligations, CA_PROP64_COMPLETION_OBLIGATIONS)) problems.push({
    counter: "unclassifiedBlanks", why: "Required Prop64 manual completion obligations are missing or changed; legacy classification cannot excuse their omission.",
  });
  const partition = [...(fieldMap.writes ?? []), ...(fieldMap.selections ?? []), ...(fieldMap.refusals ?? [])];
  for (const [form, pin] of Object.entries(SOURCES)) {
    const document = census?.documents?.find((row) => row.formNumber === form);
    if (!document || sha(JSON.stringify(document.fields)) !== pin.fields) {
      problems.push({ counter: "unclassifiedBlanks", why: `${form}: exact source field inventory is missing or changed.` });
      continue;
    }
    for (const field of document.fields) {
      if (partition.filter((row) => row.fieldName === field.name).length !== 1)
        problems.push({ counter: "unclassifiedBlanks", field: field.name, why: "Every exact-source Prop64 field must appear once in the write/selection/refusal partition." });
    }
  }
  for (const row of [...(fieldMap.writes ?? []), ...(fieldMap.selections ?? [])]) {
    const field = census?.documents?.find((document) => document.formNumber === row.formNumber)?.fields?.find((field) => field.name === row.fieldName);
    if (!field) continue; // Existing full-inventory checks diagnose absent source fields.
    // The four existing CR-400 route controls are not third-party acts.
    if (row.formNumber === "CR-400" && /\.(?:FormTitle|LI2)\[0\]/.test(row.fieldName)) continue;
    try {
      const expected = caProp64RefusalDisposition(field, { familyId, formNumber: row.formNumber });
      if (stages.has(expected.completionStage)) problems.push({ counter: "protectedWrites", field: row.fieldName, why: "No actor, signature, service, judicial act or optional waiver may be manufactured by the Prop64 fixture builder." });
    } catch {
      problems.push({ counter: "unclassifiedBlanks", field: row.fieldName, why: "Unregistered Prop64 source field write; requires explicit source-bound review." });
    }
  }
  return problems;
}
