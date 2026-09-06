# Louisiana Article987 — one bounded source-fidelity repair

**Family:** `la-987-set-aside-and-dismiss-set`  
**Route:** `obligation:track-only:LA:la-987-set-aside-and-dismiss`  
**Compared at:** `609f648cbb5a5e9fc258fa1ab895ab0ce685fc1b`  
**Date:** September6,2026  
**Status:** Code/primary-source finding and recommended repair contract. No build, PDF verdict, counsel approval or repository edit was performed here.

## The concrete problem

The current owner worklist treats two lines as a legal question about whether already-held offense/statute facts may be prefilled. The actual builder does not contain either fact in its synthetic `FACTS` objects. It always emits dotted lines for both. Do not fabricate a value or report an absent value as a successful write.

The narrower field question also obscures a larger defect. The current `primaryBody` substitutes a bespoke questionnaire for the Article987 motion, rewrites its rule to show cause, and replaces the Article987 order's preprinted operative wording with blank findings/decretal lines. The comparison is to the Louisiana Legislature's current Article987 publication, not a third-party template.

## Controlling sources

1. Article986: https://www.legis.la.gov/legis/Law.aspx?d=919679
2. Article987: https://www.legis.la.gov/legis/Law.aspx?d=919680
3. Existing `LA-STATUTORY-FORMS` determination in `data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json`, as invoked by the current builder. Inspect its current record before implementation; this handoff adds no new approval.

Article986 prescribes the listed statutory forms, permits adhering supplemental sheets under Article993, and authorizes appropriate court-name adjustment. Article987 publishes the motion, rule and order. Reproduction from that codified source is different from claiming an issuer PDF was downloaded.

## Exact implementation owner and scope

Captain: reserve one writer after checking the active assignment. Reuse the existing builder and output family:

- `scripts/build-census-v1-la-987-set-aside-and-dismiss-set.mjs`
- `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/`
- Existing return location assigned by the Captain.

Any necessary authoritative-input correction is performed by its existing owner. Do not give a worker blanket permission to rewrite state memos, national queues, source registries, or approval history. Do not create a second renderer or change unrelated families.

## Required correction matrix

| Element | Observed code | Required behavior |
|---|---|---|
| Filed motion | Labels and a newly written question-and-answer structure, including a separate participant-assertions section. | Render the Article987 motion's prescribed text and actual selection controls. Put explanatory questions in intake/instructions, not in place of the statutory pleading. |
| Representation | Both attorney and unrepresented blocks exist, with representation described as a fact. | Preserve the statutory alternatives and their execution/contact fields. Select only the actual representation branch; never insert attorney credentials for a self-represented participant. |
| Article selection | A descriptive `case.conviction_level` string. | Use the statutory Article894(B)/Article893(E) selection based on supported route facts. Do not confuse choosing a route with proof of completed probation. |
| Allegations of deferral/probation completion | Added YES/NO questions instead of the prescribed allegation. | Keep the prescribed allegation. Confirm the underlying facts before permitting execution; uncertain or contrary facts require the established correction/handoff treatment. |
| Identifying fields | Extra conviction labels; no prescribed date-of-arrest/arresting-agency/city-or-parish-of-arrest lines in `primaryBody`. | Preserve Article987's actual DOCKET NUMBER, CHARGE, DATE OF ARREST, ARRESTING AGENCY, and CITY/PARISH OF ARREST fields. Fill with the correctly identified participant facts or clearly track missing data. |
| Pro-se contact fields | The current unrepresented block prints signature/date/name only. | Restore the statutory address, city/state/ZIP and telephone fields as well as signature/name. |
| Rule to show cause | Paraphrased rule and generic hearing/place fields. | Reproduce the statutory rule, judicial execution blanks, and PLEASE SERVE recipients. Do not execute the hearing order or invent a hearing date. |
| Order of dismissal | Blank findings and decretal paragraphs replace the statutory text. | Preserve Article987's preprinted proposed order, with judicial signing/date/location fields unexecuted. Preprinted proposed text does not mean that relief is already granted. |
| Machine metadata | Internal FORM_ID, route key and explanatory system language are printed. | Keep internal provenance outside filed statutory text. Do not put route keys or engine messages inside the court's motion/order blocks. Preserve any specifically approved identification outside those blocks only if the current contract calls for it. |
| Missing offense/statute | Both fixture fact objects omit the values; field map declares before-filing completion. | Distinguish absence from prohibited filling. When a neutral field is supplied by the participant and belongs in the statutory instrument, write it. Do not add an extra standalone statute field to the statutory form solely because the old questionnaire did. |

## Data rules

- Keep the original arrest date distinct from offense date, plea date, conviction date and sentence date.
- Do not equate the place of arrest with the sentencing court or residence.
- Preserve the actual charge meaning required by the form. When the underlying record distinguishes amended, arrested-on and convicted charges, do not silently borrow a different form's mapping convention; resolve the relevant field from the record and applicable approved contract.
- Synthetic test facts may be added only as explicitly synthetic fixtures, not described as recovered real records or facts already held at the comparison snapshot.
- A missing fact must produce the product's documented before-filing/needs-information behavior, never an invented value. An unconfirmed essential completion allegation must not be presented as a ready-to-sign fact.
- Judge signatures, order dates, actual hearing details, service execution and participant signatures are completed only by the responsible actor at the proper event. The statutory legal text of an unexecuted proposed order remains printed.

## Focused completion evidence

Use existing builder and completeness tools; add only the minimal source-fidelity assertion needed for this defect.

1. Compare the court-facing motion, rule and order text to the official Article987 publication, allowing only actual field values and permitted court-name/layout treatment. Confirm every required statutory field and service recipient survives composition.
2. Exercise a synthetic case with complete neutral facts and one missing-information case. Establish that supplied facts appear in the correct visible places, while the missing-information case is truthfully labeled rather than filled with directions or guessed data.
3. Confirm only the supported representation and Article branch is selected and that protected execution fields are unexecuted.
4. Produce deterministic canonical/boundary outputs, inspect all changed pages for clipping, misleading page breaks and machine text, then return the changed hashes for the normal independent acceptance process. A write-counter pass alone cannot establish conformity to the statutory form.

No national audit is requested. Do not ship a two-field-only patch while the prescribed-form discrepancy remains. The completed repair and its independent review, not this document, determine when this family leaves its current hold.
