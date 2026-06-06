# RCAP Source of Truth — v2

**Record Clearing Access Program — Managed Case Journey Specification**

LegalEase Partner Journey OS · Version 2.1 · Owner: Roger Roman · Status: Governing build contract

Supersedes v1.0. This version folds in the eight rulings, the reconciliation punch list, and the v2.1 Section 6.1 amendment. Section 12 is the changelog.

---

## How to read this document

The **state machine** (Section 3) is the contract. Statuses, transitions, who triggers each, what each requires. When code and prose disagree, the state machine wins. When the state machine and reality disagree, the machine gets a version bump, not a quiet workaround.

The **object model** (Section 2) defines what carries state. The **narrative** (Sections 1, 4, 5) is context. The **open items** (Section 6) identify what still needs decision authority; everything else is ruled and buildable.

Core rule, stated once and never violated: **status lives on the case, not the user.** A user is a person. A case is one record in one jurisdiction. A user has one or more cases, each moving through the machine independently. The Briefcase is an aggregate view with no status of its own.

---

## 1. Core principle

RCAP is a self-help-first case-journey system, not a linear form funnel. The default flow is self-represented filing: a user prepares and files a record-clearing packet without attorney representation. Every user may have one or more cases and may file pro se. Each case has its own lifecycle, packet history, review tasks, filing events, and outcome tracking. The defining experiences are uncertainty, interruption, review, and follow-up: people do not know what happened in their case, do not have their record, have more than one case, land in an unsupported state, need a human, leave and come back, file or do not, and hear from the court months later or never. The product is built around those realities.

---

## 2. Core objects

### User
```
user_id, name, email, phone_optional, preferred_contact_method,
partner_id, briefcase_id, multi_record_user (bool), last_login_at,
created_at, updated_at
```
The user is never globally "eligible," "ready," or "blocked." Those are case facts.

### Briefcase
```
briefcase_id, user_id, partner_id, case_count, active_case_count,
next_best_action, last_activity_at
```
Aggregate view. Computes `next_best_action` across all cases by the priority ordering in Section 3.5.

### Case / Record
```
case_id, user_id, partner_id, workflow_id, jurisdiction, county, court,
case_number, offense_type, case_outcome, disposition_date,
current_status, record_source_status, blocker_type, review_status,
filing_status, outcome_status, closure_reason,
parent_case_id (nullable), spawn_reason (nullable),
reopened_at, refile_eligible_after, last_activity_at,
created_at, updated_at
```
`current_status` is authoritative for workflow movement. `record_source_status` is metadata only (ruling 6). `parent_case_id` + `spawn_reason` link spawned cases to their origin (see 2.1).

### Packet
```
packet_id, case_id, packet_type, draft_status, review_status,
pdf_status, download_status, filing_status, created_at, updated_at
```
A case may have more than one packet over time.

### Review Task
```
task_id, case_id, partner_id, assigned_to, review_authority, task_type,
priority, status, notes, visible_to_user, created_at, due_at, completed_at
```
`review_authority` distinguishes administrative/completeness review from legal-sufficiency review (Section 4.3). `partner_follow_up` is a task status here, never a case status (ruling 1).

### Filing Event
```
filing_event_id, case_id, packet_id, filed_by, filed_date,
filed_location, hearing_date, court_response_status, notes,
created_at, updated_at
```

### Outcome Event
```
outcome_event_id, case_id, outcome_status, outcome_source,
verification_status, reported_by, reported_date, verification_source,
notes, created_at, updated_at
```
`outcome_source`: `user_self_report`, `partner_report`, `attorney_report`, `court_record_check`, `unknown`.
`verification_status`: `unverified`, `partner_confirmed`, `attorney_confirmed`, `court_verified`.
Case status alone never drives outcome reporting; reports always join to source and verification (ruling 2, Section 9).

### 2.1 Spawned cases (rulings 3 and 4)

Some cases are spawned from others. `parent_case_id` points to the origin; `spawn_reason` records why.

- **`multi_record_split`** — Wilma detects multiple records at intake and spawns one case per record. Children enter **fresh** at `intake_started` / `needs_record` / `triage_ready`. These are genuinely new matters; `parent_case_id` is null for split cases (they are siblings, not children), and `multi_record_user` is set true on the User.
- **`partial_grant_followup`** — A partial grant spawns a child case for the unresolved portion. The child enters through **`reopened`** then `triage_ready`, because the matter already has filing history. `parent_case_id` points to the partially-granted case.

Rule of thumb: brand-new matters enter fresh; continuations enter through `reopened`.

---

## 3. The state machine (the contract)

### 3.1 Case statuses

Intake and record readiness:
```
intake_started
needs_record
needs_case_details
record_retrieval_in_progress
record_received
```
Triage:
```
triage_ready
possible_pathway
possible_exclusion
unsupported_jurisdiction
```
Document preparation:
```
draft_packet_started
draft_packet_generated
needs_user_information
```
Review:
```
needs_partner_completeness_review
needs_attorney_legal_review
legal_review_needed_but_unavailable
partner_requested_more_info
attorney_requested_more_info
ready_for_user_review
ready_to_file
not_suitable_for_automated_packet
referred_out
```
Filing:
```
filed
hearing_scheduled
waiting_for_court_response
```
Outcome:
```
outcome_granted
outcome_denied
outcome_partially_granted
outcome_unknown
```
Loop / regression / closure:
```
reopened
refile_eligible_after_wait
inactive
closed_no_action
```

**Removed in v2:** `not_enough_information` (folded into `needs_case_details`, ruling 5) and `multiple_records_detected` (now a Wilma intake event that spawns cases, not a status, ruling 3).
**Added in v2:** `legal_review_needed_but_unavailable` (case status, ruling 1). Note `partner_follow_up` is a *task* status, not listed here.

### 3.2 Terminal status register

| Status | Terminal? |
|---|---|
| `outcome_granted` | Terminal |
| `outcome_partially_granted` | Terminal for the original case; spawns a child (2.1) |
| `closed_no_action` | Terminal |
| `referred_out` | Terminal by default, reopenable via `reopened` (ruling 8) |
| `outcome_unknown` | Resting state, reopenable via `reopened` (ruling 2) |
| everything else | Non-terminal; has at least one OUT |

### 3.3 Transitions

Actors: System (automated rule), Wilma (intake logic), User, Partner (staff, non-attorney unless noted), Attorney (licensed reviewer per 6.1).

Intake:
| From | To | Trigger | Actor |
|---|---|---|---|
| (none) | `intake_started` | Arrived via partner page, started Wilma | User |
| `intake_started` | `needs_record` | No disposition/case number/court/county/record | Wilma/User |
| `intake_started` | `needs_case_details` | Has record, specific fields missing | Wilma/User |
| `intake_started` | `unsupported_jurisdiction` | Jurisdiction not served | Wilma/System |
| `intake_started` | `triage_ready` | Enough basic detail to run pathway logic | Wilma/System |

Record readiness:
| From | To | Trigger | Actor |
|---|---|---|---|
| `needs_record` | `record_retrieval_in_progress` | Opens checklist / confirms working on it | User/System |
| `needs_record` | `closed_no_action` | Intentional closure with reason | User/Partner/System |
| `record_retrieval_in_progress` | `record_received` | Enters/uploads record info | User/Partner |
| `record_received` | `triage_ready` | Enough detail available | System/Wilma |
| `record_received` | `needs_case_details` | Record present, specific fields still missing | System |
| `record_received` | `possible_exclusion` | Retrieved record reveals exclusion/high-risk | System/Partner/Attorney |
| `record_received` | `needs_attorney_legal_review` | Retrieved record creates legal uncertainty | System/Partner |
| `needs_case_details` | `triage_ready` | Missing fields supplied | User/System/Wilma |
| `needs_case_details` | `record_retrieval_in_progress` | User goes to retrieve the missing record | User/System |
| `needs_case_details` | `closed_no_action` | Intentional closure with reason | User/Partner/System |

Triage:
| From | To | Trigger | Actor |
|---|---|---|---|
| `triage_ready` | `possible_pathway` | Workflow logic finds a path | System |
| `triage_ready` | `possible_exclusion` | Workflow logic finds an exclusion | System |
| `triage_ready` | `needs_case_details` | Required details still missing | System |
| `possible_pathway` | `draft_packet_started` | User starts form | User |
| `possible_pathway` | `closed_no_action` | Intentional closure with reason | User/Partner/System |
| `possible_exclusion` | `needs_attorney_legal_review` | Legal review configured | System |
| `possible_exclusion` | `legal_review_needed_but_unavailable` | Legal review required, none configured (3.4) | System |
| `possible_exclusion` | `referred_out` | Issue outside automated workflow | System/Partner |
| `possible_exclusion` | `closed_no_action` | Intentional closure with reason | User/Partner/Attorney |
| `unsupported_jurisdiction` | `triage_ready` | Jurisdiction later goes live; demand re-engaged | System |
| `unsupported_jurisdiction` | `closed_no_action` | User declines update list / intentional closure | User/Partner/System |

Document preparation:
| From | To | Trigger | Actor |
|---|---|---|---|
| `draft_packet_started` | `needs_user_information` | Required fields missing | System |
| `draft_packet_started` | `draft_packet_generated` | Packet generated | System |
| `draft_packet_started` | `closed_no_action` | Intentional closure with reason | User/Partner/System |
| `needs_user_information` | `draft_packet_started` | User resumes form | User |
| `draft_packet_generated` | `needs_partner_completeness_review` | Workflow/partner settings require it | System |
| `draft_packet_generated` | `needs_attorney_legal_review` | Workflow risk rules require it | System |
| `draft_packet_generated` | `legal_review_needed_but_unavailable` | Legal review required, none configured (3.4) | System |
| `draft_packet_generated` | `ready_for_user_review` | Low-risk self-guided workflow | System |

Review:
| From | To | Trigger | Actor |
|---|---|---|---|
| `needs_partner_completeness_review` | `partner_requested_more_info` | Missing/inconsistent info found | Partner |
| `needs_partner_completeness_review` | `needs_attorney_legal_review` | Partner identifies legal issue | Partner |
| `needs_partner_completeness_review` | `legal_review_needed_but_unavailable` | Legal issue, no legal review configured (3.4) | Partner/System |
| `needs_partner_completeness_review` | `ready_for_user_review` | Completeness passes (NOT legal sufficiency) | Partner |
| `partner_requested_more_info` | `needs_user_information` | User must update form/provide record | Partner/System |
| `needs_attorney_legal_review` | `attorney_requested_more_info` | Attorney needs more detail | Attorney |
| `needs_attorney_legal_review` | `ready_to_file` | Attorney clears legal sufficiency | Attorney |
| `needs_attorney_legal_review` | `not_suitable_for_automated_packet` | Attorney determines packet inappropriate | Attorney |
| `attorney_requested_more_info` | `needs_user_information` | User must provide more detail | Attorney/System |
| `legal_review_needed_but_unavailable` | `referred_out` | Referral path configured (3.4) | System/Partner |
| `legal_review_needed_but_unavailable` | (hold; `partner_follow_up` task created) | No referral path; partner follow-up task spawned (3.4) | System |
| `legal_review_needed_but_unavailable` | `closed_no_action` | Intentional closure with reason | User/Partner/System |
| `not_suitable_for_automated_packet` | `referred_out` | Referral path provided | Partner/Attorney/System |
| `ready_for_user_review` | `ready_to_file` | User confirms packet reviewed + instructions viewed | User/System |
| `ready_to_file` | `filed` | Packet reported filed | User/Partner/Attorney |
| `ready_to_file` | `needs_user_information` | Readiness invalidated (e.g. error found) | User/Partner/Attorney |
| `ready_to_file` | `closed_no_action` | Intentional closure with reason | User/Partner/System |
| `referred_out` | `reopened` | User returns / referral sends back / workflow available | User/Partner/Attorney |

Filing:
| From | To | Trigger | Actor |
|---|---|---|---|
| `filed` | `hearing_scheduled` | Hearing date entered | User/Partner/Attorney |
| `filed` | `waiting_for_court_response` | Filed, no hearing date or outcome yet | System |
| `hearing_scheduled` | `waiting_for_court_response` | Hearing completed/pending response | User/Partner/Attorney |

Outcome:
| From | To | Trigger | Actor |
|---|---|---|---|
| `waiting_for_court_response` | `outcome_granted` | Relief granted (any source; verification recorded) | User/Partner/Attorney/System |
| `waiting_for_court_response` | `outcome_denied` | Denial reported | User/Partner/Attorney/System |
| `waiting_for_court_response` | `outcome_partially_granted` | Some relief granted; spawns child (2.1) | User/Partner/Attorney/System |
| `waiting_for_court_response` | `outcome_unknown` | Follow-up window expires, no response | System |
| `outcome_denied` | `refile_eligible_after_wait` | Denial allows refiling after wait | Attorney/Partner/System |
| `outcome_denied` | `closed_no_action` | Denial final / user stops | User/Attorney/Partner |
| `outcome_unknown` | `reopened` | User returns / partner reaches person / later check (ruling 2) | User/Partner/System |
| `refile_eligible_after_wait` | `reopened` | Wait ends or user returns | System/User/Partner |

Loop / regression / closure:
| From | To | Trigger | Actor |
|---|---|---|---|
| `reopened` | `triage_ready` | Case reassessed | System/Wilma/Partner |
| `reopened` | `outcome_granted` / `outcome_denied` / `outcome_partially_granted` | Returned info already complete (audit event preserved) | User/Partner/Attorney |
| any non-terminal | `inactive` | No activity past dormancy threshold | System |
| `inactive` | `reopened` | User returns / partner re-engages / new activity | User/Partner/System |

### 3.4 Legal-review-unavailable routing (ruling 1)

Checked by the system at the moment an out-of-footprint case would enter any legal-review status:
```
if legal_review_required and not legal_review_enabled:
    if referral_path_configured:
        -> legal_review_needed_but_unavailable -> referred_out
    else:
        -> legal_review_needed_but_unavailable
           + create partner_follow_up task (case holds at this status)
```
The case status stays honest ("needs legal review, none configured for this jurisdiction/scope") while the `partner_follow_up` *task* drives non-legal next steps and referral support. `partner_follow_up` is never a case status. `legal_review_needed_but_unavailable` is out-of-footprint only: it applies when legal review is required and no LegalEase contracted jurisdiction-licensed attorney is configured for that operating state/scope. Inside MS / IL / DC, `legal_review_needed_but_unavailable` should not fire because LegalEase staffs a contracted attorney in each operating state. Do not build a partner-follow-up queue expecting it to carry volume.

**Launch-readiness gate (binding):** a partner/workflow cannot go `live` unless every legal-review route its risk rules can reach has one of: (1) licensed legal review configured, (2) a referral path configured, or (3) a partner follow-up path explicitly approved as non-legal support. This stops `partner_follow_up` from becoming a fake legal-review queue and stops cases piling into a queue that cannot drain.

### 3.5 `next_best_action` priority ordering

The Briefcase headline and partner dashboard headline both compute next action by walking the user's cases and surfacing the highest-priority unresolved case. Both consumers use this one ordering so they never disagree:
```
1. ready_to_file                  (closest to done — push it over)
2. partner_requested_more_info / attorney_requested_more_info  (user is the blocker)
3. needs_user_information
4. needs_record / record_retrieval_in_progress / needs_case_details
5. ready_for_user_review
6. draft_packet_started
7. filed / hearing_scheduled / waiting_for_court_response  (nudge outcome report)
8. possible_pathway
9. everything else
```
Terminal and resting states (`outcome_granted`, `closed_no_action`, `referred_out`, `outcome_unknown`, `inactive`) do not generate a next action unless reopened.

### 3.6 What powers off status

One source. Briefcase timeline, partner dashboard queues, Command Center, and reports all read case status. If a number appears in a report it traces to a case status (with outcome numbers additionally joined to outcome source + verification, Section 9). No parallel counting logic.

---

## 4. End-user experience

### 4.1 Entry, intake, record retrieval

Partner page `/p/[partnerSlug]` does not imply same-day clearing: "Start here to understand what information you may need, whether a possible pathway may exist, and what next step makes sense." CTA: Start with Wilma.

Wilma `/intake/[partnerSlug]` carries an "I'm not sure" branch on every major question. "I'm not sure" sets `needs_record` or `needs_case_details` and produces a real next step. Wilma may provide Initial Screening / Possible Match based on configured workflow facts and risk flags; Wilma does not make a final eligibility determination, give legal advice, or decide whether the user should file. Clear no's stop the packet or refer out at intake; uncertain maybes route to the Attorney checkpoint. When Wilma detects multiple records it fires the `multiple_records_detected` intake event, which spawns one case per record (2.1) — it is not a status.

Record retrieval is a first-class stage at `/records/[partnerSlug]` or `/briefcase/record-help`, user-facing status **Needs Record**. It answers: what record do I need (RAP sheet, docket, disposition, arrest record, summary), where to get it, what to look for, what to enter/upload on return, what if I don't know the county, what if I have more than one case.

### 4.2 Form, packet, multi-record

Form `/documents/[partnerSlug]/form` prefills from Wilma (state, county, case type, possible outcome, pathway, missing info, record readiness, contact). "We saved what you already shared." The intake-to-form handoff carries state; re-asking loses people.

Multi-record is the norm: User > Cases > Packets > Filing > Outcome. Briefcase shows each case with its own status.

Packet `/documents/[partnerSlug]/[packetId]` is labeled **Draft packet**. Hedging calibrates by stage: action-first at intake, sober and prominent at the packet (the artifact that enters a courthouse).

### 4.3 Review authority (UPL-critical)

**Administrative Completeness Check** (trained partner/LegalEase staff): check fields filled, signatures present, documents attached, case number present, county matches workflow; request missing info; mark incomplete; route to legal review. May NOT determine eligibility, recommend filing, approve legal sufficiency, interpret legal consequences, tell the user whether they should file, or file for the user. Status: `needs_partner_completeness_review`, exits to `ready_for_user_review`, never directly to `ready_to_file`.

**Attorney checkpoint / Legal-Sufficiency Review** (LegalEase contracted jurisdiction-licensed attorney): review-and-clear, not review-and-file. The reviewer may review legal sufficiency, assess eligibility within the configured scope, flag risk, request more information, determine the packet inappropriate, or clear the packet for the user's own review and filing decision. The attorney does not file for the user and does not represent the user in court. Status: `needs_attorney_legal_review`, the only review that exits to internal status `ready_to_file`.

**No attorney available** is an explicit out-of-footprint configuration, never a hopeful default. Routed per 3.4. User-facing: this record may need a licensed professional before filing; the program does not currently have legal review available for this jurisdiction/scope, but can show referral options or help gather information.

### 4.4 Briefcase and outcome loop

Briefcase is a timeline answering "what do I need to do next?", not a document locker. Contents: saved intake, form progress, record checklist, packets, filing instructions, partner notes visible to user, next action, filing status, outcome follow-up.

User-facing `ready_to_file` surfaces as **Filing Guidance**. This is procedural, self-help language: the user can review filing instructions and decide whether to file pro se. It does not mean RCAP, Wilma, partner staff, LegalEase staff, or an attorney has filed or will file for the user.

Filing instructions per workflow cover where/how to file, court/agency, copies, service, notarization, fees, fee waivers, what happens after, when legal review helps.

Post-filing loop asks did you file, when, where, hearing date, response, granted/denied/partial/waiting, need help. The follow-up lives primarily in the partner's task queue; automated nudges are secondary. `outcome_unknown` is the expected resting state for a large share and is reopenable (ruling 2). Reporting honesty is enforced in Section 9.

---

## 5. Partner and internal layers

### 5.1 Partner workflow and dashboard

Request pilot > onboarding > workflow assigned > launch readiness checked > public link activated > users start > partner sees blockers/review queue > partner helps users move > partner tracks filing/outcomes > weekly/final reports.

Dashboard primary question: **who needs help today?** Queues: Needs Record, Needs Case Details, Needs Review (Administrative Completeness Check vs Attorney checkpoint), Legal Review Unavailable / Partner Follow-up, Draft Packet, Filing Guidance, Outcome Follow-up. Partner staff can flag, note, request info, tell user to pull records, complete Administrative Completeness Check within their tier, refer out, close with reason, and route legal issues to the attorney checkpoint.

Allowed modules: Wilma Intake, RecordShield, Expungement.ai, Partner Dashboard, Weekly Reports, Final Impact Report. Not StartApart or ClaimCoach.

### 5.2 Launch readiness and staleness

Provisioned and Live are separate. Partner statuses: `provisioned`, `onboarding_incomplete`, `payment_pending`, `workflow_assigned`, `launch_readiness_pending`, `launch_ready`, `live`, `paused`, `expired_verification`.

Workflow verification fields: `source_materials_present`, `forms_present`, `wilma_logic_ready`, `record_retrieval_instructions_ready`, `document_generator_ready`, `filing_next_steps_ready`, `review_authority_configured`, `verifier_passed`, `last_verified_at`, `verification_expires_at`, `staleness_status` (`fresh` / `verify_soon` / `stale` / `blocked`).

Readiness is recurring, not a launch-day stamp. Date-dependent facts (e.g. Illinois Clean Slate future-dating) get a re-verify trigger. The legal-review launch gate (3.4) is part of readiness.

### 5.3 Command Center

Master layer tracking partners, workflows, users, cases, packets, review tasks, blockers, reports, outcomes. Answers which partners are live/blocked, which workflows are launch-ready/stale, which users are stuck, which packets need review, which outcomes need follow-up, which reports are due. Emits events: `case_status_changed`, `case_spawned`, `packet_generated`, `review_task_created`, `record_needed`, `unsupported_jurisdiction_requested`, `partner_review_completed`, `legal_review_unavailable`, `filing_reported`, `outcome_reported`, `workflow_verification_expired`. Phase 20 connects this to the existing LegalEase Command Center; until connected and verified, RCAP is not displayed as live.

---

## 6. Open items (Lawrence)

Structure is ruled and buildable. Section 6.1 is resolved by the v2.1 amendment. Sections 6.1b and 6.2 remain open, and the model is built to absorb the answers without rework.

**Legal authority of record for 6.1:** Lawrence Blackmon, licensed attorney (Mississippi), co-founder/CEO of LegalEase, approved the review-authority framework, attorney-checkpoint model, disqualification and escalation logic, and user-facing disclaimer copy on **2026-06-05**, with Roger Roman (COO) present. Roger Roman approved the product implementation of the attorney-checkpoint flow on the same date. Written approval captured in `RCAP_V2_1_SECTION_6_1_AMENDMENT.md`: "Reviewed and approved — Lawrence Blackmon, 2026-06-05."

### 6.1 Legal review authority and self-help boundary — RESOLVED

RCAP is a **self-help-first** system. The default flow is self-represented filing: a user prepares and files a record-clearing packet without attorney representation. This is grounded in the right to self-representation (28 U.S.C. § 1654) and the established space for self-help legal materials, forms, and software, provided they clearly disclaim being a substitute for attorney advice (cf. Tex. Gov't Code § 81.101; ABA Model Rule 5.5 framing of the practice-of-law line). The mantra: help people handle non-complex record-clearing matters on their own, without an attorney.

The system distinguishes four layers of authority, and **only licensed legal review** may be labeled attorney-reviewed, legally sufficient, eligible, qualified, or cleared to file:

| Layer | Safe label | What it means |
|---|---|---|
| Wilma | Initial Screening / Possible Match | User's answers may match basic criteria for a possible pathway |
| User | Self-Represented Filing Option | User may choose to prepare and file a self-help packet |
| Partner staff | Administrative Completeness Check | Staff may check that fields, signatures, and documents appear present |
| Attorney | Legal-Sufficiency Review | Licensed jurisdiction attorney reviews eligibility/legal adequacy within scope |

**Core rule:** the user's right to self-representation belongs to the user. It does not transfer legal decision-making authority to Wilma, LegalEase, or nonlawyer partner staff.

**Attorney checkpoint, review-and-clear (not review-and-file).** When a case is flagged for attorney review, it routes to LegalEase's contracted jurisdiction-licensed attorney. The attorney **reviews and clears** the case back into the self-help flow, or determines it is not suitable for an automated self-help packet. The attorney does **not** file for the user and does not represent the user in court. The user who proceeds after clearance is still filing pro se, with an attorney checkpoint behind them. This preserves the self-representation framing end to end.

Attorney review is the **edge case, not the norm.** Wilma filters obvious no's out at intake; the attorney reviews uncertain maybes; clean self-help cases keep moving without ever touching the attorney queue.

#### 6.1.1 Wilma disqualification at intake (clear no's)

Wilma stops the self-help packet and refers out (or routes to a hold/return-later path) when the user reports any of the following. These are filtered at intake, **not** sent to attorney review — sending clear ineligibilities to the attorney would defeat the self-help-first posture by flooding the checkpoint.

| Intake condition | Action |
|---|---|
| Federal case | No state packet; refer out |
| Unsupported state/jurisdiction | Refer out or waitlist (`unsupported_jurisdiction`) |
| Pending criminal charge where the workflow requires none | Stop packet; refer or explain unavailable |
| Current incarceration/probation/parole/supervision where completion is required | Stop packet or hold until completion (see 6.1b) |
| Sex offense / registration-related offense where excluded | Stop packet; refer out |
| Violent offense where excluded | Stop packet; refer out |
| DV / weapons / DUI / other category excluded by state law | Stop packet; refer out |
| Waiting period clearly not satisfied | Stop packet or return-later path (see 6.1b) |
| User seeking immigration / firearm / licensing / custody advice | Refer out |
| User wants the attorney to represent them, appear at a hearing, or argue contested issues | Refer out or route to representation inquiry |

#### 6.1.2 Wilma routes to attorney checkpoint (uncertain maybes)

Routes to `needs_attorney_legal_review` (LegalEase contracted attorney) when:

| Intake condition | Why review is needed |
|---|---|
| Disposition unclear | Eligibility turns on legal meaning of the disposition |
| Charge category unclear | Attorney must classify the offense |
| Multiple cases or mixed outcomes | Sequencing and eligibility judgment needed |
| User's answers conflict with uploaded records | Needs human judgment |
| Possibly eligible but edge-case facts | Checkpoint appropriate |
| Wilma/staff confidence low | Over-escalate rather than under-flag |
| User asks a legal-advice question during intake | Attorney or referral needed |

**Default direction under uncertainty: escalate.** Self-help-first sets the default, but the standing instruction when a case is ambiguous is to flag it, not to keep it on the self-help rail. An over-inclusive checkpoint is safe (the attorney reviews something that turns out simple); an under-inclusive one is the UPL risk (a complex case self-helps when it should not have). The escalation list errs toward flagging.

#### 6.1.3 State machine mapping

The disqualification and escalation logic maps onto existing v2 statuses; no new review statuses are introduced:

- Clear no → `not_suitable_for_automated_packet` or `referred_out`
- Out of footprint → `unsupported_jurisdiction` or `referred_out`
- Uncertain maybe → `needs_attorney_legal_review` → (attorney clears) `ready_to_file` / surfaced as "Filing Guidance" → or (attorney declines) `not_suitable_for_automated_packet` → `referred_out`
- Clean self-help → `possible_pathway` → `draft_packet_started` → `draft_packet_generated` → `ready_for_user_review`

**`legal_review_needed_but_unavailable` shrinks to out-of-footprint-only.** This status and the `partner_follow_up` task fallback (ruling 1) existed for the case where review had nowhere to go. That case is now answered inside the operating footprint: LegalEase staffs a contracted attorney in each operating state, so review always has a destination. Inside MS / IL / DC, `legal_review_needed_but_unavailable` should not fire. It remains only for any future operation in a state where no attorney is contracted. Do not build a partner-follow-up queue expecting it to carry volume.

### 6.1b — NEW OPEN THREAD: the "eligible later" hold state

Two disqualification rows above are not true no's — they are not-yet's:

- supervision/probation/parole not yet complete (eligible once complete)
- waiting period not yet satisfied (eligible once it elapses)

The current machine has no clean status for "you are not eligible today but will be on a known future date." `referred_out` is wrong (the user belongs in RCAP, just later). `not_suitable_for_automated_packet` is wrong (it may be perfectly suitable later). `needs_record` is close but describes a missing document, not a time gate. `refile_eligible_after_wait` exists but is currently scoped to post-denial refiling, not pre-filing waiting periods.

**Decision owed (product, not legal):** either extend `refile_eligible_after_wait` semantics to cover pre-filing time gates, or add a dedicated `eligible_after_date` hold status carrying the target date, the reason (supervision completion vs. statutory wait), and a return-later prompt. Recommendation: a dedicated hold status, because conflating pre-filing waits with post-denial refiles will muddy reporting and the Briefcase timeline. Small, isolated, does not block the copy commit.

**6.2 Outcome verification per state.** Whether court records are searchable for `court_record_check`, whether partners can confirm, whether users can upload orders, and which sources count as authoritative for funder reporting. The model already supports all sources and verification levels (Section 2, 9); Lawrence rules which are authoritative where.

---

## 7. State workflow model

Universal to the user, state-specific underneath. Each built from actual source materials.

**Mississippi** — non-conviction/dismissed, misdemeanor conviction, felony conviction; certificate of service; proposed order placeholder; filing instructions.
**Illinois** — expungement vs sealing; outcome-first logic (so the `needs_record`/`needs_case_details` branches matter most here); supervision/qualified probation; sealing exclusions; RAP sheet readiness; county/circuit filing; Cook County district/same-day fee note; Clean Slate future-dated, re-verify per 5.2.
**DC** — DC-specific materials and forms.
**Pennsylvania** — PA-specific materials; migration status open (confirm shared table vs own migration before launch readiness).
**Harris County, Texas** — custom Harris County, not generic Texas; migration status open (same).

---

## 8. Build sequence

**20A — State-machine foundation.** Case-level statuses, transition constants, status labels, event names, this spec file, and copy updates reflecting case journey over one-shot packets. Includes the two new statuses, the two removed statuses, and `parent_case_id`/`spawn_reason`.
**20B — Uncertainty and record retrieval.** "I don't know / I don't have this" branches, `needs_record`/`needs_case_details`, state-specific retrieval guidance, Briefcase Needs Record state, multi-record case spawning.
**20C — Briefcase timeline.** Case-level timeline, multiple cases, `next_best_action` via 3.5.
**20D — Partner review queue.** Completeness vs legal split, review queue statuses, legal-review-unavailable handling (3.4), launch gate.
**20E — Command Center adapter.** Expose partner/workflow/case/packet/review/report status read-only first; track stale workflows and launch readiness.

Do not build the review layer (20D) beyond the resolved v2.1 authority boundaries until 6.1b and 6.2 are resolved where they affect workflow launch readiness.

---

## 9. Reporting rules

Activity: intakes_started, records_added, packets_generated, packets_downloaded, users_returned.
Support: users_needing_record_help, cases_needing_partner_review, cases_needing_attorney_review, cases_legal_review_unavailable, cases_referred_out, unsupported_jurisdiction_requests.
Filing: packets_reported_filed, hearings_reported, court_responses_reported.
Outcome: outcomes_reported, outcome_response_rate, reported_grants, reported_denials, reported_partial_grants, outcome_unknown.

Outcome reporting always joins case status to `outcome_source` and `verification_status`. Funder-facing language: "Of cases with reported outcomes, X were granted relief." Never "X% of all generated packets resulted in relief" unless verified outcome data supports it. `outcome_unknown` is reported as expected, not as failure.

---

## 10. Pricing and unit economics

Track all three units now; decide pricing later: `people_served` (partner/funder story), `cases_addressed` (operational workload), `packets_generated` (product usage/cost). Multi-record support means cases/person grows, so pricing must not be silently user-only. Possible model: base partner fee + included people + included cases + overage for additional packets or review volume.

---

## 11. Stage-specific safety language

Intake/Wilma: action-first, warm. "That's okay. Your next step is to get your case information. I'll save your progress." Note: "This is not legal advice, and a record review may still be needed."
Record retrieval: practical. "Look for the case number, court, charge, outcome, and date the case ended."
Packet preview: sober, prominent. "This is a draft packet based on the information provided. Do not file it until you have reviewed the instructions carefully. If anything is missing, unclear, or incorrect, get help from the partner or a qualified legal professional before filing."
Filing instructions: clear, careful. "Your next procedural step is to file with the court listed below. Filing does not guarantee relief. The court may request more information, schedule a hearing, deny the request, or grant only part of the request."

Approved v2.1 copy, true in all operating jurisdictions and shipped where true:

**Initial screening (Wilma):** "Based on your answers, this case may match initial screening criteria for a record-clearing pathway. You may continue preparing a self-help packet if you choose. This is not a final eligibility decision, legal advice, or a guarantee that a court will grant your request."

**Administrative completeness (partner staff):** "Partner staff may check whether required fields, documents, and signatures appear to be present. Staff cannot determine legal eligibility, approve legal sufficiency, or tell you whether you should file."

**Self-represented filing option:** "You may choose to file on your own without an attorney. Staff can help with administrative completeness, but staff cannot tell you whether you are eligible or whether you should file."

**Attorney checkpoint (surfaces only on a flagged case, not standing copy):** "Before filing, this case will be reviewed by a licensed attorney in your state. The attorney will review it for legal sufficiency and either clear it for you to file on your own, or let you know it needs more than a self-help packet." Renders **only** once a case has entered `needs_attorney_legal_review` — never as a promise on every case.

**Filing label:** `ready_to_file` (internal status) surfaces to the user as **"Filing Guidance"**, never a bare "Ready to File," because even an attorney-cleared case is the user choosing to file pro se, not the attorney filing for them.

---

## 12. Changelog

### v2.0 -> v2.1

Open item 6.1 resolved. Adopted self-help-first model with attorney-checkpoint (review-and-clear, not review-and-file) routing to LegalEase's contracted jurisdiction-licensed attorney. Added Wilma intake disqualification logic (6.1.1) and attorney-escalation logic (6.1.2), mapped onto existing statuses (6.1.3). Shrank `legal_review_needed_but_unavailable` to out-of-footprint-only. Approved user-facing copy. Flagged new open thread 6.1b (pre-filing "eligible later" hold state — product decision, non-blocking). Legal authority: Lawrence Blackmon, 2026-06-05; written approval captured in the v2.1 amendment. 6.1a (per-jurisdiction attorney availability) is subsumed: LegalEase contracts an attorney in each operating state, so availability is answered at the LegalEase level rather than per partner.

### v1.0 -> v2.0

Folded in all eight rulings and the reconciliation punch list:

1. **Legal review unavailable** — added `legal_review_needed_but_unavailable` (case status) and `partner_follow_up` (task status). Wired the per-partner config branch (3.4): referral path first, partner-follow-up fallback. Added binding launch-readiness gate blocking live status for unstaffed legal-review routes.
2. **Outcome verification** — added `outcome_source` and `verification_status` to the Outcome Event; reporting now always joins to both. Added `outcome_unknown -> reopened`.
3. **`multiple_records_detected`** — removed as a case status; now a Wilma intake event that spawns one case per record (sibling cases, fresh entry).
4. **`outcome_partially_granted`** — kept as terminal-honest for the original case; spawns a `partial_grant_followup` child case entering through `reopened`.
5. **`not_enough_information`** — removed; folded into `needs_case_details`. Documented the `needs_record` vs `needs_case_details` distinction.
6. **`record_source_status`** — demoted to metadata; `current_status` is authoritative for movement.
7. **`inactive` / `closed_no_action`** — `inactive` now fully wired (any non-terminal in, reopened out). `closed_no_action` entry widened to many non-terminal statuses; `closure_reason` required.
8. **`referred_out`** — terminal by default, reopenable via `reopened`.

Additional reconciliation fixes from the punch list: closed the `needs_case_details`/`unsupported_jurisdiction`/`ready_to_file` transition gaps; added the `ready_to_file -> needs_user_information` regression; added `parent_case_id` + `spawn_reason` to the Case object to link spawned cases; defined `next_best_action` priority ordering (3.5); added the terminal status register (3.2).

---

## 13. Source-of-truth sentence

RCAP is a self-help-first, partner-managed record-clearing journey system where each user may have multiple cases, each case moves through its own state machine, and every blocker, review task, packet, filing event, and outcome feeds the Partner Dashboard and the LegalEase Command Center — with status living on the case, review authority split between Administrative Completeness Check and Attorney checkpoint, user-facing filing readiness surfaced as Filing Guidance, and outcome reporting always honest about its source.
