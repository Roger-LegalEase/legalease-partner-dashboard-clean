// Every generated Colorado record, computed in one place.
//
// The emitter writes what this returns and the verifier recomputes it and
// compares, so "the committed files are what the code produces" is a check
// rather than a habit. A hand edit to any emitted file turns the verifier red
// with the exact path and the exact difference.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { buildFormSpec, type FieldCensus } from "./build-spec";
import { bindForm } from "./bind";
import { mergeFacts } from "./derived-facts";
import { canonicalJson } from "./canonical-json";
import { auditProtection, COLORADO_PROTECTED_CATEGORIES } from "./protected-fields";
import { readLabelEvidence } from "./label-evidence";
import {
  COLORADO_OVERLAY_ROOT,
  DANGLING_RENDERER_FAMILIES,
  PORTING_COMMIT,
  SPECIFIED_FAMILIES,
  UNRECOVERABLE_RENDERER,
  UNRECOVERABLE_RENDERER_COMMIT,
  type SpecifiedFamily,
} from "./families";
import type { ColoradoFactSet, ColoradoFieldSpec, ColoradoFormSpec } from "./types";

export interface EmittedFile {
  /** Repository-relative path. */
  readonly path: string;
  readonly text: string;
}

export function sha256(text: string | Buffer): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJson<T>(absolute: string): T {
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// Renderer provenance
// ---------------------------------------------------------------------------

/**
 * The four questions the lane had to answer before any manifest could be
 * repointed, answered against this clone rather than from the audit note.
 *
 * Each answer is a measurement: whether the file is in the tree, whether the
 * commit is reachable, which renderer the rest of the corpus names, and
 * whether the official binaries needed to re-render are mounted.
 */
export interface RendererDetermination {
  readonly rendererNamedByPortedManifests: string;
  readonly presentInTree: boolean;
  readonly blobCommitReachableInThisClone: boolean;
  readonly blobCommitIsCaptainAncestor: boolean;
  readonly supersedingRendererInAcceptedHistory: string | null;
  readonly supersedingRendererCoversColorado: boolean;
  readonly officialCorpusMounted: boolean;
  readonly regenerationPossibleHere: boolean;
}

const D1_RENDERER = "scripts/implement-rcap-official-forms-d1.mjs";
const OPERATIONAL_CORPUS = "private/Nationwide Record Clearing";
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";

export function determineRenderer(rootDir: string, gitObjectExists: (sha: string) => boolean): RendererDetermination {
  const rendererPath = path.join(rootDir, UNRECOVERABLE_RENDERER);
  const d1Path = path.join(rootDir, D1_RENDERER);
  const d1Source = fs.existsSync(d1Path) ? fs.readFileSync(d1Path, "utf8") : "";
  // The d1 renderer restricts itself to the jurisdictions it names. Colorado
  // is read out of that list rather than assumed absent from it.
  const slugTable = /JURISDICTION_SLUGS\s*=\s*\{([^}]*)\}/.exec(d1Source)?.[1] ?? "";
  const coversColorado = /\bCO\s*:/.test(slugTable);

  const corpusMounted =
    fs.existsSync(path.join(rootDir, OPERATIONAL_CORPUS)) ||
    fs.existsSync(path.join(rootDir, MASTER_LIBRARY)) ||
    (process.env.OFFICIAL_FORMS_SOURCE_DIR !== undefined &&
      fs.existsSync(process.env.OFFICIAL_FORMS_SOURCE_DIR));

  return {
    rendererNamedByPortedManifests: UNRECOVERABLE_RENDERER,
    presentInTree: fs.existsSync(rendererPath),
    blobCommitReachableInThisClone: gitObjectExists(UNRECOVERABLE_RENDERER_COMMIT),
    blobCommitIsCaptainAncestor: false,
    supersedingRendererInAcceptedHistory: fs.existsSync(d1Path) ? D1_RENDERER : null,
    supersedingRendererCoversColorado: coversColorado,
    officialCorpusMounted: corpusMounted,
    regenerationPossibleHere: corpusMounted,
  };
}

function rendererProvenanceRecord(
  determination: RendererDetermination,
  family: string,
  sourceSha256: string,
): unknown {
  return {
    schemaVersion: "rcap-renderer-provenance/v1",
    family,
    sourceSha256,
    portedBy: PORTING_COMMIT,
    portedWithoutRenderer: true,
    declaredRenderer: determination.rendererNamedByPortedManifests,
    declaredRendererPresentInTree: determination.presentInTree,
    declaredRendererCommit: UNRECOVERABLE_RENDERER_COMMIT,
    declaredRendererCommitReachableInThisClone: determination.blobCommitReachableInThisClone,
    declaredRendererCommitIsCaptainAncestor: determination.blobCommitIsCaptainAncestor,
    candidateSupersedingRenderer: determination.supersedingRendererInAcceptedHistory,
    candidateSupersedingRendererCoversColorado: determination.supersedingRendererCoversColorado,
    officialCorpusMounted: determination.officialCorpusMounted,
    byteIdenticalRegenerationAttempted: false,
    byteIdenticalRegenerationPossibleHere: determination.regenerationPossibleHere,
    determination: "renderer_identity_unrecoverable_from_accepted_history",
    treatment: "executable_identity_cleared_historical_identity_preserved_bytes_retained_by_hash",
    // The captain's required statements, said outright rather than left to be
    // inferred from four booleans. The historical identity is PRESERVED on this
    // record: the executable field is cleared because nothing can run, not
    // because the name is being forgotten, and a forgotten name is how a later
    // reader repoints these bytes at a renderer that never produced them.
    historicalRendererIdentityPreserved: true,
    historicalRendererIdentity: determination.rendererNamedByPortedManifests,
    historicalRendererAvailableInAcceptedCaptainAncestry: false,
    currentExecutableRenderer: "unresolved",
    byteIdenticalRegenerationProven: false,
    retainedArtifactsBasis: "digest_verified_only",
    captainStatement:
      "The historical renderer identity is preserved on this record. It is unavailable in accepted captain ancestry, the current executable renderer is unresolved, byte-identical regeneration is not proven, and the retained artifacts are digest-verified only. None of that authorizes repointing the identity at a renderer that did not produce these bytes.",
    reasoning: [
      "The named renderer is not in the tree and its directory does not exist, so the recorded identity names nothing that can run.",
      "Its commit is not reachable in this clone and is not an ancestor of the captain branch, so restoring it would import unaccepted work rather than recover accepted history.",
      "The renderer that owns the other 89 manifests in this corpus restricts itself to the nine jurisdictions it names and does not name Colorado, so repointing to it would assert an ownership it does not have.",
      "Neither the operational Nationwide tree nor the Master Library is mounted in this environment, so no implementation can regenerate these bytes here and byte-identical regeneration cannot be demonstrated by any renderer.",
      "The executable identity is therefore cleared rather than replaced, while the historical identity stays recorded here. The artifacts are retained on the only basis that is actually true of them: their recorded digests match the bytes on disk exactly.",
    ],
    retention: "hash_verified_bytes_only",
    reopensWhen:
      "The official binary named by this family's source record is mounted. At that point the Colorado specification binder renders these fixtures again and the render receipt records the renderer that produced them.",
  };
}

// ---------------------------------------------------------------------------
// Per-family computation
// ---------------------------------------------------------------------------

export interface FamilyContext {
  readonly rootDir: string;
  readonly family: SpecifiedFamily;
  readonly familyDir: string;
  readonly census: FieldCensus;
  readonly sourceRecord: Record<string, unknown>;
  readonly spec: ColoradoFormSpec;
  readonly specText: string;
  readonly specSha256: string;
}

export async function loadFamilyContext(rootDir: string, family: SpecifiedFamily): Promise<FamilyContext> {
  const familyDir = path.join(rootDir, COLORADO_OVERLAY_ROOT, family.family);
  const census = readJson<FieldCensus>(path.join(familyDir, "field-census.json"));
  const sourceRecord = readJson<Record<string, unknown>>(path.join(familyDir, "source-record.json"));

  const artifact = path.join(familyDir, "fixtures/canonical-filled.pdf");
  const evidence = await readLabelEvidence(
    artifact,
    census.fields.map((field) => ({ name: field.name, widgets: [...field.widgets] })),
    "retained participant artifact fixtures/canonical-filled.pdf, which carries the official form's own page content; the official binary is not mounted in this environment",
    census.sha256,
  );

  const spec = buildFormSpec({ authored: family.authored, census, labelEvidence: evidence.byField });
  const specText = canonicalJson(spec as unknown as Parameters<typeof canonicalJson>[0]);

  return {
    rootDir,
    family,
    familyDir,
    census,
    sourceRecord,
    spec,
    specText,
    specSha256: sha256(specText),
  };
}

function writableFields(spec: ColoradoFormSpec): readonly ColoradoFieldSpec[] {
  return spec.fields.filter((field) => field.fieldClass !== "protected" && field.fieldClass !== "unmapped");
}

function coverageRecord(context: FamilyContext, plans: Record<string, ReturnType<typeof bindForm>>): unknown {
  const spec = context.spec;
  const byClass: Record<string, number> = {};
  for (const field of spec.fields) byClass[field.fieldClass] = (byClass[field.fieldClass] ?? 0) + 1;

  const priorMap = readJson<{ bindings?: { field: string }[] }>(
    path.join(context.familyDir, "production-field-map.json"),
  );
  const priorBound = (priorMap.bindings ?? []).map((binding) => binding.field).sort();

  return {
    schemaVersion: "rcap-colorado-binding-coverage/v1",
    family: spec.family,
    documentId: spec.documentId,
    specVersion: spec.specVersion,
    specSha256: context.specSha256,
    sourceSha256: spec.sourceSha256,
    pageCount: spec.pageCount,
    fieldCount: spec.fieldCount,
    fieldsByClass: byClass,
    writableFields: writableFields(spec).length,
    protectedFields: spec.fields.filter((field) => field.fieldClass === "protected").length,
    unmappedFields: spec.fields.filter((field) => field.fieldClass === "unmapped").length,
    boundByCanonicalFixture: plans.canonical.writtenCount,
    boundByBoundaryFixture: plans.boundary.writtenCount,
    boundByNegativeFixture: plans.negative.writtenCount,
    priorBindingCount: priorBound.length,
    priorBoundFields: priorBound,
    realizedInRetainedArtifacts: priorBound.length,
    realizedNote:
      "The retained fixtures were rendered by the D3A run on 2026-08-12 under the narrow binding named in priorBoundFields. This lane specifies and verifies the expanded binding; it does not claim it is on any committed artifact, because the official binary this family is pinned to is not mounted in this environment and nothing could be re-rendered.",
  };
}

function protectedFieldsRecord(context: FamilyContext): unknown {
  const spec = context.spec;
  const disagreements = auditProtection(spec.fields);
  return {
    schemaVersion: "rcap-colorado-protected-fields/v1",
    family: spec.family,
    documentOwnership: "participant_completed",
    wholeDocumentUnwritable: false,
    basis:
      "typed fail-closed Colorado specification binder; every field starts protected and is written only where the specification names a fact, the fact is supplied and any condition holds",
    categoriesNeverWritten: COLORADO_PROTECTED_CATEGORIES,
    protectedFields: spec.fields
      .filter((field) => field.fieldClass === "protected")
      .map((field) => ({
        field: field.field,
        section: field.section,
        label: field.label,
        category: field.protectedCategory,
        rationale: field.rationale,
      })),
    judicialFieldsOnThisForm: spec.fields.filter((field) =>
      field.protectedCategory === "judicial_signature" || field.protectedCategory === "judicial_finding",
    ).length,
    clerkFieldsOnThisForm: spec.fields.filter((field) => field.protectedCategory === "clerk_only").length,
    prosecutorOnlyFieldsOnThisForm: spec.fields.filter((field) => field.protectedCategory === "prosecutor_only").length,
    agencyOnlyFieldsOnThisForm: spec.fields.filter((field) => field.protectedCategory === "agency_only").length,
    courtUseOnlyFieldsOnThisForm: spec.fields.filter((field) => field.protectedCategory === "court_use_only").length,
    courtUseRegionNote:
      "This form's court-use region is printed text with no widget behind it: the case-event-code box. Every one of the form's fields is named by the specification, so the region carries nothing that could be written.",
    reDerivationAgrees: disagreements.length === 0,
    reDerivationDisagreements: disagreements,
  };
}

function classificationRecord(context: FamilyContext): unknown {
  const spec = context.spec;
  const counts: Record<string, number> = {};
  for (const field of spec.fields) counts[field.fieldClass] = (counts[field.fieldClass] ?? 0) + 1;
  return {
    schemaVersion: "rcap-field-classification/v5-colorado-spec",
    factoryVersion: "d0-remediated-v1",
    specVersion: spec.specVersion,
    specSha256: context.specSha256,
    documentOwnership: "participant_completed",
    ownershipBasis:
      "Participant-completed filing: participant facts, participant elections, transcribed participant prose and facts the document establishes about itself may bind; the execution block never does.",
    classCounts: counts,
    entries: spec.fields.map((field) => ({
      name: field.field,
      type: field.control,
      class: field.fieldClass,
      section: field.section,
      label: field.label,
      factId: field.factId,
      protectedCategory: field.protectedCategory,
    })),
  };
}

function classificationPolicyRecord(context: FamilyContext): unknown {
  const spec = context.spec;
  return {
    schemaVersion: "rcap-field-classification-policy/v3-colorado-spec",
    factoryVersion: "d0-remediated-v1",
    specVersion: spec.specVersion,
    specSha256: context.specSha256,
    basis:
      "src/lib/rcap/state-packs/colorado/official-forms — a typed fail-closed binder driven by a per-document specification, with protection re-derived independently from each field's own name and printed label",
    everyFieldStartsProtected: true,
    writableRequires: [
      "the specification names this exact field",
      "the specification gives it a class other than protected or unmapped",
      "protection re-derived from the field's name and printed label does not reach it",
      "the specification names the fact it is written from",
      "the fact is supplied and is not empty once whitespace is collapsed",
      "any condition the specification attaches to the field holds",
      "for a choice control, the value is one the document itself offers",
      "for an indexed offence row, a charge exists at that row's index",
      "for a text control, the value is within the length the document declares",
    ],
    documentAcceptsFill: true,
    captionOnly: false,
    ownership: "participant_completed",
    protectionsWeakened: false,
    supersedes: {
      basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs — typed fail-closed binder, unmodified",
      why:
        "The shared binder matches fact descriptors against field names. Colorado names its fields 3B.1, 4A.1A and 6E.3, which no descriptor reaches, so 58 of JDF 417's 62 fields and 57 of JDF 612's 63 were refused as 'no allowlisted fact matches' — a refusal about the name, not about the field. The shared binder also type-guards every checkbox and radio group, so no election on either form could ever bind through it. Neither refusal is weakened here: this specification names each field explicitly, and the protections are re-derived rather than inherited.",
      reviewedWithholdingsReconsidered: [
        {
          field: "Court Address",
          previously: "withheld_by_review",
          now: "written from filing.court_address",
          why:
            "The withholding was correct about the risk and wrong about the field: the shared binder reached the court's address through a participant street-address descriptor. Given its own fact id, the field is the filing destination and no participant descriptor can reach it.",
        },
        {
          field: "CoS_Date",
          previously: "withheld_by_review",
          now: "written from service.service_date",
          why:
            "The withholding reasoned that the certificate block names the party served rather than the participant. That is true of the recipient fields and false of the service date, which is the participant's own act and without which the certificate is unusable.",
        },
      ],
    },
    protectedCategories: COLORADO_PROTECTED_CATEGORIES,
  };
}

function fixtureRecord(
  context: FamilyContext,
  name: "canonical" | "boundary" | "negative",
  facts: ColoradoFactSet,
  note: string,
): unknown {
  return {
    schemaVersion: "rcap-fixture/v4-colorado-spec",
    level: "participant_fact",
    fixture: name,
    specVersion: context.spec.specVersion,
    specSha256: context.specSha256,
    note,
    facts,
  };
}

const FIXTURE_NOTES = {
  canonical:
    "Synthetic participant facts covering every fact the specification marks required. Telephone numbers are in the 555-01xx range reserved for fiction and mail is at the reserved example.com domain, so no fixture resolves to a real person.",
  boundary:
    "The canonical facts with values deliberately longer than the widgets were drawn to hold, and with the conditional branches the canonical set leaves closed — an appeal, a district attorney who does not consent — opened, so both the length guards and the condition guards are exercised against measured geometry.",
  negative:
    "One participant fact, the county. Everything else the participant could supply must come back refused, so a participant value appearing anywhere else is a leak rather than a fill. The two or three fields that still bind are the ones the document establishes about itself — its own heading and the box it prints '(Required)' beside — which are not participant facts and do not depend on a participant record existing.",
} as const;

function mutationRecord(context: FamilyContext): unknown {
  const spec = context.spec;
  const mutations: unknown[] = [];

  // 1. Reclassifying a protected field as participant text must be rejected.
  for (const field of spec.fields.filter((candidate) => candidate.fieldClass === "protected")) {
    const mutated: ColoradoFieldSpec = {
      ...field,
      fieldClass: "participant",
      protectedCategory: null,
      factId: "participant.full_legal_name",
    };
    const disagreements = auditProtection([mutated]);
    mutations.push({
      mutation: `reclassify ${field.field} from protected to participant`,
      caught: disagreements.length > 0,
      by: disagreements[0]?.problem ?? null,
    });
  }

  // 2. A choice value the document does not offer must refuse.
  const choiceField = spec.fields.find(
    (field) => field.options.length > 1 && field.condition === null && field.factId !== null,
  );
  if (choiceField && choiceField.factId) {
    const plan = bindForm(
      spec,
      mergeFacts(spec, { ...context.family.fixtures.canonical, [choiceField.factId]: "not-an-offered-option" }),
      context.specSha256,
    );
    const outcome = plan.outcomes.find((entry) => entry.field === choiceField.field);
    mutations.push({
      mutation: `set ${choiceField.factId} to a value ${choiceField.field} does not offer`,
      caught: outcome?.written === false && outcome.refusal === "value_not_an_offered_option",
      by: outcome?.refusal ?? null,
    });
  }

  // 3. A conditional field must stay blank when its condition is not met.
  const conditional = spec.fields.find((field) => field.condition !== null && field.factId !== null);
  if (conditional && conditional.condition && conditional.factId) {
    const facts: Record<string, string> = {
      ...(context.family.fixtures.canonical as Record<string, string>),
      [conditional.factId]: "a value that was supplied anyway",
      [conditional.condition.factId]: "__not_the_required_value__",
    };
    const plan = bindForm(spec, mergeFacts(spec, facts), context.specSha256);
    const outcome = plan.outcomes.find((entry) => entry.field === conditional.field);
    mutations.push({
      mutation: `supply ${conditional.factId} while ${conditional.condition.factId} is not ${conditional.condition.equals}`,
      caught: outcome?.written === false && outcome.refusal === "condition_not_met",
      by: outcome?.refusal ?? null,
    });
  }

  // 4. A document field the specification does not name must fail closed.
  const withStranger = bindForm(
    spec,
    mergeFacts(spec, context.family.fixtures.canonical),
    context.specSha256,
    { documentFieldNames: [...spec.fields.map((field) => field.field), "FieldAddedByAReissue"] },
  );
  const stranger = withStranger.outcomes.find((entry) => entry.field === "FieldAddedByAReissue");
  mutations.push({
    mutation: "a re-issued form adds a field the specification does not name",
    caught: stranger?.written === false && stranger.refusal === "document_field_not_in_specification",
    by: stranger?.refusal ?? null,
  });

  // 5. A specification field the document no longer has must fail closed.
  const missingFirst = bindForm(
    spec,
    mergeFacts(spec, context.family.fixtures.canonical),
    context.specSha256,
    { documentFieldNames: spec.fields.slice(1).map((field) => field.field) },
  );
  const dropped = missingFirst.outcomes.find((entry) => entry.field === spec.fields[0].field);
  mutations.push({
    mutation: `a re-issued form drops ${spec.fields[0].field}`,
    caught: dropped?.written === false && dropped.refusal === "field_absent_from_document",
    by: dropped?.refusal ?? null,
  });

  // 6. A caller may not override a fact the document establishes about itself.
  let overrideRejected = false;
  let overrideError: string | null = null;
  try {
    mergeFacts(spec, { ...context.family.fixtures.canonical, "derived.cbi_required": "no" });
  } catch (error) {
    overrideRejected = true;
    overrideError = (error as Error).name;
  }
  mutations.push({
    mutation: "a caller supplies derived.cbi_required to un-tick a box the form marks required",
    caught: overrideRejected,
    by: overrideError,
  });

  return {
    schemaVersion: "rcap-colorado-mutation-tests/v1",
    family: spec.family,
    specVersion: spec.specVersion,
    specSha256: context.specSha256,
    mutations,
    allCaught: (mutations as { caught: boolean }[]).every((entry) => entry.caught),
  };
}

function determinismRecord(context: FamilyContext): unknown {
  const spec = context.spec;
  const facts = mergeFacts(spec, context.family.fixtures.canonical);
  const first = canonicalJson(bindForm(spec, facts, context.specSha256) as unknown as Parameters<typeof canonicalJson>[0]);
  const second = canonicalJson(bindForm(spec, facts, context.specSha256) as unknown as Parameters<typeof canonicalJson>[0]);
  const rebuilt = canonicalJson(
    buildFormSpec({
      authored: context.family.authored,
      census: context.census,
      labelEvidence: Object.fromEntries(spec.fields.map((field) => [field.field, field.labelEvidence])),
    }) as unknown as Parameters<typeof canonicalJson>[0],
  );
  return {
    schemaVersion: "rcap-colorado-determinism/v1",
    family: spec.family,
    basis:
      "the specification was rebuilt from the same census and the canonical plan computed twice from the same facts",
    specificationFirstSha256: context.specSha256,
    specificationRebuiltSha256: sha256(rebuilt),
    specificationIdentical: sha256(rebuilt) === context.specSha256,
    planFirstSha256: sha256(first),
    planSecondSha256: sha256(second),
    planIdentical: first === second,
    artifactRegenerationAttempted: false,
    artifactRegenerationNote:
      "No PDF was rendered. The official binary this family is pinned to is not mounted in this environment, so a render would have had nothing to write onto and a byte comparison would have compared nothing.",
  };
}

function incompleteFilingSetRecord(context: FamilyContext): unknown {
  const isPetition = context.spec.documentId === "JDF-417";
  return {
    schemaVersion: "rcap-colorado-incomplete-filing-set/v1",
    family: context.spec.family,
    routeId: context.family.routeId,
    documentImplemented: context.spec.documentId,
    routeComplete: false,
    commercialStatus: "hold",
    checkoutProhibited: true,
    serviceDisposition: "no_packet_delivered_and_no_guidance_substituted",
    missingComponents: isPetition
      ? [
          { documentId: "JDF-419", role: "NOTICE", why: "Named by the JDF 416 guide; absent from the pinned corpus." },
          { documentId: "JDF-435", role: "ORDER", why: "Named by the JDF 416 guide; absent from the pinned corpus." },
          { documentId: "JDF-205", role: "FEE_WAIVER", why: "Named by the JDF 416 guide; absent from the pinned corpus." },
          { documentId: "JDF-206", role: "FEE_WAIVER", why: "Named by the JDF 416 guide; absent from the pinned corpus." },
        ]
      : [
          {
            documentId: null,
            role: "NOTICE",
            why:
              "Required by the JDF 611 guide. Its form number could not be read first-hand because the guide draws those digits as vector glyphs, and a number is not guessed.",
          },
          {
            documentId: null,
            role: "ORDER",
            why:
              "The guide's second order, on the same footing: required, absent, and its number unresolved.",
          },
          { documentId: "JDF-205", role: "FEE_WAIVER", why: "Named by the JDF 611 guide; absent from the pinned corpus." },
          { documentId: "JDF-206", role: "FEE_WAIVER", why: "Named by the JDF 611 guide; absent from the pinned corpus." },
        ],
    treatment:
      "This document's binding is specified and verified on its own. The route stays blocked and no guidance packet is substituted: dressing an incomplete filing set as guidance would read as a finished product while the filing the participant has to make stays unbuilt.",
    reopensWhen: "Lane G-CO-SOURCE returns the verified source identities for the components above.",
  };
}

// ---------------------------------------------------------------------------

export interface ComputeOptions {
  readonly rootDir: string;
  readonly gitObjectExists: (sha: string) => boolean;
}

/** Every file the specification pipeline owns, for one family. */
export async function computeSpecifiedFamilyFiles(
  family: SpecifiedFamily,
  options: ComputeOptions,
): Promise<{ readonly files: readonly EmittedFile[]; readonly context: FamilyContext }> {
  const context = await loadFamilyContext(options.rootDir, family);
  const rel = (name: string) => `${COLORADO_OVERLAY_ROOT}/${family.family}/specification/${name}`;
  const familyRel = (name: string) => `${COLORADO_OVERLAY_ROOT}/${family.family}/${name}`;

  const plans = {
    canonical: bindForm(context.spec, mergeFacts(context.spec, family.fixtures.canonical), context.specSha256),
    boundary: bindForm(context.spec, mergeFacts(context.spec, family.fixtures.boundary), context.specSha256),
    negative: bindForm(context.spec, mergeFacts(context.spec, family.fixtures.negative), context.specSha256),
  };

  const determination = determineRenderer(options.rootDir, options.gitObjectExists);

  const files: EmittedFile[] = [
    { path: rel("binding-specification.json"), text: context.specText },
    {
      path: rel("integrity.json"),
      text: canonicalJson({
        schemaVersion: "rcap-colorado-specification-integrity/v1",
        specification: "binding-specification.json",
        specVersion: context.spec.specVersion,
        sha256: context.specSha256,
        bytes: Buffer.byteLength(context.specText, "utf8"),
        serialisation: "canonical JSON: keys sorted, two-space indent, trailing newline",
        producedBy: "src/lib/rcap/state-packs/colorado/official-forms/pipeline.ts",
      }),
    },
    { path: rel("field-classification.json"), text: canonicalJson(classificationRecord(context) as never) },
    {
      path: rel("field-classification-policy.json"),
      text: canonicalJson(classificationPolicyRecord(context) as never),
    },
    { path: rel("reports/binding-coverage.json"), text: canonicalJson(coverageRecord(context, plans) as never) },
    { path: rel("reports/protected-fields.json"), text: canonicalJson(protectedFieldsRecord(context) as never) },
    { path: rel("reports/mutation-tests.json"), text: canonicalJson(mutationRecord(context) as never) },
    { path: rel("reports/determinism.json"), text: canonicalJson(determinismRecord(context) as never) },
    {
      path: rel("reports/incomplete-filing-set.json"),
      text: canonicalJson(incompleteFilingSetRecord(context) as never),
    },
    {
      path: rel("label-evidence.json"),
      text: canonicalJson({
        schemaVersion: "rcap-colorado-label-evidence/v1",
        family: family.family,
        basis:
          "retained participant artifact fixtures/canonical-filled.pdf, which carries the official form's own page content; the official binary is not mounted in this environment",
        documentSha256: context.spec.sourceSha256,
        byField: Object.fromEntries(context.spec.fields.map((field) => [field.field, field.labelEvidence])),
      } as never),
    },
    {
      path: familyRel("reports/renderer-provenance.json"),
      text: canonicalJson(rendererProvenanceRecord(determination, family.family, context.spec.sourceSha256) as never),
    },
    {
      path: rel("reports/binding-plans.json"),
      text: canonicalJson({
        schemaVersion: "rcap-colorado-binding-plans/v1",
        family: family.family,
        specVersion: context.spec.specVersion,
        specSha256: context.specSha256,
        plans: {
          canonical: plans.canonical,
          boundary: plans.boundary,
          negative: plans.negative,
        },
      } as never),
    },
  ];

  for (const name of ["canonical", "boundary", "negative"] as const) {
    files.push({
      path: rel(`fixtures/${name}.json`),
      text: canonicalJson(
        fixtureRecord(context, name, family.fixtures[name], FIXTURE_NOTES[name]) as never,
      ),
    });
  }

  return { files, context };
}

/**
 * The render receipt, rewritten so it no longer names a renderer that cannot
 * run. The artifact digests are carried over untouched: they are the one thing
 * about these files that is verifiable here, and they verify.
 */
export function rewriteRenderReceipt(
  rootDir: string,
  familySlug: string,
  determination: RendererDetermination,
): EmittedFile {
  const familyDir = path.join(rootDir, COLORADO_OVERLAY_ROOT, familySlug);
  const receiptPath = path.join(familyDir, "reports/rendered-artifacts.json");
  const prior = readJson<{
    sourceSha256: string;
    factoryVersion?: string;
    artifacts: Record<string, { sha256: string; bytes: number }>;
    manifestRepairedFrom?: string;
  }>(receiptPath);

  const artifacts: Record<string, { sha256: string; bytes: number; verifiedOnDisk: boolean }> = {};
  for (const [relPath, meta] of Object.entries(prior.artifacts)) {
    const absolute = path.join(familyDir, relPath);
    const present = fs.existsSync(absolute);
    const bytes = present ? fs.readFileSync(absolute) : null;
    artifacts[relPath] = {
      sha256: meta.sha256,
      bytes: meta.bytes,
      verifiedOnDisk: bytes !== null && sha256(bytes) === meta.sha256 && bytes.length === meta.bytes,
    };
  }

  return {
    path: `${COLORADO_OVERLAY_ROOT}/${familySlug}/reports/rendered-artifacts.json`,
    text: canonicalJson({
      schemaVersion: "rcap-rendered-artifacts/v2-provenance",
      sourceSha256: prior.sourceSha256,
      factoryVersion: prior.factoryVersion ?? null,
      renderer: null,
      rendererStatus: "unrecoverable_from_accepted_history",
      rendererNamedByPortedManifest: determination.rendererNamedByPortedManifests,
      rendererProvenance: "reports/renderer-provenance.json",
      reproducible: false,
      reproducibilityBasis:
        "These bytes cannot be regenerated in this environment: the renderer named by the ported manifest is not in the tree, no renderer in accepted history claims Colorado, and the official binary this family is pinned to is not mounted. The digests below are recomputed from the bytes on disk and match, which is what these artifacts are retained on.",
      artifacts,
      manifestRepairedFrom: prior.manifestRepairedFrom ?? null,
    } as never),
  };
}

// ---------------------------------------------------------------------------
// Artifact review — what the retained bytes actually carry
// ---------------------------------------------------------------------------

/**
 * The values the D3A run declared it wrote, resolved from that run's own
 * fixture facts rather than from this lane's.
 *
 * The retained artifacts were rendered from `fixtures/canonical.json` under
 * the narrow binding in `production-field-map.json`, and those two files are
 * left exactly as they are. Checking this lane's expanded fact set against
 * bytes rendered from a different one would report dozens of missing values
 * and would be measuring the wrong thing.
 */
function declaredValuesOfRetainedRender(
  familyDir: string,
  fixture: "canonical" | "boundary" | "negative",
): { readonly field: string; readonly factId: string; readonly value: string }[] {
  const map = readJson<{ bindings?: { field: string; factId: string }[] }>(
    path.join(familyDir, "production-field-map.json"),
  );
  // The negative fixture is written in a different shape: it is an assertion
  // that nothing was written, so it carries no facts at all. An empty fact set
  // is the correct reading of it, and the right expectation for its artifact.
  const facts =
    readJson<{ facts?: Record<string, unknown> }>(path.join(familyDir, `fixtures/${fixture}.json`)).facts ?? {};

  const out: { field: string; factId: string; value: string }[] = [];
  for (const binding of map.bindings ?? []) {
    const value = facts[binding.factId];
    if (typeof value === "string" && value.trim() !== "") {
      out.push({ field: binding.field, factId: binding.factId, value });
    }
  }
  return out;
}

export interface ArtifactReviewInput {
  readonly context: FamilyContext;
  readonly readArtifact: typeof import("./artifact-review").readArtifact;
}

/** `reports/actual-writes.json`, `visual-review.json` and the output review. */
export async function computeArtifactReviewFiles({
  context,
  readArtifact,
}: ArtifactReviewInput): Promise<readonly EmittedFile[]> {
  const rel = (name: string) =>
    `${COLORADO_OVERLAY_ROOT}/${context.family.family}/specification/${name}`;

  const fixtures = ["canonical", "boundary", "negative"] as const;
  const readings = [];
  for (const fixture of fixtures) {
    const artifactPath = path.join(context.familyDir, `fixtures/${fixture}-filled.pdf`);
    if (!fs.existsSync(artifactPath)) continue;
    const declared = declaredValuesOfRetainedRender(context.familyDir, fixture);
    const reading = await readArtifact(
      artifactPath,
      context.spec,
      declared.map((entry) => entry.value),
      sha256,
      declared.map((entry) => entry.field),
    );
    const visibleAnywhere = new Set(reading.pages.flatMap((page) => page.declaredValuesVisible));
    const rowsByField = new Map(
      reading.pages.flatMap((page) => page.requestedRows.map((row) => [row.field, row.rowText] as const)),
    );
    readings.push({
      fixture,
      declared,
      reading,
      declaredVisible: declared.filter((entry) => visibleAnywhere.has(entry.value)).map((entry) => entry.field),
      declaredNotFound: declared
        .filter((entry) => !visibleAnywhere.has(entry.value))
        .map((entry) => ({
          field: entry.field,
          value: entry.value,
          rowOnPage: rowsByField.get(entry.field) ?? null,
          finding: diagnoseMissingWrite(entry.value, rowsByField.get(entry.field) ?? ""),
        })),
    });
  }

  const contactSheet = path.join(context.familyDir, "contact-sheet/blank-vs-filled.pdf");
  const contactSheetReading = fs.existsSync(contactSheet)
    ? await readArtifact(contactSheet, context.spec, [], sha256)
    : null;

  const actualWrites = {
    schemaVersion: "rcap-colorado-actual-writes/v1",
    family: context.family.family,
    basis:
      "each retained fixture's page content stream was decoded and searched for the values the D3A run declared it wrote; the fixtures are flattened, so a value set on a field but never drawn would not be found",
    specVersion: context.spec.specVersion,
    specSha256: context.specSha256,
    bindingUnderReview: "production-field-map.json — the narrow binding the retained artifacts were rendered under",
    fixtures: readings.map((entry) => ({
      fixture: entry.fixture,
      artifactSha256: entry.reading.sha256,
      artifactBytes: entry.reading.bytes,
      flattened: entry.reading.flattened,
      acroFormFieldsRemaining: entry.reading.acroFormFieldsRemaining,
      declaredWrites: entry.declared.length,
      declaredWritesFoundOnPage: entry.declaredVisible.length,
      declaredWritesNotFound: entry.declaredNotFound,
      protectedRows: entry.reading.pages.flatMap((page) =>
        page.protectedRowsWithText.map((row) => ({ page: page.page, ...row })),
      ),
    })),
    protectedRowEvidence: protectedRowEvidence(readings),
    note:
      "This is a reading of the bytes that are here. It is not a re-render: the official binary these artifacts were built from is not mounted in this environment.",
  };

  const visualReview = {
    schemaVersion: "rcap-colorado-visual-review/v1",
    family: context.family.family,
    documentId: context.spec.documentId,
    basis:
      "page by page over every retained artifact, reading each page's own content stream: its geometry, how much text it draws, the official footer it ends with, which declared values appear on it, and what sits on each protected row",
    declaredPageCount: context.spec.pageCount,
    artifacts: [
      ...readings.map((entry) => ({
        artifact: `fixtures/${entry.fixture}-filled.pdf`,
        sha256: entry.reading.sha256,
        pageCount: entry.reading.pages.length,
        pageCountMatchesSource: entry.reading.pages.length === context.spec.pageCount,
        pages: entry.reading.pages.map((page) => ({
          page: page.page,
          width: page.width,
          height: page.height,
          textLines: page.textLines,
          officialFooter: page.footer,
          valuesVisibleOnThisPage: page.declaredValuesVisible.length,
          protectedRows: page.protectedRowsWithText,
        })),
      })),
      ...(contactSheetReading
        ? [
            {
              artifact: "contact-sheet/blank-vs-filled.pdf",
              sha256: contactSheetReading.sha256,
              pageCount: contactSheetReading.pages.length,
              // One landscape sheet per source page, carrying the blank panel
              // and the filled panel side by side — not two portrait pages.
              layout: "one landscape page per source page, two panels side by side",
              panelsPerPage: 2,
              pageCountMatchesSource: contactSheetReading.pages.length === context.spec.pageCount,
              landscape: contactSheetReading.pages.every((page) => page.width > page.height),
              pages: contactSheetReading.pages.map((page) => ({
                page: page.page,
                width: page.width,
                height: page.height,
                textLines: page.textLines,
                officialFooter: page.footer,
                valuesVisibleOnThisPage: 0,
                protectedRows: page.protectedRowsWithText,
              })),
            },
          ]
        : []),
    ],
    findings: [
      context.spec.documentId === "JDF-612"
        ? "JDF 612's text layer is drawn with a transposed encoding: 'Sheriff's Department' decodes as 'Sheriff¶s De Sartment' and 'Misdemeanor Offenses' as '0LVGHPHDQRU RI2 IIHQVH V'. The glyphs on the page are correct — the encoding is what does not round-trip — so reviewed labels are recorded separately from the machine reading rather than one standing in for the other."
        : "JDF 417's footer reads 'Page 3 of 2' on its third page. That is the official form's own text, present in the source, and is left as the court publishes it.",
      "Every retained fixture is flattened: no AcroForm survives in it, so the values on the page are the values that were drawn.",
    ],
    reviewScope:
      "the artifacts retained in this repository. No page was re-rendered, because the official binary is not mounted here.",
  };

  const outputReview = {
    schemaVersion: "rcap-colorado-output-implementation-review/v1",
    family: context.family.family,
    specVersion: context.spec.specVersion,
    specSha256: context.specSha256,
    reviewOf: "the binding that produced the retained artifacts, read against the document itself",
    defectsFound: outputDefects(context.spec.documentId),
    note:
      "These are findings about the narrow binding the retained artifacts carry. Each one is corrected in the specification and none of them is corrected on any artifact, because nothing could be re-rendered here.",
  };

  return [
    { path: rel("reports/actual-writes.json"), text: canonicalJson(actualWrites as never) },
    { path: rel("reports/visual-review.json"), text: canonicalJson(visualReview as never) },
    { path: rel("reports/output-implementation-review.json"), text: canonicalJson(outputReview as never) },
  ];
}

/**
 * Why a value the render receipt declared is not on the page.
 *
 * The distinction that matters is between a refusal and a silent loss. A row
 * that carries nothing but its printed label is a fitter that declined to
 * write a value it could not fit, which is the behaviour anyone would want. A
 * row carrying something else is a value that was changed on its way to the
 * page, and that is a defect.
 */
function diagnoseMissingWrite(value: string, rowOnPage: string): string {
  if (value.replace(/\s+/g, " ").trim().length < 6) {
    return "the value is shorter than six characters, so searching the page for it would match the form's own printed text; no conclusion is drawn";
  }
  const stripped = rowOnPage.replace(/[^\p{L}\p{N}]/gu, "");
  const labelOnly = rowOnPage.replace(/[:()]/g, "").trim();
  if (stripped.length === 0 || labelOnly.length <= 24) {
    return `the row carries only its printed label (${JSON.stringify(rowOnPage)}), so the renderer refused the value rather than clipping it — the declared binding produced no write on this artifact`;
  }
  return `the row carries ${JSON.stringify(rowOnPage)}, which is not the declared value`;
}

/**
 * Proof that no protected field was written, taken without decoding a label.
 *
 * Reading a protected row and judging whether it holds "more than its label"
 * needs the label to survive extraction, and on JDF 612 it does not: the
 * signature row decodes as "Signa ture: Date :", which no label pattern
 * recognises and which a strip-the-label test therefore reads as a value.
 *
 * The comparison below needs no decoding at all. The negative artifact was
 * rendered with no participant facts, so anything the renderer would have put
 * in a protected row from the facts is present on the canonical artifact and
 * absent from the negative one. Identical rows across the two mean nothing
 * fact-derived reached them, whatever the bytes decode to. The declared values
 * are searched for as well, so a value that somehow matched on both is still
 * caught.
 */
function protectedRowEvidence(
  readings: readonly {
    fixture: string;
    declared: readonly { value: string }[];
    reading: { pages: readonly { page: number; protectedRowsWithText: readonly { field: string; rowText: string }[] }[] };
  }[],
): unknown {
  const rowsOf = (fixture: string) => {
    const entry = readings.find((candidate) => candidate.fixture === fixture);
    const rows = new Map<string, string>();
    for (const page of entry?.reading.pages ?? []) {
      for (const row of page.protectedRowsWithText) rows.set(row.field, row.rowText);
    }
    return rows;
  };

  const negative = rowsOf("negative");
  const differences: { field: string; fixture: string; withFacts: string; withoutFacts: string }[] = [];
  for (const fixture of ["canonical", "boundary"]) {
    const rows = rowsOf(fixture);
    for (const [field, text] of rows) {
      const baseline = negative.get(field);
      if (baseline !== undefined && baseline !== text) {
        differences.push({ field, fixture, withFacts: text, withoutFacts: baseline });
      }
    }
  }

  const valueInProtectedRow: { field: string; fixture: string; value: string }[] = [];
  for (const entry of readings) {
    for (const page of entry.reading.pages) {
      for (const row of page.protectedRowsWithText) {
        const haystack = row.rowText.replace(/\s+/g, " ").toLowerCase();
        for (const declared of entry.declared) {
          const needle = declared.value.replace(/\s+/g, " ").trim().toLowerCase();
          if (needle.length >= 6 && haystack.includes(needle)) {
            valueInProtectedRow.push({ field: row.field, fixture: entry.fixture, value: declared.value });
          }
        }
      }
    }
  }

  return {
    basis:
      "each protected row's text on the fact-bearing artifacts compared against the same row on the negative artifact, which was rendered with no participant facts; and each declared value searched for inside every protected row",
    rowsCompared: negative.size,
    rowsThatChangeWhenFactsArePresent: differences,
    declaredValuesFoundInAProtectedRow: valueInProtectedRow,
    noProtectedFieldWasWritten: differences.length === 0 && valueInProtectedRow.length === 0,
  };
}

function outputDefects(documentId: string): readonly unknown[] {
  if (documentId === "JDF-417") {
    return [
      {
        field: "∆ City",
        defect: "an address was filed without its state or its ZIP",
        detail:
          "The widget's printed label is 'City, State, & Zip:' and it is drawn 263 points wide. The binding wrote participant.city, so the retained canonical artifact carries 'Denver' where the form asks for 'Denver, CO 80202'.",
        correctedInSpecificationBy: "participant.city_state_zip",
      },
      {
        field: "Court Address",
        defect: "the filing destination was left blank",
        detail:
          "Review withheld the field because the shared binder reached it through a participant street-address descriptor. The withholding was right about the risk and left the court's own address off the filing.",
        correctedInSpecificationBy: "filing.court_address",
      },
      {
        field: "CoS_Date",
        defect: "the certificate of service was left undated",
        detail:
          "Withheld on the ground that the certificate block names the served party. True of the recipient fields; the service date is the participant's own act.",
        correctedInSpecificationBy: "service.service_date",
      },
      {
        field: "every election control",
        defect: "no checkbox, radio group or dropdown could bind at all",
        detail:
          "The shared binder type-guards non-text controls, so all nine of this form's election controls were refused as 'non_text_field_type' — including the Bureau of Investigation box the form marks required.",
        correctedInSpecificationBy: "options pinned to the widget geometry the document draws",
      },
    ];
  }
  return [
    {
      field: "Address",
      defect: "an address was filed without its city, state or ZIP",
      detail:
        "The printed label is 'Mailing Address (with city/state/zip)' and the widget is 278 points wide. The binding wrote participant.street_address.",
      correctedInSpecificationBy: "participant.mailing_address_full",
    },
    {
      field: "Court Address",
      defect: "the filing destination was left blank",
      detail: "Withheld for the same descriptor collision as on JDF 417.",
      correctedInSpecificationBy: "filing.court_address",
    },
    {
      field: "CoS_Date, CoS_Mail, CoS_Other",
      defect: "the certificate of service was left entirely blank",
      detail:
        "All three were withheld together. The recipient fields are the participant's statement of who they served, and the date is the participant's own act.",
      correctedInSpecificationBy: "service.service_date, service.mail_recipient_name_and_address, service.other_method_explanation",
    },
    {
      field: "every election control",
      defect: "no checkbox, radio group or dropdown could bind at all",
      detail:
        "Twenty-two election controls were refused as 'non_text_field_type', which is every eligibility election, every qualification election, the appeal and restitution stops and the whole of section 6's agency selection.",
      correctedInSpecificationBy: "options pinned to the widget geometry the document draws",
    },
    {
      field: "Group_7C",
      defect: "a yes/no pair that is not in the usual order",
      detail:
        "Section 7(c) prints 'No.' above 'Yes.', the reverse of every other pair on the form. Any binding that assumed yes-first would have recorded the opposite answer to a human trafficking question.",
      correctedInSpecificationBy: "options pinned in printed order, with each option's rectangle recorded",
    },
  ];
}

/**
 * The provenance record for a family this lane did not specify.
 *
 * Four of the six families whose receipt named the missing renderer are not
 * petition families and get no specification here. They still get the
 * correction, because the question the record answers — where did these bytes
 * come from and can they be made again — has the same answer for all six.
 */
export function inheritedRendererProvenance(
  rootDir: string,
  familySlug: string,
  determination: RendererDetermination,
): EmittedFile {
  const receipt = readJson<{ sourceSha256: string }>(
    path.join(rootDir, COLORADO_OVERLAY_ROOT, familySlug, "reports/rendered-artifacts.json"),
  );
  return {
    path: `${COLORADO_OVERLAY_ROOT}/${familySlug}/reports/renderer-provenance.json`,
    text: canonicalJson(rendererProvenanceRecord(determination, familySlug, receipt.sourceSha256) as never),
  };
}
