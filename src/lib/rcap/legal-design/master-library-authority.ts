// Master Library authority gate.
//
// The one place a normalized track's source relationship is checked against the
// adopted Master Library edition. It fails closed: absence of a clearance is a
// block, not a pass, so a track that was never audited cannot be promoted by
// omission.
//
// This gate is about *provenance*, not legal design. It never decides whether a
// route exists, what it files, or whether counsel approved it — those live in
// the normalized legal-design records and are not revisited here. It decides
// only whether the source a track proposes to render is one the adopted edition
// authorises for that use.
//
// Two rules do most of the work:
//
//   1. A file existing somewhere is not source approval. The manifest carries
//      the controlling classification; the repository holding a binary does not.
//   2. Filenames and folders do not route. A component reaches an asset through
//      an explicit mapping by workflow key or document ID, never by scanning.

import type { OutputStrategy } from "@/lib/rcap/packets/types";
import type { RuntimeStatus } from "@/lib/rcap/packets/types";

/** Asset classes as the Master Library manifest defines them. */
export type LibraryAssetClass =
  | "legal_review"
  | "packet_form"
  | "instructions"
  | "supporting_process"
  | "source_gated";

/** Roles a normalized packet component can hold that consume an official form. */
export const PACKET_FORM_ROLES: readonly LibraryAssetClass[] = ["packet_form"];

/**
 * The manifest fields this repository is allowed to rely on.
 *
 * Deliberately a subset. Anything not listed here is library bookkeeping and
 * must not become an implicit runtime input.
 */
export type LibraryAssetRef = {
  readonly libraryEdition: string;
  readonly jurisdictionCode: string;
  readonly workflowKey: string;
  readonly documentId: string;
  readonly documentRole: string;
  readonly officialTitle: string;
  readonly revision: string;
  readonly language: string;
  readonly assetClass: LibraryAssetClass;
  readonly canonicalRelativePath: string;
  readonly sha256: string;
  readonly packetCandidate: boolean;
  readonly generationAllowed: boolean;
  readonly runtimeStatus: string;
};

/** The result of auditing one official-form component against the edition. */
export type ComponentAuthorityResult =
  /** Mapped to a retained packet-form candidate. Still requires every release gate. */
  | "authority_mapped_packet_candidate"
  /** Mapped, but the asset is source-gated: legal identity yes, runtime no. */
  | "authority_mapped_source_gated"
  /** Mapped, but the revision the edition retains is not the one the track assumes. */
  | "authority_mapped_revision_pending"
  /** Mapped to an asset whose class cannot fill this component's role. */
  | "authority_role_mismatch"
  /** The edition records the source as missing, retired or excluded. */
  | "authority_missing_asset"
  /** Two retained rows disagree on the bytes, or the track's hash disagrees with the edition's. */
  | "authority_hash_conflict"
  /** No retained row in the adopted edition. Pending an edition amendment. */
  | "authority_unmanifested_source";

const CLEARED_COMPONENT_RESULTS: readonly ComponentAuthorityResult[] = [
  "authority_mapped_packet_candidate"
];

/** A component result that permits promotion — nothing else does. */
export function componentResultPermitsPromotion(result: ComponentAuthorityResult): boolean {
  return CLEARED_COMPONENT_RESULTS.includes(result);
}

export type ComponentAudit = {
  readonly componentId: string;
  readonly role: string;
  readonly outputStrategy: OutputStrategy;
  readonly officialFormId: string | null;
  readonly result: ComponentAuthorityResult | null;
  /** Present only where the component actually reached a retained asset. */
  readonly asset: LibraryAssetRef | null;
  /**
   * Whether the track's own record pins the bytes it will render.
   *
   * The edition requires a matching SHA-256 for an official-form mapping. A
   * component whose source relationship carries no hash has not met that
   * requirement, however well its document ID matches.
   */
  readonly sha256Verified: boolean;
  /**
   * Whether this repository holds the component's governing specification.
   *
   * A custom pleading needs its counsel-approved specification and a guidance
   * route needs its guidance rationale. Neither needs an official binary, but
   * neither may ship on nothing at all.
   */
  readonly specificationPresent?: boolean;
  readonly reasons: readonly string[];
};

/**
 * An outstanding reconciliation between a newly retained controlling source and
 * the normalization that predates it.
 *
 * A retained legal review removes a missing-authority problem. It does not show
 * that the tracks normalized before it agree with it — that is a separate
 * reading of the amended source against the live registry, and until it runs
 * the tracks are unreconciled rather than approved. Treating "a review now
 * exists" as clearance would convert an unanswered question into a pass.
 */
export type AuthorityReconciliation = {
  readonly required: boolean;
  readonly reason: string;
};

export type TrackAuthorityAudit = {
  readonly jurisdiction: string;
  readonly trackId: string;
  readonly outputStrategy: OutputStrategy | null;
  readonly legalReviewRetained: boolean;
  readonly pendingAuthorityReconciliation: AuthorityReconciliation | null;
  /** Blockers the controlling review itself leaves open for this track. */
  readonly openLegalDesignBlockers: readonly string[];
  readonly components: readonly ComponentAudit[];
  readonly cleared: boolean;
  readonly blockingReasons: readonly string[];
};

/**
 * Decides whether one track's source relationships are authorised.
 *
 * Custom-pleading and process-guidance components are not required to reach an
 * official binary — the adopted memorandum makes a counsel-approved pleading the
 * statewide fallback where the law permits a participant petition and no current
 * controlling form exists, and a guidance route has no participant filing to
 * render. Failing them for a missing form would invert the memorandum.
 */
export function decideTrackAuthority(input: {
  jurisdiction: string;
  trackId: string;
  outputStrategy: OutputStrategy | null;
  legalReviewRetained: boolean;
  pendingAuthorityReconciliation?: AuthorityReconciliation | null;
  openLegalDesignBlockers?: readonly string[];
  components: readonly ComponentAudit[];
}): TrackAuthorityAudit {
  const blocking: string[] = [];

  if (!input.legalReviewRetained) {
    blocking.push(
      `${input.jurisdiction}: the adopted edition retains no controlling legal review for this jurisdiction.`
    );
  }

  if (input.pendingAuthorityReconciliation?.required) {
    blocking.push(`${input.jurisdiction}: ${input.pendingAuthorityReconciliation.reason}`);
  }

  // A retained review that itself keeps a true blocker open has not authorised
  // the track — it has said the design is undetermined. This is an authority
  // block, not a platform one: the controlling source is the thing withholding
  // the answer. Without it a track whose governing mechanism, form or venue
  // counsel expressly left unresolved would still compute a ready ceiling,
  // because the platform ceiling reads release blockers and not these.
  for (const statement of input.openLegalDesignBlockers ?? []) {
    blocking.push(`${input.trackId}: the controlling review retains an open legal-design blocker — ${statement}`);
  }

  for (const component of input.components) {
    if (component.outputStrategy === "custom_pleading" || component.outputStrategy === "process_guidance") {
      if (component.specificationPresent === false) {
        blocking.push(
          `${component.componentId}: ${component.outputStrategy} component has no governing specification in this repository.`
        );
      }
      continue;
    }
    if (component.outputStrategy !== "official_pdf_fill") continue;

    if (component.result === null) {
      blocking.push(`${component.componentId}: not audited against the adopted edition.`);
      continue;
    }
    if (!componentResultPermitsPromotion(component.result)) {
      blocking.push(`${component.componentId}: ${component.result}.`);
      continue;
    }
    if (!component.sha256Verified) {
      blocking.push(`${component.componentId}: no SHA-256 pinned for the mapped asset.`);
      continue;
    }
    if (component.asset && component.asset.generationAllowed !== true) {
      blocking.push(`${component.componentId}: the edition does not allow generation from this asset.`);
    }
  }

  return {
    jurisdiction: input.jurisdiction,
    trackId: input.trackId,
    outputStrategy: input.outputStrategy,
    legalReviewRetained: input.legalReviewRetained,
    pendingAuthorityReconciliation: input.pendingAuthorityReconciliation ?? null,
    openLegalDesignBlockers: input.openLegalDesignBlockers ?? [],
    components: input.components,
    cleared: blocking.length === 0,
    blockingReasons: blocking
  };
}

/**
 * Applies the authority gate to a readiness ceiling.
 *
 * `readinessCeilingFor` answers "what would this track be if every platform gate
 * passed". Master Library authority is a further gate, and it is applied here
 * rather than inside that function so that the platform question and the
 * provenance question stay separately answerable.
 *
 * Fail-closed: an absent audit blocks. A track nobody checked is a track that
 * cannot ship.
 */
export function gateRuntimeStatus(
  ceiling: RuntimeStatus,
  audit: TrackAuthorityAudit | undefined | null
): RuntimeStatus {
  if (ceiling !== "packet_ready" && ceiling !== "guidance_ready") return ceiling;
  if (!audit) return "runtime_disabled";
  return audit.cleared ? ceiling : "runtime_disabled";
}

/**
 * True where the manifest row may be selected by the packet resolver.
 *
 * Every clause matters and every one of them is `false` throughout Edition 1:
 * the edition ships with `generation_allowed = no` on all 378 retained assets,
 * so no asset is resolver-selectable and promotion has to happen in this
 * repository through an auditable change, not by moving a file in the archive.
 */
export function isResolverSelectable(asset: LibraryAssetRef): boolean {
  return (
    asset.assetClass === "packet_form" &&
    asset.packetCandidate &&
    asset.generationAllowed &&
    asset.runtimeStatus !== "runtime_disabled"
  );
}
