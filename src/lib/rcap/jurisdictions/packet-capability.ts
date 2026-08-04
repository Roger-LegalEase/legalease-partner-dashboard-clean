// Explicit packet-delivery capability for all 50 states plus DC.
//
// This registry is the single authority on whether a jurisdiction can produce a
// downloadable document packet. It exists because the previous template
// resolver named four states and silently fell through to Mississippi for every
// other jurisdiction, which meant an unsupported jurisdiction would have been
// served another jurisdiction's court form.
//
// Two rules make that class of defect unrepresentable here:
//
//   1. Every jurisdiction is enumerated. There is no catch-all entry and no
//      default branch anywhere in this module.
//   2. `packet_ready` requires at least one asset binding whose mapping is
//      approved. `assertRegistryIntegrity` enforces that, so a capability
//      cannot claim readiness that the runtime is unable to honour.
//
// No jurisdiction is `packet_ready` today: no official source template has an
// approved mapping yet. That is the honest state, and the runtime HTTP gate is
// expected to report zero proven jurisdictions until one is genuinely mapped.
//
// Deliberately free of `server-only` so the audit script, the acceptance gate
// and unit tests can import the same data the runtime uses.

import all51 from "@/lib/rcap-engine/compiled/all51.json";

/**
 * Packet-delivery capability, narrowest to widest.
 *
 * - `guidance_only`        no document generator; the product offers guidance.
 * - `generator_present`    a generator entry point exists, no mapping drafted.
 * - `mapping_in_review`    mappings drafted but not approved for live use.
 * - `packet_ready`         an approved mapping exists and delivery is provable.
 * - `temporarily_disabled` deliberately withdrawn; never falls back elsewhere.
 */
export type PacketCapabilityStatus =
  | "guidance_only"
  | "generator_present"
  | "mapping_in_review"
  | "packet_ready"
  | "temporarily_disabled";

export const PACKET_CAPABILITY_STATUSES: readonly PacketCapabilityStatus[] = [
  "guidance_only",
  "generator_present",
  "mapping_in_review",
  "packet_ready",
  "temporarily_disabled"
];

/** Only this status permits producing a document. */
export function isPacketDeliveringStatus(
  status: PacketCapabilityStatus
): boolean {
  return status === "packet_ready";
}

/**
 * A binding from one remedy/form to the exact official source template and the
 * mapping that positions values on it.
 *
 * `sourceTemplatePath` is repository-relative and must point at an official
 * source document. A generated derivative, an HTML reconstruction or a rendered
 * sample is not an official source and must never appear here.
 */
type PacketAssetBindingIdentity = {
  readonly remedyId: string;
  readonly formId: string;
  readonly sourceTemplatePath: string;
  readonly mappingPath: string;
};

/**
 * A false approval may omit a mapping pin. A true approval is valid only when
 * it is bound to the canonical SHA-256 of the exact mapping object.
 */
export type PacketAssetBinding = PacketAssetBindingIdentity &
  (
    | {
        readonly mappingApproved: false;
        readonly mappingSha256?: string | null;
      }
    | {
        readonly mappingApproved: true;
        readonly mappingSha256: string;
      }
  );

/**
 * County-scoped capability. Support that is limited to a county is represented
 * here rather than on the jurisdiction, so statewide coverage can never be
 * inferred from a single supported county.
 */
export type CountyPacketCapability = {
  readonly countyKey: string;
  readonly countyName: string;
  readonly status: PacketCapabilityStatus;
  readonly assets: readonly PacketAssetBinding[];
  readonly note?: string;
};

export type JurisdictionPacketCapability = {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  /**
   * Statewide status. When `countyScoped` is true this describes the rest of
   * the jurisdiction and may not be `packet_ready`; only a named county can be.
   */
  readonly status: PacketCapabilityStatus;
  readonly countyScoped: boolean;
  readonly counties: readonly CountyPacketCapability[];
  readonly assets: readonly PacketAssetBinding[];
  readonly note?: string;
};

type CompiledJurisdiction = {
  jurisdiction?: { code?: string; name?: string; slug?: string };
};

const COMPILED = all51 as Record<string, CompiledJurisdiction>;

/** Canonical identity for all 51, taken from the compiled engine profiles. */
function identity(code: string): { code: string; name: string; slug: string } {
  const entry = COMPILED[code]?.jurisdiction;
  if (!entry?.code || !entry.name || !entry.slug) {
    throw new Error(
      `Jurisdiction ${code} is absent from the compiled engine profiles.`
    );
  }
  return { code: entry.code, name: entry.name, slug: entry.slug };
}

function guidanceOnly(code: string, note: string): JurisdictionPacketCapability {
  return {
    ...identity(code),
    status: "guidance_only",
    countyScoped: false,
    counties: [],
    assets: [],
    note
  };
}

/**
 * A jurisdiction with a document generator whose mappings are drafted but not
 * approved. Drafted mappings are recorded so the audit can show what exists,
 * but `mappingApproved: false` keeps them out of the delivery path.
 */
function mappingInReview(
  code: string,
  assets: readonly PacketAssetBinding[],
  note: string
): JurisdictionPacketCapability {
  return {
    ...identity(code),
    status: "mapping_in_review",
    countyScoped: false,
    counties: [],
    assets,
    note
  };
}

const DRAFT_MAP_DIR = "docs/record-clearing/field-map-drafts/all50";

/**
 * The five jurisdictions with a document generator entry point. Every mapping
 * below is an unapproved draft: the corpus audit found the nationwide overlay
 * anchors to be two repeated placeholder geometries, not confirmed positions.
 *
 * The official source templates these bind to live outside the repository, in
 * the gitignored nationwide source inventory. `sourceTemplatePath` records the
 * inventory-relative identity so the resolver can fail closed with a precise
 * reason rather than a generic miss.
 */
const GENERATOR_JURISDICTIONS: readonly JurisdictionPacketCapability[] = [
  mappingInReview(
    "MS",
    [
      {
        remedyId: "expungement_dismissed_case",
        formId: "ms-petition-expungement-dismissed-case",
        sourceTemplatePath:
          "private/Nationwide Record Clearing/LegalEase Mississippi/Petition-for-Expungement-of-Criminal-Record-on-Dismissed-Case.pdf",
        mappingPath: `${DRAFT_MAP_DIR}/mississippi-legalease-mississippi-petition-for-expungement-of-criminal-record-on-dismissed-case.field-map-draft.json`,
        mappingApproved: false
      },
      {
        remedyId: "expungement_conviction",
        formId: "ms-petition-expungement-conviction",
        sourceTemplatePath:
          "private/Nationwide Record Clearing/LegalEase Mississippi/Petition-for-Expungement-of-Criminal-Record-of-Criminal-Conviction.pdf",
        mappingPath: `${DRAFT_MAP_DIR}/mississippi-legalease-mississippi-petition-for-expungement-of-criminal-record-of-criminal-conviction.field-map-draft.json`,
        mappingApproved: false
      }
    ],
    "Legacy generator. Draft field maps only; no confirmed coordinates."
  ),
  mappingInReview(
    "DC",
    [
      {
        remedyId: "motion_to_seal_expunge",
        formId: "dc-motion-to-seal-expunge",
        sourceTemplatePath:
          "private/Nationwide Record Clearing/LegalEase District of Columbia/dc-motion-to-seal-expunge.pdf",
        mappingPath: `${DRAFT_MAP_DIR}/dc-legalease-dc-motion-to-seal-expunge.field-map-draft.json`,
        mappingApproved: false
      }
    ],
    "Legacy generator. Draft field maps only; no confirmed coordinates."
  ),
  mappingInReview(
    "IL",
    [
      {
        remedyId: "expungement_sealing",
        formId: "il-expungement-companion-forms",
        sourceTemplatePath:
          "private/Nationwide Record Clearing/LegalEase Illinois/il-expungement-companion-forms.pdf",
        mappingPath: `${DRAFT_MAP_DIR}/illinois-legalease-illinois-expungement-companion-forms.field-map-draft.json`,
        mappingApproved: false
      }
    ],
    "Legacy generator. Draft field maps only; no confirmed coordinates."
  ),
  mappingInReview(
    "PA",
    [
      {
        remedyId: "petition_for_expungement",
        formId: "pa-petition-expungement-790",
        sourceTemplatePath:
          "private/Nationwide Record Clearing/LegalEase Pennsylvania/pa-petition-expungement-790.pdf",
        mappingPath: `${DRAFT_MAP_DIR}/pennsylvania-legalease-pennsylvania-petition-for-expungement-790.field-map-draft.json`,
        mappingApproved: false
      }
    ],
    "Legacy generator. Draft field maps only; no confirmed coordinates."
  )
];

/**
 * Texas is supported only in Harris County. The statewide entry stays
 * `guidance_only` so a participant outside Harris can never resolve to the
 * Harris forms, which is the specific cross-jurisdiction failure this registry
 * exists to prevent.
 */
const TEXAS: JurisdictionPacketCapability = {
  ...identity("TX"),
  status: "guidance_only",
  countyScoped: true,
  counties: [
    {
      countyKey: "harris",
      countyName: "Harris County",
      status: "mapping_in_review",
      assets: [
        {
          remedyId: "expunction_nondisclosure",
          formId: "tx-harris-expunction-nondisclosure-forms",
          sourceTemplatePath:
            "private/Nationwide Record Clearing/LegalEase Texas/tx-harris-expunction-nondisclosure-forms.pdf",
          mappingPath: `${DRAFT_MAP_DIR}/texas-legalease-texas-harris-expunction-nondisclosure-forms.field-map-draft.json`,
          mappingApproved: false
        }
      ],
      note: "Legacy generator, Harris County only. Draft field maps only."
    }
  ],
  assets: [],
  note: "Statewide Texas is guidance-only. Only Harris County has a generator."
};

const GUIDANCE_ONLY_CODES: readonly string[] = [
  "AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "IA", "ID", "IN", "KS", "KY", "LA", "MA", "MD", "ME",
  "MI", "MN", "MO", "MT", "NC", "ND", "NE", "NH", "NJ", "NM",
  "NV", "NY", "OH", "OK", "OR", "RI", "SC", "SD", "TN", "UT",
  "VA", "VT", "WA", "WI", "WV", "WY"
];

const NO_SOURCE_MATERIAL: readonly string[] = ["LA", "OK"];

const REGISTRY_ENTRIES: readonly JurisdictionPacketCapability[] = [
  ...GENERATOR_JURISDICTIONS,
  TEXAS,
  ...GUIDANCE_ONLY_CODES.map((code) =>
    guidanceOnly(
      code,
      NO_SOURCE_MATERIAL.includes(code)
        ? "No official source material ingested. Guidance only."
        : "No document generator. Guidance only."
    )
  )
];

const REGISTRY: ReadonlyMap<string, JurisdictionPacketCapability> = new Map(
  REGISTRY_ENTRIES.map((entry) => [entry.code, entry])
);

/** All 51, ordered by name, for audits and reporting. */
export const PACKET_CAPABILITIES: readonly JurisdictionPacketCapability[] =
  [...REGISTRY_ENTRIES].sort((left, right) => left.name.localeCompare(right.name));

/** Every jurisdiction code the registry is required to enumerate. */
export const ALL_JURISDICTION_CODES: readonly string[] = Object.keys(COMPILED)
  .map((code) => code.trim().toUpperCase())
  .sort();

const LOOKUP: ReadonlyMap<string, string> = new Map(
  REGISTRY_ENTRIES.flatMap((entry) =>
    [entry.code, entry.name, entry.slug].map(
      (value) => [value.trim().toLowerCase(), entry.code] as const
    )
  )
);

/**
 * Canonical jurisdiction code for a code, name or slug. Returns null rather
 * than guessing: every caller is expected to fail closed on null.
 */
export function canonicalJurisdictionCode(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return LOOKUP.get(key) ?? null;
}

/** Capability for a jurisdiction, or null when the input is not one of the 51. */
export function getPacketCapability(
  jurisdiction: string | null | undefined
): JurisdictionPacketCapability | null {
  const code = canonicalJurisdictionCode(jurisdiction);
  return code ? REGISTRY.get(code) ?? null : null;
}

/** Normalizes a county to its registry key. Returns null when absent. */
export function canonicalCountyKey(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") return null;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/\s+county$/u, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return key || null;
}

/**
 * The status that actually governs a request, accounting for county scoping.
 *
 * For a county-scoped jurisdiction the statewide status applies unless the
 * request names a supported county. An unnamed or unsupported county never
 * inherits a supported county's status.
 */
export function resolveEffectiveStatus(input: {
  jurisdiction: string | null | undefined;
  county?: string | null;
}): {
  capability: JurisdictionPacketCapability | null;
  county: CountyPacketCapability | null;
  status: PacketCapabilityStatus | null;
} {
  const capability = getPacketCapability(input.jurisdiction);
  if (!capability) return { capability: null, county: null, status: null };

  if (!capability.countyScoped) {
    return { capability, county: null, status: capability.status };
  }

  const countyKey = canonicalCountyKey(input.county);
  const county = countyKey
    ? capability.counties.find((entry) => entry.countyKey === countyKey) ?? null
    : null;

  return {
    capability,
    county,
    status: county ? county.status : capability.status
  };
}

/** Asset bindings that are approved for delivery. Empty unless truly approved. */
export function approvedAssets(input: {
  jurisdiction: string | null | undefined;
  county?: string | null;
}): readonly PacketAssetBinding[] {
  const { capability, county, status } = resolveEffectiveStatus(input);
  if (!capability || status !== "packet_ready") return [];
  const assets = county ? county.assets : capability.assets;
  return assets.filter((asset) => asset.mappingApproved);
}

/**
 * Structural invariants. Called by tests, the audit and the acceptance gate so
 * a registry edit that would let an unprovable claim through fails loudly.
 */
export function assertRegistryIntegrity(): void {
  const problems: string[] = [];

  const declared = new Set(REGISTRY_ENTRIES.map((entry) => entry.code));
  for (const code of ALL_JURISDICTION_CODES) {
    if (!declared.has(code)) problems.push(`Jurisdiction ${code} is not enumerated.`);
  }
  for (const code of declared) {
    if (!ALL_JURISDICTION_CODES.includes(code)) {
      problems.push(`Jurisdiction ${code} is not one of the 51.`);
    }
  }
  if (REGISTRY_ENTRIES.length !== new Set(REGISTRY_ENTRIES.map((e) => e.code)).size) {
    problems.push("A jurisdiction is declared more than once.");
  }

  for (const entry of REGISTRY_ENTRIES) {
    if (!PACKET_CAPABILITY_STATUSES.includes(entry.status)) {
      problems.push(`${entry.code} has an unknown status ${entry.status}.`);
    }
    if (entry.status === "packet_ready") {
      if (entry.countyScoped) {
        problems.push(
          `${entry.code} is county-scoped, so statewide packet_ready is not representable.`
        );
      }
      if (!entry.assets.some((asset) => asset.mappingApproved)) {
        problems.push(
          `${entry.code} claims packet_ready with no approved mapping.`
        );
      }
    }
    for (const county of entry.counties) {
      if (!entry.countyScoped) {
        problems.push(`${entry.code} declares counties but is not county-scoped.`);
      }
      if (
        county.status === "packet_ready" &&
        !county.assets.some((asset) => asset.mappingApproved)
      ) {
        problems.push(
          `${entry.code}/${county.countyKey} claims packet_ready with no approved mapping.`
        );
      }
    }
  }

  if (problems.length) {
    throw new Error(`Packet capability registry is invalid:\n- ${problems.join("\n- ")}`);
  }
}

/** Codes whose effective status is `packet_ready`, statewide or by county. */
export function packetReadyTargets(): readonly {
  code: string;
  county: string | null;
}[] {
  const targets: { code: string; county: string | null }[] = [];
  for (const entry of REGISTRY_ENTRIES) {
    if (entry.status === "packet_ready") targets.push({ code: entry.code, county: null });
    for (const county of entry.counties) {
      if (county.status === "packet_ready") {
        targets.push({ code: entry.code, county: county.countyKey });
      }
    }
  }
  return targets;
}
