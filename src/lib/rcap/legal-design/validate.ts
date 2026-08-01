// Legal-design memo validator.
//
// Rejects incomplete imports rather than filling gaps. A missing waiting period
// or an absent stop condition is a question for counsel, and inventing one here
// would put a fabricated legal rule into the runtime wearing counsel's approval.
//
// It also refuses two shapes that would quietly turn LegalEase into a service it
// is not:
//
//   - A limitation with no classification. Left as free text, "the participant
//     needs a certified disposition" reads as a reason to withhold the packet.
//     Classified, it is a packet instruction, and the packet still generates.
//
//   - A `legal_design_blocker` that does not name which element of the design
//     is undetermined. A blocker is about the mechanism, the form, the venue,
//     the geographic scope or the output strategy. A document the participant
//     must obtain is none of those.

import {
  AFFECTED_ELEMENTS,
  CLASSIFICATION_BASES,
  COMPOSITION_MODES,
  COUNSEL_AUTHORED_BASES,
  OUTPUT_STRATEGY_STATUSES,
  FORBIDDEN_FULFILLMENT_KEYS,
  FORBIDDEN_MEMO_KEYS,
  GUIDANCE_RATIONALES,
  LEGAL_DESIGN_STATUSES,
  LIMITATION_CLASSIFICATIONS,
  REQUIRED_TRACK_FIELDS,
  UNRESOLVED_QUESTION_IMPACTS,
  type LegalDesignMemo,
  type ProposedReliefTrack
} from "@/lib/rcap/legal-design/types";
import { canonicalJurisdictionCode } from "@/lib/rcap/jurisdictions/packet-capability";
import { OUTPUT_STRATEGIES } from "@/lib/rcap/packets/types";

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
// Underscores are allowed because the Batch 1 crosswalk IDs use them, and the
// crosswalk is how 117 tracks are reconciled. Renaming them here to satisfy a
// style preference would break the only completeness check we have.
const TRACK_ID = /^[a-z0-9][a-z0-9_-]{2,80}$/;
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
  for (const path of findForbiddenKeys(memo, FORBIDDEN_MEMO_KEYS)) {
    push("attorney_metadata", `Memo contains attorney metadata at ${path}. Remove it; this is not a reviewer database.`);
  }

  // Likewise for a memo that assumes a fulfillment model LegalEase does not
  // operate. There is no upload, no document review, no staff approval step and
  // no eligibility determination; a memo written around one is rejected rather
  // than reinterpreted into something counsel did not say.
  for (const path of findForbiddenKeys(memo, FORBIDDEN_FULFILLMENT_KEYS)) {
    push(
      "fulfillment_model",
      `Memo assumes a workflow LegalEase does not operate at ${path}. LegalEase asks questions, generates the packet, and lists what the participant must obtain, sign, pay, notarize or serve before filing. It does not collect, review or approve anything.`
    );
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
    push("trackId", "trackId must be lowercase, 3 to 81 characters, using hyphens or underscores.", label);
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

  // 7. Output strategy, and whether counsel actually settled one.
  //
  //    A concrete strategy is a substantive conclusion. `process_guidance` says
  //    the relief is not a participant filing; `custom_pleading` says we draft
  //    the document. Neither may stand in for "counsel has not decided". So an
  //    unresolved strategy is said by omitting the field and marking the status,
  //    which forces deferral and keeps the track out of runtime resolution.
  const strategyStatus = track.outputStrategyStatus ?? "resolved";
  if (!OUTPUT_STRATEGY_STATUSES.includes(strategyStatus)) {
    push(
      "outputStrategyStatus",
      `outputStrategyStatus must be one of ${OUTPUT_STRATEGY_STATUSES.join(", ")}.`,
      label
    );
  }

  if (strategyStatus === "unresolved") {
    if (track.outputStrategy !== undefined) {
      push(
        "outputStrategy",
        "An unresolved output strategy must omit outputStrategy. A concrete strategy is a substantive conclusion and may never be a placeholder for what counsel has not decided.",
        label
      );
    }
    if (track.legalDesignDecision?.status !== "legal_research_required") {
      push(
        "outputStrategyStatus",
        "An unresolved output strategy forces deferral: legalDesignDecision.status must be legal_research_required, so the track stays out of runtime resolution.",
        label
      );
    }
    if (track.packetIdentity !== "unresolved") {
      push(
        "packetIdentity",
        "An unresolved output strategy means the packet identity is unresolved too. Say so explicitly.",
        label
      );
    }
  } else if (track.outputStrategy === "composed") {
    // `composed` is a composition, not a renderer strategy. It is legal only
    // with a declared composition mode and units, each carrying one of the three
    // real strategies or openly omitting it where counsel left that branch
    // unresolved.
    if (!COMPOSITION_MODES.includes(track.compositionMode as never)) {
      push(
        "compositionMode",
        `A composed route must say how its units relate: ${COMPOSITION_MODES.join(", ")}.`,
        label
      );
    }
    if (!nonEmptyArray(track.units)) {
      push("units", "A composed route must list its units.", label);
    } else {
      const seenUnitIds = new Set<string>();
      for (const [i, unit] of track.units.entries()) {
        const field = `units[${i}]`;
        // A stable unit ID is the whole basis of explicit selection. Without
        // one, the only way to name a unit is its position, and position is not
        // legal routing.
        if (!nonEmptyString(unit?.unitId)) {
          push(`${field}.unitId`, "Every unit needs a stable unitId; it is how the unit is selected.", label);
        } else if (seenUnitIds.has(unit.unitId)) {
          push(
            `${field}.unitId`,
            `Duplicate unitId ${unit.unitId}. Two units answering to one selection would force a first-match choice.`,
            label
          );
        } else {
          seenUnitIds.add(unit.unitId);
        }
        if (typeof unit?.order !== "number") push(`${field}.order`, "order must be a number.", label);
        if (!nonEmptyString(unit?.label)) push(`${field}.label`, "label is required.", label);
        if (!nonEmptyString(unit?.description)) push(`${field}.description`, "description is required.", label);
        if (typeof unit?.available !== "boolean") {
          push(`${field}.available`, "available must be true or false.", label);
        }
        const unitStatus = unit?.outputStrategyStatus ?? "resolved";
        if (unitStatus === "unresolved") {
          if (unit?.outputStrategy !== undefined) {
            push(
              `${field}.outputStrategy`,
              "An unresolved unit must omit outputStrategy. A concrete strategy may not stand in for a branch counsel has not settled.",
              label
            );
          }
          if (unit?.available !== false) {
            push(`${field}.available`, "A unit with an unresolved vehicle cannot be available.", label);
          }
          if (unit?.packetIdentity !== undefined && unit.packetIdentity !== "unresolved") {
            push(
              `${field}.packetIdentity`,
              "An unresolved unit cannot claim an identified packet.",
              label
            );
          }
        } else if (!OUTPUT_STRATEGIES.includes(unit?.outputStrategy as never)) {
          push(`${field}.outputStrategy`, `Each settled unit needs one of ${OUTPUT_STRATEGIES.join(", ")}.`, label);
        }
        if (unit?.available === false && !nonEmptyString(unit?.unavailableReason)) {
          push(`${field}.unavailableReason`, "An unavailable unit must say why.", label);
        }
      }

      // Nesting exists only for `mixed`, and only one level deep: an
      // alternative branch containing sequential units. Anything else is schema
      // no controlling source has asked for.
      for (const [i, unit] of track.units.entries()) {
        if (unit?.parentUnitId === undefined) continue;
        const field = `units[${i}].parentUnitId`;
        if (track.compositionMode !== "mixed") {
          push(field, "parentUnitId belongs only on a mixed composition.", label);
          continue;
        }
        if (unit.parentUnitId === unit.unitId) {
          push(field, "A unit cannot be its own parent.", label);
          continue;
        }
        const parent = track.units.find((candidate) => candidate?.unitId === unit.parentUnitId);
        if (!parent) {
          push(field, `parentUnitId ${unit.parentUnitId} names no unit on this track.`, label);
        } else if (parent.parentUnitId !== undefined) {
          push(field, "Nesting is one level deep: a parent unit may not itself have a parent.", label);
        }
      }

      if (track.compositionMode === "mixed" && !track.units.some((unit) => unit?.parentUnitId !== undefined)) {
        push(
          "compositionMode",
          "A mixed composition must have at least one unit nested inside a branch; otherwise it is sequential or alternative.",
          label
        );
      }

      if (!track.units.some((unit) => unit?.available === true)) {
        push("units", "A composed route needs at least one available unit; otherwise it is deferred, not composed.", label);
      }
    }
  } else if (!OUTPUT_STRATEGIES.includes(track.outputStrategy as never)) {
    push("outputStrategy", `outputStrategy must be one of ${OUTPUT_STRATEGIES.join(", ")}.`, label);
  }

  if (track.outputStrategy !== "composed") {
    if (track.units !== undefined) {
      push("units", "units belongs only on a composed route.", label);
    }
    if (track.compositionMode !== undefined) {
      push("compositionMode", "compositionMode belongs only on a composed route.", label);
    }
  }

  // A provisional strategy is only legal where the controlling source says so.
  // Idaho's addendum expressly authorised `custom_pleading, legal-design
  // blocked` for ID-3 and ID-4; without such a statement, provisional is a
  // guess wearing counsel's approval.
  if (strategyStatus === "provisional") {
    const authorised = (track.legalDesignDecision?.limitations ?? []).some(
      (limitation) =>
        limitation?.provenance &&
        COUNSEL_AUTHORED_BASES.includes(limitation.provenance.classificationBasis)
    );
    if (!authorised) {
      push(
        "outputStrategyStatus",
        "A provisional output strategy needs a limitation whose provenance is explicit_state_addendum, batch_decision_matrix or general_packet_only_rule, showing the controlling source expressly authorised it.",
        label
      );
    }
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
  //     A track whose packet identity is unresolved has no components to name.
  //     Requiring one would force a strategy to be invented for it.
  if (strategyStatus === "unresolved") {
    if (nonEmptyArray(track.components)) {
      push(
        "components",
        "A track with an unresolved output strategy has no identified packet, so it must carry no components.",
        label
      );
    }
  } else if (!nonEmptyArray(track.components)) {
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
      if (!OUTPUT_STRATEGIES.includes(component?.outputStrategy as never)) {
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

  // 11. Questions LegalEase asks the participant.
  //     These are answers, not records. LegalEase generates from what the
  //     participant tells it; it never requires a third-party document first.
  if (!Array.isArray(track.participantInputs)) {
    push(
      "participantInputs",
      "participantInputs must be an array of questions LegalEase asks the participant. Use [] only when the track needs no facts at all.",
      label
    );
  } else {
    for (const [i, input] of track.participantInputs.entries()) {
      if (!nonEmptyString(input?.key)) push(`participantInputs[${i}].key`, "key is required.", label);
      if (!nonEmptyString(input?.question)) {
        push(`participantInputs[${i}].question`, "Give the question as the participant would be asked it.", label);
      }
      if (!COMPONENT_REQUIREMENTS.includes(String(input?.requirement))) {
        push(`participantInputs[${i}].requirement`, "requirement must be required or conditional.", label);
      }
      if (input?.requirement === "conditional" && !nonEmptyString(input?.conditionDescription)) {
        push(`participantInputs[${i}].conditionDescription`, "A conditional question must say when it applies.", label);
      }
    }
  }

  // 12. Documents the participant obtains and attaches.
  //     A court or agency requiring a certified disposition, a criminal
  //     history, a fingerprint card or a certificate is a participant filing
  //     requirement. LegalEase names it and says where to get it. It is never a
  //     condition of generating the packet, and LegalEase never holds a copy.
  if (!Array.isArray(track.supportingDocuments)) {
    push(
      "supportingDocuments",
      "supportingDocuments must be an array. Use [] to state the participant attaches nothing.",
      label
    );
  } else {
    for (const [i, document] of track.supportingDocuments.entries()) {
      if (!nonEmptyString(document?.name)) push(`supportingDocuments[${i}].name`, "name is required.", label);
      if (!nonEmptyString(document?.obtainedFrom)) {
        push(`supportingDocuments[${i}].obtainedFrom`, "Say which court, clerk or agency issues it.", label);
      }
      if (!COMPONENT_REQUIREMENTS.includes(String(document?.requirement))) {
        push(`supportingDocuments[${i}].requirement`, "requirement must be required or conditional.", label);
      }
      if (document?.requirement === "conditional" && !nonEmptyString(document?.conditionDescription)) {
        push(
          `supportingDocuments[${i}].conditionDescription`,
          "A conditional document must say when it applies.",
          label
        );
      }
      if (typeof document?.requiredBeforeFiling !== "boolean") {
        push(
          `supportingDocuments[${i}].requiredBeforeFiling`,
          "requiredBeforeFiling must be true or false: does the court or agency want it with the filing?",
          label
        );
      }
      if (!nonEmptyString(document?.howToObtain)) {
        push(
          `supportingDocuments[${i}].howToObtain`,
          "Say what the participant does to get it; this becomes packet instruction text.",
          label
        );
      }
      // A record that corroborates an answer must point at a question we
      // actually ask, or the packet cannot tell the participant what to check.
      if (document?.confirms !== undefined) {
        const known = Array.isArray(track.participantInputs)
          ? track.participantInputs.some((input) => input?.key === document.confirms)
          : false;
        if (!known) {
          push(
            `supportingDocuments[${i}].confirms`,
            `confirms must name a participantInputs key. "${String(document.confirms)}" is not one.`,
            label
          );
        }
      }
    }
  }

  // 13. Items the participant completes by hand.
  if (!Array.isArray(track.manualCompletionItems)) {
    push(
      "manualCompletionItems",
      "manualCompletionItems must be an array. Use [] to state the packet leaves nothing blank.",
      label
    );
  } else {
    for (const [i, item] of track.manualCompletionItems.entries()) {
      if (!nonEmptyString(item?.item)) push(`manualCompletionItems[${i}].item`, "item is required.", label);
      if (!nonEmptyString(item?.whereInPacket)) {
        push(`manualCompletionItems[${i}].whereInPacket`, "Say which component and where on it.", label);
      }
      if (!nonEmptyString(item?.why)) push(`manualCompletionItems[${i}].why`, "Say why it is left blank.", label);
    }
  }

  // 14. Official sources.
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

  // 15. Filing, fee, notice, service, signature and notarization rules.
  //     Signature and notarization are asked for because they are the ordinary
  //     reason a generated packet is not yet a filed one, and the participant
  //     has to be told about them in the packet rather than blocked by them.
  const rules = track.rules;
  for (const key of [
    "filing",
    "fees",
    "feeWaiver",
    "notice",
    "service",
    "participantSignature",
    "notarization"
  ] as const) {
    if (!rules || !nonEmptyString(rules[key])) {
      push(`rules.${key}`, `rules.${key} is required. State "none" explicitly if none applies.`, label);
    }
  }

  // 16. Self-help stop conditions.
  if (!nonEmptyArray(track.selfHelpStopConditions)) {
    push(
      "selfHelpStopConditions",
      "At least one stop condition is required; every track has a point where self-help ends.",
      label
    );
  }

  // 17. Unresolved questions. Empty is valid, absent is not.
  //     Each carries an impact, because "we are still looking into it" is not
  //     an answer to "may we build it" or "may we ship it". Without the impact
  //     an open question survives only as prose and quietly expires when every
  //     track stops being runtime_disabled.
  if (!Array.isArray(track.unresolvedQuestions)) {
    push("unresolvedQuestions", "unresolvedQuestions must be an array. Use [] to state there are none.", label);
  } else {
    for (const [i, raw] of track.unresolvedQuestions.entries()) {
      const field = `unresolvedQuestions[${i}]`;
      if (typeof raw === "string") {
        push(
          field,
          `A bare string is not an unresolved question. Give { question, impact, affectedElement }, where impact is one of ${UNRESOLVED_QUESTION_IMPACTS.join(", ")}.`,
          label
        );
        continue;
      }
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        push(field, "Each unresolved question must be an object.", label);
        continue;
      }
      const question = raw as Record<string, unknown>;
      if (!nonEmptyString(question.question)) push(`${field}.question`, "question is required.", label);
      if (!UNRESOLVED_QUESTION_IMPACTS.includes(question.impact as never)) {
        push(
          `${field}.impact`,
          `impact must be one of ${UNRESOLVED_QUESTION_IMPACTS.join(", ")}. build_blocker means we do not know what to implement; release_blocker means we may build but may not ship.`,
          label
        );
      }
      if (!AFFECTED_ELEMENTS.includes(question.affectedElement as never)) {
        push(`${field}.affectedElement`, `affectedElement must be one of ${AFFECTED_ELEMENTS.join(", ")}.`, label);
      }
      validateProvenance(question.provenance, `${field}.provenance`, label, push);
    }
  }

  // 17b. Why a track is guidance rather than a packet.
  //      Required for guidance tracks so the re-review queue can tell an
  //      external dependency from a route that genuinely has nothing to file.
  // Required on a guidance track, because the re-review queue needs to tell an
  // external dependency from a route that genuinely has nothing to file.
  //
  // Permitted, but not required, on a composed route carrying a guidance unit.
  // Counsel sometimes says why that unit is guidance and sometimes only says
  // what the other unit files; demanding the rationale would mean inventing one
  // where the source is silent, which is the failure this pipeline exists to
  // prevent. Where it is stated it is recorded and checked.
  const composedGuidance =
    track.outputStrategy === "composed" &&
    Array.isArray(track.units) &&
    track.units.some((unit) => unit?.outputStrategy === "process_guidance");

  if (track.outputStrategy === "process_guidance" && !nonEmptyArray(track.guidanceRationales)) {
    push(
      "guidanceRationales",
      `A process_guidance track must say why: one or more of ${GUIDANCE_RATIONALES.join(", ")}.`,
      label
    );
  } else if (track.guidanceRationales !== undefined) {
    if (track.outputStrategy !== "process_guidance" && !composedGuidance) {
      push(
        "guidanceRationales",
        "guidanceRationales belongs only on a track with a process_guidance output.",
        label
      );
    } else {
      for (const [i, rationale] of track.guidanceRationales.entries()) {
        if (!GUIDANCE_RATIONALES.includes(rationale)) {
          push(`guidanceRationales[${i}]`, `Unknown rationale "${String(rationale)}".`, label);
        }
      }
    }
  }

  // 18. Legal-design decision.
  const decision = track.legalDesignDecision;
  if (!decision || !LEGAL_DESIGN_STATUSES.includes(decision.status)) {
    push("legalDesignDecision.status", `status must be one of ${LEGAL_DESIGN_STATUSES.join(", ")}.`, label);
  }
  if (!decision || !nonEmptyString(decision.rationale)) {
    push("legalDesignDecision.rationale", "A rationale is required.", label);
  }
  if (!decision || !Array.isArray(decision.limitations)) {
    push("legalDesignDecision.limitations", "limitations must be an array. Use [] for none.", label);
  } else {
    if (decision.status === "legal_design_approved_with_limitations" && decision.limitations.length === 0) {
      push("legalDesignDecision.limitations", "Approval with limitations must name the limitations.", label);
    }
    validateLimitations(decision.limitations, label, push);
  }
}

/**
 * Every limitation must say what kind of thing it is.
 *
 * An unclassified limitation defaults, in practice, to "do not generate" — which
 * is the wrong default for almost all of them. Requiring the classification puts
 * the decision with counsel and the operator converting their memo, where it
 * belongs, instead of with whoever reads the string later.
 */
function validateLimitations(
  limitations: readonly unknown[],
  label: string,
  push: (field: string, message: string, trackId?: string | null, severity?: ValidationIssue["severity"]) => void
): void {
  for (const [i, raw] of limitations.entries()) {
    const field = `legalDesignDecision.limitations[${i}]`;

    if (typeof raw === "string") {
      push(
        field,
        `A bare string is not a limitation. Give { classification, statement }, where classification is one of ${LIMITATION_CLASSIFICATIONS.join(", ")}.`,
        label
      );
      continue;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      push(field, "Each limitation must be an object with a classification and a statement.", label);
      continue;
    }

    const limitation = raw as Record<string, unknown>;

    if (!LIMITATION_CLASSIFICATIONS.includes(limitation.classification as never)) {
      push(
        `${field}.classification`,
        `classification must be one of ${LIMITATION_CLASSIFICATIONS.join(", ")}.`,
        label
      );
    }
    if (!nonEmptyString(limitation.statement)) {
      push(`${field}.statement`, "statement is required.", label);
    }

    validateProvenance(limitation.provenance, `${field}.provenance`, label, push);

    if (limitation.classification === "legal_design_blocker") {
      // A blocker is about the design, not about what the participant has to
      // go and collect. Naming the undetermined element is what enforces that.
      if (!AFFECTED_ELEMENTS.includes(limitation.undeterminedElement as never)) {
        push(
          `${field}.undeterminedElement`,
          `A legal_design_blocker must name which element is undetermined: ${AFFECTED_ELEMENTS.join(", ")}. A record the participant must obtain is not one of these — classify that as packet_instruction.`,
          label
        );
      }
    } else if (limitation.undeterminedElement !== undefined) {
      push(
        `${field}.undeterminedElement`,
        "undeterminedElement belongs only on a legal_design_blocker.",
        label
      );
    }
  }
}

/**
 * Every classification must say where it came from.
 *
 * Two rules here carry the weight:
 *
 *   - `normalizerInferred` may sit only on `mechanical_translation`. Combined
 *     with a basis that asserts counsel decided the point, it would let an
 *     operator's reading be filed as counsel's conclusion. That is the exact
 *     failure this provenance block exists to prevent.
 *
 *   - `counsel_confirmation_required` must carry the question. A basis that
 *     says "someone needs to decide this" without recording what they are being
 *     asked is an open item nobody can action.
 */
function validateProvenance(
  raw: unknown,
  field: string,
  label: string,
  push: (field: string, message: string, trackId?: string | null, severity?: ValidationIssue["severity"]) => void
): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    push(
      field,
      `provenance is required: { classificationBasis, sourceFile, sourceHeading, sourceStatement }. Basis is one of ${CLASSIFICATION_BASES.join(", ")}.`,
      label
    );
    return;
  }

  const provenance = raw as Record<string, unknown>;

  if (!CLASSIFICATION_BASES.includes(provenance.classificationBasis as never)) {
    push(`${field}.classificationBasis`, `classificationBasis must be one of ${CLASSIFICATION_BASES.join(", ")}.`, label);
  }
  if (!nonEmptyString(provenance.sourceFile)) push(`${field}.sourceFile`, "sourceFile is required.", label);
  if (!nonEmptyString(provenance.sourceHeading)) push(`${field}.sourceHeading`, "sourceHeading is required.", label);
  if (!nonEmptyString(provenance.sourceStatement)) {
    push(`${field}.sourceStatement`, "sourceStatement is required, quoted exactly from the source.", label);
  }

  if (provenance.normalizerInferred === true && provenance.classificationBasis !== "mechanical_translation") {
    push(
      `${field}.normalizerInferred`,
      "normalizerInferred belongs only on mechanical_translation. It records restructuring of a stated conclusion; it may never supply missing law under a basis that asserts counsel decided the point.",
      label
    );
  }

  if (provenance.classificationBasis === "counsel_confirmation_required" && !nonEmptyString(provenance.counselQuestion)) {
    push(
      `${field}.counselQuestion`,
      "counsel_confirmation_required must record the precise question counsel is being asked.",
      label
    );
  }
  if (provenance.classificationBasis !== "counsel_confirmation_required" && provenance.counselQuestion !== undefined) {
    push(`${field}.counselQuestion`, "counselQuestion belongs only on counsel_confirmation_required.", label);
  }
}

/** Walks the whole memo for forbidden keys, at any depth. */
function findForbiddenKeys(value: unknown, forbidden: readonly string[], path = "memo"): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => found.push(...findForbiddenKeys(entry, forbidden, `${path}[${index}]`)));
    return found;
  }
  if (!value || typeof value !== "object") return found;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbidden.includes(key)) found.push(`${path}.${key}`);
    found.push(...findForbiddenKeys(child, forbidden, `${path}.${key}`));
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
