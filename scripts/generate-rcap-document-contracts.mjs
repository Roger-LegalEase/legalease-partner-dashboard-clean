#!/usr/bin/env node
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
// Populates the explicit document contract on every packet specification.
//
//   node scripts/generate-rcap-document-contracts.mjs           # write
//   node scripts/generate-rcap-document-contracts.mjs --check    # verify
//
// The contract's attributes are derived or read from sources that already exist
// in the repository. Nothing here invents a value:
//
//   instrumentClass, signer, recipient, orderTreatment  from documents[].role
//   formApplicability                                   from documents[].outputStrategy
//   preparedBy                                          from the specification itself
//   executionType, serviceTreatment                     from the route's pleading config
//
// Everything else is recorded UNRESOLVED with the reason. An unresolved
// attribute that its document type requires makes the component fail closed;
// that is the point, and it is not repaired by guessing here. It is repaired by
// the route's own remediation, against its own sources.
//
// This changes specificationSha256 for every specification it touches, including
// the six the Grade-A registry pins. That is expected: the corrected successor
// carries new bytes, the old approvals stay bound to the old bytes, and fresh
// acceptance is obtained for the successor. Old approval is not carried forward.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = path.join(rootDir, "data/record-clearing/packet-specifications");
const checkOnly = process.argv.includes("--check");

const UNRESOLVED = "unresolved";

const INSTRUMENT_BY_ROLE = {
  primary_filing: "participant_filing",
  enforcement_motion: "participant_filing",
  declaration_and_verification: "participant_filing",
  verification: "participant_filing",
  proposed_order: "proposed_order",
  certificate_of_service: "certificate_of_service",
  certificate_of_service_and_attachment_checklist: "certificate_of_service",
  prosecutor_service: "certificate_of_service",
  attachment: "attachment",
  records_checklist: "attachment",
  filing_instructions: "participant_guidance",
  filing_and_service_instructions: "participant_guidance",
  filing_and_next_steps: "participant_guidance",
  instructions: "participant_guidance",
  process_guidance: "participant_guidance",
  referral_instructions: "participant_guidance",
  service_instructions: "participant_guidance",
  record_gathering_instructions: "participant_guidance",
  objection_and_hearing_instructions: "participant_guidance",
  post_order_verification: "participant_guidance",
  legal_effect_explanation: "participant_guidance",
  cover_and_contents: "participant_guidance",
  detection_and_routing: "participant_guidance",
  branch_screen: "participant_guidance",
  discharge_type_screen: "participant_guidance",
  fingerprint_step: "participant_guidance"
};
const SIGNER = {
  participant_filing: "participant", proposed_order: "judge",
  certificate_of_service: "participant", attachment: "none",
  correspondence: "participant", participant_guidance: "none"
};
const RECIPIENT = {
  participant_filing: "court", proposed_order: "court",
  certificate_of_service: "court", attachment: "court",
  correspondence: "agency", participant_guidance: "participant"
};

/** Every pleading config in the repository, indexed by trackId. */
function pleadingConfigsByTrack() {
  const byTrack = new Map();
  const roots = [
    path.join(rootDir, "data/rcap-all50/pleadings"),
    path.join(rootDir, "data/rcap-all50/composed-routes")
  ];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "pleading-config.json") {
        try {
          const parsed = JSON.parse(fs.readFileSync(full, "utf8"));
          const config = parsed.config ?? parsed;
          const trackId = config.trackId ?? path.basename(path.dirname(full));
          if (!byTrack.has(trackId)) byTrack.set(trackId, config);
        } catch { /* an unreadable config supplies nothing; it stays unresolved */ }
      }
    }
  };
  for (const root of roots) walk(root);
  return byTrack;
}

/**
 * The TypeScript pleading configs, which several jurisdictions use instead of a
 * JSON one. Omitting them would record "no source states how this is executed"
 * for routes whose source says so plainly -- a false unresolved, which is worse
 * than a missing one because it refuses a component for no real reason.
 */
async function typescriptPleadingConfigs(byTrack) {
  const modules = [
    "src/lib/record-clearing/pennsylvania-config.ts",
    "src/lib/record-clearing/dc-config.ts",
    "src/lib/record-clearing/oklahoma-config.ts",
    "src/lib/record-clearing/wyoming-config.ts",
    "src/lib/record-clearing/north-dakota-config.ts",
    "src/lib/record-clearing/north-dakota-nonconviction-config.ts",
    "src/lib/rcap/state-packs/north-dakota/grade-a/pleading-config.ts"
  ];
  for (const specifier of modules) {
    let namespace;
    try { namespace = await import(path.join(rootDir, specifier)); } catch { continue; }
    const visit = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      if (typeof value.trackId === "string" && value.templateGrade) {
        if (!byTrack.has(value.trackId)) byTrack.set(value.trackId, value);
        return;
      }
      for (const inner of Object.values(value)) visit(inner);
    };
    for (const exported of Object.values(namespace)) visit(exported);
  }
  return byTrack;
}

/**
 * The packet-set manifests are the canonical relationship between a
 * specification and its route: they key on the SAME trackId the specifications
 * use, which the pleading configs do not, and they record what the participant
 * must actually do as participantActionRequired[].
 *
 * 17 of 19 specifications join here. That is the authoritative relationship the
 * contract is populated from; the pleading configs were the wrong side of a
 * different identifier space.
 */
function packetSetManifestsByTrack() {
  const file = path.join(rootDir, "data/record-clearing/legal-design-packet-set-manifests.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const byTrack = new Map();
  const bySet = new Map();
  for (const set of manifest.packetSets ?? []) {
    if (set.trackId) byTrack.set(set.trackId, set);
    if (set.packetSetId) bySet.set(set.packetSetId, set);
  }
  return { byTrack, bySet };
}

/** A description that says the requirement was not established, rather than stating one. */
const NOT_ESTABLISHED = /not established|none required|does not state|no source|none on the archived|not applicable/i;
/** A description that records genuine ambiguity, which must stay unresolved. */
const AMBIGUOUS = /does not clearly state|unclear|unresolved|confirm with the clerk/i;

/**
 * Execution, from what the participant is recorded as having to do.
 *
 * A notarisation requirement that the source review could not establish is not a
 * notarisation requirement. A signature the participant must also verify is a
 * verified filing. Neither is inferred from a template.
 */
function executionFrom(set) {
  if (!set) return [UNRESOLVED, "no packet-set manifest joins this specification, so execution is not established."];
  const actions = set.participantActionRequired ?? [];
  const notarize = actions.find((a) => a.kind === "notarize");
  const sign = actions.find((a) => a.kind === "sign");
  const signStatesVerification = /verif/i.test(String(sign?.description ?? ""));
  if (notarize && !NOT_ESTABLISHED.test(String(notarize.description ?? ""))) {
    // An unsettled NOTARISATION question does not make EXECUTION unresolved when
    // the signing action already establishes verification. Wyoming is the case:
    // "Verification is required by statute; confirm with the clerk ... whether"
    // -- the verification is established by statute and the notary is a local
    // practice question, which belongs to localVariant, not to execution.
    if (AMBIGUOUS.test(String(notarize.description ?? ""))) {
      if (signStatesVerification) return ["verified", null];
      return [UNRESOLVED, `notarisation is recorded but not settled: "${String(notarize.description).slice(0, 120)}"`];
    }
    return ["sworn_notarised", null];
  }
  if (sign) return [signStatesVerification ? "verified" : "signature", null];
  return [UNRESOLVED, "the packet-set manifest records no signing action for this route."];
}

/** Service, from the recorded service action. */
function serviceFrom(set) {
  if (!set) return [UNRESOLVED, "no packet-set manifest joins this specification, so service treatment is not established."];
  const serve = (set.participantActionRequired ?? []).find((a) => a.kind === "serve_party");
  if (!serve) return ["no_service", null];
  const description = String(serve.description ?? "");
  if (AMBIGUOUS.test(description)) {
    return [UNRESOLVED, `who serves is not settled for this route: "${description.slice(0, 120)}"`];
  }
  if (/\bclerk\b/i.test(description) && !/by the (petitioner|participant|movant)/i.test(description)) {
    return ["clerk_serves", null];
  }
  return ["participant_serves", null];
}

function contractFor(document, spec, configs) {
  const reasons = {};
  const instrumentClass = INSTRUMENT_BY_ROLE[document.role] ?? UNRESOLVED;
  if (instrumentClass === UNRESOLVED) {
    reasons.instrumentClass = `role "${document.role}" is not a recorded instrument class.`;
  }
  const formApplicability =
    document.outputStrategy === "official_pdf_fill" ? "official_form_required"
      : document.outputStrategy === "custom_pleading" ? "custom_document_permitted"
        : document.outputStrategy === "process_guidance" ? "not_a_filing" : UNRESOLVED;
  if (formApplicability === UNRESOLVED) {
    reasons.formApplicability = `outputStrategy "${document.outputStrategy}" does not state form applicability.`;
  }

  // Specifications key on a packet-family id ("ms-nonconv") and pleading configs
  // on a route track id, so a single join misses. Try every identifier the
  // specification carries before recording that no source states a value: a
  // false unresolved refuses a component for a lookup failure, which is a worse
  // error than a missing one because it looks like a finding.
  const set = configs.byTrack.get(spec.trackId) ?? configs.bySet.get(spec.packetSetId);
  const guidance = instrumentClass === "participant_guidance";
  const [executionType, executionWhy] = guidance ? ["none", null] : executionFrom(set);
  if (executionWhy) reasons.executionType = executionWhy;
  const [serviceTreatment, serviceWhy] = guidance ? ["no_service", null] : serviceFrom(set);
  if (serviceWhy) reasons.serviceTreatment = serviceWhy;

  // Case mode, from the specification's own required facts. A route that must
  // copy a case or cause number from the docket is filed into that existing
  // case; that is what the fact is for. A route that requires no such number is
  // not thereby a new case -- it stays unresolved rather than being assumed.
  const factIds = new Set((spec.requiredFacts ?? []).map((fact) => fact.factId));
  const namesExistingCase = ["case_number", "cause_number", "underlying_case_number", "docket_number"]
    .some((id) => factIds.has(id));
  // Where the specification names no case number, the recorded FILING action
  // still says which case this goes into: a petition filed with the clerk of
  // the convicting court, or in the court that heard the underlying matter, is
  // filed into that existing case. A route that commences a new action says so.
  const fileAction = (set?.participantActionRequired ?? []).find((a) => a.kind === "file");
  const fileWhere = String(fileAction?.description ?? "");
  // "Which case does this go into?" stated in the authority's own words. Each
  // alternative below is a court identified BY the case it already has, or an
  // explicit statement that the filing is bound to one docket:
  //
  //   Nevada  — "the defendant files a petition in the court that handled the
  //             case" (NRS 176A.245 subsection 2 branch)
  //   Kansas  — "the clerk of the convicting municipal court" (K.S.A. 12-4516)
  //   Connecticut — "One docket number per form; the court cannot process a
  //             form covering more than one case" (JD-CR-202)
  //
  // A phrase that names only WHERE, like Oregon's "the circuit court of the
  // county in which the person was arrested, cited or charged", fixes the
  // county and not the case, and still falls through to unresolved. That is
  // the distinction this list exists to keep.
  const filedIntoExisting = /convicting( \w+)? court|underlying (case|matter|conviction)|court (that|which) (heard|entered|handled)|same court|court of conviction|one docket number per/i
    .test(fileWhere);
  const commencesNew = /new (civil )?action|commenc|separate proceeding/i.test(fileWhere);
  const [caseMode, caseWhy] = guidance ? ["existing_case", null]
    : namesExistingCase ? ["existing_case", null]
      : commencesNew ? ["new_case", null]
        : filedIntoExisting ? ["existing_case", null]
          : [UNRESOLVED, `the specification requires no case or cause number and the recorded filing action does not say which case this is filed into: "${fileWhere.slice(0, 110)}"`];
  if (caseWhy) reasons.caseMode = caseWhy;

  // Privacy, from the identifiers the specification actually requires. A packet
  // that collects a full Social Security Number treats it differently from one
  // that collects none, and the specification says which it is.
  const FULL_IDENTIFIERS = ["social_security_number", "fbi_number", "state_identification_number"];
  const MASKED_IDENTIFIERS = ["social_security_number_last_four"];
  const collectsFull = FULL_IDENTIFIERS.some((id) => factIds.has(id));
  const collectsMasked = MASKED_IDENTIFIERS.some((id) => factIds.has(id));
  const collectsAnySensitive = collectsFull || collectsMasked || factIds.has("date_of_birth");
  const [privacyTreatment, privacyWhy] = guidance ? ["no_sensitive_identifiers", null]
    : collectsFull ? ["sealed_or_confidential_addendum", null]
      : collectsMasked ? ["masked_on_public_filing", null]
        : collectsAnySensitive ? ["masked_on_public_filing", null]
          : ["no_sensitive_identifiers", null];
  if (privacyWhy) reasons.privacyTreatment = privacyWhy;

  reasons.localVariant = "no source read states whether a local form or practice controls this component.";

  return {
    // Every document in a consumer packet specification is one the participant
    // receives and files. That is what the specification is.
    instrumentClass,
    preparedBy: "participant",
    signer: instrumentClass === UNRESOLVED ? UNRESOLVED : SIGNER[instrumentClass],
    recipient: instrumentClass === UNRESOLVED ? UNRESOLVED : RECIPIENT[instrumentClass],
    formApplicability,
    caseMode,
    executionType,
    serviceTreatment,
    orderTreatment: instrumentClass === UNRESOLVED ? UNRESOLVED
      : instrumentClass === "proposed_order" ? "submits_proposed_order" : "no_proposed_order",
    privacyTreatment,
    localVariant: UNRESOLVED,
    unresolvedReasons: reasons
  };
}

const configs = packetSetManifestsByTrack();
const stale = [];
let documents = 0;
let populated = 0;

for (const file of fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith(".json")).sort()) {
  const full = path.join(SPEC_DIR, file);
  const original = fs.readFileSync(full, "utf8");
  const spec = JSON.parse(original);
  for (const document of spec.documents ?? []) {
    documents += 1;
    const contract = contractFor(document, spec, configs);
    const before = JSON.stringify(document.documentContract ?? null);
    document.documentContract = contract;
    if (JSON.stringify(contract) !== before) populated += 1;
  }
  const serialized = `${JSON.stringify(spec, null, 2)}\n`;
  if (serialized !== original) {
    if (checkOnly) stale.push(path.relative(rootDir, full));
    else fs.writeFileSync(full, serialized);
  }
}

if (checkOnly) {
  if (stale.length > 0) {
    console.error("DOCUMENT CONTRACTS STALE");
    for (const file of stale) console.error(`  - ${file}`);
    console.error("  run: node scripts/generate-rcap-document-contracts.mjs");
    process.exit(1);
  }
  console.log(`document contracts current — ${documents} document(s) across the packet specifications`);
} else {
  console.log(`document contracts written — ${documents} document(s), ${populated} updated`);
  console.log(`packet-set manifests consulted: ${configs.byTrack.size}`);
}
