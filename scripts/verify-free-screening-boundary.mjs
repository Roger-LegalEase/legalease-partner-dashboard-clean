#!/usr/bin/env node
/**
 * What free screening actually asks, in every jurisdiction.
 *
 * Field names are not evidence. Missouri's sentence_completion_date reads like
 * an exact date and is a yes/no completion question; its twenty_first_birthday
 * read like a derived value and asked for a date of birth. So this classifies
 * questions by their type and prompt rather than by their id.
 *
 * The surface is not evidence either. The first version of this audit read
 * `projectPublicProfile(profile).questions` and reported 254 violations. That
 * property is the whole question catalogue for a jurisdiction, prepay and
 * postpay together — `postPaymentPacketCompletion` is a categorised view over
 * the same list, not a separate set. Free screening is what
 * `selectScreeningQuestionIds` returns, and every packet field the first pass
 * flagged (court, case_identifier, disposition_date) was never in it. An audit
 * that names the wrong surface produces confident findings about nothing.
 *
 * A participant who names a pathway is shown more than one who names none, so
 * the surface audited is the union of the empty context and every pathway
 * context in the profile.
 *
 * Anonymous screening is not authenticated. Anything it collects is unowned, so
 * it may not carry an exact date, an identity date, a court identifier, a case
 * number, a filing destination or a document.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { selectScreeningQuestionIds } = await import("@/lib/rcap-engine/screening-question-selection");

const DATE_TYPES = new Set(["date", "month_year", "year"]);
const EXACT_DATE_PROMPT = /\b(what date|which date|on what date|when did|when was|date of|exact date)\b/i;
const IDENTITY_DATE = /\b(date of birth|birthday|born)\b/i;
const COURT_IDENTIFIER = /\b(which court|what court|court name|courthouse|division|judicial (district|circuit))\b/i;
const CASE_NUMBER = /\b(case number|docket number|cause number|case no|citation number)\b/i;
const FILING_DESTINATION = /\b(where (will|do) you file|filing location|county (of|to) fil|which county.*fil)\b/i;
const DOCUMENT_UPLOAD = /\b(upload|attach (a|your)|scan)\b/i;

const findings = [];
const record = (code, question, kind, why) => findings.push({
  code, id: question.id, kind, type: question.type, required: question.required === true,
  prompt: String(question.prompt ?? question.text ?? "").slice(0, 90), why
});

let jurisdictions = 0;
let questionsScanned = 0;

/** Every question id free screening can put in front of an anonymous person. */
function screeningQuestionIds(profile, projected) {
  const ids = new Set(selectScreeningQuestionIds(profile, projected, {}));
  for (const pathway of profile.pathways ?? []) {
    for (const id of selectScreeningQuestionIds(profile, projected, { possible_pathway_context: pathway.label })) {
      ids.add(id);
    }
  }
  return ids;
}

function classify(prompt, type) {
  // Type first: a date-typed question asks for a date whatever it is called.
  if (DATE_TYPES.has(String(type))) return IDENTITY_DATE.test(prompt) ? "date_of_birth" : "exact_date";
  if (IDENTITY_DATE.test(prompt)) return "date_of_birth";
  if (EXACT_DATE_PROMPT.test(prompt)) return "exact_date";
  if (CASE_NUMBER.test(prompt)) return "case_number";
  if (COURT_IDENTIFIER.test(prompt)) return "court_identifier";
  if (FILING_DESTINATION.test(prompt)) return "filing_destination";
  if (DOCUMENT_UPLOAD.test(prompt)) return "document_upload";
  return undefined;
}

for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  jurisdictions += 1;
  let projected;
  try {
    projected = projectPublicProfile(profile);
  } catch (error) {
    findings.push({ code, id: "(projection)", kind: "projection_failed", why: String(error.message ?? error) });
    continue;
  }
  let asked;
  try {
    asked = screeningQuestionIds(profile, projected);
  } catch (error) {
    findings.push({ code, id: "(selection)", kind: "selection_failed", why: String(error.message ?? error) });
    continue;
  }
  const byId = new Map(projected.questions.map((question) => [question.id, question]));
  for (const id of asked) {
    const question = byId.get(id);
    if (!question) {
      findings.push({ code, id, kind: "unanswerable_question", why: "free screening asks an id the public profile does not define" });
      continue;
    }
    questionsScanned += 1;
    const kind = classify(String(question.prompt ?? question.text ?? ""), question.type);
    if (kind) record(code, question, kind, `type=${question.type}`);
  }
}

const byKind = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;

console.log(`Free-screening boundary audit: ${jurisdictions} jurisdictions, ${questionsScanned} questions actually asked.`);
for (const [kind, count] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${kind}: ${count}`);
if (findings.length === 0) console.log("  clean");

/**
 * No accepted violations, and none to accept.
 *
 * The first version of this file carried 254 of them — thirteen shared question
 * ids replicated across all 51 jurisdictions — under a long note explaining why
 * they were debt rather than defects. Every one was an artefact of auditing
 * `projectPublicProfile(profile).questions`, the whole question catalogue,
 * instead of what `selectScreeningQuestionIds` puts in front of an anonymous
 * person. Against the real surface the boundary is clean in every jurisdiction.
 *
 * The map stays so that any future exemption has to be written down and argued
 * for in a diff. It is empty, and a stale entry fails the check, so it cannot
 * rot into a permanent exemption.
 */
const ACCEPTED = new Map([]);


const unexpected = findings.filter((f) => !ACCEPTED.has(`${f.code}:${f.id}`));
const stale = [...ACCEPTED.keys()].filter((key) => !findings.some((f) => `${f.code}:${f.id}` === key));

if (process.argv.includes("--report")) {
  for (const f of findings.sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id))) {
    console.log(`  ${f.code} ${f.id} [${f.kind}] required=${f.required} — ${f.prompt}`);
  }
}

if (unexpected.length > 0 || stale.length > 0) {
  console.error("\nFree-screening boundary FAILED:");
  for (const f of unexpected.slice(0, 40)) {
    console.error(`  - ${f.code} ${f.id} is a ${f.kind} in anonymous screening (${f.why}): "${f.prompt}"`);
  }
  if (unexpected.length > 40) console.error(`  - ...and ${unexpected.length - 40} more`);
  for (const key of stale) console.error(`  - ${key} is recorded as an accepted violation but no longer appears; remove it`);
  process.exit(1);
}
/**
 * A clean result is only worth reading if the classifier can fail.
 *
 * The 254-finding version of this audit was confidently wrong about the surface
 * it read. Nothing in that run would have told me so, because every finding was
 * a true statement about the wrong list. So the classifier is exercised here
 * against questions whose correct answer is known, and a clean sweep that a
 * broken classifier could also produce fails the build.
 */
const CLASSIFIER_PROBES = [
  { prompt: "What is your date of birth?", type: "date", expect: "date_of_birth" },
  { prompt: "What was your twenty-first birthday?", type: "date_or_unknown", expect: "date_of_birth" },
  { prompt: "What date did the case end?", type: "text", expect: "exact_date" },
  { prompt: "What is the case number?", type: "text", expect: "case_number" },
  { prompt: "Which court handled the case?", type: "text", expect: "court_identifier" },
  { prompt: "Where will you file the petition?", type: "text", expect: "filing_destination" },
  { prompt: "Please upload your disposition record.", type: "text", expect: "document_upload" },
  { prompt: "Are you at least 22 years old?", type: "yes_no_unsure", expect: undefined },
  { prompt: "Have you finished all court requirements?", type: "yes_no_unsure", expect: undefined },
  { prompt: "How long ago did the case end?", type: "single_choice", expect: undefined }
];
const probeFailures = CLASSIFIER_PROBES
  .map((probe) => ({ probe, got: classify(probe.prompt, probe.type) }))
  .filter(({ probe, got }) => got !== probe.expect);
if (probeFailures.length > 0) {
  console.error("\nFree-screening boundary FAILED: the classifier itself is wrong.");
  for (const { probe, got } of probeFailures) {
    console.error(`  - "${probe.prompt}" (${probe.type}) classified ${got ?? "clean"}, expected ${probe.expect ?? "clean"}`);
  }
  process.exit(1);
}

console.log(`Classifier self-test: ${CLASSIFIER_PROBES.length} probes, ${CLASSIFIER_PROBES.filter((p) => p.expect).length} of them violations it must catch.`);
console.log("Free screening collects no exact date, birth date, court identifier, case number, filing destination or document in any jurisdiction.");
