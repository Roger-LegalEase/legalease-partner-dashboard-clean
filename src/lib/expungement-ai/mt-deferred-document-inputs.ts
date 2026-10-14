import "server-only";
import mtMemo from "../../../data/record-clearing/legal-design-intake/MT.memo.json";
import packetSets from "../../../data/record-clearing/legal-design-packet-set-manifests.json";
import { createHash } from "node:crypto";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import { isMontanaDeferredContract } from "@/lib/rcap-engine/montana-deferred-facts";

export const MT_DEFERRED_DOCUMENT_FAMILY = "mt_deferred_dismissal-set";
export const MT_DEFERRED_DOCUMENT_COMPONENTS = ["primary-filing-1", "certificate-of-service-2", "proposed-order-3", "primary-filing-4", "instructions-5"].map(id => `mt_deferred_dismissal-${id}`);
export const MT_DEFERRED_DOJ_SOURCE_SHA256 = "4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7";
const TRACK_SHA256 = "4ca447e25801f537629f362aa8ee86343a2205a6d7ceac5d2dbf13ed8b84fd4c";
const SET_SHA256 = "40763d419d972c695d1b4d0ddc538ff6973277eea3449eb38e453942bfcb90aa";
const AUTHORITY_SHA256 = "d6ea2cb9d87223ce1da5999f41e54b0e655d519606230b1af5fcd2ce8817c75c";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value) ?? "").digest("hex");

type Snapshot = Pick<ProtectedPacketDraftSnapshot, "schemaVersion" | "jurisdiction" | "pathwayId" | "profileVersion" | "profileSourceFingerprint" | "profileAuthorityFingerprint" | "paymentAllowed" | "selectedTrackId" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">;
export type MontanaDeferredDocumentContract = {
  /** Exact server-loaded adopted track and packet-set objects; not request data. */
  track: unknown;
  packetSet: unknown;
  dojSourceSha256: string;
};
export const MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT: MontanaDeferredDocumentContract = {
  track: mtMemo.tracks.find(track => track.trackId === "mt_deferred_dismissal"),
  packetSet: packetSets.packetSets.find(set => set.packetSetId === MT_DEFERRED_DOCUMENT_FAMILY),
  dojSourceSha256: MT_DEFERRED_DOJ_SOURCE_SHA256
};
export type MontanaDeferredDocumentMapping = {
  status: "not_applicable" | "needs_facts" | "source_review" | "mapped_for_review";
  stage: "court_motion" | "doj_after_order" | null;
  familyId: typeof MT_DEFERRED_DOCUMENT_FAMILY;
  componentIds: string[];
  missingFactIds: string[];
  reviewReasons: string[];
  /** Names match the existing MT family renderer, not guessed aliases. */
  inputs: Record<string, string | boolean>;
  inputSources: Record<string, string[]>;
  /** No mapping result grants a route, execution, payment or delivery. */
  generationAllowed: false;
  paymentAllowed: false;
  verificationAuthority: false;
};

/** Exact participant-owned meaning pairs. No aggregate contact parsing, actor
 * substitution, name folding, phone inference or email case normalization. */
export const MT_DEFERRED_PARTICIPANT_ALIASES: Record<string, string> = {
  fullName: "participant_full_legal_name", dateOfBirth: "date_of_birth",
  mailingAddress: "mailing_address", phone: "phone_number", email: "email_address"
};
export function montanaDeferredAliasDisplay(snapshot: Pick<Snapshot, "screeningAnswers" | "prefilledAnswers" | "packetAnswers">): Record<string, unknown> {
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const projected: Record<string, unknown> = {};
  for (const [id, alias] of Object.entries(MT_DEFERRED_PARTICIPANT_ALIASES)) {
    if (maps.some(map => Object.hasOwn(map, id))) continue;
    const supplied = maps.filter(map => Object.hasOwn(map, alias)).map(map => map[alias]);
    if (!supplied.length) continue;
    const values = supplied.map(knownValue);
    if (values.every(value => typeof value === "string" && value.trim() && !UNKNOWN.test(value.trim()))
      && values.every(value => sameDocumentValue(id, value, values[0]))) projected[id] = supplied[0];
  }
  return projected;
}
const COMMON_FIELDS = ["fullName", "dateOfBirth", "mailingAddress", "phone", "email", "chargeName", "arrestDate"];
const COURT_FIELDS = ["sentencingCourtLevel", "courtName", "sentencingCounty", "caseNumber", "pleaOrVerdict", "sentencingDate", "prosecutingOffice", "prosecutorAddress", "prosecutorEmail"];
const DATES = new Set(["dateOfBirth", "arrestDate", "sentencingDate"]);
const UNKNOWN = /^(unknown|i am not sure|not sure)$/i;
function knownValue(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const wrapper = raw as Record<string, unknown>;
    if (wrapper.unknown !== false || !Object.hasOwn(wrapper, "value") || Object.keys(wrapper).some(key => !["value", "unknown"].includes(key))) return undefined;
    return wrapper.value;
  }
  return raw;
}
function printedDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const printed = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const [year, month, day] = iso ? iso.slice(1) : printed ? [printed[3], printed[1], printed[2]] : [];
  if (!year) return null;
  const stamp = `${year}-${month}-${day}`, parsed = new Date(`${stamp}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === stamp ? `${month}/${day}/${year}` : null;
}

function sameDocumentValue(id: string, a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (DATES.has(id) && typeof a === "string" && typeof b === "string") {
    const first = printedDate(a), second = printedDate(b);
    return first !== null && first === second;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Pure document mapping after existing protected-record integrity and current
 * reevaluation checks. It does not select a composed track or authorize output.
 * The accepted synthetic renderer is not a participant runtime: these named
 * inputs are its contract, with explicit court/DOJ component boundaries.
 * Collection of missing inputs belongs to the existing protected preparation
 * surface, not anonymous screening. Signing, service, orders and attachments
 * remain later human tasks, never fabricated answers or mandatory uploads.
 */
export function montanaDeferredDocumentInputs(snapshot: Snapshot, current: {
  profile: EngineProfile;
  profileAuthorityFingerprint: string;
  contract: MontanaDeferredDocumentContract;
}): MontanaDeferredDocumentMapping {
  const out: MontanaDeferredDocumentMapping = { status: "not_applicable", stage: null,
    familyId: MT_DEFERRED_DOCUMENT_FAMILY, componentIds: [], missingFactIds: [], reviewReasons: [],
    inputs: {}, inputSources: {}, generationAllowed: false, paymentAllowed: false, verificationAuthority: false };
  const { profile, contract } = current;
  if (!isMontanaDeferredContract(profile, snapshot.pathwayId) || snapshot.jurisdiction !== "MT"
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || current.profileAuthorityFingerprint !== AUTHORITY_SHA256 || snapshot.profileAuthorityFingerprint !== AUTHORITY_SHA256
    || snapshot.paymentAllowed !== false || snapshot.selectedTrackId !== null
    || digest(contract.track) !== TRACK_SHA256 || digest(contract.packetSet) !== SET_SHA256
    || contract.dojSourceSha256 !== MT_DEFERRED_DOJ_SOURCE_SHA256) return out;
  out.status = "needs_facts";
  const missing = new Set<string>(), conflicts = new Set<string>();
  const suppliedKeys = new Map<string, string[]>();
  const answer = (id: string): unknown => {
    const keys = [id, ...(MT_DEFERRED_PARTICIPANT_ALIASES[id] ? [MT_DEFERRED_PARTICIPANT_ALIASES[id]] : [])];
    const supplied = keys.flatMap(key => [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers]
      .filter(map => Object.hasOwn(map, key)).map(map => ({ key, value: knownValue(map[key]) })));
    if (!supplied.length) return undefined;
    suppliedKeys.set(id, [...new Set(supplied.map(entry => entry.key))]);
    if (supplied.some(entry => !sameDocumentValue(id, entry.value, supplied[0].value))) { conflicts.add(id); return undefined; }
    return supplied[0].value;
  };
  const choice = (id: string, options: readonly string[]): string | undefined => {
    const value = answer(id);
    if (typeof value !== "string" || !options.includes(value)) { missing.add(id); return undefined; }
    return value;
  };
  const flag = (id: string): boolean | undefined => {
    const raw = answer(id);
    const value = raw === "Yes" ? true : raw === "No" ? false : raw;
    if (typeof value !== "boolean") { missing.add(id); return undefined; }
    return value;
  };
  const put = (key: string, value: string | boolean, ...sources: string[]) => { out.inputs[key] = value; out.inputSources[key] = [...new Set(sources.flatMap(source => suppliedKeys.get(source) ?? [source]))]; };
  const order = choice("mt_deferred_order_type", ["deferred", "suspended", "other"]);
  if (order && order !== "deferred") out.reviewReasons.push("not_a_deferred_imposition");
  const dismissed = choice("mt_deferred_dismissal_order", ["yes", "no"]);
  if (order === "deferred" && dismissed) {
    out.stage = dismissed === "yes" ? "doj_after_order" : "court_motion";
    out.componentIds = out.stage === "court_motion" ? [0, 1, 2, 4].map(i => MT_DEFERRED_DOCUMENT_COMPONENTS[i])
      : [3, 4].map(i => MT_DEFERRED_DOCUMENT_COMPONENTS[i]);
    put("deferredNotSuspended", true, "mt_deferred_order_type");
    put("alreadyDismissed", dismissed === "yes", "mt_deferred_dismissal_order");
    // These are the adopted self-help boundaries, not new legal eligibility
    // conclusions. The source does not permit assuming citizenship or denial.
    const citizen = flag("citizenshipConfirmed"), denial = flag("denialQuestion");
    if (citizen === false) out.reviewReasons.push("noncitizen_requires_qualified_advice");
    if (denial === true) out.reviewReasons.push("denial_of_charge_question_requires_qualified_advice");
    if (citizen !== undefined) put("citizenshipConfirmed", citizen, "citizenshipConfirmed");
    if (denial !== undefined) put("denialQuestion", denial, "denialQuestion");
    for (const id of [...COMMON_FIELDS, ...(out.stage === "court_motion" ? COURT_FIELDS : [])]) {
      const value = answer(id);
      if (typeof value !== "string" || !value.trim() || UNKNOWN.test(value.trim())) { missing.add(id); continue; }
      const text = DATES.has(id) ? printedDate(value) : value;
      if (!text) { missing.add(id); continue; }
      put(id, text, id);
    }
    const dateOrder = ["dateOfBirth", "arrestDate", ...(out.stage === "court_motion" ? ["sentencingDate"] : [])];
    const isoDate = (value: string) => `${value.slice(6)}-${value.slice(0, 2)}-${value.slice(3, 5)}`;
    for (let index = 1; index < dateOrder.length; index++) {
      const before = out.inputs[dateOrder[index - 1]], after = out.inputs[dateOrder[index]];
      if (typeof before === "string" && typeof after === "string" && isoDate(before) > isoDate(after)) {
        out.reviewReasons.push(`contradictory_date_order:${dateOrder[index - 1]}:${dateOrder[index]}`);
      }
    }
    if (out.stage === "court_motion") {
      const grade = choice("mt_deferred_offense_grade", ["felony", "misdemeanor"]);
      if (grade) put("chargeClass", grade, "mt_deferred_offense_grade"); // never original charge grade
      const term = choice("mt_deferred_term_status", ["expired", "terminated_by_order", "still_running"]);
      if (term === "expired") put("deferralPeriodExpired", true, "mt_deferred_term_status");
      if (term === "still_running") out.reviewReasons.push("deferral_period_not_terminated");
      // Existing accepted output explicitly alleges an expired period. An
      // existing early-termination order is legally distinct and must not be
      // encoded as expiration just to fit those already accepted PDF bytes.
      if (term === "terminated_by_order") out.reviewReasons.push("court_terminated_remaining_time_requires_distinct_allegation");
      const conditions = choice("mt_deferred_conditions_status", ["yes", "no"]);
      const money = choice("mt_deferred_financial_order_status", ["paid", "waived_by_order", "none_ordered", "balance_remaining"]);
      if (conditions === "no" || money === "balance_remaining") out.reviewReasons.push("current_conditions_or_financial_orders_unresolved");
      if (conditions === "yes" && money && money !== "balance_remaining") put("conditionsCompleted", true, "mt_deferred_conditions_status", "mt_deferred_financial_order_status");
      // The adopted drafted motion alleges no revocation on both limbs and
      // requires clerk confirmation. Misdemeanor status guidance alone does
      // not establish that stronger document allegation.
      const revocation = choice("mt_deferred_revocation_petition", ["yes", "no"]);
      if (revocation === "yes") out.reviewReasons.push("filed_revocation_requires_document_review");
      const clerk = flag("clerkContacted"), confirmed = flag("revocationConfirmedByClerk"), record = flag("recordConfirmed");
      if (clerk === false) missing.add("clerkContacted");
      if (confirmed === false) missing.add("revocationConfirmedByClerk");
      if (record === false) missing.add("recordConfirmed");
      if (revocation === "no" && clerk === true && confirmed === true && record === true) put("revocationPetitionFiled", false, "mt_deferred_revocation_petition", "clerkContacted", "revocationConfirmedByClerk", "recordConfirmed");
      if (clerk === true) put("clerkContacted", true, "clerkContacted");
      if (record === true) put("recordConfirmed", true, "recordConfirmed");
      for (const [id, reason] of [["earlyTermination", "seeking_early_termination"], ["localFormOverride", "court_specific_procedure_or_form"], ["disputedCompletion", "disputed_completion" ]] as const) {
        const value = flag(id);
        if (value === true) out.reviewReasons.push(reason);
        if (value !== undefined) put(id, value, id);
      }
      if (out.inputs.sentencingCourtLevel && !["district", "justice", "municipal_city"].includes(String(out.inputs.sentencingCourtLevel))) missing.add("sentencingCourtLevel");
      if (out.inputs.pleaOrVerdict && !["guilty", "nolo contendere", "verdict"].includes(String(out.inputs.pleaOrVerdict))) missing.add("pleaOrVerdict");
    } else {
      // DOJ stage selects only the retained official request, never a new
      // motion/proposed order or another request category. Court-owned dates,
      // signatures and the dismissal order itself are never mapped as facts.
      put("deferredImposition", true, "mt_deferred_order_type", "mt_deferred_dismissal_order");
    }
  }
  out.missingFactIds = [...missing];
  if (conflicts.size) out.reviewReasons.push(...[...conflicts].map(id => `conflicting_protected_fact:${id}`));
  out.status = out.reviewReasons.length ? "source_review" : missing.size ? "needs_facts" : "mapped_for_review";
  return out;
}
