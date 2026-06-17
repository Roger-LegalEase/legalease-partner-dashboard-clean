# RCAP State Promotion — First-Batch Recommendation

**Status:** Recommendation only. Nothing in this document approves, enables, or routes any jurisdiction.

This document reviews the available all-50 review artifacts (`tmp/review-inbox/all50/`), the
promotion manifest (`src/lib/rcap/state-promotion-manifest.ts`), the promotion rules
(`src/lib/rcap/state-promotion-rules.ts`), and the overlay factory manifest
(`data/rcap-all50/overlays/overlay-factory-manifest.json`) to recommend a state-by-state
promotion order.

## Current baseline (read from the manifest, unchanged by this document)

- 51 jurisdictions (50 states + DC), all at `buildStatus = state_built`.
- All gates (`qaReview`, `attorneyReview`, `sourceFreshnessReview`, `visualReview`) = `pending` for every jurisdiction.
- `approvedForLive = false` and `liveEnabled = false` for every jurisdiction.
- `promotionStatus = state_built` for every jurisdiction. **0** approved_for_live, **0** live.
- `approvedChannels.internalPreview = true` for all 51; `partnerRcap`/`expungementAi` gated per state.
- Legacy-live-preserved jurisdictions carry the `legacy_live_preserved` blocker and `partnerRcap = true`: **MS, IL, DC, PA, TX**.
- Public live routing unchanged; legacy generators preserved; Expungement.ai UI untouched.

---

## 1. Promotion principles

1. **Promote state by state.** Each jurisdiction is approved on its own record; there is no bulk promotion.
2. **No state goes live merely because it is `state_built`.** `state_built` is a build status, not an approval. It is intentionally decoupled from any live decision.
3. **Required gates before `approved_for_live`:** QA review, attorney review, and source freshness review must each be `passed`. Visual review must be `passed` **or** explicitly `not_required`. Any `blockers` must be cleared. (Enforced by `canApproveForLive` in `state-promotion-rules.ts`.)
4. **Visual review may be `not_required`** for guidance-only and custom-pleading paths where there is no official PDF overlay to align. It must still be an explicit decision, not skipped silently.
5. **`partnerRcap` approval is separate from Expungement.ai consumer approval.** `approvedChannels.partnerRcap` and `approvedChannels.expungementAi` are independent booleans. Approving the partner RCAP channel never implies consumer availability.
6. **`approved_for_live` is not the same as `liveEnabled`.** `approved_for_live` means the review gates passed. It does **not** turn on live routing.
7. **`liveEnabled` requires an explicit, separate later action.** `canBecomeLive` requires `promotionStatus = approved_for_live` **and** `approvedForLive = true` **and** `liveEnabled = true`. The `liveEnabled` toggle is a deliberate, separate step performed after approval — and is out of scope for this document.

**Gate flow:** `state_built` → (QA + attorney + source + visual/not_required pass, blockers cleared) → `approved_for_live` → (explicit `liveEnabled` toggle) → `live`.

---

## 2. Recommended Batch 1 — Legacy / familiar states

**States:** Mississippi (MS), Illinois (IL), District of Columbia (DC), Pennsylvania (PA), Texas-Harris (TX).

These five carry the `legacy_live_preserved` blocker and already have `partnerRcap = true` in the manifest.

**Why first:**

- **Existing legacy live workflows are preserved.** These jurisdictions already have working live generators; promotion validates the new machinery *alongside* them and must not replace the live fallback until separately approved.
- **Review burden is easier.** The legal content, forms, and filing flows are already known and battle-tested from the legacy generators, so QA/attorney review starts from a known-good baseline.
- **Known states.** Reviewers and counsel are already familiar with these jurisdictions, reducing ramp-up time.
- **Validates the promotion machinery without replacing live routes.** Running these through the gate workflow exercises `canApproveForLive` / `canBecomeLive`, the dashboard, and the verifier on low-risk jurisdictions where the live route does not change.

> **Note on Texas:** the manifest holds a single `TX` record. In this batch, "Texas-Harris" refers to the preserved Harris-County legacy live generator used as the validation surface. The Texas **statewide** all-50 build is treated separately as a high-priority promotion in Batch 2. Both map to the one `TX` record today, which carries the `legacy_live_preserved` blocker; clearing that blocker must not disturb the Harris-County live fallback.

---

## 3. Recommended Batch 2 — High-priority states

**States:** Georgia (GA), Maryland (MD), Michigan (MI), Texas statewide (TX), California (CA), New York (NY), Florida (FL).

**Why second:**

- **High demand.** These are among the highest-volume record-clearing jurisdictions by population and request load.
- **Launch priority.** They are the commercial/launch-priority set already surfaced in the internal handoff dashboard's recommended review order ("High-volume / launch-priority states: GA, MD, MI, TX statewide, CA, NY, FL").
- **Partner / commercial importance.** Partner RCAP demand is concentrated here, so partner-channel approval value is highest.

> **Carry-over blockers in this batch:** **CA** has 2 blocked forms (encrypted) and **TX** carries the `legacy_live_preserved` blocker (statewide build must not disturb the Harris-County legacy live route). See sections 5 and 6.

---

## 4. Recommended Batch 3 — No blocked forms / simple guidance or pleading paths

Determined from the overlay factory manifest: jurisdictions with **0 blocked forms** and the **simplest paths** (guidance-only or low official-PDF complexity), excluding states already in Batch 1/2.

**Tier 3a — guidance-only (no official PDF overlay; visual review is a candidate for `not_required`):**

| State | Official PDFs | Guidance/pleading sources | Blocked |
|-------|--------------|---------------------------|---------|
| Louisiana (LA) | 0 | 8 | 0 |
| Oklahoma (OK) | 0 | 3 | 0 |

**Tier 3b — low-complexity overlay (≤3 official PDFs, 0 blocked forms):**

| State | Official PDFs | Guidance | Blocked |
|-------|--------------|----------|---------|
| Wyoming (WY) | 1 | 2 | 0 |
| Alaska (AK) | 2 | 2 | 0 |
| Indiana (IN) | 2 | 3 | 0 |
| Oregon (OR) | 2 | 1 | 0 |
| Alabama (AL) | 3 | 3 | 0 |
| Connecticut (CT) | 3 | 4 | 0 |
| Hawaii (HI) | 3 | 3 | 0 |
| Montana (MT) | 3 | 1 | 0 |
| Nebraska (NE) | 3 | 0 | 0 |
| New Jersey (NJ) | 3 | 4 | 0 |
| Tennessee (TN) | 3 | 3 | 0 |
| Virginia (VA) | 3 | 1 | 0 |

**Why third:** these have the lowest visual/overlay review burden (LA/OK have no PDF overlay at all; visual review can be marked `not_required` where the path is guidance/custom-pleading only), no blocked-form remediation, and small form inventories — fast QA and attorney passes.

> The remaining `state_built`, no-blocked-form jurisdictions with larger PDF inventories (e.g. CO with 33 PDFs, UT/ND/WA/MN, etc.) are promotion-eligible by the same rules but carry a heavier visual-review load and are best sequenced into later batches.

---

## 5. Blocked-form review list

From the overlay factory manifest: **9 blocked forms total** across **6 jurisdictions** — **1 XFA**, **8 encrypted**, **0 unreadable**. These overlays cannot be auto-mapped and need manual remediation (rebuild as flat/AcroForm, source an unencrypted official copy, or fall back to a guidance/custom-pleading path).

| State | Form | Block type |
|-------|------|-----------|
| Pennsylvania (PA) | `213825-file-6289.pdf` | **XFA** (dynamic XFA form) |
| Pennsylvania (PA) | `dna_removal_request.pdf` | Encrypted PDF |
| California (CA) | `cr180.pdf` | Encrypted PDF |
| California (CA) | `cr181.pdf` | Encrypted PDF |
| Delaware (DE) | `download.aspx.pdf` | Encrypted PDF |
| Maine (ME) | `MJB-Form-cr-218.pdf` | Encrypted PDF |
| Maine (ME) | `MJB-Form-jv-043.pdf` | Encrypted PDF |
| Nevada (NV) | `DPS-006.pdf` | Encrypted PDF |
| West Virginia (WV) | `SCA-C906.pdf` | Encrypted PDF |

**By type:**

- **XFA (1):** PA `213825-file-6289.pdf`.
- **Encrypted (8):** CA `cr180.pdf`, CA `cr181.pdf`, DE `download.aspx.pdf`, ME `MJB-Form-cr-218.pdf`, ME `MJB-Form-jv-043.pdf`, NV `DPS-006.pdf`, PA `dna_removal_request.pdf`, WV `SCA-C906.pdf`.

**Batch impact:** PA is in Batch 1 and CA is in Batch 2 — each must clear its blocked-form remediation (or document a guidance/pleading fallback) as part of its promotion. DE, ME, NV, and WV each carry a blocked form and are therefore **not** Batch-3 candidates until remediated.

---

## 6. Per-batch required actions

For every batch below, "required action" = the gate work needed before `approved_for_live`. No action in this document changes any status; these are the recommended review steps.

### Batch 1 — Legacy / familiar (MS, IL, DC, PA, TX)

- **Required QA action:** Run QA against the legacy live output as the known-good baseline; confirm `qaReview` → `passed` per state.
- **Required attorney action:** Counsel confirms eligibility pathways, form names, venue, filing steps, fees/copies/service, and disclaimer match the preserved legacy generator; set `attorneyReview` → `passed`.
- **Required source freshness action:** Confirm statutes/forms are current vs. the legacy generator's known versions; set `sourceFreshnessReview` → `passed`.
- **Required visual action:** Visual review of overlays where official PDFs exist; **PA** must additionally resolve its XFA + encrypted forms (section 5).
- **Expected promotion blocker:** `legacy_live_preserved` on all five (must not replace the live fallback until separately approved); plus PA's blocked forms.
- **Recommended next action:** Use these to validate the promotion machinery; clear `legacy_live_preserved` only with explicit sign-off that the legacy live route is untouched. Do **not** toggle `liveEnabled`.

### Batch 2 — High-priority (GA, MD, MI, TX statewide, CA, NY, FL)

- **Required QA action:** Full QA pass per state (no legacy baseline for GA/MD/MI/NY/FL); set `qaReview` → `passed`.
- **Required attorney action:** Counsel confirms pathways, forms, venue, steps, fees/copies/service, disclaimer, and no unsupported legal conclusion; set `attorneyReview` → `passed`.
- **Required source freshness action:** Confirm current statutes and official form versions for high-churn, high-volume jurisdictions; set `sourceFreshnessReview` → `passed`.
- **Required visual action:** Visual overlay/sample alignment review; **CA** must resolve its 2 encrypted forms; **TX** statewide must not disturb the Harris-County legacy route.
- **Expected promotion blocker:** CA blocked forms; TX `legacy_live_preserved`; otherwise standard pending gates.
- **Recommended next action:** Sequence GA/MD/MI/NY/FL first (no carry-over blockers), then CA (after form remediation) and TX statewide (after legacy-route sign-off). Do **not** toggle `liveEnabled`.

### Batch 3 — No blocked forms / simple paths (LA, OK; WY, AK, IN, OR, AL, CT, HI, MT, NE, NJ, TN, VA)

- **Required QA action:** Lightweight QA pass (small inventories); set `qaReview` → `passed`.
- **Required attorney action:** Counsel confirms guidance/custom-pleading language and disclaimer; set `attorneyReview` → `passed`.
- **Required source freshness action:** Confirm guidance and any official forms are current; set `sourceFreshnessReview` → `passed`.
- **Required visual action:** For LA/OK (no official PDF) mark `visualReview = not_required`; for low-PDF states, a short overlay/sample alignment check.
- **Expected promotion blocker:** None recorded (no blockers, no blocked forms) — only the standard pending gates.
- **Recommended next action:** Fastest tranche to carry through the gate workflow once Batches 1–2 validate the machinery. Do **not** toggle `liveEnabled`.

---

## 7. What this document does not do

This is a recommendation document only. Explicitly:

- It does **not** approve any state. No `promotionStatus`, `approvedForLive`, gate status, or `approvedChannels` value is changed.
- It does **not** enable live routing. No `liveEnabled` value is changed; `canBecomeLive` requires a separate explicit toggle.
- It does **not** change public routing. Public live routes are unchanged.
- It does **not** replace or alter the legacy generators (MS, IL, DC, PA, TX-Harris remain preserved).
- It does **not** launch Expungement.ai consumer availability. `approvedChannels.expungementAi` is untouched and remains separate from `partnerRcap`.
- It does **not** change Stripe, Supabase, auth/RLS/session logic, billing, secrets, or production/deployment config.
- It does **not** edit the promotion manifest statuses or the promotion verifier.

All promotion decisions remain gated behind QA, attorney, source freshness, and (where applicable) visual review, followed by an explicit `approved_for_live` action and a separate `liveEnabled` toggle.
