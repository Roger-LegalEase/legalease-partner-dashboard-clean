# Sellable pathway evidence join — for Session A

One record for each of the **284** intended-paid pathways, on head `29dcd0cb`.

This packet joins records that already exist. It issues no counsel approval, changes no
runtime, and changes no count in the closure ledger. Where a record says a standing
adoption covers a packet family, that states **that the join exists** — not that it is
legally sufficient. Counsel and Session A decide sufficiency.

## The standing counsel adoption

- Record: `EXT-ADOPT-01-standing-external-counsel-adoption`, status `adopted`, adopted **2026-08-08**
- Ref: `05c168e7:data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json`
- sha256: `7bea6b4c78cde50a4075bb107ea08a4804f2af3d5add75b245ebc37afaef1185`
- Scope: `packet_family`, standing, **57 families**, corpus reviewed through 2026-08-08
- Bound families actually listed: **57**, across **45 jurisdictions**

### Correction to the release brief

The brief says the adoption covers "57 document families across 45 states plus D.C.".
The record's own bound-family list carries 57 families across **45 jurisdictions, and DC is one of them** —
that is **44 states plus D.C.**, not 45 states plus D.C.

Jurisdictions in the paid denominator with **no bound family at all**: `AL`, `AZ`, `IA`, `ID`, `OR`, `WY`.

`d-roger-adoption-decision-packet.json` describes this as "one decision about four states"
— Alabama, Arizona, Iowa and Oregon. That packet was scoped to the 67 D-lane tracks.
Across the full 284-pathway paid denominator, **Idaho and Wyoming are also unbound**, and
neither appears in `outsideStandingScopeTrackIds`. Six jurisdictions need an adoption
decision, not four.

## Reconciliation 1 — the 232 legal-review count

`legal_review_pending` in the closure ledger: **232**. It is derived from the
per-pathway compiled `lawrenceRatification` record alone. The standing adoption is a
separate record system scoped at `packet_family`. Joining them splits the count:

| Kind | Pathways | What it means |
|---|---|---|
| `missing_join_track_level` | 0 | The exact track id sits inside a hash-bound memo of the adoption. Records question. |
| `missing_join_family_level` | 138 | The pathway's packet family is bound; no exact track-level binding exists. Counsel determines reach. |
| `genuine_missing_review_jurisdiction_unbound` | 21 | The jurisdiction has no bound family at all. A new adoption is required. |
| `genuine_missing_review_family_kind_unbound` | 73 | The jurisdiction is bound, but not for this family kind. Weaker claim; counsel determines reach. |
| `genuine_missing_review_outside_scope` | 0 | Recorded in outsideStandingScopeTrackIds. Never covered. |

**138 of 232** are a missing join. **94** are a genuine missing review, in `AK`, `AL`, `AZ`, `CO`, `DE`, `FL`, `GA`, `IA`, `ID`, `KY`, `LA`, `MA`, `MD`, `ME`, `NC`, `NE`, `NH`, `OR`, `PA`, `SC`, `SD`, `VA`, `VT`, `WY`.

Three bound families carry a superseded technical result and remain an open technical
gate even where the legal design is adopted: `rcap-in-custom-pleading`, `rcap-ms-custom-pleading`, `rcap-nd-custom-pleading`.

### Why no pathway reaches track-level adoption

**54 track ids** carry an exact hash-bound counsel memo inside the standing adoption —
the strongest legal evidence in the repository. **Every one of them**
(54/54) is recorded `missing_from_compiled_runtime` with zero `mappedCompiledPathwayIds`,
so none of it can reach a compiled pathway.

That is why `missing_join_track_level` is **0** and why 138 pathways fall back to
family-level inference. The join is broken at the **track-to-pathway crosswalk**, not at
counsel. Affected jurisdictions: `AK`, `AR`, `CO`, `FL`, `IL`, `KS`, `KY`, `LA`, `MA`, `MN`, `MO`, `NC`, `ND`, `NE`, `NH`, `NJ`, `NM`, `TX`, `UT`, `VA`, `VT`, `WA`, `WI`.

Repairing the crosswalk is a records question. It would move pathways from
`genuine_missing_review` or family-level inference onto exact track-level adoption
without any new review — and it is Session A's call, not this lane's.

## Reconciliation 2 — the 244 renderer count

`renderer_unavailable` in the closure ledger: **244**.

- `factory_v2` declared in `PacketRouteKind`: **true**
- `factory_v2` returned by any branch of `resolvePacketRoute`: **false**
- `LEGACY_VERIFIED_JURISDICTIONS`: `DC`, `IL`, `MS`, `PA`, `TX`

Every one of them traces to that single structural fact: with no branch returning
`factory_v2`, every jurisdiction outside the legacy-verified five falls through to the
`guidance_only` default no matter what packet assets are committed.

| Could factory_v2 serve it | Pathways |
|---|---|
| `not_from_committed_assets` | 205 |
| `yes_asset_committed` | 39 |

**39** carry a committed pleading, composed-route, hard-form or D1 official-form
package already, so a `factory_v2` branch would have something to bind. The rest would
need the asset built first. Whether any asset is legally and technically fit to serve is a
separate gate this packet does not decide.

## Problematic-PDF intersections

**19** intended-paid pathways touch **29** problematic-PDF asset ids, in `AK`, `KY`, `NC`, `NE`, `VA`, `VT`, `WI`.
Asset ids, defect categories, dispositions, owners and post-launch priorities are on each record.

## Record shape

Each record in `data/rcap-ledger/sellable-pathway-evidence-join.json` carries:
`packetFamily`, `standingCounselAdoption`, `adoptionScopeAndHash`, `legalReviewPending`,
`rendererFamily`, `factoryV2CouldServe`, `rendererUnavailableReason`,
`problematicPdfAssetIds`, `exactPublicWitness`, `exactRemainingBlocker`.

Regenerate with `npm run rcap:generate-sellable-evidence-join`.
