# Lane C2 handoff — controlled pleadings

Lane C2 covers the eight `controlled_pleading` / `custom_pleading` jobs frozen in
`data/rcap-ledger/track-terminalization.json`: GA, TN, DC, HI, AZ, MA, ME and NC
production packets, 24 tracks in total. Every trackId in this document was read
out of the ledger, never retyped.

Verifier: `scripts/verify-rcap-terminalize-c2.mjs`.

```
node scripts/verify-rcap-terminalize-c2.mjs render [state-slug...]
node scripts/verify-rcap-terminalize-c2.mjs verify [state-slug...]   # default: all 8
```

Current state: **`verify` PASSES across 8 jobs and 24 tracks with zero warnings**.
Both findings below now apply to every jurisdiction in the lane; nothing is
exempted and nothing is downgraded to a warning.

## Job status

| Job | Tracks | Status |
| --- | --- | --- |
| `T-C-AZ-production-packet` | 1 | terminalized; hardened to both findings |
| `T-C-MA-production-packet` | 1 | terminalized; hardened to both findings |
| `T-C-ME-production-packet` | 1 | terminalized; hardened to both findings |
| `T-C-NC-production-packet` | 1 | terminalized; hardened to both findings |
| `T-C-HI-production-packet` | 2 | terminalized; hardened to both findings |
| `T-C-GA-production-packet` | 7 | terminalized |
| `T-C-TN-production-packet` | 8 | terminalized |
| `T-C-DC-production-packet` | 3 | terminalized (2 packets + 1 blocked pleading) |

## The two lane C1 findings, and what was done about them

### Finding 1 — `runPleadingQa` cannot see invented content

`runPleadingQa` checks five things: that the document rendered, that the template
grade is not the blocked grade, that the lifecycle is not `verified_replacement`,
that no prohibited relief term appears, and that the required footer is present
and no seal or logo marker is. That is the whole of it.

It therefore **passes** a pleading that fabricates a court finding, a filing fee
the source records as unquotable, the prosecutor's litigation position, completed
service, an invented Code section, or a populated docket, tracking number and
judge. Lane C1 shipped negative fixtures that did exactly that, and the lane's
own gate reported them as caught when nothing had caught them.

This was verified directly rather than assumed. Rendering
`ga-felony-j1`'s negative fixture — which fabricates all six — through the real
renderer and the real QA function returns `passed: true` with zero failures.

The verifier now carries eight content detectors that run against **every**
fixture:

| Signal | What it catches |
| --- | --- |
| `invention:court_finding` | a finding or determination the court has not made |
| `invention:hearing_outcome` | a hearing outcome or an order not entered |
| `invention:fee_amount` | a monetary figure where the source records no fee |
| `invention:prosecutor_position` | the prosecutor's or sovereign's litigation position |
| `invention:service_completed` | service asserted complete instead of left blank |
| `invention:signature_applied` | a signature or signing date instead of a blank block |
| `invention:unsourced_citation` | a statute or rule absent from the committed evidence |
| `protected_field:populated` | docket, tracking number, judge, SSN or DOB values |

Canonical, boundary and multiline fixtures must trip **zero**. Every negative
fixture in the lane must declare `expectedSignals` and actually trip each one; a
missing `expectedSignals` array is a failure, and a negative that relies on a QA
failure alone is rejected explicitly:

```
negative fixture relies on a QA failure alone; it must also trip an invention or
protected-field signal (runPleadingQa cannot see invented content)
```

The detectors earned their place during this lane. Three authoring errors were
caught before commit that review would otherwise have had to find:

1. A Tennessee authority description cited a section absent from that track's
   committed evidence (`invention:unsourced_citation`).
2. Another reused the chapter's restoration provision on a track whose pinned
   authority does not include it (same signal).
3. `invention:prosecutor_position` was written for pleadings that name the
   prosecutor in the third person and **silently missed** a fabricated prosecutor
   position in a letter addressed to that office. It now also matches
   second-person address (`your office`, `this office`).

### Finding 2 — silence must be recorded, never filled

Where a source says nothing — no verification statute, no fee, no venue, no
waiting period, no service rule — the field stays `null` and the silence is
recorded in a `sourceSilences` array. Each entry carries the field name, the
**quoted source statement**, a note on what was withheld and why, and a
`counselFlag` that must also appear **verbatim** in `config.counselFlags`. A null
without such an entry fails verification; so does a `counselFlag` that does not
reach the flag list.

The scan is over the **whole config**, not only the fields the schema happens to
name. Every null anywhere in `config` must be covered by a `sourceSilences` entry
for that exact path, or by the one alternative the verifier accepts: a null that
means "this packet component is not included", where `NULL_MEANS_COMPONENT_ABSENT`
maps the path to a component and the verifier **checks** that the matching
`includeX` switch is `false` and that `componentInventory` records the component
as absent or blocked with a reason. `config.serviceNote` is the only such path
today. It is a verified linkage, not an exemption list: break either half of it
and the null fails.

Where a fee silence is recorded, the verifier additionally scans
`participant-instructions.md` for any monetary figure, because the rendered-text
detector alone would miss a number invented in the instructions.

This gate caught two of its own during the DC build: a waiting-period silence and
a venue silence whose counsel flags had not been carried into the config.

Recorded silences by jurisdiction:

- **GA** — no verification statute on any route; no filing fee figure (unresolved
  and county-specific); no fee-waiver route; plus, on `ga-jail-k2`, no waiting
  period.
- **TN** — no verification statute on any route. On four routes the clerk's fee
  *exists* but its amount sits in the licensed code and was not retrievable, so no
  figure is quoted anywhere. The widely circulating figure appears only on a
  superseded page and is not in the enacted text; the negative fixtures use it as
  invented content precisely because the source refuses it. No waiting period on
  the routes whose subsection states none, with none imported from a neighbouring
  subsection.
- **DC** — no verification statute (the coded config already left it null and
  flagged it); no fee figure and no fee waiver; no waiting period on
  `dc_seal_fugitive`; no service destination on `dc_yra_set_aside`, where the
  mechanics are an unresolved build blocker.
- **AZ** — the § 13-4051 review records fees, fee waiver, service and
  notarization as "not stated" and names the superior court without a county
  venue rule: five silences, one for each, all pointing at counsel flags the
  config already carried.
- **HI** — no fee prescribed for the stage-one motion and none published by the
  Judiciary (clerk cost practice is a release-level open question); no fee-waiver
  instrument for this proceeding (Form B belongs to Rule 40); no venue as a track
  constant, because venue follows the offence and is a participant input. The
  verification statute and service note are *not* silent — Haw. R. Penal P. 47(d)
  and 49(a) state both — so they stay filled.
- **MA** — no verification statute (the source records only that the participant
  signs and that notarization is none); no service mechanics beyond "per the
  Standing Order" and no certificate component; no fee and no fee-waiver route
  identified. Venue is *not* recorded as silent: the Standing Order states a
  residence-based rule. Waiting period is not either: the source states none
  applies to these dispositions.
- **ME** — no verification statute, and no service rule at all on a route where
  nothing is filed. The fee is *not* recorded as silent: § 1500-CC affirmatively
  requires the investigation to be without charge.
- **NC** — no verification statute; no service rule ("This is correspondence, not
  a filing"); and no figure for the clerk's certificate-of-verification fee that
  may arise later, so none is quoted anywhere. The waiting period is not silent:
  the source states at least 210 days from final disposition.

## Negative fixtures

Every negative in the lane embeds concrete violations of its own track's packet
rules, labelled `INVENTED` inline, and names in `expectedSignals` the signal each
violation must trip. The six negatives that previously exercised only the QA gate
were re-authored against their own sources rather than against a shared list:

| Track | Track-specific violations added |
| --- | --- |
| `az_wrongful_arrest_clearance` | the § 13-4051 justice finding and a hearing the judge has not held; a fee where the review says "not stated"; the prosecuting agency's position and completed service where the review states no service requirement |
| `hi_first_time_property_offender_expungement` | the paragraph (a)–(d) provisos decided as findings, and the discretionary substance-abuse fallback presented as making relief automatic — which the source expressly forbids |
| `hi_marijuana_three_grams_expungement` | the quantity proviso and the same-facts question decided as findings; Rule 49(a) service recited as done when service follows filing |
| `ma-bmc-multi` | the § 100C substantial-justice determination and the *Pon* weighing recited as made; Standing Order preliminary hearing and public notice recited as held |
| `me-screening` | the § 1500-EE(3) remedy demanded in figures, which this packet must never plead, threaten or calculate; the vendor's position stated for it; a signature applied for a sender who must sign personally |
| `nc_auto_146_a4_agency_followup` | the expunction certified as determined by the Court, which the letter must never do; a demand and an asserted breach of duty where the letter asks; a figure for a fee the source quotes none for |

Each also carries the cross-cutting violations — an unsourced citation built from
that state's own numbering, and populated docket, OTN, judge, DOB and SSN fields.
Where the previous fixture asserted something worth keeping (the Grade E block,
or the Massachusetts sealing/expungement vocabulary error) that assertion was
kept and `qa` declared alongside the content signals, so no coverage was traded
away.

## Blocked dependencies

Nothing below was drafted around. Each names the instrument, the issuing body,
where it would be published, and the exact missing source.

**GA (7)** — six court routes record `proposed_order_statutory_content`: the
source requires the order to carry the tracking number, the arrest date and the
statutory disclosure limits, and the frozen shared renderer emits a fixed order
body that cannot. It *does* name the state record centre, without which an order
is not actionable. The dependency is a renderer contract change in `src/**`,
outside this lane's owned paths. `ga-jail-k2` records
`facility_published_request_form`: whether any county or municipal jail publishes
its own required intake form is an unresolved release blocker.

**TN (10)** — the three routes running under the procedure section record
`statutory_petition` and `proposed_order` as blocked because the statute assigns
their preparation to the office of the district attorney general and gives them
to the petitioner to file. Drafting them here is barred by the statute itself,
not by a missing source. Each also records `district_attorney_request_form`
(whether any office publishes its own intake form is unresolved).
`tn_redaction` records `state_bureau_removal_instrument`: form BI-0334
(rev. 04/2025), issued by the Tennessee Bureau of Investigation, whose
participant-facing role is unestablished.

**DC (2)** — `dc_seal_fugitive` records `eligibility_branch_confirmation`: the pin
carries a build blocker on what expires on 11 September 2026 and which subsections
revert. The filing vehicle is settled, so the motion is drafted to the subsection
the pin names as this track's authority, but promotion past
`pleading_packet_rendered` is withheld until the question is answered.
`dc_yra_set_aside` records `primary_filing` — see below.

## The one blocked pleading

`dc_yra_set_aside` is **not drafted**, and the dependency record is the
deliverable. Its pinned filing rule reads, verbatim:

> Blocked pending confirmation of Superior Court form or standing practice for YRA
> set-aside motions.

Four build blockers reach the current statutory factors and Superior Court
practice, the service and response mechanics, whether the set-aside and the
sealing motion are filed together or in sequence, and whether the court has any
form or standing practice at all. Drafting in that state would mean inventing the
instrument's form, its service and its composition.

The verifier gained a `documentForm: "blocked_pleading"` shape for this. Such a
track records its intended vehicle in `config`, quotes every blocking question
from the pin in a `blockedPleading` block, and must record `primary_filing` as
`blocked_dependency`. It must **not** ship fixtures, rendered artifacts or
participant instructions — shipping participant-facing filing instructions would
imply a packet that does not exist — and must ship `handoff.md` and
`blocked-pleading.md`. The verifier enforces both directions.

`blocked-pleading.md` records what is settled, what is barred, all four questions
with their source statements, the exact missing source, the dependency lane, and
explicit unblocking criteria. It also flags the first thing a reviewer should
check: the pin records that some participants already hold this relief
automatically and need no motion at all.

## Route-shape decisions worth review

- **GA** grants record restriction and sealing, never expungement, and neither
  destroys the record. `qaProhibitedTerms` enforces that. The caption carries a
  confirm bracket rather than a court name because the court level is participant
  data and must not default to Superior Court.
- **GA `ga-jail-k2`** is correspondence to a custodial facility — no court, no
  prosecutor, no clerk, no proposed order, no certificate of service.
- **TN** grants expunction. No Tennessee route carries a proposed order or a
  certificate of service: the order is a court instrument and service runs through
  the clerk. `tn_redaction` additionally prohibits "full expunction" because that
  route is partial removal leaving the conviction in place.
- **TN `tn_arrest_no_court_record`** is the one route where the participant writes
  the operative petition, because its section carries no cross-reference to the
  procedure section — and so also carries none of that section's waiting period,
  61-day clock, presumption or refiling bar.
- **DC** reuses the coded config at `src/lib/record-clearing/dc-config.ts` as the
  *source* of the data artifacts rather than forking it. The generator imports
  that module and reads out its presentation block, verification statute, service
  note, court caption and the counsel flags shared by both coded motion configs.
  `provenance.reusedCodedConfig` records the path, the file's sha256 and the exact
  reused fields, and the build asserts the coded verification statute is still
  null before proceeding. The coded configs cover two different tracks
  (`adult_motion_to_seal`, `adult_motion_to_expunge`), so per-track content comes
  from each track's own pinned entry.
- **DC `dc_correct_misattributed_arrest`** is correction, not closure. The closure
  vocabulary is prohibited outright, so the rendered motion cannot use it even by
  way of contrast; the contrast is drawn in the participant instructions instead.

## Residual gaps

1. **The GA proposed-order content requirement** cannot be met until the shared
   renderer can carry order-level tracking-number, arrest-date and
   disclosure-limit clauses.
2. **`dc_seal_fugitive`** should not be promoted past `pleading_packet_rendered`
   until the September 2026 reversion question is answered.
3. **Every track in all eight jurisdictions** is `legal_review_pending` with
   output review, visual review and technical proof outstanding. These are build
   output for review, not live routing.
