# RCAP State Promotion — First-Batch Recommendation

**Status:** Recommendation only. Nothing in this document approves, enables, or routes any jurisdiction.

> **Naming.** This document's first batch is the **legacy live-preserved batch**
> — the five jurisdictions carrying the `legacy_live_preserved` blocker. It is
> *not* "Batch 1" of the nationwide legal-design sprint, which is a different set
> of twelve jurisdictions (AL, AK, AZ, AR, CA, CO, CT, DC, DE, FL, HI, ID) and
> 117 relief tracks. The two overlap only at DC. Do not read a conclusion about
> one as a conclusion about the other.


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

## 1a. What a limitation is, and what it is not

LegalEase is a self-help packet generator. It asks the participant structured
questions, relies on their answers, generates the applicable packet, identifies
documents they may need to obtain and attach, and gives filing, fee, signature,
notarization, service and next-step instructions. The court, clerk, prosecutor
or agency is the authority. LegalEase does not require, accept, inspect or
authenticate third-party records, does not determine eligibility, does not
decide whether a participant's evidence is sufficient, does not approve an
individual filing, and does not guarantee court or agency action.

That has a direct consequence for how a limitation is recorded. **A supporting
document required by a court or agency is a participant filing requirement, not
a packet-generation blocker.** "Pennsylvania wants a PATCH report attached"
becomes a question we ask and an instruction we print — never a reason to
withhold the packet.

Every limitation below therefore carries one of six classifications:

| Classification | What it means | Withholds the track? |
|---|---|---|
| `packet_instruction` | Text the packet must carry — a step, a document to obtain and attach, a fee, a deadline, a warning. | No |
| `participant_question` | Something to ask before generating, so the answer selects or fills the right output. | No |
| `scope_restriction` | A narrowing of who or where the track is offered to. It still generates within that scope. | No |
| `manual_completion_item` | A field the packet leaves blank for the participant to complete, sign, date or notarize. | No |
| `self_help_boundary` | Where LegalEase's automated assistance ends and a person needs a lawyer. | No |
| `legal_design_blocker` | Counsel has not determined the governing mechanism, the correct form, the venue, the geographic scope, or a legally permissible output strategy. | **Yes** |

Two things this classification does **not** do.

It does not touch the promotion gates. QA, attorney, source-freshness and visual
review are unchanged, and every track stays `runtime_disabled` until the source,
legal-output, technical and visual gates are satisfied. A `packet_instruction`
classification says the item is not a *legal-design* blocker; it says nothing
about whether the state is ready to promote.

And it does not resolve anything counsel has left open. Where a limitation turns
on a legal conclusion nobody has stated, it stays a `legal_design_blocker` and
the track stays disabled.

---

## 2. Recommended legacy live-preserved batch

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

Determined from the overlay factory manifest: jurisdictions with **0 blocked forms** and the **simplest paths** (guidance-only or low official-PDF complexity), excluding states already in the legacy live-preserved batch or Batch 2.

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

**Batch impact:** PA is in the legacy live-preserved batch and CA is in Batch 2 — each must clear its blocked-form remediation (or document a guidance/pleading fallback) as part of its promotion. DE, ME, NV, and WV each carry a blocked form and are therefore **not** Batch-3 candidates until remediated.

---

## 6. Per-batch required actions

For every batch below, "required action" = the gate work needed before `approved_for_live`. No action in this document changes any status; these are the recommended review steps.

### Legacy live-preserved batch (MS, IL, DC, PA, TX)

- **Required QA action:** Run QA against the legacy live output as the known-good baseline; confirm `qaReview` → `passed` per state.
- **Required attorney action:** Counsel confirms the relief pathways, form names, venue, filing steps, fees/copies/service, the questions we ask the participant, the documents we tell them to obtain, and the disclaimer all match the preserved legacy generator; set `attorneyReview` → `passed`. Counsel is confirming the *design*, not certifying that any individual participant qualifies — LegalEase makes no eligibility determination.
- **Required source freshness action:** Confirm statutes/forms are current vs. the legacy generator's known versions; set `sourceFreshnessReview` → `passed`.
- **Required visual action:** Visual review of overlays where official PDFs exist; **PA** must additionally resolve its XFA + encrypted forms (section 5).
- **Expected promotion blocker:** `legacy_live_preserved` on all five (must not replace the live fallback until separately approved); plus PA's blocked forms.
- **Recommended next action:** Use these to validate the promotion machinery; clear `legacy_live_preserved` only with explicit sign-off that the legacy live route is untouched. Do **not** toggle `liveEnabled`.

#### Legacy live-preserved batch limitations, classified

Every limitation carried by MS, IL, DC, PA and TX-Harris in the legacy live-preserved batch, sorted by what it
actually constrains. Nothing here is a new legal conclusion; each row restates
an existing limitation under the vocabulary in section 1a.

| # | Limitation | States | Classification | Effect |
|---|---|---|---|---|
| L1 | The preserved legacy live route must not be replaced until separately approved. The new machinery runs alongside it. | MS, IL, DC, PA, TX | `scope_restriction` | Bounds what is served, not what can be generated. |
| L2 | "Texas-Harris" is the preserved Harris-County generator. The Harris design is offered only in Harris County. | TX | `scope_restriction` | The Harris track fails closed outside Harris County. |
| L3 | Whether the Harris-County design carries statewide is not settled; both map to one `TX` record today. | TX | `legal_design_blocker` — undetermined: `geographic_scope` | Statewide TX stays disabled until counsel says what its scope is. |
| L4 | PA `213825-file-6289.pdf` is a dynamic XFA form and cannot be filled as published. | PA | `legal_design_blocker` — undetermined: `output_strategy` | Disabled until counsel says whether a custom pleading or guidance output is lawful here, or an unencrypted flat/AcroForm original is sourced. |
| L5 | PA `dna_removal_request.pdf` is encrypted and cannot be filled as published. | PA | `legal_design_blocker` — undetermined: `output_strategy` | Same as L4. |
| L6 | Pennsylvania expects a State Police PATCH criminal-history report obtained within 60 days before filing, attached, or the petition must explain its absence (Pa.R.Crim.P. 790). | PA | `packet_instruction` | We ask the participant the history questions, generate from their answers, and print how to request PATCH and when it is needed. We do not obtain, receive or inspect it. |
| L7 | DC expects the MPD arrest record / rap sheet to be requested before the packet is used. | DC | `packet_instruction` | Named in the instructions with where to request it. Not a generation gate. |
| L8 | Illinois expects the participant to check their criminal-history (RAP sheet) report before filing where possible. | IL | `packet_instruction` | Named in the instructions. Not a generation gate. |
| L9 | Harris County expunction expects the Texas DPS criminal history and, where needed, a certified disposition from the arresting agency, attached. | TX | `packet_instruction` | Named in the instructions with where to obtain each. Not a generation gate. |
| L10 | Mississippi certified-copy, record-retrieval and clerk charges vary by court. | MS | `packet_instruction` | Printed as a cost warning with a direction to confirm with the clerk. |
| L11 | Harris County filing fee, DPS fee and agency record fees are variable and must be confirmed with the clerk or agency. | TX | `packet_instruction` | Printed as a cost warning. Confirming a current fee is the participant's step, not ours. |
| L12 | Harris County filing method, copy counts and agency service mechanics are not stated in the preserved source. | TX | `packet_instruction` | Printed as a direction to confirm with the clerk before filing. It does not stop us producing the petition. |
| L13 | The Harris verification page requires the petitioner to swear to the facts before a notary or other authorized officer. | TX | `manual_completion_item` | The packet leaves the verification signature and notary block blank. |
| L14 | Mississippi and Harris County require the participant to confirm the correct court and county. | MS, TX | `participant_question` | Asked before generating; the answer selects venue. |
| L15 | Pennsylvania requires the county, Court of Common Pleas docket number, offense grade, disposition and restitution status. | PA | `participant_question` | Asked before generating; the answers fill and select the petition. |
| L16 | Mississippi felony-conviction petitions require district-attorney notice before any hearing. | MS | `packet_instruction` | Printed as a notice-and-service step. Service is the participant's, and it happens at or after filing. |
| L17 | A prosecutor objection or a contested hearing ends automated assistance. | MS, IL, DC, PA, TX | `self_help_boundary` | Assistance stops there. It does not retract a packet already generated and is not a reason to withhold the initial one. |
| L18 | Harris County: track execution by agencies after the order is signed. | TX | `packet_instruction` | A next-step instruction. LegalEase does not track agency execution and does not guarantee any agency acts. |

**Three of eighteen withhold a track.** L3, L4 and L5 are true legal-design
blockers: counsel has not determined the geographic scope or a legally
permissible output strategy, and those tracks stay disabled until they do. L1
and L2 bound where a track is offered without stopping it generating there. The
remaining thirteen are packet content, questions we ask, a hand-completed field,
or the point where self-help ends — none of them a reason to withhold a packet.

**This changes no status.** All five states remain `state_built` with every gate
`pending`, and every track remains `runtime_disabled` until the source,
legal-output, technical and visual gates are satisfied. Reclassifying L6–L18 out
of the blocker column does not promote anything; it records that they were never
questions for counsel to answer before we could generate.

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
- It does **not** promote anything by reclassifying a limitation. Section 6's legacy live-preserved batch table moves thirteen items out of the blocker column and into packet instructions, questions, a hand-completed field and a self-help boundary. Every one of those states remains `state_built`, every gate remains `pending`, and every track remains `runtime_disabled`.
- It does **not** create a document-upload, document-review or staff-approval step. LegalEase has none, and no limitation in section 6 may be satisfied by building one.

All promotion decisions remain gated behind QA, attorney, source freshness, and (where applicable) visual review, followed by an explicit `approved_for_live` action and a separate `liveEnabled` toggle.
