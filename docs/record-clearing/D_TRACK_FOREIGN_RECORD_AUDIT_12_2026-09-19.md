# 12 — who owns `va_exp_absolute_pardon`, and was its D placement authorized

`generate-rcap-d-track-queue --check` fails because
`data/rcap-codex/d-track-terminalization/track-family-map.json` declares
`expectedTracks: 67` and its `tracks` array holds 68. The extra entry is
`va_exp_absolute_pardon`.

## Classification

**`MOVE_TO_EXISTING_OWNER_DATASET`.**

The D placement was never authorized. But the record carries a real fact that a
downstream generator depends on, and removing it makes the repository **less**
truthful, not more. It needs a canonical home before it can leave.

## The placement was never authorized

**The record does not share the D schema at all.** Against its 67 peers:

| | |
|---|---|
| Peers sharing its field signature | **0 / 67** |
| Universal peer fields it lacks | **26 of 29** — `legalName`, `authorityRefs`, `officialFormRefs`, `canonicalImplementationJobId`, `implementationLane`, `outputStrategy`, `canonicalRequiredTreatment`, `technicalStatus`, `legalAdoptionStatus`, `currentRootBlocker`, `proposedTerminalProductTreatment`, `terminal`, … |
| Fields it adds that no peer has | **5** — `runtimeRouteKey`, `obligationRouteKey`, `exactFamilyJobIds`, `relationshipMethod`, `createsApproval` |

It is also absent from every count in the file: `treatmentCounts` sums to 67
(7 `correction_required` + 60 `held_on_source_or_design`), and `scope` records
`tracksDerived: 67`, `uniqueTracks: 67`. The derivation produced 67; the 68th
was appended.

**D's own rule excludes it.** Derivation rule 1: *"Track membership comes only
from lane-D jobs in the canonical track-terminalization ledger."* In
`data/rcap-ledger/track-terminalization.json`, lane D is defined as:

```
scope      "official PDFs, AcroForms and overlays"
families   ["official_form_standard"]
treatments ["production_packet"]
```

and the assignment rule is *"a track resolves to exactly one lane via
`requiredTreatment` and `implementationFamily`."* The VA track's own record
there reads:

```
declaredStrategy      "custom_pleading"
implementationFamily  "controlled_pleading"
requiredTreatment     null
```

`controlled_pleading` is not `official_form_standard`, and `null` is not
`production_packet`. By the ledger's disjoint rule the track cannot resolve to
lane D. **No scope expansion, and no owner or legal decision, ever placed it
there.**

**The commit says what it was for.** `97adcecd5` (2026-09-04, *"fix(rcap): map
Virginia pardon route to packet family"*) and its return record
`data/rcap-grade-a/packet-factory-24h/fix06/va-absolute-pardon-product-crosswalk-return.json`:

> `whyThisFile`: "scripts/generate-rcap-paid-pathway-legal-join.mjs reads this
> file as familyMap and consumes `tracks[].exactFamilyJobIds` as a
> track-to-family bridge."

with `routesOpened: 0`, `Production: false`, `centralGeneratedEdits: 0`,
`createsApproval: false`, `packetOrLegalTextChanged: false`, and *"this worker
created no approval"*. So the record was never meant to be a D track. It was a
crosswalk bridge, written into the D file because that is the file the join
generator reads.

## The route's actual lane, and who already owns it

VA absolute pardon is a **post-pardon court expungement implemented as a
controlled pleading**, runtime route `VA:regime-1-expungement-available-now`,
family `va_exp_absolute_pardon-set`, rendered as
`va-exp-absolute-pardon-set--custom-pleading`. Not an official-form overlay,
which is what lane D is for.

Canonical ownership already exists in at least three places:

- `data/rcap-ledger/track-terminalization.json` — the track itself,
  `terminal: true`, `coverageDisposition: exact_current_pathway`
- `data/record-clearing/legal-design-packet-set-manifests.json` — the family's
  components (`va_exp_absolute_pardon-filing-instructions-3`, …)
- `data/rcap-grade-a/route-productization/PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json`
  — the exact obligation and runtime route keys, `ratified_deployable`
- plus the packet specification `VA-absolute-pardon-expungement.v1.json`

## Why removal alone is wrong

Removing the record clears step 12 — `d track queue current`, `tracks 67`. It
also changes the paid-pathway legal join, measured:

```
tracksWithAFamilyBridge        260 -> 259
family_bridge_missing_no_family 156 -> 157
owner_approval_pending            1 -> (key gone)

VA:regime-1-expungement-available-now
  packetFamilies   ["va_exp_absolute_pardon-set"] -> []
  familyBridgePresent            true -> false
  disposition   owner_approval_pending -> family_bridge_missing_no_family
  statement  "resolves to packet family va_exp_absolute_pardon-set, and 1 of
              them is not named by any owner legal decision."
          -> "No packet family is reachable from this pathway, so no owner
              decision reaches it either."
```

The post-removal statement is **false**. The family exists — it has a packet
specification, a census overlay and manifest components. The pre-removal
statement is the accurate one: the family exists and no owner decision names it.

So naive removal buys a green step 12 by making a green generator lie.

## The root, which is bigger than this record

`generate-rcap-paid-pathway-legal-join.mjs` uses a **lane-D-scoped, explicitly
non-canonical analysis** (`status: "proposed_noncanonical_analysis"`) as its
**universal** track-to-family map. It records this itself:

```js
trackToFamilyScope: familyMap.scope?.lane ?? "unknown"
```

That is why a `controlled_pleading` track ended up in a file for official-form
overlays: the only bridge available was the D one, so a cross-lane fact was
written into a lane-scoped file. The VA entry is the symptom.

## Terminal remediation, in order

1. Give the track-to-family bridge a canonical home. The fact is already carried
   by `legal-design-packet-set-manifests.json` and
   `PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json`; what is missing is a single
   dataset the join generator can read for every lane.
2. Re-point `generate-rcap-paid-pathway-legal-join.mjs` at it, and confirm the
   join output is unchanged — `owner_approval_pending: 1` must survive.
3. Only then remove the foreign record from the D map. Step 12 goes green
   truthfully, and `scope.expectedTracks: 67` becomes true again.

Step 1 changes what a currently-green generator reads, and
`legal-design-packet-set-manifests.json` is a worker-image input, so the rebuild
gate must be reassessed if the bridge lands there.

## What must not be done

- Do not make the VA record conform to the D schema. It is not a D track; 26
  invented fields would be 26 fabrications.
- Do not change `expectedTracks` to 68. The scope block is correct; the
  membership is not.
- Do not remove the record before step 1. A green step 12 bought with a false
  join statement is a net loss.

## Gate

Diagnosis and recording only. The removal was applied, measured and reverted;
the tree is clean. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.
