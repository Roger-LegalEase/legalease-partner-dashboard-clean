# RCAP State Machine - Reconciliation Punch List

Pre-build audit of the expanded state machine spec. This is not the spec. It is the checklist you and Lawrence walk before the spec gets rewritten. Every case status is listed with its documented transitions IN and OUT, gaps flagged, and terminal status marked intentional or accidental.

Legend:
- **IN** = documented transitions that reach this status (from Section 5)
- **OUT** = documented transitions that leave this status (from Section 5)
- Gap = gap that will ship as a bug if not closed
- Clean = clean, no action
- Terminal = terminal by design (no OUT is correct)
- Decision = decision owed before build

---

## Part 1: Status-by-status audit

### Intake and record readiness

**`intake_started`**
IN: (entry point, none needed) · OUT: -> needs_record, -> unsupported_jurisdiction, -> triage_ready, -> multiple_records_detected
Clean. Entry point, four documented exits.

**`needs_record`**
IN: <- intake_started · OUT: -> record_retrieval_in_progress
Clean.

**`needs_case_details`**
IN: Gap **none** · OUT: Gap **none**
Gap. Defined in Section 3 status list but appears nowhere in Section 5 transitions. Either it is a real status (then it needs IN from intake/triage and OUT to triage_ready) or it is a duplicate of `not_enough_information` and should be deleted. **Decision owed: is this distinct from `not_enough_information`?** They look like the same concept under two names.

**`record_retrieval_in_progress`**
IN: <- needs_record · OUT: -> record_received
Clean.

**`record_received`**
IN: <- record_retrieval_in_progress · OUT: -> triage_ready, -> possible_exclusion, -> needs_attorney_legal_review
Clean.

### Triage

**`triage_ready`**
IN: <- intake_started, <- record_received, <- reopened · OUT: -> possible_pathway, -> possible_exclusion, -> not_enough_information
Clean. Well-connected hub.

**`possible_pathway`**
IN: <- triage_ready · OUT: -> draft_packet_started
Clean.

**`possible_exclusion`**
IN: <- triage_ready, <- record_received · OUT: -> needs_attorney_legal_review, -> referred_out
Clean.

**`unsupported_jurisdiction`**
IN: <- intake_started · OUT: Gap **none documented in Section 5**
Gap. Section 6 describes user-facing next steps (save info, notify partner, join update list) but no state transition. **Question: is this terminal, or does it transition to `triage_ready` when the jurisdiction later goes live?** My draft had `unsupported -> possible_pathway` on jurisdiction launch. If that re-engagement is intended, it needs a transition. If unsupported cases are abandoned on launch, say so. Right now it is an undocumented dead end sitting on top of your roadmap-intelligence data.

**`not_enough_information`**
IN: <- triage_ready · OUT: Gap **none**
Gap. Entry but no exit. What pulls a case out of `not_enough_information`? Presumably the user supplies more, routing back toward `record_retrieval_in_progress` or `triage_ready`. Undocumented. See also `needs_case_details` - likely the same state.

**`multiple_records_detected`**
IN: <- intake_started · OUT: Gap **none**
Gap. **This is the architectural contradiction, not just a gap.** A case status describing a user-level fact. A single case cannot be "multiple records." Recommended kill: remove this status entirely. Wilma detecting multiple records is an *action* that spawns N case objects, each entering at `intake_started`/`needs_record`/`triage_ready` independently. If you keep it as a status it smuggles the user-level concept back into the case machine - the exact thing the case-journey rewrite exists to prevent. **Decision owed: delete and replace with case-spawning, or define its OUT transitions explicitly.**

### Document preparation

**`draft_packet_started`**
IN: <- possible_pathway, <- needs_user_information · OUT: -> needs_user_information, -> draft_packet_generated
Clean. Note the legitimate loop with needs_user_information.

**`draft_packet_generated`**
IN: <- draft_packet_started · OUT: -> needs_partner_completeness_review, -> needs_attorney_legal_review, -> ready_for_user_review
Clean.

**`needs_user_information`**
IN: <- draft_packet_started, <- partner_requested_more_info, <- attorney_requested_more_info · OUT: -> draft_packet_started
Clean. Note: three things route in, only one routes out (back to form). Verify that is intended - a user who was bounced by an attorney returns to the *form*, then has to re-traverse review. Probably correct, but confirm the re-entry doesn't skip the review that bounced it.

### Review

**`needs_partner_completeness_review`**
IN: <- draft_packet_generated · OUT: -> partner_requested_more_info, -> needs_attorney_legal_review, -> ready_for_user_review
Clean. Note: completeness review exits to `ready_for_user_review`, NOT `ready_to_file`. Correct and UPL-critical. Keep it that way.

**`needs_attorney_legal_review`**
IN: <- record_received, <- possible_exclusion, <- draft_packet_generated, <- needs_partner_completeness_review · OUT: -> attorney_requested_more_info, -> ready_to_file, -> not_suitable_for_automated_packet
Gap. **The biggest functional gap.** Four documented inflows, including automatic ones (`possible_exclusion`, risk rules). But NO transition to the "no attorney available" path. Section 8 says an unstaffed case should become `legal_review_needed_but_unavailable`, but that transition does not exist in Section 5, and `legal_review_needed_but_unavailable` is not even in the Section 3 status list. **Cases will pile into an attorney queue that does not drain for any partner without configured legal review.** Required fix: a system-checked transition at routing time - if a case would enter `needs_attorney_legal_review` AND `legal_review_enabled = false` for that partner/workflow, route instead to `legal_review_needed_but_unavailable`, then onward to `referred_out` or `record_retrieval_only`. This check fires at routing time, not as prose. Decision: See Lawrence question 1.

**`partner_requested_more_info`**
IN: <- needs_partner_completeness_review · OUT: -> needs_user_information
Clean.

**`attorney_requested_more_info`**
IN: <- needs_attorney_legal_review · OUT: -> needs_user_information
Clean.

**`ready_for_user_review`**
IN: <- draft_packet_generated, <- needs_partner_completeness_review · OUT: -> ready_to_file
Connected, but the OUT lives in the Filing section, away from the review block. Easy to miss when implementing. Flagging for placement, not a logic gap.

**`ready_to_file`**
IN: <- needs_attorney_legal_review, <- ready_for_user_review · OUT: -> filed
Gap. Partial gap. My earlier draft had a bounce-back: something invalidates readiness and the case returns to `needs_case_details`/`needs_user_information`. The expanded version dropped it. **A `ready_to_file` case that turns out to be wrong has no way back.** Add a regression transition: ready_to_file -> needs_user_information (actor: user/partner/attorney). Real world: user notices a typo in the case number after the packet is marked ready.

**`not_suitable_for_automated_packet`**
IN: <- needs_attorney_legal_review, (<- possible_exclusion via Section 8 prose) · OUT: -> referred_out
Clean.

**`referred_out`**
IN: <- possible_exclusion, <- not_suitable_for_automated_packet, <- (unavailable-review path, once added) · OUT: Terminal none
Terminal - likely correct. **Confirm:** is a referred-out case truly done from RCAP's perspective, or can a referral come back (user returns having seen outside counsel)? If it can return, it needs OUT -> reopened. Mark intentional either way.

### Filing

**`ready_for_user_review`** - (audited above)

**`ready_to_file`** - (audited above)

**`filed`**
IN: <- ready_to_file · OUT: -> hearing_scheduled, -> waiting_for_court_response
Clean.

**`hearing_scheduled`**
IN: <- filed · OUT: -> waiting_for_court_response
Clean. Note: hearing_scheduled routes only to waiting_for_court_response, not directly to an outcome. Slightly indirect but defensible - a hearing happening doesn't equal an outcome recorded.

**`waiting_for_court_response`**
IN: <- filed, <- hearing_scheduled · OUT: -> outcome_granted, -> outcome_denied, -> outcome_partially_granted, -> outcome_unknown
Clean. Good fan-out to all four outcomes.

### Outcome

**`outcome_granted`**
IN: <- waiting_for_court_response · OUT: Terminal none
Terminal - correct.

**`outcome_denied`**
IN: <- waiting_for_court_response · OUT: -> refile_eligible_after_wait, -> closed_no_action
Clean.

**`outcome_partially_granted`**
IN: <- waiting_for_court_response · OUT: Gap **none**
Gap. Terminal with no exit, but a partial grant is exactly the case that should loop - granted part done, denied part may be refilable/appealable. Fix options: (a) partial grant spawns a new case for the unresolved portion (consistent with the case-spawning model recommended for multiple records), or (b) add OUT -> refile_eligible_after_wait / referred_out. Option (a) is cleaner. **Decision owed.**

**`outcome_unknown`**
IN: <- waiting_for_court_response · OUT: Gap **none documented**
Gap. My draft had outcome_unknown -> reopened when the user returns. The expanded version drops it. Since this is the *expected terminal state for a large share* of cases, decide deliberately: is it truly terminal, or can a returning user reopen it? If a user comes back six months later to report they filed and won, the case needs a way out of unknown. Add OUT -> reopened (actor: user). Decision: See Lawrence question 2 (this is also the outcome-verification question).

### Loop / regression

**`reopened`**
IN: <- refile_eligible_after_wait, (<- outcome_unknown / <- inactive, once added) · OUT: -> triage_ready
Clean exit. IN depends on resolving the gaps above.

**`refile_eligible_after_wait`**
IN: <- outcome_denied · OUT: -> reopened
Clean.

**`inactive`**
IN: Gap **none** · OUT: Gap **none**
Gap. In the status list, absent from all transitions. My draft had "any non-terminal -> inactive" past a dormancy threshold, and inactive -> reopened on return. The expanded version names the status but never wires it. Either wire it (system-triggered dormancy in, user-triggered reopen out) or delete it. **Decision owed.**

**`closed_no_action`**
IN: <- outcome_denied · OUT: Terminal none
Terminal - correct. But note it is currently only reachable from `outcome_denied`. Should a user be able to close a case at other points (abandons at needs_record, decides not to pursue)? Probably yes. Consider IN from multiple non-terminal statuses, user-triggered. Otherwise the only way to "close" a dormant case is `inactive`, which blurs the two.

---

## Part 2: Terminal status register

Mark each intentional so future readers don't "fix" a real terminal by adding phantom transitions.

| Status | Terminal? | Confirmed |
|---|---|---|
| `outcome_granted` | Yes | intended |
| `closed_no_action` | Yes | intended |
| `referred_out` | Maybe | confirm - can a referral return? |
| `outcome_unknown` | Probably not | likely needs -> reopened |
| `outcome_partially_granted` | No | needs spawn or -> refile path |
| everything else | No | should have an OUT |

---

## Part 3: Cross-cutting issues (not status-specific)

**C1 - `needs_case_details` vs `not_enough_information`.** Two statuses, one concept. Pick one, delete the other, or write the distinction explicitly. Leaving both guarantees inconsistent implementation.

**C2 - `record_source_status` field vs `record_received` status.** Same fact in two places, will drift. Make status authoritative or make the field authoritative; status derives from it. Decide which.

**C3 - self-report vs verified outcomes share a status.** `user_self_report` and `court_record_check` both land a case in `outcome_granted`. Section 9's honest-reporting promise depends on telling them apart. Recoverable because reporting can read `verified_status` on the outcome event, but confirm reporting always joins to it and never counts case status alone. Decision: See Lawrence question 2.

**C4 - `next_best_action` is undefined.** The single most user-facing field (Briefcase headline and partner dashboard headline) has no computation rule across multiple cases with conflicting statuses. User with one `ready_to_file` and one `needs_record` - which surfaces? **Required: a priority ordering of statuses.** Highest-priority unresolved case wins. Draft ordering to react to:

```text
1. ready_to_file            (closest to done, push it over the line)
2. partner_requested_more_info / attorney_requested_more_info (user is the blocker)
3. needs_user_information
4. needs_record / record_retrieval_in_progress
5. ready_for_user_review
6. draft_packet_started
7. filed / waiting_for_court_response (nudge outcome report)
8. possible_pathway
9. everything else
```

Without this, Briefcase and dashboard will compute different "next actions" and disagree with each other. Not a nice-to-have.

**C5 - launch readiness vs unstaffed review.** If a workflow's risk rules can auto-route to `needs_attorney_legal_review` but the partner has `legal_review_enabled = false`, should that workflow be allowed to go `live` at all? Strong argument that launch readiness should *refuse* live status for a workflow whose risk rules can reach a review tier the partner can't staff. One line in Section 7, closes a real liability hole. Decision: See Lawrence question 1.

**C6 - placement, not logic.** `ready_for_user_review -> ready_to_file` lives in the Filing section, away from the review block where a reader expects it. Reorganize so each status's exits are findable. Minor, but this is the document people implement from.

---

## Part 4: Decisions owed before build (the short list)

Mechanical fixes I can make without you: close the documented transition gaps (needs_record family, inactive, outcome_unknown->reopened, ready_to_file bounce-back), reorganize placement, add the next_best_action priority block.

Decisions that need you (and Lawrence on 1 and 2):

1. **Legal review unavailable routing + launch gate** (C5, `needs_attorney_legal_review` gap). When no attorney is configured, what is the exact route, and can a workflow with legal-review risk rules go live without a configured reviewer? This is the liability-shaped one. - *Lawrence*
2. **Outcome verification per state** (C3, `outcome_unknown` exit). Self-report only, or court-record check where available, and does a returning user reopen an unknown? Determines reporting integrity. - *Lawrence*
3. **`multiple_records_detected`: delete in favor of case-spawning, or define its exits?** Recommendation: delete. - *you*
4. **`outcome_partially_granted`: spawn a new case for the unresolved part, or add a refile transition?** Recommendation: spawn. - *you*
5. **`needs_case_details` vs `not_enough_information`: which survives?** - *you*
6. **`record_source_status` field vs status: which is authoritative?** - *you*
7. **`inactive` and `closed_no_action`: wire `inactive` or delete it; widen `closed_no_action` entry?** - *you*
8. **`referred_out`: terminal, or can it return?** - *you*

---

## Part 5: What passed clean

No action needed, do not re-litigate: the full object model and field lists, the completeness-vs-legal review split as separate statuses, the per-partner review configuration table, `legal_review_unavailable` as an explicit config state, the staleness sub-statuses and `verification_expires_at`, the Command Center event-emission list, the stage-specific safety language, and the 20A-20E build phasing. These are the strong spine. The fixes above are about making the machine *complete and non-contradictory*, not about rethinking the architecture.
