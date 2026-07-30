// Normalizes a validated legal-design memo into implementation artifacts.
//
// The pivotal rule lives in `legalStatusFor`: counsel approving a track's legal
// DESIGN never yields `legal_approved`. Design approval says the mechanism,
// venue and components are right. It says nothing about the document the
// renderer produced, which is a separate review of a separate artifact.
//
// So an imported track lands at `legal_review_pending` at best, and because
// `computeRuntimeStatus` requires legal approval plus visual approval plus
// technical proof plus a current source plus runtime enablement, an imported
// track is `runtime_disabled` no matter how emphatic the memo is.

import {
  IMPLEMENTABLE_DESIGN_STATUSES,
  type LegalDesignMemo,
  type LegalDesignStatus,
  type ProposedReliefTrack
} from "@/lib/rcap/legal-design/types";
import type { GeographicScope, LegalStatus, OutputStrategy } from "@/lib/rcap/packets/types";

export type ImplementationStrategyQueue =
  | "A_official_pdf_acroform"
  | "B_official_pdf_overlay"
  | "C_custom_pleading"
  | "D_staged_or_process_guidance"
  | "E_local_variant"
  | "F_source_problem";

export type NormalizedComponent = {
  componentId: string;
  role: string;
  requirement: "required" | "conditional";
  conditionDescription: string | null;
  outputStrategy: OutputStrategy;
  officialFormId: string | null;
  officialSourceUrl: string | null;
  order: number;
};

export type NormalizedTrack = {
  jurisdiction: string;
  trackId: string;
  legalName: string;
  publicName: string;
  mechanism: string;
  authority: readonly string[];
  reviewedAsOf: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  exclusions: readonly string[];
  waitingPeriods: readonly { condition: string; duration: string }[];
  outputStrategy: OutputStrategy;
  geographicScope: GeographicScope;
  geographyKeys: readonly string[];
  venue: string;
  destination: { kind: string; name: string; detail: string };
  packetSet: { packetSetId: string; version: string; components: readonly NormalizedComponent[] };
  officialSources: readonly { title: string; url: string; retrievedOn: string; sha256: string | null }[];
  rules: ProposedReliefTrack["rules"];
  selfHelpStopConditions: readonly string[];
  unresolvedQuestions: readonly string[];
  legalDesignStatus: LegalDesignStatus;
  legalDesignLimitations: readonly string[];
  /** Derived. Design approval never yields legal_approved. */
  legalStatus: LegalStatus;
  /** Always runtime_disabled on import. Recorded so the reason is legible. */
  runtimeDisabledReason: string;
  implementationQueue: ImplementationStrategyQueue;
  blockers: readonly string[];
};

export type NormalizedMemo = {
  jurisdiction: string;
  memoVersion: string;
  submittedAt: string;
  tracks: readonly NormalizedTrack[];
  /** Tracks counsel returned that are not yet implementable. */
  deferredTrackIds: readonly string[];
};

export type TrackSourceRelationship = {
  jurisdiction: string;
  trackId: string;
  componentId: string;
  officialFormId: string | null;
  officialSourceUrl: string | null;
  sha256: string | null;
  /** Whether the named source is present in the local corpus. */
  corpusState: "unchecked" | "present" | "missing";
};

/**
 * Maps counsel's design decision onto the track's legal status.
 *
 * The whole point of this function is that the first two cases do NOT return
 * `legal_approved`.
 */
export function legalStatusFor(status: LegalDesignStatus): LegalStatus {
  switch (status) {
    case "legal_design_approved":
    case "legal_design_approved_with_limitations":
    case "output_review_pending":
      // Design is settled; the produced document has not been reviewed.
      return "legal_review_pending";
    case "legal_approved":
      // Counsel has approved the completed output, not merely the design.
      return "legal_approved";
    case "legal_rejected":
      return "legal_rejected";
    case "legal_research_required":
      return "not_submitted";
  }
}

export function normalizeMemo(memo: LegalDesignMemo): NormalizedMemo {
  const tracks: NormalizedTrack[] = [];
  const deferred: string[] = [];

  for (const track of memo.tracks) {
    if (!IMPLEMENTABLE_DESIGN_STATUSES.includes(track.legalDesignDecision.status)) {
      deferred.push(track.trackId);
      continue;
    }
    tracks.push(normalizeTrack(memo.jurisdiction, track));
  }

  return {
    jurisdiction: memo.jurisdiction,
    memoVersion: memo.memoVersion,
    submittedAt: memo.submittedAt,
    tracks,
    deferredTrackIds: deferred
  };
}

function normalizeTrack(jurisdiction: string, track: ProposedReliefTrack): NormalizedTrack {
  const components: NormalizedComponent[] = track.components.map((component, index) => ({
    componentId: `${track.trackId}-${slug(component.role)}-${index + 1}`,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    officialSourceUrl: component.officialSourceUrl ?? null,
    order: index + 1
  }));

  const blockers = deriveBlockers(track, components);

  return {
    jurisdiction,
    trackId: track.trackId,
    legalName: track.legalName,
    publicName: track.publicName,
    mechanism: track.controllingAuthority.summary,
    authority: track.controllingAuthority.citations,
    reviewedAsOf: track.effectiveDates.reviewedAsOf,
    effectiveFrom: track.effectiveDates.effectiveFrom,
    effectiveTo: track.effectiveDates.effectiveTo,
    recordTypes: track.eligibleRecordTypes,
    dispositions: track.eligibleDispositions,
    exclusions: track.exclusions,
    waitingPeriods: track.waitingPeriods,
    outputStrategy: track.outputStrategy,
    geographicScope: track.geography.scope,
    geographyKeys: track.geography.keys,
    venue: track.geography.venue,
    destination: track.destination,
    packetSet: {
      packetSetId: `${track.trackId}-set`,
      version: "1.0.0",
      components
    },
    officialSources: track.officialSources.map((source) => ({
      title: source.title,
      url: source.url,
      retrievedOn: source.retrievedOn,
      sha256: source.sha256 ?? null
    })),
    rules: track.rules,
    selfHelpStopConditions: track.selfHelpStopConditions,
    unresolvedQuestions: track.unresolvedQuestions,
    legalDesignStatus: track.legalDesignDecision.status,
    legalDesignLimitations: track.legalDesignDecision.limitations,
    legalStatus: legalStatusFor(track.legalDesignDecision.status),
    runtimeDisabledReason:
      "Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.",
    implementationQueue: queueFor(track),
    blockers
  };
}

/** Assigns the implementation batch, narrowest problem first. */
export function queueFor(track: ProposedReliefTrack): ImplementationStrategyQueue {
  const missingHash = track.officialSources.some((source) => !source.sha256);
  const needsForm = track.components.some((component) => component.outputStrategy === "official_pdf_fill");

  if (needsForm && (track.officialSources.length === 0 || missingHash)) {
    return "F_source_problem";
  }
  if (["county", "circuit", "district", "court_specific"].includes(track.geography.scope)) {
    return "E_local_variant";
  }
  if (track.outputStrategy === "process_guidance") {
    return "D_staged_or_process_guidance";
  }
  if (track.outputStrategy === "custom_pleading") {
    return "C_custom_pleading";
  }
  // An official-form track whose sources carry hashes is a candidate for the
  // AcroForm batch; whether the form actually has usable fields is a corpus
  // question answered by the source registry, not by counsel.
  return "B_official_pdf_overlay";
}

function deriveBlockers(
  track: ProposedReliefTrack,
  components: readonly NormalizedComponent[]
): readonly string[] {
  const blockers: string[] = [
    "Output review pending: counsel approved the design, not the produced document.",
    "Visual review not started.",
    "Technical proof not started."
  ];

  if (track.legalDesignDecision.status === "legal_design_approved_with_limitations") {
    for (const limitation of track.legalDesignDecision.limitations) {
      blockers.push(`Design limitation: ${limitation}`);
    }
  }
  if (track.unresolvedQuestions.length > 0) {
    blockers.push(`${track.unresolvedQuestions.length} unresolved legal question(s) recorded by counsel.`);
  }
  for (const component of components) {
    if (component.outputStrategy === "official_pdf_fill" && !component.officialFormId) {
      blockers.push(`Component ${component.componentId} names no official form.`);
    }
  }
  if (track.officialSources.some((source) => !source.sha256)) {
    blockers.push("One or more official sources have no recorded SHA-256, so staleness cannot be detected.");
  }
  return blockers;
}

export function sourceRelationships(normalized: NormalizedMemo): readonly TrackSourceRelationship[] {
  const rows: TrackSourceRelationship[] = [];
  for (const track of normalized.tracks) {
    for (const component of track.packetSet.components) {
      if (component.outputStrategy !== "official_pdf_fill") continue;
      const source = track.officialSources.find((entry) => entry.url === component.officialSourceUrl);
      rows.push({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        officialFormId: component.officialFormId,
        officialSourceUrl: component.officialSourceUrl,
        sha256: source?.sha256 ?? null,
        corpusState: "unchecked"
      });
    }
  }
  return rows;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
