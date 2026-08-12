# Lane B — F2 correction record

Owner: Terminal B (guidance, exclusions and exact deferrals)
Review record: `claude/rcap-review-f2-guidance-hard-forms` @ `9c030920`,
`docs/rcap/review/f2/F2-DISPOSITIONS.json`, review date 2026-08-12
Review target: `claude/rcap-terminalize-b-guidance` @ `a26eda05` (6 commits)
Corrected at: `claude/rcap-terminalize-b-guidance`, current tip

F2 reviewed 13 treatments and returned 1 `technical_approved`,
11 `correction_required` and 1 `held_on_source_or_design`. Six of those findings
name lane-B guidance tracks. The rest name CA petition routes
(`ca-1203-41`, `ca-1203-42`, `ca-1203-43`, `ca-1203-4a`, `ca-17b-reduction`,
`ca-851-91`), `DE:de_discretionary_family_court` and `ME:me-seal-prost`, none of
which are lane-B tracks in the terminalization ledger — they belong to the lanes
that own those families.

## Corrected in participant copy

| Finding | Track | What was wrong | What it says now |
|---|---|---|---|
| **F2-03** | `CA:ca-auto-conviction` | The eligibility screen named three exclusion categories; CA-california.json states four. The fourth — offenses punishable by life or death — appeared in `authority[3]` but never reached the participant, making the screen over-broad in the participant's favour | `gather[4]` and `nextSteps[0]` now name all four in both languages |
| **F2-04** | `IL:il-auto-seal-2028` | Two divergences on the objection window. The copy anchored the 60 days to *filing*; 20 ILCS 2630/5.2(d) runs it from *service of the Notice of Filing*. And it named two objectors where the source names four | `timing`, `nextSteps[4]` and `afterNextStep` now run the window from service and name the State's Attorney or prosecutor, the Illinois State Police, the arresting agency, and the chief legal officer of the local government that made the arrest — both languages |
| **F2-01** | `MI:mi_auto_misd92` | Screened only the MCL 780.621c never-eligible list. The source scopes a second screen to the whole automatic track, and its agent guidance says "run two screens". The sibling 93-day entry carried it; this one did not | `gather` gains the automatic-track exclusion list, the more-than-one-assaultive bar and the two-felony cap; `nextSteps[0]` states both screens. The two Michigan entries now screen identically |
| **F2-02b** | `MI:mi_auto_misd93` | Carried the exclusion list but not the "more than one assaultive conviction bars automatic relief entirely" rule, and not the MCL 780.621c never-eligible screen the 92-day entry carried | Both added to `gather` and `nextSteps` in both languages |
| **F2-02** | `MI:mi_auto_misd93` | Stated MCL 780.621b same-incident collapsing without its two limiting conditions, so a participant could conclude same-incident convictions always count as one | `handoff` now carries the 24-hour same-transaction requirement and the three grouping-breakers — assaultive, weapon-involved, punishable by more than ten years |
| **F2-08b** | `AK:ak-sej` | `authority[1].sourceRef` trailed a pointer to `exclusionRules[8]` for AS 12.55.078(f). That rule is about AS 12.62.180 mistaken-identity sealing. The co-cited `sourceSections[3] 'Disqualifying offenses'` does carry the claim, so the citation was supported and only the pointer was wrong | The bad pointer is removed. The approved `ak-sej` treatment is otherwise untouched — this changes provenance metadata, not participant copy or the treatment |

**F2-16** (`CA:ca-auto-conviction` handoff tripping the lane's own
`PROHIBITED_PROMISES` guard on "you qualify" / "usted califica") was already
corrected before this pass, in commit `fca03fdf`. The guard is over-broad — the
strings promised the opposite of eligibility — but the gate did not pass as
committed, so the copy was reworded to "an eligibility question" rather than
narrowing a shared verifier this lane must not modify.

## Not correctable inside this lane — recorded for the owning lane

Two findings have acceptance conditions that require editing
`src/lib/rcap-engine/compiled/profiles/` or the shared verifier. Both are
outside lane B's writable paths, so they are recorded here with their owners
rather than silently left or silently fixed.

### F2-08 — AK CourtView classification conflict

`AK:ak-nonconviction-confidential` ships as `complete_guidance`, which is what
the terminalization ledger requires for the track. The committed pathway
`confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40`
in `AK-alaska.json` declares `automatic=false`, `filingRequired=true`,
`routeType='court_filing'`, `suggestedResultCode='packet_ready_with_caution'`.

Alaska is the only one of the four reviewed guidance states whose pathway
metadata contradicts its treatment. CA `tool-2-automatic-relief`, IL
`clean-slate-automatic-sealing` and MI `automatic-clean-slate-set-aside-under-mcl-780-621g`
all read `automatic=true` / `filingRequired=false` / `routeType='automatic'` /
`suggestedResultCode='guidance_only'`.

The participant copy is not informational-only — it discloses the TF-810 filing,
the destination and the fee — so the defect is the unreconciled classification
rather than a misleading experience.

Neither of the reviewer's two acceptance paths is available to this lane. The
first edits `AK-alaska.json` under `src/`. The second removes the track from the
guidance packet, which would break ledger coverage, since the ledger assigns it
`complete_guidance` and the shared verifier asserts every assigned track is
terminalized exactly once.

**Owner:** the owner of `src/lib/rcap-engine/compiled/profiles/AK-alaska.json`
(state-pack fidelity) with Terminal A for route resolution.
**Recorded as:** a state-pack fidelity item. The reviewer's further condition —
that the shared verifier gain an assertion that a `complete_guidance` entry's
pathway carries `filingRequired=false` — also belongs to whoever owns that
verifier; lane B is instructed not to modify it.

### F2-09 — ordered decision rules routing no-filing tracks to checkout

`MI-michigan.json` `rule-11-92-day-or-less-misdemeanors-are-set-aside-7-years-after`
carries `then={suggestedResultCode:'packet_ready_with_caution',
frontendAction:'show_cautions_then_allow_packet_checkout'}` — it routes a
no-filing automatic route to a paid packet checkout. Its siblings rule-10,
rule-27, rule-41 and rule-56 all carry `save_state_guidance_no_checkout`.
rule-11 is the outlier. The same exposure exists in `AK-alaska.json`, where 11
CourtView-keyed rules permit checkout.

This is pre-existing — neither lane touched `src/` — and is inert today because
nothing under `src/` reads the guidance packets. It is recorded here so that it
is not inert *and* unrecorded.

Every lane-B treatment sets `paymentAllowed: false` and `sellable: false`, and
the shared verifier asserts both on all 73 tracks, so nothing this lane produces
opens payment. The exposure is in the compiled profiles, not in this data.

**Owner:** the compiled-profile owner (state-pack fidelity) with Terminal A for
route resolution.
**Acceptance condition to carry forward:** rule-11 is corrected to
`save_state_guidance_no_checkout` to match its siblings, or the discrepancy is
registered as a state-pack fidelity item with an owner; and a check exists that
no ordered decision rule reachable from a `complete_guidance` track emits an
`allow_packet_checkout` frontendAction.

## F2-17 — coverage

The review recorded that 18 of 24 B1-partition tracks, and 67 lane-wide, were
terminalized nowhere at `a26eda05`. That was accurate at the review snapshot.
All 73 lane-B tracks across 33 states are now terminalized, and the shared
verifier passes on every partition.

## What the participant is told

Nothing in this record reaches a participant. It exists so the disposition of
each review finding is visible and auditable.
