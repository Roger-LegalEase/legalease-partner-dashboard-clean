# C3 split agency or prosecutor application

This directory records branch identities only. It does not create packet families, form maps, artifacts, runtime wiring, checkout authority, or production changes. Commercial routes opened: `0`. Production touched: `NO`.

The retained B stage and participant A branch are separate products. Each row in `branch-identities.json` gives each side its own selector, output strategy, product outcome, and commercial treatment. `crosswalks.json` records both assignment rows marked `REUSE_AS_IS`; both stop because their form-token matches do not cover the full assigned participant instrument.

## Route disposition

| State | Assignment route | Result | Participant family named, not created |
| --- | --- | --- | --- |
| AK | `obligation:track-only:AK:ak-nonconviction-confidential` | Complete. A new correction and agency-review identity is recorded with explicit boundaries around existing mistaken-identity and judicial-review routes. | `rcap-ak-participant-agency-application` |
| MD | `obligation:track-only:MD:md_10112_dpscs_cannabis` | Stopped. The 072A token match does not cover the DPSCS correction request, and the committed cannabis-specific route uses 072D. | `rcap-md-official-pdf-fill` |
| MI | `obligation:track-only:MI:mi_arrest_no_charge` | Complete. A new residual-record participant identity is recorded and remains commercially closed. | `rcap-mi-official-pdf-fill` |
| NY | `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57` | Stopped. The 160.59 token match leaves the assigned manual-review and DCJS challenge actions uncovered. | `rcap-ny-official-pdf-fill` |

## What each branch files

### Alaska

The retained B stage files nothing. DPS and other custodians apply the confidentiality restriction after a qualifying non-conviction disposition.

The participant branch sends a correction request to the Alaska DPS Criminal Records and Identification Bureau or Quality Assurance Unit. The committed record identifies that form as `DPS-CRI-103`. The initial request has no stated deadline. A request for the commissioner's final administrative decision is due within 30 days after written denial.

The new identity is limited to a non-conviction confidentiality defect and agency correction or review. Mistaken-identity sealing stays on the existing AS 12.62.180 route using `DPS-SEAL-REQ-2-04`, and a final adverse agency decision hands off to judicial review. The decision-only `ak-correct-record` entry is related evidence that future runtime integration must reconcile.

### Maryland

The retained B stage files nothing. It reports on the one-time DPSCS cannabis-possession purge that was due July 1, 2024.

The proposed A branch combines two actions: a `CC-DC-CR-072A` petition in the court of disposition and a correction submission to DPSCS CJIS or the Central Repository after an unremoved record is discovered. The section 10-105 petition follows disposition-specific waits; the committed worklist records no separate filing deadline.

The reuse crosswalk is stopped. The existing 072A route covers favorable or non-conviction court petitions, not the unidentified DPSCS correction submission. The committed cannabis-specific charge or conviction route instead uses `CC-DC-CR-072D`.

### Michigan

The retained B stage files nothing when the arresting or reporting agency and MSP complete the statutory destruction as required.

The participant A branch is triggered when no charge was filed or prosecution was declined but arrest data remains or is inaccurate. The person sends a written correction or deletion request to the reporting agency and MSP. If judicial enforcement is required, the record identifies Michigan Court form `MC-235` for the appropriate trial or circuit court. No short administrative deadline is recorded; submit after the no-charge status is established or the stale entry is found.

This selector is limited to never-charged cases with a residual-record defect. Acquittal or dismissal after charge belongs to a separate route even though it may use the same form and family.

### New York

The retained B stage files nothing. UCS and DCJS apply CPL 160.57 automatic sealing during the implementation window, which runs through November 16, 2027.

The proposed reused A branch applies only when the person independently qualifies for discretionary sealing under CPL 160.59. File `CPL-160.59-APPLICATION` and the required companions in the court of conviction, then serve the county district attorney. There is no separate filing deadline in the worklist; the eligibility wait is at least ten years from sentencing or release, whichever is later, subject to extensions for later incarceration.

The crosswalk is stopped because it does not cover CPL 160.57(e) manual review or a DCJS record challenge. No committed form ID or exact route binding was found for either process, and the CPL 160.59 packet must not be presented as performing them.

## Launch boundary

All four participant families are names only. No source acquisition, PDF field map, packet artifact, review approval, runtime edge, payment route, or delivery path is created here. The launch-control state remains `HOLD`; every participant branch fails closed pending an exact Grade-A fulfilment record for its own route and family.
