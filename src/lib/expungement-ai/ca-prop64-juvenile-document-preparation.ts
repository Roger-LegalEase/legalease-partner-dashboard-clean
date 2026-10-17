import "server-only";
import { createHash } from "node:crypto";
import spec from "../../../data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json";
import caMemo from "../../../data/record-clearing/legal-design-intake/CA.memo.json";
import packetSets from "../../../data/record-clearing/legal-design-packet-set-manifests.json";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { caProp64ContactFacts } from "@/lib/expungement-ai/ca-prop64-contact-questions";
import { caProp64JuvenileDocumentQuestions, caProp64JuvenileAdditionalCount, CA_JUVENILE_SECTIONS } from "@/lib/expungement-ai/ca-prop64-juvenile-document-questions";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const bytesHash = (x: Uint8Array) => createHash("sha256").update(x).digest("hex");
const UNKNOWN = /^(unknown|i am not sure|not sure|no sé|no se|no estoy segur[oa])$/i;
function value(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const x = raw as Record<string, unknown>;
    if (Object.keys(x).some(k => k !== "value" && k !== "unknown") || x.unknown === true
      || x.unknown !== undefined && x.unknown !== false || !Object.hasOwn(x, "value")) return undefined;
    return x.value;
  }
  return raw;
}
function date(raw: unknown, today: string): string | undefined {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
  const d = new Date(raw + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === raw && raw <= today ? raw : undefined;
}
/** Collection scope only, after the caller has verified the protected source and
 * current route authority. It grants no plan, verification or document authority. */
export function caProp64JuvenilePreparationScope(snapshot: ProtectedPacketVerificationRecord["draftSnapshot"]) {
  if (!snapshot || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || !isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId)
    || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed !== false
    || snapshot.packetPlan !== null || snapshot.selectedTrackId !== null
    || digest(caMemo.tracks.find(t => t.trackId === "ca-prop64")) !== spec.sourceContract.trackSha256
    || digest(packetSets.packetSets.find(s => s.packetSetId === "ca-prop64-set")) !== spec.sourceContract.packetSetSha256) return false;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  return [["ca_prop64_court_type", "juvenile"], ["ca_prop64_next_step", "apply"]].every(([id, expected]) => {
    const values = maps.filter(m => Object.hasOwn(m, id)).map(m => value(m[id]));
    return values.length > 0 && values.every(v => v === expected);
  });
}

/** A held source mapper after the existing protected model's integrity/source
 * check. The caller still needs an authorized record read. Only the explicit
 * juvenile preparation surface may edit these document facts.
 * It never changes the current juvenile legal result, plan or verification. */
export function caProp64JuvenileDocumentPreparation(record: ProtectedPacketVerificationRecord,
  officialSources: Readonly<Record<string, Uint8Array>>) {
  const model = protectedPacketInformationModelFor(record), snapshot = record.draftSnapshot;
  if (!model || !isCaProp64Pathway(model.stateCode, model.pathwayId)
    || digest(caMemo.tracks.find(t => t.trackId === "ca-prop64")) !== spec.sourceContract.trackSha256
    || digest(packetSets.packetSets.find(s => s.packetSetId === "ca-prop64-set")) !== spec.sourceContract.packetSetSha256) return null;
  const missing = new Set<string>(), conflicts = new Set<string>(), review = new Set<string>();
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const answer = (id: string): unknown => {
    const found = maps.filter(m => Object.hasOwn(m, id)).map(m => value(m[id]));
    if (found.some(x => JSON.stringify(x) !== JSON.stringify(found[0]))) { conflicts.add(id); return; }
    return found[0];
  };
  if (answer("ca_prop64_court_type") !== "juvenile" || answer("ca_prop64_next_step") !== "apply") return null;
  for (const source of spec.documents) {
    if (!officialSources[source.documentId] || bytesHash(officialSources[source.documentId]) !== source.sourceSha256) return null;
  }
  const today = snapshot.capturedAt.slice(0, 10);
  const text = (id: string, required = true): string | undefined => {
    const x = answer(id);
    if (typeof x !== "string" || !x.trim() || UNKNOWN.test(x.trim()) || /[\x00-\x1f\x7f]/.test(x)) { if (required) missing.add(id); return; }
    return x;
  };
  const pick = (id: string, choices: readonly string[], required = true) => {
    const x = text(id, required); if (x && choices.includes(x)) return x;
    if (required) missing.add(id); else if (x) review.add("unrecognized_optional_election:" + id);
    return undefined;
  };
  const dated = (id: string) => { const d = date(answer(id), today); if (!d) missing.add(id); return d; };
  const facts: Record<string, string> = {}, sourceWrites: Array<{ documentId: string; instance: number; field: string; value: string | boolean; sourceFactId: string }> = [];
  const put = (documentId: string, fieldSuffix: string, val: string | boolean | undefined, sourceFactId: string, instance = 0) => {
    if (val === undefined) return;
    const field = spec.documents.find(d => d.documentId === documentId)?.fields.filter(f => f.field.endsWith(fieldSuffix));
    if (field?.length !== 1 || ["court", "prosecutor", "participant_at_signing", "source_ui_removed_at_finalization"].includes(field[0].actor)) throw new Error("Unreviewed juvenile document destination");
    sourceWrites.push({ documentId, instance, field: field[0].field, value: val, sourceFactId });
  };
  const name = text("ca_prop64_juvenile_full_name"), caseName = text("ca_prop64_juvenile_case_name"), caseNumber = text("ca_prop64_juvenile_case_number");
  const birth = dated("ca_prop64_juvenile_date_of_birth"), offense = dated("ca_prop64_offense_date"), age = answer("ca_prop64_age_at_offense");
  if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age >= 18) review.add("juvenile_age_at_conduct_unresolved");
  if (birth && offense) {
    const years = Number(offense.slice(0, 4)) - Number(birth.slice(0, 4)) - (offense.slice(5) < birth.slice(5) ? 1 : 0);
    if (birth > offense || years !== age || years >= 18) review.add("birth_offense_age_conflict");
  }
  if (answer("ca_prop64_existing_relief") !== "none") review.add("prior_relief_requires_count_specific_order_comparison");
  const disposition = pick("ca_prop64_juvenile_disposition", ["probation", "completed", "other"]);
  if (disposition === "other") review.add("actual_disposition_requires_source_review");
  const branch = answer("ca_prop64_branch");
  if (disposition && (disposition === "probation" ? branch !== "currently-serving petition" : disposition === "completed" && branch !== "completed-sentence application")) review.add("juvenile_disposition_branch_conflict");
  const county = text("ca_prop64_filing_court_county"), representation = pick("ca_prop64_filer_representation", ["self_represented", "attorney"]);
  for (const id of ["ca_prop64_filer_contact", "ca_prop64_court_address"]) answer(id);
  const contact = caProp64ContactFacts(model.initialAnswers);
  if (name !== answer("participant_full_legal_name") || caseNumber !== answer("ca_prop64_court_case_number")) review.add("juvenile_caption_contact_context_not_confirmed");
  const actor = representation === "attorney" ? "attorney" : "participant";
  for (const id of [`${actor}.street_address`, `${actor}.city`, `${actor}.state`, `${actor}.zip`, `${actor}.phone`, "court.street_address", "court.city_state_zip"]) if (!contact.facts[id]) missing.add(id);
  if (representation === "attorney") for (const id of ["attorney.full_legal_name", "attorney.bar_number"]) if (!contact.facts[id]) missing.add(id);
  Object.assign(facts, contact.facts);
  for (const [id, val] of Object.entries({ "participant.full_legal_name": name, "matter.case_name": caseName, "matter.case_number": caseNumber, "matter.county": county })) if (val) facts[id] = val;
  for (const documentId of ["JV-744", "JV-746"]) {
    for (const [suffix, val, fact] of [["CaseName_ft[0]", caseName, "ca_prop64_juvenile_case_name"], ["CaseNumber_ft[0]", caseNumber, "ca_prop64_juvenile_case_number"]] as const) {
      for (const field of spec.documents.find(d => d.documentId === documentId)!.fields.filter(f => f.actor === "neutral_caption" && f.field.endsWith(suffix))) if (val !== undefined) sourceWrites.push({ documentId, instance: 0, field: field.field, value: val!, sourceFactId: fact });
    }
    const bindings: Record<string, string> = { "CrtCounty_ft[0]": "matter.county", "CourtInfo[0].Street_ft[0]": "court.street_address", "MailingAdd_ft[0]": "court.mailing_address", "CityZip_ft[0]": "court.city_state_zip", "AttyName_ft[0]": `${actor}.full_legal_name`, "AttyStreet_ft[0]": `${actor}.street_address`, "AttyCity_ft[0]": `${actor}.city`, "AttyState_ft[0]": `${actor}.state`, "AttyZip_ft[0]": `${actor}.zip`, "Phone_ft[0]": `${actor}.phone`, "Fax_ft[0]": `${actor}.fax`, "Email_ft[0]": `${actor}.email`, ...(representation === "attorney" ? { "AttyBarNo_dc[0]": "attorney.bar_number", "AttyFirm_ft[0]": "attorney.firm", "AttyFor_ft[0]": "attorney.represented_party" } : {}) };
    for (const [suffix, fact] of Object.entries(bindings)) put(documentId, suffix, facts[fact], fact);
  }
  put("JV-744", "TextField4[0]", name, "ca_prop64_juvenile_full_name");put("JV-744", "TextField4[1]", birth, "ca_prop64_juvenile_date_of_birth");
  const findings: Array<{ date: string; conductDate: string; ageAtConduct: number; sections: string[] }> = [];
  const readFinding = (index: number) => {
    const prefix = index ? `ca_prop64_juvenile_additional_${index}` : "ca_prop64_juvenile_finding", when = dated(prefix + "_date"), raw = answer(prefix + "_sections");
    const sections = Array.isArray(raw) && raw.length > 0 && new Set(raw).size === raw.length && raw.every(x => typeof x === "string" && CA_JUVENILE_SECTIONS.includes(x as typeof CA_JUVENILE_SECTIONS[number])) ? raw as string[] : undefined;
    if (!sections) missing.add(prefix + "_sections");
    const conduct = index === 0 ? offense : dated(prefix + "_conduct_date");
    const years = conduct && birth ? Number(conduct.slice(0, 4)) - Number(birth.slice(0, 4)) - (conduct.slice(5) < birth.slice(5) ? 1 : 0) : undefined;
    if (conduct && birth && (conduct < birth || years === undefined || years < 0 || years >= 18)) review.add("finding_conduct_not_under_18:" + index);
    if (when && conduct && when < conduct) review.add("adjudication_precedes_conduct:" + index);
    if (when && birth && when < birth) review.add("adjudication_precedes_birth:" + index);
    if (when && sections && conduct && years !== undefined && years >= 0 && years < 18 && conduct >= birth!) findings.push({ date: when, conductDate: conduct, ageAtConduct: years, sections });
    return { when, sections, prefix };
  };
  const primary = readFinding(0);
  put("JV-744", "DateField1[0]", primary.when, primary.prefix + "_date");
  for (const section of primary.sections ?? []) put("JV-744", `petitioner_cb[${5 + CA_JUVENILE_SECTIONS.indexOf(section as typeof CA_JUVENILE_SECTIONS[number])}]`, true, primary.prefix + "_sections");
  const additionalScope = pick("ca_prop64_juvenile_additional_scope", ["none", "same_case_remedy", "separate"]);
  if (additionalScope === "separate") review.add("separate_JV744_required_for_other_case_or_remedy");
  let additionalCount = 0;
  if (additionalScope === "same_case_remedy") {
    const count = caProp64JuvenileAdditionalCount(answer("ca_prop64_juvenile_additional_count"));
    if (count === undefined) missing.add("ca_prop64_juvenile_additional_count");
    else additionalCount = count;
  }
  const suppliedIndexes = [...new Set(maps.flatMap(m => Object.keys(m)).flatMap(id => { const found = /^ca_prop64_juvenile_additional_(\d+)_(conduct_date|date|sections)$/.exec(id); return found ? [Number(found[1])] : []; }))].filter(index => Number.isSafeInteger(index) && index >= 1 && index <= additionalCount).sort((a, b) => a - b);
  if (suppliedIndexes.length < additionalCount) missing.add("ca_prop64_juvenile_additional_findings");
  for (const index of suppliedIndexes) {
    const finding = readFinding(index), slot = (index - 1) % spec.attachmentRows, instance = Math.floor((index - 1) / spec.attachmentRows);
    put("JV-744A", "CaseName_ft[0]", caseName, "ca_prop64_juvenile_case_name", instance);put("JV-744A", "CaseNumber_ft[0]", caseNumber, "ca_prop64_juvenile_case_number", instance);
    put("JV-744A", `DateField1[${slot}]`, finding.when, finding.prefix + "_date", instance);
    for (const section of finding.sections ?? []) put("JV-744A", `petitioner_cb[${slot * 4 + CA_JUVENILE_SECTIONS.indexOf(section as typeof CA_JUVENILE_SECTIONS[number])}]`, true, finding.prefix + "_sections", instance);
  }
  if (additionalCount) put("JV-744", "petitioner_cb[9]", true, "ca_prop64_juvenile_additional_scope");
  if (disposition === "probation" || disposition === "completed") put("JV-744", `petitioner_cb[${disposition === "probation" ? 2 : 0}]`, true, "ca_prop64_juvenile_disposition");
  const hearing = pick("ca_prop64_juvenile_hearing", ["none", "opposed", "always"], false);
  if (hearing === "opposed" || hearing === "always") put("JV-744", `petitioner_cb[${hearing === "opposed" ? 1 : 4}]`, true, "ca_prop64_juvenile_hearing");
  for (const [id, control] of [["ca_prop64_juvenile_appearance_waiver", 3], ["ca_prop64_juvenile_original_judge_waiver", 11]] as const) if (pick(id, ["yes", "no"], false) === "yes") put("JV-744", `petitioner_cb[${control}]`, true, id);
  const interpreter = pick("ca_prop64_juvenile_interpreter", ["yes", "no"], false);
  if (interpreter === "yes") { const language = text("ca_prop64_juvenile_interpreter_language"); if (language) { put("JV-744", "petitioner_cb[10]", true, "ca_prop64_juvenile_interpreter");put("JV-744", "TextField5[0]", language, "ca_prop64_juvenile_interpreter_language"); } }
  const uniqueWrites = sourceWrites.filter((item, i) => sourceWrites.findIndex(other => other.documentId === item.documentId && other.instance === item.instance && other.field === item.field) === i);
  return { schemaVersion: "ca-prop64/juvenile-document-preparation/v1", reviewOnly: true, status: conflicts.size || review.size ? "source_review" : missing.size ? "needs_facts" : "mapped_for_review",
    pathwayId: model.pathwayId, revision: model.revision, capturedAt: model.capturedAt, originalResultCode: model.resultCode,
    facts, findings, sourceWrites: conflicts.size || review.size || missing.size ? [] : uniqueWrites, missingFactIds: [...missing], conflictingFactIds: [...conflicts], reviewReasons: [...review],
    attachmentCount: Math.ceil(additionalCount / 6), serviceActor: representation ? spec.serviceActors[representation as "attorney" | "self_represented"] : null,
    questions: caProp64JuvenileDocumentQuestions(model.initialAnswers), sourceDocuments: spec.documents.map(({ documentId, sourceSha256 }) => ({ documentId, sourceSha256 })),
    generationAllowed: false, paymentAllowed: false, verificationAuthority: false, authorizedDeliveryEstablished: false,
    remainingRequirements: spec.limits };
}
