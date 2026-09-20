#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const ASSIGNMENT_PATH = "data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json";
const ASSIGNMENT_SHA256 = "1b2bb69e97ea78f9b1b84666b830b41be749736c03b53114d5359aa46626e623";
const PATCH_SPEC_PATH = "docs/record-clearing/terminalize-c/c-dependency-runtime-patch-spec.json";
const TREATMENT_SCHEMA = "rcap-official-form-deferral-treatment/v1";
const FIXTURE_SCHEMA = "rcap-official-form-deferral-fixture/v1";
const EXACT = "exact_supported_deferral";
const HELD = "held_on_source_or_design";
const ALLOWED_DISPOSITIONS = new Set([EXACT, HELD]);
const REQUIRED_EVIDENCE_IDS = ["dependency-record", "captain-assignment"];
const INTERNAL_TERMS = [
  /\blane[- ]?[a-z0-9/]+\b/i,
  /\bregistry\b/i,
  /\bsource blocker\b/i,
  /\binternal blocker\b/i,
  /\bimplementation(?: queue| family| status)?\b/i,
  /\bruntime(?: disabled| classification| patch)?\b/i,
  /\bterminal disposition\b/i,
  /\btechnical(?:ly)? approved\b/i,
  /\bcoming soon\b/i,
  /\bresearch required\b/i,
  /\bunknown\b/i
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(relativePath) {
  return sha256Bytes(fs.readFileSync(path.join(ROOT, relativePath)));
}

function clone(value) {
  return structuredClone(value);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function substantive(value, minimum = 18) {
  return normalize(value).length >= minimum;
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function participantText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.flatMap(participantText).join("\n");
  if (!isRecord(value)) return "";
  return Object.entries(value)
    .filter(([key]) => !["evidenceRefs", "url", "kind", "name", "actor"].includes(key))
    .flatMap(([, child]) => participantText(child))
    .join("\n");
}

function bilingual(errors, label, value, { array = false } = {}) {
  add(errors, isRecord(value), `${label}: bilingual object is missing`);
  if (!isRecord(value)) return;
  if (array) {
    add(errors, Array.isArray(value.en) && value.en.length > 0, `${label}.en: substantive list is missing`);
    add(errors, Array.isArray(value.es) && value.es.length > 0, `${label}.es: substantive list is missing`);
    if (Array.isArray(value.en) && Array.isArray(value.es)) {
      add(errors, value.en.length === value.es.length, `${label}: English/Spanish list lengths differ`);
      for (let index = 0; index < Math.min(value.en.length, value.es.length); index += 1) {
        add(errors, substantive(value.en[index]), `${label}.en[${index}]: text is too thin`);
        add(errors, substantive(value.es[index]), `${label}.es[${index}]: text is too thin`);
        add(errors, normalize(value.en[index]).toLocaleLowerCase("en") !== normalize(value.es[index]).toLocaleLowerCase("es"), `${label}[${index}]: untranslated duplicate`);
      }
    }
  } else {
    add(errors, substantive(value.en), `${label}.en: text is missing or too thin`);
    add(errors, substantive(value.es), `${label}.es: text is missing or too thin`);
    if (substantive(value.en) && substantive(value.es)) {
      add(errors, normalize(value.en).toLocaleLowerCase("en") !== normalize(value.es).toLocaleLowerCase("es"), `${label}: untranslated duplicate`);
    }
  }
  add(errors, Array.isArray(value.evidenceRefs) && value.evidenceRefs.length > 0, `${label}: evidenceRefs is missing`);
}

function validateEvidence(errors, treatment, assignmentComponent, dependencyPath) {
  add(errors, Array.isArray(treatment.evidence), "evidence: array is missing");
  if (!Array.isArray(treatment.evidence)) return new Set();
  const ids = new Set();
  for (const [index, carrier] of treatment.evidence.entries()) {
    const label = `evidence[${index}]`;
    add(errors, isRecord(carrier), `${label}: carrier is invalid`);
    if (!isRecord(carrier)) continue;
    add(errors, substantive(carrier.id, 3), `${label}.id: missing`);
    add(errors, !ids.has(carrier.id), `${label}.id: duplicate ${carrier.id}`);
    ids.add(carrier.id);
    add(errors, substantive(carrier.path, 5), `${label}.path: missing`);
    add(errors, /^[0-9a-f]{64}$/.test(String(carrier.sha256 ?? "")), `${label}.sha256: invalid`);
    add(errors, substantive(carrier.sourceRef, 8), `${label}.sourceRef: missing`);
    if (substantive(carrier.path, 5)) {
      const absolute = path.join(ROOT, carrier.path);
      add(errors, fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `${label}.path: carrier does not resolve (${carrier.path})`);
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile() && /^[0-9a-f]{64}$/.test(String(carrier.sha256 ?? ""))) {
        add(errors, sha256File(carrier.path) === carrier.sha256, `${label}: committed bytes do not match sha256`);
      }
    }
  }
  add(errors, ids.has("dependency-record"), "evidence: dependency-record carrier is missing");
  add(errors, ids.has("captain-assignment"), "evidence: captain-assignment carrier is missing");
  const dependencyCarrier = treatment.evidence.find((carrier) => carrier?.id === "dependency-record");
  const assignmentCarrier = treatment.evidence.find((carrier) => carrier?.id === "captain-assignment");
  add(errors, dependencyCarrier?.path === dependencyPath, `evidence: dependency-record path must be ${dependencyPath}`);
  add(errors, dependencyCarrier?.sha256 === assignmentComponent.dependencyRecordSha256, "evidence: dependency-record sha256 differs from frozen assignment");
  add(errors, assignmentCarrier?.path === ASSIGNMENT_PATH, `evidence: captain-assignment path must be ${ASSIGNMENT_PATH}`);
  add(errors, assignmentCarrier?.sha256 === ASSIGNMENT_SHA256, "evidence: captain-assignment sha256 differs from frozen assignment");
  return ids;
}

function collectEvidenceRefs(value, output = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectEvidenceRefs(child, output);
    return output;
  }
  if (!isRecord(value)) return output;
  if (Object.hasOwn(value, "en") || Object.hasOwn(value, "es")) {
    output.push(value.evidenceRefs);
  }
  for (const child of Object.values(value)) collectEvidenceRefs(child, output);
  return output;
}

function validateFixture(errors, fixture, treatment, assignmentRoute, assignmentComponent) {
  add(errors, fixture.schemaVersion === FIXTURE_SCHEMA, `fixture.schemaVersion: expected ${FIXTURE_SCHEMA}`);
  add(errors, fixture.treatmentPath === "../deferral-treatment.json", "fixture.treatmentPath: must resolve to ../deferral-treatment.json");
  add(errors, fixture.trackId === assignmentRoute.trackId, "fixture.trackId: differs from assignment route");
  for (const key of ["componentId", "unitId", "role"]) {
    add(errors, fixture[key] === assignmentComponent[key], `fixture.${key}: differs from assignment`);
  }
  const expected = fixture.expected;
  add(errors, isRecord(expected), "fixture.expected: missing");
  if (!isRecord(expected)) return;
  add(errors, expected.candidateDisposition === treatment.candidateDisposition, "fixture.expected.candidateDisposition: differs from treatment");
  add(errors, expected.paymentAllowed === false, "fixture.expected.paymentAllowed: must be false");
  add(errors, expected.checkoutSuppressed === true, "fixture.expected.checkoutSuppressed: must be true");
  add(errors, expected.packetCreditConsumption === "none", "fixture.expected.packetCreditConsumption: must be none");
  add(errors, expected.partnerCreditConsumed === false, "fixture.expected.partnerCreditConsumed: must be false");
  add(errors, expected.briefcaseHandoffRequired === true, "fixture.expected.briefcaseHandoffRequired: must be true");
  add(errors, JSON.stringify(expected.evidenceIds) === JSON.stringify(REQUIRED_EVIDENCE_IDS), `fixture.expected.evidenceIds: must be ${JSON.stringify(REQUIRED_EVIDENCE_IDS)}`);
}

function validateTreatment({ treatment, fixture, assignmentRoute, assignmentComponent, dependencyPath, mode = "normal" }) {
  const errors = [];
  const prefix = `${assignmentRoute.trackId}/${assignmentComponent.componentId}`;
  add(errors, treatment.schemaVersion === TREATMENT_SCHEMA, `schemaVersion: expected ${TREATMENT_SCHEMA}`);
  add(errors, treatment.trackId === assignmentRoute.trackId, "trackId: differs from frozen assignment route");
  for (const key of ["componentId", "unitId", "role"]) {
    add(errors, treatment[key] === assignmentComponent[key], `${key}: differs from frozen assignment`);
  }
  add(errors, ALLOWED_DISPOSITIONS.has(treatment.candidateDisposition), "candidateDisposition: invalid or missing");

  const evidenceIds = validateEvidence(errors, treatment, assignmentComponent, dependencyPath);
  const p = treatment.participantTreatment;
  add(errors, isRecord(p), "participantTreatment: missing");
  if (isRecord(p)) {
    bilingual(errors, "participantTreatment.absentComponent", p.absentComponent);
    bilingual(errors, "participantTreatment.specificReason", p.specificReason);
    bilingual(errors, "participantTreatment.destination", p.destination);
    add(errors, substantive(p.destination?.name, 4), "participantTreatment.destination.name: a named official destination is required");
    add(errors, !/^https?:\/\//i.test(normalize(p.destination?.name)), "participantTreatment.destination.name: a URL alone is not a destination");
    add(errors, new Set(["issuing_authority", "court", "agency", "clerk", "official_resource"]).has(p.destination?.kind), "participantTreatment.destination.kind: invalid");
    add(errors, p.destination?.url === null || /^https:\/\//.test(String(p.destination?.url ?? "")), "participantTreatment.destination.url: must be null or HTTPS");
    bilingual(errors, "participantTreatment.nextAction", p.nextAction);
    bilingual(errors, "participantTreatment.gather", p.gather, { array: true });
    bilingual(errors, "participantTreatment.doNot", p.doNot, { array: true });
    bilingual(errors, "participantTreatment.packetAbsenceDisclosure", p.packetAbsenceDisclosure);
    add(errors, /(?:packet[^.!]{0,160}(?:does not|doesn't|contains? no|includes? no|without|generates? no)|does not (?:include|contain|provide|reproduce)|is not in (?:this|the) (?:generated )?packet)/i.test(normalize(p.packetAbsenceDisclosure?.en)), "packetAbsenceDisclosure.en: must say the generated packet does not contain the component");
    add(errors, /(?:paquete[^.!]{0,160}(?:no (?:incluye|contiene|proporciona|genera|reproduce)|sin)|no (?:incluye|contiene|proporciona|genera|reproduce)|no está (?:incluido|incluida) en (?:este|el) paquete)/i.test(normalize(p.packetAbsenceDisclosure?.es)), "packetAbsenceDisclosure.es: must say the generated packet does not contain the component");
    add(errors, Array.isArray(p.doNot?.en) && p.doNot.en.some((entry) => /do not|must not|should not|not (?:file|sign|submit|assume)/i.test(entry)), "doNot.en: must state what not to file, sign, submit, or assume");
    add(errors, Array.isArray(p.doNot?.es) && p.doNot.es.some((entry) => /^\s*No\b/i.test(entry)), "doNot.es: must state what not to file, sign, submit, or assume");

    const briefcase = p.briefcase;
    add(errors, isRecord(briefcase), "participantTreatment.briefcase: missing");
    if (isRecord(briefcase)) {
      bilingual(errors, "participantTreatment.briefcase.preserved", briefcase.preserved, { array: true });
      bilingual(errors, "participantTreatment.briefcase.outstanding", briefcase.outstanding, { array: true });
      bilingual(errors, "participantTreatment.briefcase.return", briefcase.return);
      add(errors, /Briefcase/i.test(participantText(briefcase)), "participantTreatment.briefcase: must name Briefcase");
    }

    const payment = p.payment;
    add(errors, isRecord(payment), "participantTreatment.payment: missing");
    if (isRecord(payment)) {
      add(errors, payment.paymentAllowed === false, "participantTreatment.payment.paymentAllowed: must be false");
      add(errors, payment.checkoutSuppressed === true, "participantTreatment.payment.checkoutSuppressed: must be true");
      bilingual(errors, "participantTreatment.payment", payment);
      add(errors, /(?:no|not|nothing|must not|cannot|does not)[^.!]{0,100}(?:charg|payment|pay)|(?:charg|payment)[^.!]{0,100}(?:no|not|nothing|unavailable|disabled|suppressed|permitted)/i.test(normalize(payment.en)), "participantTreatment.payment.en: must explain no charge");
      add(errors, /(?:no|sin)[^.!]{0,120}(?:cobr|pago|cargo)|(?:cobr|pago|cargo)[^.!]{0,100}(?:no|deshabilit|inhabilit|indisponible)/i.test(normalize(payment.es)), "participantTreatment.payment.es: must explain no charge");
      add(errors, /checkout|payment (?:page|screen|button)|pay control/i.test(normalize(payment.en)), "participantTreatment.payment.en: must explain checkout suppression");
      add(errors, /pago|cobro/i.test(normalize(payment.es)), "participantTreatment.payment.es: must explain checkout suppression");
    }

    const credit = p.credit;
    add(errors, isRecord(credit), "participantTreatment.credit: missing");
    if (isRecord(credit)) {
      add(errors, credit.packetCreditConsumption === "none", "participantTreatment.credit.packetCreditConsumption: must be none");
      add(errors, credit.partnerCreditConsumed === false, "participantTreatment.credit.partnerCreditConsumed: must be false");
      bilingual(errors, "participantTreatment.credit", credit);
      add(errors, /(?:no|neither|does not|must not|may not|cannot)[^.!]{0,120}credit|credit[^.!]{0,120}(?:not|none|neither|no|zero)/i.test(normalize(credit.en)), "participantTreatment.credit.en: must explain zero packet/partner credit consumption");
      add(errors, /(?:no|ningún|ninguna)[^.!]{0,120}crédito|crédito[^.!]{0,120}(?:no|ningún|ninguna|cero)/i.test(normalize(credit.es)), "participantTreatment.credit.es: must explain zero packet/partner credit consumption");
    }

    const escalation = p.escalation;
    add(errors, isRecord(escalation), "participantTreatment.escalation: missing");
    if (isRecord(escalation)) {
      add(errors, substantive(escalation.actor, 4), "participantTreatment.escalation.actor: named actor is required");
      bilingual(errors, "participantTreatment.escalation", escalation);
    }

    for (const refs of collectEvidenceRefs(p)) {
      add(errors, Array.isArray(refs) && refs.length > 0, "participant legal statement has no evidenceRefs");
      if (Array.isArray(refs)) {
        for (const ref of refs) add(errors, evidenceIds.has(ref), `participant legal statement references missing evidence carrier ${ref}`);
      }
    }
    const text = participantText(p);
    for (const pattern of INTERNAL_TERMS) add(errors, !pattern.test(text), `participant text contains prohibited internal/generic terminology (${pattern})`);
  }

  const runtime = treatment.runtimeContract;
  add(errors, isRecord(runtime), "runtimeContract: missing");
  if (isRecord(runtime)) {
    add(errors, runtime.classification === "component_deferral", "runtimeContract.classification: must be component_deferral");
    add(errors, runtime.paymentAllowed === false, "runtimeContract.paymentAllowed: must be false");
    add(errors, runtime.checkoutSuppressed === true, "runtimeContract.checkoutSuppressed: must be true");
    add(errors, runtime.packetCreditConsumption === "none", "runtimeContract.packetCreditConsumption: must be none");
    add(errors, runtime.partnerCreditConsumed === false, "runtimeContract.partnerCreditConsumed: must be false");
    add(errors, runtime.briefcaseHandoffRequired === true, "runtimeContract.briefcaseHandoffRequired: must be true");
    add(errors, runtime.requiresCaptainPatch === true, "runtimeContract.requiresCaptainPatch: must be true until captain integration");
  }

  add(errors, Array.isArray(treatment.authority) && treatment.authority.length > 0, "authority: at least one committed support pointer is required");
  if (Array.isArray(treatment.authority)) {
    for (const [index, authority] of treatment.authority.entries()) {
      add(errors, isRecord(authority), `authority[${index}]: invalid`);
      if (!isRecord(authority)) continue;
      add(errors, authority.citation === null || substantive(authority.citation, 4), `authority[${index}].citation: invalid`);
      add(errors, substantive(authority.sourceRef, 8), `authority[${index}].sourceRef: missing`);
      add(errors, Array.isArray(authority.supports) && authority.supports.length > 0, `authority[${index}].supports: missing`);
    }
  }

  if (fixture) validateFixture(errors, fixture, treatment, assignmentRoute, assignmentComponent);
  if (mode === "normal" && treatment.candidateDisposition === HELD) {
    add(errors, /missing evidence|evidence (?:does not|doesn't)|no committed evidence|falta (?:la )?evidencia/i.test(participantText(treatment.participantTreatment?.specificReason)), "held component must name the exact missing evidence in both languages");
  }
  return errors.map((message) => `[${prefix}] ${message}`);
}

function loadCorpus() {
  assert.equal(sha256File(ASSIGNMENT_PATH), ASSIGNMENT_SHA256, "captain assignment bytes drifted");
  const assignment = readJson(ASSIGNMENT_PATH);
  assert.equal(assignment.routes.length, 10, "captain assignment must contain ten routes");
  assert.equal(assignment.routes.flatMap((route) => route.components).length, 31, "captain assignment must contain 31 components");
  const treatments = new Map();
  const fixtures = new Map();
  const locations = new Map();
  for (const route of assignment.routes) {
    assert.equal(sha256File(route.routeJson.path), route.routeJson.sha256, `${route.trackId} route.json drifted`);
    for (const component of route.components) {
      const componentDir = path.join(route.routeDir, "components", component.componentId);
      const dependencyPath = path.join(componentDir, "dependency.json");
      const treatmentPath = path.join(componentDir, "deferral-treatment.json");
      const fixturePath = path.join(componentDir, "fixtures", "canonical.json");
      if (fs.existsSync(path.join(ROOT, treatmentPath))) treatments.set(component.componentId, readJson(treatmentPath));
      if (fs.existsSync(path.join(ROOT, fixturePath))) fixtures.set(component.componentId, readJson(fixturePath));
      locations.set(component.componentId, { dependencyPath, treatmentPath, fixturePath });
    }
  }
  return { assignment, treatments, fixtures, locations };
}

function validatePatchSpec(assignment) {
  const errors = [];
  const spec = readJson(PATCH_SPEC_PATH);
  add(errors, spec.schemaVersion === "rcap-c-component-deferral-runtime-patch-spec/v1", "[runtime-patch-spec] schemaVersion is invalid");
  // The specification is Codex-authored and captain-applied: it is pending
  // until Terminal A patches the shared runtime, and applied afterwards. No
  // third status is accepted, and neither status promotes a route.
  add(
    errors,
    spec.status === "captain_action_required" || spec.status === "captain_applied",
    "[runtime-patch-spec] status must be captain_action_required or captain_applied"
  );
  if (spec.status === "captain_applied") {
    add(errors, isRecord(spec.captainApplication), "[runtime-patch-spec] captain_applied requires a captainApplication record");
  }
  add(errors, spec.assignment?.path === ASSIGNMENT_PATH && spec.assignment?.sha256 === ASSIGNMENT_SHA256, "[runtime-patch-spec] assignment pin differs from the frozen input");
  const expectedRoutes = assignment.routes.map((route) => route.trackId).sort();
  const affectedRoutes = Array.isArray(spec.affectedRouteIds) ? [...spec.affectedRouteIds].sort() : [];
  add(errors, JSON.stringify(affectedRoutes) === JSON.stringify(expectedRoutes), "[runtime-patch-spec] affectedRouteIds is not the exact ten-route set");
  add(errors, spec.componentCount === 31, "[runtime-patch-spec] componentCount must be 31");
  add(errors, Array.isArray(spec.patches) && spec.patches.length > 0, "[runtime-patch-spec] patches are missing");
  for (const [index, patch] of (spec.patches ?? []).entries()) {
    const label = `[runtime-patch-spec/patches/${index}]`;
    add(errors, substantive(patch.id, 5), `${label} id is missing`);
    add(errors, substantive(patch.file, 5), `${label} file is missing`);
    add(errors, Array.isArray(patch.symbols) && patch.symbols.length > 0, `${label} symbols are missing`);
    add(errors, substantive(patch.currentBehavior, 30), `${label} currentBehavior is missing`);
    add(errors, substantive(patch.requiredBehavior, 30), `${label} requiredBehavior is missing`);
    add(errors, isRecord(patch.input), `${label} input contract is missing`);
    add(errors, isRecord(patch.output), `${label} output contract is missing`);
    add(errors, /^[0-9a-f]{64}$/.test(String(patch.baseSha256 ?? "")), `${label} baseSha256 is invalid`);
    if (substantive(patch.file, 5)) {
      const absolute = path.join(ROOT, patch.file);
      add(errors, fs.existsSync(absolute), `${label} file does not resolve`);
      if (fs.existsSync(absolute) && /^[0-9a-f]{64}$/.test(String(patch.baseSha256 ?? ""))) {
        // The target must be in a RECORDED state: the authoring base (patch not
        // yet applied), the current captain-recorded applied bytes, or one of
        // the earlier applied states this file has passed through. Anything else
        // means the shared runtime moved underneath the specification, which is
        // the drift this check exists to catch.
        //
        // The history exists because these targets are shared runtime, not
        // C-lane property: a later window that legitimately extends the same
        // resolver or Briefcase writer moves the bytes again. Recording each
        // application keeps the audit trail intact while still refusing any
        // shape nobody wrote down — which is the whole point of the check.
        const current = sha256File(patch.file);
        const recorded = [
          patch.baseSha256,
          patch.appliedSha256,
          ...(Array.isArray(patch.priorAppliedSha256) ? patch.priorAppliedSha256 : [])
        ].filter((value) => /^[0-9a-f]{64}$/.test(String(value ?? "")));
        add(
          errors,
          recorded.includes(current),
          `${label} file bytes match no recorded state (baseSha256, appliedSha256 or priorAppliedSha256)`
        );
      }
    }
  }
  add(errors, Array.isArray(spec.acceptanceTests) && spec.acceptanceTests.length >= 8, "[runtime-patch-spec] acceptance tests are incomplete");
  return { errors, targetCount: spec.patches?.length ?? 0 };
}

function validateRouteSet(corpus, treatments = corpus.treatments) {
  const errors = [];
  const routeResults = [];
  for (const route of corpus.assignment.routes) {
    const expectedIds = route.components.map((component) => component.componentId).sort();
    const presentIds = expectedIds.filter((componentId) => treatments.has(componentId)).sort();
    add(errors, JSON.stringify(presentIds) === JSON.stringify(expectedIds), `[${route.trackId}] one or more assigned component treatments are omitted`);
    const instructions = read(route.participantInstructions.path);
    const normalizedInstructions = normalize(instructions);
    add(errors, /##[^\n]*(?:component|official|componente|oficial)[^\n]*(?:deferral|deferred|aplazamiento|ausente)|##[^\n]*(?:deferral|aplazamiento)[^\n]*(?:component|form|componente|formulario)/i.test(instructions), `[${route.trackId}] participant instructions lack a component-deferral section`);
    add(errors, /Briefcase/.test(instructions), `[${route.trackId}] participant instructions lack Briefcase handoff`);
    add(errors, /no (?:packet |partner )?credit|no (?:se )?consume|ningún crédito/i.test(instructions), `[${route.trackId}] participant instructions lack zero-credit disclosure`);
    add(errors, /checkout|payment|pago|cobro/i.test(instructions), `[${route.trackId}] participant instructions lack payment/checkout disclosure`);
    for (const component of route.components) {
      const treatment = treatments.get(component.componentId);
      if (!treatment) continue;
      const absentEnglish = normalize(treatment.participantTreatment?.absentComponent?.en);
      const absentSpanish = normalize(treatment.participantTreatment?.absentComponent?.es);
      const officialName = normalize(treatment.participantTreatment?.destination?.name);
      const identityTokens = normalize(`${component.componentId} ${absentEnglish} ${officialName}`)
        .split(/[^\p{L}\p{N}-]+/u)
        .filter((token) => token.length >= 5)
        .slice(0, 8);
      const identityPresent = identityTokens.some((token) => normalizedInstructions.toLocaleLowerCase().includes(token.toLocaleLowerCase()));
      add(errors, identityPresent && /not (?:include|contain)|does not (?:include|contain)|missing|absent|no (?:incluye|contiene|se incluye)|falta|ausente/i.test(normalizedInstructions), `[${route.trackId}] participant instructions do not identify the absent ${component.componentId} treatment`);
      add(errors, /##[^\n]*(?:Español|Spanish|En español)|\b(?:Su paquete|No se incluye|No presente|Regrese|Obtenga|Pida)\b/i.test(instructions) && substantive(absentSpanish), `[${route.trackId}] participant instructions lack substantive Spanish treatment for ${component.componentId}`);
    }
    const allExact = expectedIds.every((componentId) => treatments.get(componentId)?.candidateDisposition === EXACT);
    const handoffPath = path.join(route.routeDir, "handoff.md");
    const handoff = read(handoffPath);
    if (allExact) add(errors, /candidate_ready_for_independent_review/.test(handoff), `[${route.trackId}] all components pass but handoff lacks candidate_ready_for_independent_review`);
    if (!allExact) add(errors, !/candidate_ready_for_independent_review/.test(handoff), `[${route.trackId}] held/omitted component forbids candidate_ready_for_independent_review`);
    routeResults.push({ trackId: route.trackId, components: expectedIds.length, allExact });
  }
  return { errors, routeResults };
}

function mutationCases(corpus) {
  const firstRoute = corpus.assignment.routes[0];
  const firstComponent = firstRoute.components[0];
  const base = corpus.treatments.get(firstComponent.componentId);
  const fixture = corpus.fixtures.get(firstComponent.componentId);
  const dependencyPath = corpus.locations.get(firstComponent.componentId).dependencyPath;
  assert(base, "mutation seed component treatment is missing");
  assert(fixture, "mutation seed fixture is missing");
  const validate = (mutate) => {
    const candidate = clone(base);
    mutate(candidate);
    return validateTreatment({ treatment: candidate, fixture, assignmentRoute: firstRoute, assignmentComponent: firstComponent, dependencyPath, mode: "mutation" });
  };
  const cases = [
    ["reason removed", (value) => { delete value.participantTreatment.specificReason; }],
    ["destination removed", (value) => { delete value.participantTreatment.destination; }],
    ["next step removed", (value) => { delete value.participantTreatment.nextAction; }],
    ["packet disclosure removed", (value) => { delete value.participantTreatment.packetAbsenceDisclosure; }],
    ["Briefcase handoff removed", (value) => { delete value.participantTreatment.briefcase; }],
    ["payment changed to true", (value) => { value.participantTreatment.payment.paymentAllowed = true; value.runtimeContract.paymentAllowed = true; }],
    ["credit consumption enabled", (value) => { value.participantTreatment.credit.packetCreditConsumption = "one"; value.participantTreatment.credit.partnerCreditConsumed = true; value.runtimeContract.packetCreditConsumption = "one"; value.runtimeContract.partnerCreditConsumed = true; }],
    ["Spanish removed", (value) => { delete value.participantTreatment.nextAction.es; }],
    ["Spanish replaced by English", (value) => { value.participantTreatment.nextAction.es = value.participantTreatment.nextAction.en; }],
    ["evidence carrier removed", (value) => { value.evidence = value.evidence.filter((carrier) => carrier.id !== "dependency-record"); }]
  ];
  const results = [];
  for (const [name, mutate] of cases) {
    const errors = validate(mutate);
    assert(errors.length > 0, `mutation falsely passed: ${name}`);
    results.push({ mutation: name, rejected: true });
  }
  const omitted = new Map(corpus.treatments);
  omitted.delete(firstComponent.componentId);
  const routeErrors = validateRouteSet(corpus, omitted).errors;
  assert(routeErrors.some((message) => message.includes("omitted")), "mutation falsely passed: one component omitted from route");
  results.push({ mutation: "one component omitted from route", rejected: true });
  return results;
}

function main() {
  const corpus = loadCorpus();
  const errors = [];
  const dispositions = { [EXACT]: 0, [HELD]: 0 };
  for (const route of corpus.assignment.routes) {
    for (const component of route.components) {
      const locations = corpus.locations.get(component.componentId);
      const treatment = corpus.treatments.get(component.componentId);
      const fixture = corpus.fixtures.get(component.componentId);
      if (!treatment) {
        errors.push(`[${route.trackId}/${component.componentId}] deferral-treatment.json is missing`);
        continue;
      }
      if (!fixture) {
        errors.push(`[${route.trackId}/${component.componentId}] fixtures/canonical.json is missing`);
        continue;
      }
      if (ALLOWED_DISPOSITIONS.has(treatment.candidateDisposition)) dispositions[treatment.candidateDisposition] += 1;
      errors.push(...validateTreatment({ treatment, fixture, assignmentRoute: route, assignmentComponent: component, dependencyPath: locations.dependencyPath }));
    }
  }
  const routes = validateRouteSet(corpus);
  errors.push(...routes.errors);
  const patchSpec = validatePatchSpec(corpus.assignment);
  errors.push(...patchSpec.errors);
  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, routes: corpus.assignment.routes.length, components: 31, dispositions, errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  const mutations = mutationCases(corpus);
  console.log(JSON.stringify({
    ok: true,
    assignmentSha256: ASSIGNMENT_SHA256,
    routes: routes.routeResults.length,
    components: corpus.treatments.size,
    dispositions,
    candidateReadyRoutes: routes.routeResults.filter((route) => route.allExact).map((route) => route.trackId),
    captainPatchSpecificationTargets: patchSpec.targetCount,
    mutationTests: mutations
  }, null, 2));
}

main();
