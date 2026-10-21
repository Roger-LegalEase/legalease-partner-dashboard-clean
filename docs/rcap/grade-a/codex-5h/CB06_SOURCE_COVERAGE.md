# CB06 source coverage and relationship gap audit

## Scope and safety

This is a read-only reconciliation of the committed source conveyor. It compares
`ACTIVE_ASSIGNMENTS.json`, `claim-ledger.json`, `SOURCE_CONVEYOR_ASSIGNMENTS.json`,
and `SOURCE_RELATIONSHIP_REGISTRY.json`; it does not inspect source bodies or
change claims, receipts, manifests, registry records, routes, or source custody.
The collision wall is recorded in `collision-guard.json`. Findings that require a
Claude-owned generator or registry change are apply-ready proposals only.

## Executive result

- **449 source-obligation claims audited.** Every claim has exactly one matching
  committed assignment at the same `itemId + operation`; there are zero missing,
  duplicate, or lane-owner mismatches.
- **221 registry records are DISC-routed** under the registry's own owner/state
  vocabulary. Only 21 currently reconcile to exactly one DISC `itemId` and one
  Claude lane owner. The other **200 records** have an absent or non-unique
  item-level relationship. This is a registry-to-obligation relationship gap,
  not an unclaimed source obligation.
- **67 held-artifact review records** remain: 58 currentness-unverified, eight
  family-identity ambiguous, and one scope/version ambiguous.
- **53 records are concretely routed through SRC/ACQ despite a relationship state
  that requires DISC normalization or containment handling first:** 39
  currentness checks, seven ambiguous family identities, three bundle components,
  two embedded sections, and two stale/variant identities.
- Six statutory custom pleadings belong in packet build, three bundles must be
  acquired once rather than component-by-component, three embedded sections have
  no separate binary, and two license/reuse questions belong to counsel/business.
- URL syntax validation found **zero malformed accepted URLs**. Twenty records use
  a circular placeholder publisher label of the form `publisher of <source page>`;
  those labels are evidence-quality gaps and are not accepted as independent
  publisher corroboration.

## Method

1. Derived the collision wall from all 16 committed DISC/SRC/ACQ/PROMO prompt
   records and their owned/prohibited paths.
2. Joined all current source claims to active assignments by the exact composite
   key `itemId + operation`, then separately compared lane ownership.
3. Classified DISC-routed registry records from the registry's explicit ownership
   vocabulary. A row maps only when both its `sourceIds` and its family
   relationships intersect a DISC claim; no identity was inferred.
4. Audited containment, aliases, variants, held candidates, currentness, reuse,
   statutes, and URL syntax. Every omission and non-unique mapping is retained in
   the machine-readable results.

## Exact handoffs

- **Captain / source-conveyor generator:** introduce one canonical obligation
  itemId per DISC-routed registry record, or an explicit many-obligation mapping
  when the record intentionally serves multiple family obligations. Do not rely
  on incidental overlap between `sourceIds` and family arrays.
- **DISC:** settle currentness, family identity, scope/version, and stale/variant
  identity before any acquisition handoff. Record bundle component locators and
  embedded-section relationships.
- **ACQ:** acquire a containing bundle/document once, and only after DISC settles
  identity and the exact official address. Do not acquire statutes or embedded
  sections as standalone forms.
- **Packet build:** handle all six `STATUTORY_CUSTOM_PLEADING` records as drafting
  inputs, not source acquisition.
- **Counsel/business:** decide the two `LICENSE_PERMISSION_REVIEW` reuse issues;
  source acquisition cannot resolve permission.

## Artifacts

- `claim-coverage.json` — exact assignment/claim coverage and duplicate checks.
- `relationship-gaps.json` — all DISC mapping gaps, containment/alias findings,
  malformed URL results, and circular publisher labels.
- `ambiguous-held-artifacts.json` — all 67 ambiguity/currentness held records.
- `misrouted-obligations.json` — exact affected records and an apply-ready routing
  proposal for the forbidden generator/registry paths.
- `state.json` and `progress.md` — machine state and concise checkpoint.

This audit makes no `PASS_COMPLETE` claim. It opens no commercial route and
confers no delivery or production authority.
