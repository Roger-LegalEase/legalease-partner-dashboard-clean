# RCAP v2.1 Amendment — Section 6.1 Resolved

**Applies to:** `docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md` (committed 506e3e3)  
**Version bump:** 2.0 → 2.1  
**Nature:** Open item 6.1 closed. Review-authority model resolved, escalation logic added, user-facing copy approved. One small new open thread (6.1b) flagged.

**Legal authority of record:** Lawrence Blackmon, licensed attorney (Mississippi), co-founder/CEO of LegalEase, approved the review-authority framework, the attorney-checkpoint model, the disqualification and escalation logic, and the user-facing disclaimer copy on **2026-06-05**, with Roger Roman (COO) present. Roger Roman approved the product implementation of the attorney-checkpoint flow on the same date.

**Written approval:** Reviewed and approved — Lawrence Blackmon, 2026-06-05.

**Dashboard copy approval:** Reviewed and approved — Lawrence Blackmon, 2026-06-06. Applies to the We Must Vote dashboard copy using Initial Screening / Possible Match, Self-Represented Filing Option, Administrative Completeness Check, Filing Guidance, and Outcome Follow-Up language.

---

## Replaces Section 6.1 in the committed spec

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

### 6.1.1 Wilma disqualification at intake (clear no's)

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

### 6.1.2 Wilma routes to attorney checkpoint (uncertain maybes)

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

### 6.1.3 State machine mapping

The disqualification and escalation logic maps onto existing v2 statuses; no new review statuses are introduced:

- Clear no → `not_suitable_for_automated_packet` or `referred_out`
- Out of footprint → `unsupported_jurisdiction` or `referred_out`
- Uncertain maybe → `needs_attorney_legal_review` → (attorney clears) `ready_to_file` / surfaced as "Filing Guidance" → or (attorney declines) `not_suitable_for_automated_packet` → `referred_out`
- Clean self-help → `possible_pathway` → `draft_packet_started` → `draft_packet_generated` → `ready_for_user_review`

**`legal_review_needed_but_unavailable` shrinks to out-of-footprint-only.** This status and the `partner_follow_up` task fallback (ruling 1) existed for the case where review had nowhere to go. That case is now answered inside the operating footprint: LegalEase staffs a contracted attorney in each operating state, so review always has a destination. Inside MS / IL / DC, `legal_review_needed_but_unavailable` should not fire. It remains only for any future operation in a state where no attorney is contracted. Do not build a partner-follow-up queue expecting it to carry volume.

---

## 6.1b — NEW OPEN THREAD: the "eligible later" hold state

Two disqualification rows above are not true no's — they are not-yet's:

- supervision/probation/parole not yet complete (eligible once complete)
- waiting period not yet satisfied (eligible once it elapses)

The current machine has no clean status for "you are not eligible today but will be on a known future date." `referred_out` is wrong (the user belongs in RCAP, just later). `not_suitable_for_automated_packet` is wrong (it may be perfectly suitable later). `needs_record` is close but describes a missing document, not a time gate. `refile_eligible_after_wait` exists but is currently scoped to post-denial refiling, not pre-filing waiting periods.

**Decision owed (product, not legal):** either extend `refile_eligible_after_wait` semantics to cover pre-filing time gates, or add a dedicated `eligible_after_date` hold status carrying the target date, the reason (supervision completion vs. statutory wait), and a return-later prompt. Recommendation: a dedicated hold status, because conflating pre-filing waits with post-denial refiles will muddy reporting and the Briefcase timeline. Small, isolated, does not block the copy commit.

---

## Approved user-facing copy (ships now where true)

True in all operating jurisdictions; ships with the copy commit.

**Initial screening (Wilma):** "Based on your answers, this case may match initial screening criteria for a record-clearing pathway. You may continue preparing a self-help packet if you choose. This is not a final eligibility decision, legal advice, or a guarantee that a court will grant your request."

**Administrative completeness (partner staff):** "Partner staff may check whether required fields, documents, and signatures appear to be present. Staff cannot determine legal eligibility, approve legal sufficiency, or tell you whether you should file."

**Self-represented filing option:** "You may choose to file on your own without an attorney. Staff can help with administrative completeness, but staff cannot tell you whether you are eligible or whether you should file."

**Attorney checkpoint (surfaces only on a flagged case, not standing copy):** "Before filing, this case will be reviewed by a licensed attorney in your state. The attorney will review it for legal sufficiency and either clear it for you to file on your own, or let you know it needs more than a self-help packet." Renders **only** once a case has entered `needs_attorney_legal_review` — never as a promise on every case.

**Filing label:** `ready_to_file` (internal status) surfaces to the user as **"Filing Guidance"**, never a bare "Ready to File," because even an attorney-cleared case is the user choosing to file pro se, not the attorney filing for them.

---

## Changelog entry (append to spec Section 12)

**v2.0 → v2.1.** Open item 6.1 resolved. Adopted self-help-first model with attorney-checkpoint (review-and-clear, not review-and-file) routing to LegalEase's contracted jurisdiction-licensed attorney. Added Wilma intake disqualification logic (6.1.1) and attorney-escalation logic (6.1.2), mapped onto existing statuses (6.1.3). Shrank `legal_review_needed_but_unavailable` to out-of-footprint-only. Approved user-facing copy. Flagged new open thread 6.1b (pre-filing "eligible later" hold state — product decision, non-blocking). Legal authority: Lawrence Blackmon, 2026-06-05; written approval captured in this amendment. 6.1a (per-jurisdiction attorney availability) is subsumed: LegalEase contracts an attorney in each operating state, so availability is answered at the LegalEase level rather than per partner.
