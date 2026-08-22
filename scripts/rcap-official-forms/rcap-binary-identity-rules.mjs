// The six rules that decide what two asset ids over one SHA-256 mean.
//
// One implementation, used by the ledger that writes the record and by the
// mutation suite that proves the rules bite. A second copy in the verifier
// would mean the tests were checking a different rule set from the one the
// corpus is adjudicated with, which is the failure mode this whole lane keeps
// finding elsewhere.
//
//   1. same digest alone does not authorise deduplication;
//   2. a duplicate alias can retire only after every operational reference is
//      repointed to the canonical asset;
//   3. a retained operational reference prevents retirement;
//   4. distinct operational roles may remain separate even when bytes match;
//   5. a conflicted group with no proven relationship remains retained;
//   6. no group may leave contradictory dispositions unexplained.
//
// Ordered so the safe answer is the default. Rule 3 is checked per member
// before any group-level relationship is applied, because a surviving
// reference is disqualifying whatever the group turns out to be, and rule 5
// catches everything the earlier rules could not prove — and what it catches is
// retention.

/** Surfaces that count as an operational reference for these rules. */
export const OPERATIONAL_SURFACES = new Set([
  "application_source", "overlay_factory_manifest", "legal_design_registry",
  "d_track_queue", "composed_routes", "guidance_packets", "terminalization_treatments",
  "track_terminalization_ledger", "all_state_build_manifest", "field_map_drafts"
]);

/**
 * Resolve one digest group.
 *
 * `members` carry documentRole, libraryFolder, operationalReferenceCount and
 * surfaces. `repointProven` is the caller's evidence that every reference to an
 * alias has been moved to the canonical asset — it is never inferred, because
 * inferring it is how an alias retires while something still points at it.
 */
export function resolveGroup({ digest, members, repointProven = false }) {
  const roles = new Set(members.map((m) => `${m.documentRole ?? "?"}|${m.libraryFolder ?? "?"}`));
  const sameRole = roles.size === 1 && !roles.has("?|?");

  const referenced = members.filter((m) => (m.operationalReferenceCount ?? 0) > 0);
  const unreferenced = members.filter((m) => (m.operationalReferenceCount ?? 0) === 0);
  const aliasProven = sameRole && referenced.length === 1 && unreferenced.length >= 1;

  let relationship;
  let canonicalAssetId = null;
  let rule;
  if (aliasProven) {
    relationship = "true_alias";
    canonicalAssetId = referenced[0].assetId;
    rule = "rule 2 — an alias may retire only once every operational reference is repointed to the canonical asset";
  } else if (!sameRole) {
    relationship = "distinct_operational_roles";
    rule = "rule 4 — distinct operational roles may remain separate even when bytes match";
  } else {
    relationship = "unproven";
    rule = "rule 5 — a conflicted group with no proven relationship remains retained";
  }

  const dispositions = members.map((member) => {
    // Rule 3 outranks the group's relationship entirely.
    if ((member.operationalReferenceCount ?? 0) > 0) {
      return {
        assetId: member.assetId,
        disposition: "retained",
        because: `rule 3 — ${member.operationalReferenceCount} surviving operational reference(s): ${(member.surfaces ?? []).join(", ") || "recorded"}`
      };
    }
    if (relationship === "true_alias") {
      return {
        assetId: member.assetId,
        disposition: repointProven ? "retired_alias_repointed" : "retained_until_repointed",
        because: repointProven
          ? `rule 2 — a proven alias of ${canonicalAssetId} with every operational reference repointed`
          : `rule 2 — an alias of ${canonicalAssetId}, and no record proves its references were repointed`
      };
    }
    if (relationship === "distinct_operational_roles") {
      return {
        assetId: member.assetId,
        disposition: "retirable_on_its_own_merits",
        because: "rule 4 — a separate operational role that happens to share bytes; it stands or falls on its own references"
      };
    }
    return {
      assetId: member.assetId,
      disposition: "retained",
      because: "rule 5 — the relationship between these ids is not proven, and an unproven group is retained whole"
    };
  });

  // Rule 6, enforced rather than asserted.
  const unexplained = dispositions.filter((d) => !d.because);
  if (unexplained.length) throw new Error(`digest ${digest} leaves ${unexplained.length} disposition(s) unexplained`);

  return { digest, relationship, canonicalAssetId, rule, sameOperationalRole: sameRole, dispositions };
}
