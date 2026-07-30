// Legal-design memo validator.
//
// Rejects incomplete imports rather than filling gaps. A missing waiting period
// or an absent stop condition is a question for counsel, and inventing one here
// would put a fabricated legal rule into the runtime wearing counsel's approval.

import {
  FORBIDDEN_MEMO_KEYS,
  LEGAL_DESIGN_STATUSES,
  REQUIRED_TRACK_FIELDS,
  type LegalDesignMemo,
  type ProposedReliefTrack
} from "@/lib/rcap/legal-design/types";
import { canonicalJurisdictionCode } from "@/lib/rcap/jurisdictions/packet-capability";

export type ValidationIssue = {
  severity: "error" | "warning";
  jurisdiction: string | null;
  trackId: string | null;
  field: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  jurisdiction: string | null;
  trackCount: number;
  issues: readonly ValidationIssue[];
  /** Tracks that passed every check and may be normalized. */
  importableTrackIds: readonly string[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TRACK_ID = /^[a-z0-9][a-z0-9-]{2,80}$/;
const OUTPUT_STRATEGIES = ["custom_pleading", "official_pdf_fill", "process_guidance"];
const GEO_SCOPES = ["statewide", "county", "circuit", "district", "court_specific", "agency_specific"];
const DESTINATION_KINDS = ["court", "agency", "prosecutor", "portal", "automatic", "clerk"];
const COMPONENT_REQUIREMENTS = ["required", "conditional"];

export function validateLegalDesignMemo(raw: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (
    field: string,
    message: string,
    trackId: string | null = null,
    severity: ValidationIssue["severity"] = "error"
  ) => {
    issues.push({ severity, jurisdiction: jurisdictionCode, trackId, field, message });
  };

  let jurisdictionCode: string | null = null;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      jurisdiction: null,
      trackCount: 0,
      importableTrackIds: [],
      issues: [
        { severity: "error", jurisdiction: null, trackId: null, field: "memo", message: "Memo is not an object." }
      ]
    };
  }

  const memo = raw as Partial<LegalDesignMemo> & Record<string, unknown>;

  // Attorney metadata is rejected before anything else is read, so a memo
  // carrying it never gets partially imported.
  for (const path of findForbiddenKeys(memo)) {
    push("attorney_metadata", `Memo contains attorney metadata at ${path}. Remove it; this is not a reviewer database.`);
  }

  if (memo.schemaVersion !== 1) {
    push("schemaVersion", "schemaVersion must be 1.");
  }

  jurisdictionCode = canonicalJurisdictionCode(
    typeof memo.jurisdiction === "string" ? memo.jurisdiction : null
  );
  if (!jurisdictionCode) {
    push("jurisdiction", "jurisdiction must be one of the 50 states or DC.");
  }

  if (!nonEmptyString(memo.memoVersion)) push("memoVersion", "memoVersion is required.");
  if (!nonEmptyString(memo.submittedAt) || !isIsoDateTime(memo.submittedAt)) {
    push("submittedAt", "submittedAt must be an ISO 8601 timestamp.");
  }

  const tracks = Array.isArray(memo.tracks) ? (memo.tracks as ProposedReliefTrack[]) : null;
  if (!tracks) {
    push("tracks", "tracks must be an array.");
    return { ok: false, jurisdiction: jurisdictionCode, trackCount: 0, issues, importableTrackIds: [] };
  }
  if (tracks.length === 0) {
    // A jurisdiction can legitimately have nothing to offer, but counsel has to
    // say so on a track rather than by omission.
    push("tracks", "tracks is empty. Record at least one track, even if its decision is legal_research_required.");
  }

  const seen = new Set<string>();
  const importable: string[] = [];

  for (const [index, track] of tracks.entries()) {
    const label = nonEmptyString(track?.trackId) ? track.trackId : `tracks[${index}]`;
    const before = issues.length;

    validateTrack(track, label, push);

    if (nonEmptyString(track?.trackId)) {
      if (seen.has(track.trackId)) {
        push("trackId", `Duplicate trackId ${track.trackId} within this memo.`, label);
      }
      seen.add(track.trackId);
    }

    if (issues.length === before && nonEmptyString(track?.trackId)) {
      importable.push(track.trackId);
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  return {
    ok: !hasErrors,
    jurisdiction: jurisdictionCode,
    trackCount: tracks.length,
    issues,
    importableTrackIds: importable
  };
}

function validateTrack(
  track: ProposedReliefTrack | undefined,
  label: string,
  push: (field: string, message: string, trackId?: string | null, severity?: ValidationIssue["severity"]) => void
): void {
  if (!track || typeof track !== "object") {
    push("track", "Track is not an object.", label);
    return;
  }

  // 1. Stable track ID.
  if (!nonEmptyString(track.trackId) || !TRACK_ID.test(track.trackId)) {
    push("trackId", "trackId must be lowercase kebab-case, 3 to 81 characters.", label);
  }

  // 2. Legal and public name.
  if (!nonEmptyString(track.legalName)) push("legalName", "legalName is required.", label);
  if (!nonEmptyString(track.publicName)) push("publicName", "publicName is required.", label);

  // 3. Controlling authority.
  const authority = track.controllingAuthority;
  if (!authority || !Array.isArray(authority.citations) || authority.citations.length === 0) {
    push("controllingAuthority.citations", "At least one statutory or rule citation is required.", label);
  }
  if (!authority || !nonEmptyString(authority.summary)) {
    push("controllingAuthority.summary", "A plain summary of the authority is required.", label);
  }

  // 4. Effective dates.
  const dates = track.effectiveDates;
  if (!dates || !ISO_DATE.test(String(dates.effectiveFrom))) {
    push("effectiveDates.effectiveFrom", "effectiveFrom must be an ISO date.", label);
  }
  if (dates && dates.effectiveTo !== null && !ISO_DATE.test(String(dates.effectiveTo))) {
    push("effectiveDates.effectiveTo", "effectiveTo must be an ISO date or null.", label);
  }
  if (!dates || !ISO_DATE.test(String(dates.reviewedAsOf))) {
    push("effectiveDates.reviewedAsOf", "reviewedAsOf must be an ISO date; it drives staleness.", label);
  }

  // 5. Eligible record and disposition types.
  if (!nonEmptyArray(track.eligibleRecordTypes)) {
    push("eligibleRecordTypes", "At least one eligible record type is required.", label);
  }
  if (!nonEmptyArray(track.eligibleDispositions)) {
    push("eligibleDispositions", "At least one eligible disposition is required.", label);
  }

  // 6. Exclusions and waiting periods. Present but empty is a valid answer;
  //    absent is not, because absence cannot be distinguished from an oversight.
  if (!Array.isArray(track.exclusions)) {
    push("exclusions", "exclusions must be an array. Use [] to state there are none.", label);
  }
  if (!Array.isArray(track.waitingPeriods)) {
    push("waitingPeriods", "waitingPeriods must be an array. Use [] to state there are none.", label);
  } else {
    for (const [i, period] of track.waitingPeriods.entries()) {
      if (!nonEmptyString(period?.condition) || !nonEmptyString(period?.duration)) {
        push(`waitingPeriods[${i}]`, "Each waiting period needs a condition and a duration.", label);
      }
    }
  }

  // 7. Output strategy.
  if (!OUTPUT_STRATEGIES.includes(String(track.outputStrategy))) {
    push("outputStrategy", `outputStrategy must be one of ${OUTPUT_STRATEGIES.join(", ")}.`, label);
  }

  // 8. Geography and venue.
  const geography = track.geography;
  if (!geography || !GEO_SCOPES.includes(String(geography.scope))) {
    push("geography.scope", `geography.scope must be one of ${GEO_SCOPES.join(", ")}.`, label);
  }
  if (!geography || !Array.isArray(geography.keys)) {
    push("geography.keys", "geography.keys must be an array. Use [] for statewide.", label);
  } else if (
    geography.scope &&
    ["county", "circuit", "district", "court_specific"].includes(String(geography.scope)) &&
    geography.keys.length === 0
  ) {
    push(
      "geography.keys",
      "A geographically narrow track must name the places it serves, or it cannot fail closed.",
      label
    );
  }
  if (!geography || !nonEmptyString(geography.venue)) {
    push("geography.venue", "venue is required.", label);
  }

  // 9. Filing or process destination.
  const destination = track.destination;
  if (!destination || !DESTINATION_KINDS.includes(String(destination.kind))) {
    push("destination.kind", `destination.kind must be one of ${DESTINATION_KINDS.join(", ")}.`, label);
  }
  if (!destination || !nonEmptyString(destination.name)) {
    push("destination.name", "destination.name is required.", label);
  }
  if (!destination || !nonEmptyString(destination.detail)) {
    push("destination.detail", "destination.detail is required.", label);
  }

  // 10. Packet or process components.
  if (!nonEmptyArray(track.components)) {
    push("components", "At least one packet or process component is required.", label);
  } else {
    for (const [i, component] of track.components.entries()) {
      if (!nonEmptyString(component?.role)) push(`components[${i}].role`, "role is required.", label);
      if (!COMPONENT_REQUIREMENTS.includes(String(component?.requirement))) {
        push(`components[${i}].requirement`, "requirement must be required or conditional.", label);
      }
      if (component?.requirement === "conditional" && !nonEmptyString(component?.conditionDescription)) {
        push(
          `components[${i}].conditionDescription`,
          "A conditional component must say when it applies.",
          label
        );
      }
      if (!OUTPUT_STRATEGIES.includes(String(component?.outputStrategy))) {
        push(`components[${i}].outputStrategy`, "Each component needs an output strategy.", label);
      }
      if (component?.outputStrategy === "official_pdf_fill" && !nonEmptyString(component?.officialFormId)) {
        push(
          `components[${i}].officialFormId`,
          "An official-form component must identify the form it fills.",
          label
        );
      }
    }
  }

  // 11. Official sources.
  if (!nonEmptyArray(track.officialSources)) {
    push("officialSources", "At least one official source is required.", label);
  } else {
    for (const [i, source] of track.officialSources.entries()) {
      if (!nonEmptyString(source?.title)) push(`officialSources[${i}].title`, "title is required.", label);
      if (!nonEmptyString(source?.url)) push(`officialSources[${i}].url`, "url is required.", label);
      if (!ISO_DATE.test(String(source?.retrievedOn))) {
        push(`officialSources[${i}].retrievedOn`, "retrievedOn must be an ISO date.", label);
      }
    }
  }

  // 12. Filing, fee, notice and service rules.
  const rules = track.rules;
  for (const key of ["filing", "fees", "feeWaiver", "notice", "service"] as const) {
    if (!rules || !nonEmptyString(rules[key])) {
      push(`rules.${key}`, `rules.${key} is required. State "none" explicitly if none applies.`, label);
    }
  }

  // 13. Self-help stop conditions.
  if (!nonEmptyArray(track.selfHelpStopConditions)) {
    push(
      "selfHelpStopConditions",
      "At least one stop condition is required; every track has a point where self-help ends.",
      label
    );
  }

  // 14. Unresolved questions. Empty is valid, absent is not.
  if (!Array.isArray(track.unresolvedQuestions)) {
    push("unresolvedQuestions", "unresolvedQuestions must be an array. Use [] to state there are none.", label);
  }

  // 15. Legal-design decision.
  const decision = track.legalDesignDecision;
  if (!decision || !LEGAL_DESIGN_STATUSES.includes(decision.status)) {
    push("legalDesignDecision.status", `status must be one of ${LEGAL_DESIGN_STATUSES.join(", ")}.`, label);
  }
  if (!decision || !nonEmptyString(decision.rationale)) {
    push("legalDesignDecision.rationale", "A rationale is required.", label);
  }
  if (!decision || !Array.isArray(decision.limitations)) {
    push("legalDesignDecision.limitations", "limitations must be an array. Use [] for none.", label);
  } else if (
    decision.status === "legal_design_approved_with_limitations" &&
    decision.limitations.length === 0
  ) {
    push(
      "legalDesignDecision.limitations",
      "Approval with limitations must name the limitations.",
      label
    );
  }
}

/** Walks the whole memo for forbidden keys, at any depth. */
function findForbiddenKeys(value: unknown, path = "memo"): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => found.push(...findForbiddenKeys(entry, `${path}[${index}]`)));
    return found;
  }
  if (!value || typeof value !== "object") return found;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_MEMO_KEYS.includes(key)) found.push(`${path}.${key}`);
    found.push(...findForbiddenKeys(child, `${path}.${key}`));
  }
  return found;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function isIsoDateTime(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export { REQUIRED_TRACK_FIELDS };
