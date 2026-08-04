import { createHash } from "node:crypto";

import {
  LIMITATION_CLASSIFICATIONS,
  type LimitationClassification,
} from "@/lib/rcap/legal-design/types";
import { PLEADING_TEMPLATES } from "@/lib/rcap/packets/engines/pleading-templates";
import { GUIDANCE_TEMPLATES } from "@/lib/rcap/packets/engines/process-guidance";

export const TEMPLATE_HASH_SCHEMA_VERSION =
  "rcap-template-object-sha256/v1" as const;
export const TEMPLATE_FAMILY_SCHEMA_VERSION =
  "rcap-template-family-coverage/v1" as const;

export type TemplateKind = "custom_pleading" | "process_guidance";

export type TemplateHashRecord = {
  readonly schemaVersion: typeof TEMPLATE_HASH_SCHEMA_VERSION;
  readonly templateId: string;
  readonly templateKind: TemplateKind;
  readonly templateVersion: string;
  readonly sha256: string;
};

export type HashPin = {
  readonly id: string;
  readonly sha256: string;
};

export type TemplateFamilyComponentShape = {
  readonly componentId: string;
  readonly order: number;
  readonly role: string;
  readonly requirement: "required" | "conditional";
  readonly conditionKey: string | null;
  readonly outputStrategy:
    "custom_pleading" | "official_pdf_fill" | "process_guidance";
  readonly rendererStrategy: string;
  readonly templateId: string | null;
  readonly sourceId: string | null;
  readonly mappingId: string | null;
};

export type AdoptedTemplateFamily = {
  readonly schemaVersion: typeof TEMPLATE_FAMILY_SCHEMA_VERSION;
  readonly familyId: string;
  readonly templates: readonly HashPin[];
  readonly sources: readonly HashPin[];
  readonly mappings: readonly HashPin[];
  readonly components: readonly TemplateFamilyComponentShape[];
  readonly branchVariants: readonly string[];
  readonly authorityArchiveSha256: string;
  readonly controllingReviewSha256: string;
  readonly coveredExceptions: readonly HashPin[];
};

export type TemplateFamilyCandidate = {
  readonly schemaVersion: typeof TEMPLATE_FAMILY_SCHEMA_VERSION;
  readonly familyId: string;
  readonly templates: readonly HashPin[];
  readonly sources: readonly HashPin[];
  readonly mappings: readonly HashPin[];
  readonly components: readonly TemplateFamilyComponentShape[];
  readonly branchVariants: readonly string[];
  readonly authorityArchiveSha256: string;
  readonly controllingReviewSha256: string;
  readonly exceptions: readonly {
    readonly exceptionId: string;
    readonly classification: LimitationClassification;
    /** The complete exception payload counsel saw, excluding this hash. */
    readonly content: unknown;
  }[];
  readonly releaseBlockers: readonly string[];
};

export type TemplateFamilyObservedState = {
  /**
   * Hashes recomputed from the current official binaries by the integration
   * verifier. This module never opens private or external source files itself.
   */
  readonly sources: readonly HashPin[];
  /** Hashes recomputed from the current canonical mapping objects. */
  readonly mappings: readonly HashPin[];
};

export type HashPinnedMappingApproval<
  Binding extends { readonly mappingApproved: boolean },
> =
  | (Binding & {
      readonly mappingApproved: false;
      readonly mappingSha256?: string | null;
    })
  | (Binding & {
      readonly mappingApproved: true;
      readonly mappingSha256: string;
    });

export type TemplateFamilyCoverageDeltaCode =
  | "invalid_family_claim"
  | "family_id_mismatch"
  | "invalid_hash_pin"
  | "duplicate_hash_pin"
  | "missing_hash_pin"
  | "extra_hash_pin"
  | "hash_mismatch"
  | "current_template_missing"
  | "current_template_hash_mismatch"
  | "current_source_hash_mismatch"
  | "current_mapping_hash_mismatch"
  | "invalid_component_shape"
  | "unpinned_component_reference"
  | "unconsumed_hash_pin"
  | "component_shape_mismatch"
  | "duplicate_branch_variant"
  | "branch_variant_not_adopted"
  | "authority_archive_hash_mismatch"
  | "controlling_review_hash_mismatch"
  | "invalid_exception"
  | "covered_exception_hash_mismatch"
  | "uncovered_legal_design_blocker"
  | "release_blocker_open";

export type TemplateFamilyCoverageDelta = {
  readonly code: TemplateFamilyCoverageDeltaCode;
  readonly subject: string;
  readonly expected?: string;
  readonly actual?: string;
};

export type TemplateFamilyCoverageResult = {
  readonly covered: boolean;
  readonly familyId: string | null;
  readonly deltas: readonly TemplateFamilyCoverageDelta[];
};

export type TemplateHashErrorCode =
  | "invalid_template_id"
  | "template_not_found"
  | "duplicate_template_id"
  | "template_identity_mismatch"
  | "template_version_missing"
  | "non_canonical_value"
  | "template_hash_mismatch"
  | "mapping_hash_missing"
  | "invalid_mapping_hash"
  | "mapping_hash_mismatch";

export class TemplateHashError extends Error {
  readonly code: TemplateHashErrorCode;
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: TemplateHashErrorCode,
    message: string,
    detail: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "TemplateHashError";
    this.code = code;
    this.detail = detail;
  }
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const NON_WITHHOLDING_CLASSIFICATIONS = new Set<LimitationClassification>(
  LIMITATION_CLASSIFICATIONS.filter(
    (classification) => classification !== "legal_design_blocker",
  ),
);

type TemplateRegistry = Readonly<
  Record<string, { templateId: string; version: string }>
>;
type FamilyPinKind = "template" | "source" | "mapping";
type FamilyPinSide = "adopted" | "candidate" | "observed";

const COMPONENT_PROPERTIES = [
  "componentId",
  "order",
  "role",
  "requirement",
  "conditionKey",
  "outputStrategy",
  "rendererStrategy",
  "templateId",
  "sourceId",
  "mappingId",
] as const;
const OUTPUT_STRATEGIES = new Set<
  TemplateFamilyComponentShape["outputStrategy"]
>(["custom_pleading", "official_pdf_fill", "process_guidance"]);

const TEMPLATE_REGISTRIES: readonly {
  readonly kind: TemplateKind;
  readonly templates: TemplateRegistry;
}[] = [
  {
    kind: "custom_pleading",
    templates: PLEADING_TEMPLATES,
  },
  {
    kind: "process_guidance",
    templates: GUIDANCE_TEMPLATES,
  },
];

/**
 * Canonical JSON for hash inputs.
 *
 * Objects are sorted by key while arrays retain their authored order. Values
 * that JSON.stringify would silently drop or coerce are rejected, as are
 * accessors, sparse arrays, non-plain objects and cycles. A hash therefore
 * cannot stay unchanged because part of a template was accidentally omitted.
 */
export function canonicalJson(value: unknown): string {
  return serializeCanonical(value, "$", new Set<object>());
}

/** SHA-256 of strict canonical JSON, returned as lowercase hexadecimal. */
export function canonicalJsonSha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

/**
 * Stable hash of one mapping object.
 *
 * This is intentionally the same strict object contract used for templates.
 * A future mapping approval can pin this value without depending on whitespace
 * or object-key order in a JSON file.
 */
export function canonicalMappingSha256(mapping: unknown): string {
  return canonicalJsonSha256(mapping);
}

/**
 * Type-safe bridge for the captain-owned PacketAssetBinding integration.
 *
 * A false approval may omit a pin. A true approval may not, and every supplied
 * pin is recomputed even while approval remains false. This lets the later
 * shared-registry change replace its naked boolean without weakening the
 * worker boundary around that registry.
 */
export function assertMappingApprovalPinned<
  Binding extends { readonly mappingApproved: boolean },
>(
  binding: Binding,
  mapping: unknown,
): asserts binding is HashPinnedMappingApproval<Binding> {
  const mappingSha256 = (
    binding as Binding & { readonly mappingSha256?: unknown }
  ).mappingSha256;
  if (mappingSha256 === undefined || mappingSha256 === null) {
    if (binding.mappingApproved) {
      throw new TemplateHashError(
        "mapping_hash_missing",
        "An approved mapping must carry mappingSha256.",
      );
    }
    return;
  }
  if (
    typeof mappingSha256 !== "string" ||
    !SHA256_PATTERN.test(mappingSha256)
  ) {
    throw new TemplateHashError(
      "invalid_mapping_hash",
      "mappingSha256 must be a lowercase SHA-256 hexadecimal string.",
      { mappingSha256 },
    );
  }
  const actualSha256 = canonicalMappingSha256(mapping);
  if (actualSha256 !== mappingSha256) {
    throw new TemplateHashError(
      "mapping_hash_mismatch",
      "The current mapping object does not match mappingSha256.",
      { expectedSha256: mappingSha256, actualSha256 },
    );
  }
}

/**
 * Stable hash of exactly one registered template object.
 *
 * The containing source file and the rest of its registry are not part of the
 * input. Editing an unrelated template in a shared file therefore cannot
 * invalidate this template family's counsel coverage.
 */
export function canonicalTemplateHash(templateId: string): string {
  return canonicalTemplateHashRecord(templateId).sha256;
}

export function canonicalTemplateHashRecord(
  templateId: string,
): TemplateHashRecord {
  const resolved = resolveTemplate(templateId);
  return Object.freeze({
    schemaVersion: TEMPLATE_HASH_SCHEMA_VERSION,
    templateId,
    templateKind: resolved.kind,
    templateVersion: resolved.template.version,
    sha256: canonicalJsonSha256(resolved.template),
  });
}

/** Every currently registered static template, in deterministic ID order. */
export function registeredTemplateHashRecords(): readonly TemplateHashRecord[] {
  const ids = TEMPLATE_REGISTRIES.flatMap(({ templates }) =>
    Object.keys(templates),
  );
  const uniqueIds = [...new Set(ids)].sort(compareStrings);
  if (uniqueIds.length !== ids.length) {
    const duplicate = ids
      .sort(compareStrings)
      .find((id, index, values) => id === values[index - 1]);
    throw new TemplateHashError(
      "duplicate_template_id",
      `Template ID ${duplicate ?? "<unknown>"} is registered more than once.`,
      { templateId: duplicate ?? null },
    );
  }
  return Object.freeze(
    uniqueIds.map((templateId) => canonicalTemplateHashRecord(templateId)),
  );
}

/** Fail closed for malformed, missing or drifted hash claims. */
export function templateHashMatches(
  templateId: string,
  expectedSha256: string,
): boolean {
  if (!SHA256_PATTERN.test(expectedSha256)) return false;
  try {
    return canonicalTemplateHash(templateId) === expectedSha256;
  } catch {
    return false;
  }
}

export function assertTemplateHashMatches(
  templateId: string,
  expectedSha256: string,
): void {
  const actualSha256 = canonicalTemplateHash(templateId);
  if (!SHA256_PATTERN.test(expectedSha256) || actualSha256 !== expectedSha256) {
    throw new TemplateHashError(
      "template_hash_mismatch",
      `Template ${templateId} does not match its pinned SHA-256.`,
      { templateId, expectedSha256, actualSha256 },
    );
  }
}

/**
 * Mechanically decide whether a later track is covered by an adopted family.
 *
 * Coverage requires exact template/source/mapping pin sets, exact ordered
 * component shape, current template objects matching their candidate pins,
 * candidate branches contained by the adopted branch space, identical
 * authority hashes, no uncovered legal-design blocker and no release blocker.
 * Every mismatch is returned as a named delta for a bounded review job.
 */
export function verifyTemplateFamilyCoverage(
  adopted: AdoptedTemplateFamily,
  candidate: TemplateFamilyCandidate,
  observed: TemplateFamilyObservedState,
): TemplateFamilyCoverageResult {
  const deltas: TemplateFamilyCoverageDelta[] = [];
  const familyId =
    typeof candidate?.familyId === "string" && candidate.familyId
      ? candidate.familyId
      : null;

  if (
    adopted?.schemaVersion !== TEMPLATE_FAMILY_SCHEMA_VERSION ||
    candidate?.schemaVersion !== TEMPLATE_FAMILY_SCHEMA_VERSION
  ) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "schemaVersion",
      expected: TEMPLATE_FAMILY_SCHEMA_VERSION,
      actual: `${String(adopted?.schemaVersion)} / ${String(candidate?.schemaVersion)}`,
    });
  }

  if (
    typeof adopted?.familyId !== "string" ||
    adopted.familyId.length === 0 ||
    familyId === null
  ) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "familyId",
    });
  } else if (adopted.familyId !== familyId) {
    deltas.push({
      code: "family_id_mismatch",
      subject: "familyId",
      expected: adopted.familyId,
      actual: familyId,
    });
  }

  const templatePins = compareHashPins(
    "template",
    adopted?.templates,
    candidate?.templates,
    deltas,
  );
  const sourcePins = compareHashPins(
    "source",
    adopted?.sources,
    candidate?.sources,
    deltas,
  );
  const mappingPins = compareHashPins(
    "mapping",
    adopted?.mappings,
    candidate?.mappings,
    deltas,
  );

  for (const [templateId, pin] of templatePins.candidate) {
    try {
      const actualSha256 = canonicalTemplateHash(templateId);
      if (actualSha256 !== pin.sha256) {
        deltas.push({
          code: "current_template_hash_mismatch",
          subject: `template:${templateId}`,
          expected: pin.sha256,
          actual: actualSha256,
        });
      }
    } catch (error) {
      deltas.push({
        code: "current_template_missing",
        subject: `template:${templateId}`,
        actual: error instanceof Error ? error.message : String(error),
      });
    }
  }

  compareObservedPins(
    "source",
    sourcePins.candidate,
    observed?.sources,
    deltas,
  );
  compareObservedPins(
    "mapping",
    mappingPins.candidate,
    observed?.mappings,
    deltas,
  );
  validateComponentReferences(
    "adopted",
    adopted?.components,
    templatePins.adopted,
    sourcePins.adopted,
    mappingPins.adopted,
    deltas,
  );
  validateComponentReferences(
    "candidate",
    candidate?.components,
    templatePins.candidate,
    sourcePins.candidate,
    mappingPins.candidate,
    deltas,
  );
  compareComponentShape(adopted?.components, candidate?.components, deltas);
  compareBranchVariants(
    adopted?.branchVariants,
    candidate?.branchVariants,
    deltas,
  );
  compareAuthorityHashes(adopted, candidate, deltas);
  compareExceptions(adopted, candidate, deltas);
  compareReleaseBlockers(candidate?.releaseBlockers, deltas);

  const orderedDeltas = [...deltas].sort((left, right) => {
    const byCode = compareStrings(left.code, right.code);
    return byCode || compareStrings(left.subject, right.subject);
  });
  return Object.freeze({
    covered: orderedDeltas.length === 0,
    familyId,
    deltas: Object.freeze(orderedDeltas),
  });
}

function resolveTemplate(templateId: string): {
  kind: TemplateKind;
  template: { templateId: string; version: string };
} {
  if (
    typeof templateId !== "string" ||
    templateId.length === 0 ||
    templateId.trim() !== templateId
  ) {
    throw new TemplateHashError(
      "invalid_template_id",
      "A template ID must be a non-empty, already-normalized string.",
      { templateId },
    );
  }

  const matches = TEMPLATE_REGISTRIES.flatMap(({ kind, templates }) =>
    Object.prototype.hasOwnProperty.call(templates, templateId)
      ? [{ kind, template: templates[templateId] }]
      : [],
  );
  if (matches.length === 0) {
    throw new TemplateHashError(
      "template_not_found",
      `No static packet template is registered as ${templateId}.`,
      { templateId },
    );
  }
  if (matches.length !== 1) {
    throw new TemplateHashError(
      "duplicate_template_id",
      `Template ID ${templateId} is registered in more than one template registry.`,
      { templateId, matches: matches.map(({ kind }) => kind) },
    );
  }

  const resolved = matches[0];
  if (resolved.template.templateId !== templateId) {
    throw new TemplateHashError(
      "template_identity_mismatch",
      `Registry key ${templateId} does not match the template object's ID.`,
      { templateId, objectTemplateId: resolved.template.templateId },
    );
  }
  if (
    typeof resolved.template.version !== "string" ||
    resolved.template.version.length === 0
  ) {
    throw new TemplateHashError(
      "template_version_missing",
      `Template ${templateId} has no version.`,
      { templateId },
    );
  }
  return resolved;
}

function serializeCanonical(
  value: unknown,
  valuePath: string,
  ancestors: Set<object>,
): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw nonCanonical(valuePath, "numbers must be finite");
      }
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw nonCanonical(
        valuePath,
        `${typeof value} values cannot be represented in canonical JSON`,
      );
    case "object":
      break;
    default:
      throw nonCanonical(valuePath, `unsupported value type ${typeof value}`);
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw nonCanonical(valuePath, "cyclic values are not hashable");
  }
  ancestors.add(objectValue);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw nonCanonical(valuePath, "only ordinary arrays are hashable");
      }
      const names = Object.getOwnPropertyNames(value);
      const expectedNames = [
        ...Array.from({ length: value.length }, (_, index) => String(index)),
        "length",
      ];
      if (
        names.length !== expectedNames.length ||
        expectedNames.some((name) => !names.includes(name)) ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        throw nonCanonical(
          valuePath,
          "arrays must be dense and may not carry extra properties",
        );
      }
      const entries: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          throw nonCanonical(
            `${valuePath}[${index}]`,
            "array entries must be enumerable data properties",
          );
        }
        entries.push(
          serializeCanonical(
            descriptor.value,
            `${valuePath}[${index}]`,
            ancestors,
          ),
        );
      }
      return `[${entries.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw nonCanonical(valuePath, "only plain objects are hashable");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw nonCanonical(valuePath, "symbol-keyed properties are not hashable");
    }

    const entries = Object.getOwnPropertyNames(value)
      .sort(compareStrings)
      .map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          throw nonCanonical(
            `${valuePath}.${key}`,
            "properties must be enumerable data properties",
          );
        }
        return `${JSON.stringify(key)}:${serializeCanonical(
          descriptor.value,
          `${valuePath}[${JSON.stringify(key)}]`,
          ancestors,
        )}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(objectValue);
  }
}

function nonCanonical(valuePath: string, reason: string): TemplateHashError {
  return new TemplateHashError(
    "non_canonical_value",
    `Cannot hash ${valuePath}: ${reason}.`,
    { path: valuePath, reason },
  );
}

function compareHashPins(
  kind: FamilyPinKind,
  adoptedPins: readonly HashPin[] | undefined,
  candidatePins: readonly HashPin[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): {
  readonly adopted: ReadonlyMap<string, HashPin>;
  readonly candidate: ReadonlyMap<string, HashPin>;
} {
  const adopted = indexHashPins(kind, "adopted", adoptedPins, deltas);
  const candidate = indexHashPins(kind, "candidate", candidatePins, deltas);

  for (const [id, expected] of adopted) {
    const actual = candidate.get(id);
    if (!actual) {
      deltas.push({
        code: "missing_hash_pin",
        subject: `${kind}:${id}`,
        expected: expected.sha256,
      });
    } else if (actual.sha256 !== expected.sha256) {
      deltas.push({
        code: "hash_mismatch",
        subject: `${kind}:${id}`,
        expected: expected.sha256,
        actual: actual.sha256,
      });
    }
  }
  for (const [id, actual] of candidate) {
    if (!adopted.has(id)) {
      deltas.push({
        code: "extra_hash_pin",
        subject: `${kind}:${id}`,
        actual: actual.sha256,
      });
    }
  }
  return { adopted, candidate };
}

function indexHashPins(
  kind: string,
  side: FamilyPinSide,
  pins: readonly HashPin[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): Map<string, HashPin> {
  const result = new Map<string, HashPin>();
  if (!Array.isArray(pins)) {
    deltas.push({
      code: "invalid_family_claim",
      subject: `${side}.${kind}s`,
    });
    return result;
  }
  for (const pin of pins) {
    if (
      !pin ||
      typeof pin.id !== "string" ||
      pin.id.length === 0 ||
      pin.id.trim() !== pin.id ||
      typeof pin.sha256 !== "string" ||
      !SHA256_PATTERN.test(pin.sha256)
    ) {
      deltas.push({
        code: "invalid_hash_pin",
        subject: `${side}.${kind}:${String(pin?.id ?? "<missing>")}`,
        actual: String(pin?.sha256 ?? ""),
      });
      continue;
    }
    if (result.has(pin.id)) {
      deltas.push({
        code: "duplicate_hash_pin",
        subject: `${side}.${kind}:${pin.id}`,
      });
      continue;
    }
    result.set(pin.id, pin);
  }
  return result;
}

function compareObservedPins(
  kind: "source" | "mapping",
  claimed: ReadonlyMap<string, HashPin>,
  observedPins: readonly HashPin[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  const observed = indexHashPins(kind, "observed", observedPins, deltas);
  const mismatchCode =
    kind === "source"
      ? "current_source_hash_mismatch"
      : "current_mapping_hash_mismatch";

  for (const [id, expected] of claimed) {
    const actual = observed.get(id);
    if (!actual || actual.sha256 !== expected.sha256) {
      deltas.push({
        code: mismatchCode,
        subject: `${kind}:${id}`,
        expected: expected.sha256,
        actual: actual?.sha256 ?? "<missing>",
      });
    }
  }
  for (const [id, actual] of observed) {
    if (!claimed.has(id)) {
      deltas.push({
        code: "extra_hash_pin",
        subject: `observed.${kind}:${id}`,
        actual: actual.sha256,
      });
    }
  }
}

function validateComponentReferences(
  side: "adopted" | "candidate",
  components: readonly TemplateFamilyComponentShape[] | undefined,
  templates: ReadonlyMap<string, HashPin>,
  sources: ReadonlyMap<string, HashPin>,
  mappings: ReadonlyMap<string, HashPin>,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (!Array.isArray(components)) {
    deltas.push({
      code: "invalid_family_claim",
      subject: `${side}.components`,
    });
    return;
  }

  const componentIds = new Set<string>();
  const componentOrders = new Set<number>();
  const consumed = {
    template: new Set<string>(),
    source: new Set<string>(),
    mapping: new Set<string>(),
  };

  for (const [index, component] of components.entries()) {
    const subject = `${side}.components[${index}]`;
    if (!isValidComponentShape(component)) {
      deltas.push({ code: "invalid_component_shape", subject });
      continue;
    }
    if (
      componentIds.has(component.componentId) ||
      componentOrders.has(component.order)
    ) {
      deltas.push({
        code: "invalid_component_shape",
        subject,
        actual: "duplicate componentId or order",
      });
      continue;
    }
    componentIds.add(component.componentId);
    componentOrders.add(component.order);

    const references = [
      ["template", component.templateId, templates],
      ["source", component.sourceId, sources],
      ["mapping", component.mappingId, mappings],
    ] as const;
    for (const [kind, id, pins] of references) {
      if (id === null) continue;
      consumed[kind].add(id);
      if (!pins.has(id)) {
        deltas.push({
          code: "unpinned_component_reference",
          subject: `${side}.component:${component.componentId}.${kind}:${id}`,
        });
      }
    }
  }

  const pinSets = [
    ["template", templates],
    ["source", sources],
    ["mapping", mappings],
  ] as const;
  for (const [kind, pins] of pinSets) {
    for (const id of pins.keys()) {
      if (!consumed[kind].has(id)) {
        deltas.push({
          code: "unconsumed_hash_pin",
          subject: `${side}.${kind}:${id}`,
        });
      }
    }
  }
}

function isValidComponentShape(
  component: TemplateFamilyComponentShape | undefined,
): component is TemplateFamilyComponentShape {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    return false;
  }
  const keys = Object.keys(component).sort(compareStrings);
  const expectedKeys = [...COMPONENT_PROPERTIES].sort(compareStrings);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    return false;
  }
  if (
    !isNormalizedNonEmptyString(component.componentId) ||
    !Number.isSafeInteger(component.order) ||
    component.order < 1 ||
    !isNormalizedNonEmptyString(component.role) ||
    (component.requirement !== "required" &&
      component.requirement !== "conditional") ||
    !OUTPUT_STRATEGIES.has(component.outputStrategy) ||
    !isNormalizedNonEmptyString(component.rendererStrategy) ||
    !isOptionalId(component.templateId) ||
    !isOptionalId(component.sourceId) ||
    !isOptionalId(component.mappingId)
  ) {
    return false;
  }
  if (
    (component.requirement === "required" && component.conditionKey !== null) ||
    (component.requirement === "conditional" &&
      !isNormalizedNonEmptyString(component.conditionKey))
  ) {
    return false;
  }
  if (component.outputStrategy === "official_pdf_fill") {
    return (
      component.templateId === null &&
      component.sourceId !== null &&
      component.mappingId !== null
    );
  }
  return (
    component.templateId !== null &&
    component.sourceId === null &&
    component.mappingId === null
  );
}

function isOptionalId(value: unknown): value is string | null {
  return value === null || isNormalizedNonEmptyString(value);
}

function isNormalizedNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.trim() === value
  );
}

function compareComponentShape(
  adoptedComponents: readonly TemplateFamilyComponentShape[] | undefined,
  candidateComponents: readonly TemplateFamilyComponentShape[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (
    !Array.isArray(adoptedComponents) ||
    !Array.isArray(candidateComponents)
  ) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "components",
    });
    return;
  }
  try {
    const expected = canonicalJsonSha256(adoptedComponents);
    const actual = canonicalJsonSha256(candidateComponents);
    if (expected !== actual) {
      deltas.push({
        code: "component_shape_mismatch",
        subject: "components",
        expected,
        actual,
      });
    }
  } catch (error) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "components",
      actual: error instanceof Error ? error.message : String(error),
    });
  }
}

function compareBranchVariants(
  adoptedBranches: readonly string[] | undefined,
  candidateBranches: readonly string[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (!Array.isArray(adoptedBranches) || !Array.isArray(candidateBranches)) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "branchVariants",
    });
    return;
  }
  const adopted = indexStrings(
    "adopted.branchVariants",
    adoptedBranches,
    deltas,
  );
  const candidate = indexStrings(
    "candidate.branchVariants",
    candidateBranches,
    deltas,
  );
  for (const branch of candidate) {
    if (!adopted.has(branch)) {
      deltas.push({
        code: "branch_variant_not_adopted",
        subject: `branch:${branch}`,
      });
    }
  }
}

function indexStrings(
  subject: string,
  values: readonly string[],
  deltas: TemplateFamilyCoverageDelta[],
): Set<string> {
  const result = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      deltas.push({
        code: "invalid_family_claim",
        subject,
        actual: String(value),
      });
      continue;
    }
    if (result.has(value)) {
      deltas.push({
        code: "duplicate_branch_variant",
        subject: `${subject}:${value}`,
      });
    }
    result.add(value);
  }
  return result;
}

function compareAuthorityHashes(
  adopted: AdoptedTemplateFamily,
  candidate: TemplateFamilyCandidate,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  compareOneAuthorityHash(
    "authorityArchiveSha256",
    adopted?.authorityArchiveSha256,
    candidate?.authorityArchiveSha256,
    "authority_archive_hash_mismatch",
    deltas,
  );
  compareOneAuthorityHash(
    "controllingReviewSha256",
    adopted?.controllingReviewSha256,
    candidate?.controllingReviewSha256,
    "controlling_review_hash_mismatch",
    deltas,
  );
}

function compareOneAuthorityHash(
  subject: string,
  expected: string,
  actual: string,
  code: "authority_archive_hash_mismatch" | "controlling_review_hash_mismatch",
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (
    !SHA256_PATTERN.test(expected ?? "") ||
    !SHA256_PATTERN.test(actual ?? "") ||
    expected !== actual
  ) {
    deltas.push({ code, subject, expected, actual });
  }
}

function compareExceptions(
  adopted: AdoptedTemplateFamily,
  candidate: TemplateFamilyCandidate,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (
    !Array.isArray(adopted?.coveredExceptions) ||
    !Array.isArray(candidate?.exceptions)
  ) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "exceptions",
    });
    return;
  }
  const covered = indexHashPins(
    "exception",
    "adopted",
    adopted.coveredExceptions,
    deltas,
  );

  const seen = new Set<string>();
  for (const exception of candidate.exceptions) {
    if (
      !exception ||
      typeof exception.exceptionId !== "string" ||
      exception.exceptionId.length === 0 ||
      exception.exceptionId.trim() !== exception.exceptionId ||
      !LIMITATION_CLASSIFICATIONS.includes(exception.classification)
    ) {
      deltas.push({
        code: "invalid_exception",
        subject: `exception:${String(exception?.exceptionId ?? "<missing>")}`,
      });
      continue;
    }
    if (seen.has(exception.exceptionId)) {
      deltas.push({
        code: "invalid_exception",
        subject: `exception:${exception.exceptionId}`,
        actual: "duplicate",
      });
      continue;
    }
    seen.add(exception.exceptionId);
    let exceptionSha256: string;
    try {
      exceptionSha256 = canonicalJsonSha256(exception);
    } catch (error) {
      deltas.push({
        code: "invalid_exception",
        subject: `exception:${exception.exceptionId}`,
        actual: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    const coveredPin = covered.get(exception.exceptionId);
    if (coveredPin && coveredPin.sha256 !== exceptionSha256) {
      deltas.push({
        code: "covered_exception_hash_mismatch",
        subject: `exception:${exception.exceptionId}`,
        expected: coveredPin.sha256,
        actual: exceptionSha256,
      });
    } else if (
      !coveredPin &&
      !NON_WITHHOLDING_CLASSIFICATIONS.has(exception.classification)
    ) {
      deltas.push({
        code: "uncovered_legal_design_blocker",
        subject: `exception:${exception.exceptionId}`,
        actual: exception.classification,
      });
    }
  }
}

function compareReleaseBlockers(
  releaseBlockers: readonly string[] | undefined,
  deltas: TemplateFamilyCoverageDelta[],
): void {
  if (!Array.isArray(releaseBlockers)) {
    deltas.push({
      code: "invalid_family_claim",
      subject: "releaseBlockers",
    });
    return;
  }
  for (const [index, blocker] of releaseBlockers.entries()) {
    deltas.push({
      code: "release_blocker_open",
      subject:
        typeof blocker === "string" && blocker.length > 0
          ? blocker
          : `releaseBlockers[${index}]`,
    });
  }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
