# Lane B — tracks that cannot be completed from committed sources

Owner: Terminal B (guidance, exclusions and exact deferrals)
Base: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0`
Scope of this record: partition B1 (AK, CA, GA, IL, IN, MD, MI, NC, ND, NH, UT)

This is an internal record, not participant copy.

## Why this record exists

Every lane-B job names `private/Nationwide Record Clearing/ (<ST>) + pinned
registry 3b6f4c10` as its source dependency. That archive is gitignored and is
not present in the repository, so the only committed legal material available to
this lane is each state's compiled profile under
`src/lib/rcap-engine/compiled/profiles/`.

Separately, 64 of the 73 lane-B tracks are `missing_from_compiled_runtime` with
an empty `mappedCompiledPathwayIds`. That flag means no track-specific pathway;
it does not by itself mean no committed authority, because a profile often
carries the same statutory mechanism under a different pathway id. Each B1 track
was therefore checked against its state's profile individually.

The result is three groups. The first two are buildable now. The third is not
buildable without source evidence that only the operator can supply, and the
guidance for those tracks must not be written from inference — inventing a
statute, forum, waiting period or form for someone seeking record relief is the
one failure this lane must never produce.

## Group 1 — direct authority, buildable

| Track | Carrier in the committed profile |
|---|---|
| `AK:ak-nonconviction-confidential` | CourtView non-publication pathway; AS 22.35.030 / Admin. R. 40; 60-day rule; Forms TF-810 / TF-805 / TF-800; trial court where the case was filed. **Shipped.** |
| `CA:ca-auto-conviction` | `tool-2-automatic-relief`; PC 1203.425 under AB 1076 / SB 731; 1-year and 4-year clocks; DOJ as the actor; no form by design. **Shipped.** |
| `IL:il-auto-seal-2028` | `clean-slate-automatic-sealing`. Mechanism is direct, but there is a hard conflict on the "2028" element of the track id — the profile's dates do not corroborate it. Build the mechanism; do not assert the 2028 date. |
| `MI:mi_auto_misd92`, `MI:mi_auto_misd93` | Stated verbatim inside the umbrella `automatic-clean-slate-set-aside-under-mcl-780-621g` pathway; they have no pathway id of their own. |
| `ND:nd-dna-profile-removal-routing` | Mechanism fully stated; only the container id differs. |

## Group 2 — adjacent authority, buildable with a stated limitation

These carry a real statutory mechanism, but the profile is missing at least one
element the participant needs. Build them, cite what exists, and state the
missing element as a limitation rather than filling it in.

| Track | What is present | What is missing |
|---|---|---|
| `AK:ak-sej` | AS 12.55.078 with effect, once-per-lifetime limit, and 12.55.078(f) exclusions; downstream 60-day CourtView relief | No procedure for requesting one — it is a sentencing-stage disposition, not a post-hoc petition. **Shipped on that basis.** |
| `GA:ga-fo-sentencing-post2026` | The first-offender statutory family (O.C.G.A. § 42-8-60 et seq., § 42-8-66 retroactive treatment) | The sentencing-side statute and the entire post-2026 scope are absent |
| `GA:ga-time-expired` | Time-lapse triggers as disposition categories | The period itself is never quantified; the limitations-expiry trigger is not named |
| `MD:md_10103_1_automatic` | Split across two pathways | Neither is § 10-103.1 |
| `MD:md_10112_dpscs_cannabis` | Cannabis relief as a court petition | The DPSCS/agency-automatic half is effectively absent |
| `MI:mi_setaside_csc4_pre2015` | Named only | No pathway, no subsection cite, no date, no waiting period, no form |
| `ND:nd-trafficking-vacatur-routing` | A records-retention/destruction statement | That is not a petition-based relief mechanism; no statute, forum or procedure |
| `ND:nd-juvenile-records-routing`, `ND:nd-unconstitutional-arrest-expungement-routing` | Topic named with one eligibility trigger | No statute, no forum, no procedure — escalation stubs |
| `NH:nh_supreme_court_record` | Split verdict across the annulment pathways | See the per-track note; the Supreme Court record half is not carried |

## Group 3 — no committed authority: blocked on operator source

For these the profile carries no pathway and no source section for the mechanism
the track names. There is nothing to cite and nothing to ground guidance in.

| Track | Mechanism the id names | Evidence needed |
|---|---|---|
| `IN:in_auto_expungement` | Automatic expungement by court order or operation of law without a petition | Indiana source material for the automatic route; the profile carries only the four petition pathways |
| `MD:md_10104_pre_service` | Crim. Proc. § 10-104 — expungement where a charging document was filed but never served | § 10-104 text and procedure |
| `MI:mi_arrest_acquittal_dismissal` | Non-conviction arrest record / fingerprint-card destruction after acquittal, dismissal or nolle prosequi | MSP arrest-card destruction procedure and its authority |
| `MI:mi_arrest_no_charge` | Arrest with no charge filed — record and fingerprint removal, MCL 28.243 | MCL 28.243 text and the MSP process |
| `MI:mi_deferral_status` | Deferral/diversion dispositions taken under advisement then dismissed — HYTA (MCL 762.11 et seq.) and controlled-substance deferrals | HYTA and deferral-statute text and their record consequences |

The Michigan profile's filing-destination rules are entirely
application-track set-aside venue, and its only MSP section is scoped to
convictions, so neither arrest track can borrow a destination from it. The
juvenile case-outcome option routes to `automatic-set-aside` and is a
juvenile-adjudication concept — it must not be stretched to cover the deferral
track.

## What is being asked for

For the five Group 3 tracks, the operator-held per-state material named in the
job's `sourceDependency` — or any official statutory text and procedure for the
named mechanism — pinned the way the PA and SC extracts already are under
`data/rcap-crosswalk-enrichment/final-official-sources/`, with retrieval date,
issuing body and SHA-256.

Until then these five keep their assigned treatment and are not written as
complete guidance, because the only way to complete them from what is committed
would be to invent the statute, the forum, the timing and the form.

## What the participant is told

Nothing in this record reaches a participant. It exists so the gap is visible
and owned rather than silently filled. Where a Group 2 track ships, the
limitation is stated to the participant in plain language, with an exact
destination and next step still given, and never in the internal vocabulary used
here.
