# Handoff — dc_yra_set_aside (Lane C2)

## Authority

`D.C. Code § 24-906(e-1)`, `D.C. Code § 24-903(c)(2)`, `D.C. Code § 24-906(e-2)` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Reuse of the coded DC pleading config

A DC pleading config already exists at `src/lib/record-clearing/dc-config.ts`. It is **reused as the source of these artifacts, not forked**. The generator imports that module and reads out its presentation block, its verification statute, its service note, its court caption and the counsel flags shared by both coded DC motion configs, then writes them into these data artifacts. Nothing from it is retyped, so the two cannot drift apart. `provenance.reusedCodedConfig` records the path, the file's sha256 at build time, and the exact list of reused fields; the build asserts that the coded verification statute is still null before proceeding.

What is **not** taken from it: the two coded configs cover `adult_motion_to_seal` and `adult_motion_to_expunge`, which are different tracks from this job's three. The per-track title, statutory authority, relief term, relief and order verbs, records scope, prohibited vocabulary, component inventory and counsel flags are drafted from this track's own pinned registry entry.

## Mechanism

A youth offender, meaning a person who was 24 or younger at the time of the offense, may move to set aside the conviction after completing probation, incarceration, supervised release, or parole, whichever is later, regardless of whether they were sentenced under the YRA. Discretionary: the court considers the § 24-903(c)(2) factors and makes a written statement on the record of its reasons.

## Route decision

NOT DRAFTED. documentForm is `blocked_pleading`. The pinned filing rule reads "Blocked pending confirmation of Superior Court form or standing practice for YRA set-aside motions" and four build blockers reach the form, the service and response mechanics, the current statutory factors and the packet's composition. No motion, no fixtures, no rendered artifacts and no participant instructions exist for this track; the deliverable is the dependency record at blocked-pleading.md.

## Drafting barred

See `blocked-pleading.md` for the full dependency record: what the source settles, what it leaves open, every blocking question quoted from the pin, the exact missing source, and the unblocking criteria.

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The youth offender signs their own motion. Notarization: The source review does not state a notarization requirement for this motion." No verification statute is named and no notarization requirement is stated; the citation stays null.
- **filingFee** — source says: "The source review does not state a filing fee for this motion." No figure is recorded and none is quoted; the field stays null.
- **feeWaiver** — source says: "The source review does not address a fee waiver." The source review does not address a fee waiver; the field stays null.
- **venue** — source says: "Unresolved. Service and response mechanics are among the items counsel must confirm." Venue as a forum is recorded (Superior Court, Criminal Division, one motion per case number), but the service and response mechanics that would complete it are expressly unresolved, so no service destination is asserted and the field stays null.

## Open counsel flags

1. Automatic relief caution: DC has automatic record relief for some records, but processing is phased in and may not be complete until October 1, 2027. This workflow should not treat automatic relief as completed record clearing.
2. Prosecutor identity: Serve the correct prosecutor: the U.S. Attorney's Office for DC or the DC Office of the Attorney General, depending on the case.
3. Eligibility exclusions: Master Grid Group 1-3 felony convictions are not eligible for by-motion sealing.
4. Records scope: DC record relief reaches DC records, not federal records or records from other jurisdictions.
5. DC motion verification is a declaration under penalty of perjury; confirm the exact declaration/notarization form with counsel and current Superior Court practice.
6. DRAFTING BARRED. The pin records four build blockers on this track and its filing rule reads, verbatim: "Blocked pending confirmation of Superior Court form or standing practice for YRA set-aside motions." Lane C2 does not draft a replica of an instrument whose form, service mechanics and composition the source leaves open. No motion, no fixtures and no rendered artifacts are produced, and no participant-facing filing instructions are shipped, because shipping them would imply a packet that does not exist.
7. A set-aside is not sealing. Even once this route is unblocked, the person still needs a separate motion to seal the associated arrest and case records — and whether the two are filed together or in sequence is itself one of the unresolved build blockers.
8. Related automatic relief recorded in the pin: an unconditional discharge of a committed youth offender before expiration of the sentence automatically sets aside the conviction, and automatic set-aside follows early termination of supervised release by the Parole Commission. A participant may already have the relief without any motion, which is the first thing counsel should check.
9. A certificate issues in any case where the conviction is set aside.
10. DC motion verification is a declaration under penalty of perjury; confirm the exact declaration/notarization form with counsel and current Superior Court practice.
11. The source review does not state a filing fee for this motion and does not address a fee waiver. No figure is quoted and both fields are left null.
12. Service and response mechanics for this motion are recorded in the pin as an unresolved build blocker. No service destination is asserted, no certificate of service is generated, and the field is left null.
13. Self-help stop conditions: The prosecutor files an opposition or the court orders a response. The court sets a hearing. The record is federal, military, tribal, or from another jurisdiction. Immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play.
14. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Build blockers carried from the pin

- (build_blocker, packet_components) Section 24-903(c)(2) factors and current Superior Court practice for YRA set-aside motions.
- (build_blocker, notice_or_service) Service and response mechanics for a YRA set-aside motion.
- (build_blocker, packet_components) Whether the set-aside and the sealing motion are filed together or in sequence.
- (build_blocker, correct_form) Whether the Superior Court has any form or standing practice for these motions.

## Unresolved questions carried from the pin

- (build_blocker, packet_components) Section 24-903(c)(2) factors and current Superior Court practice for YRA set-aside motions.
- (build_blocker, notice_or_service) Service and response mechanics for a YRA set-aside motion.
- (build_blocker, packet_components) Whether the set-aside and the sealing motion are filed together or in sequence.
- (build_blocker, correct_form) Whether the Superior Court has any form or standing practice for these motions.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- legal_design_blocker: Design undetermined: Current YRA factors, service/response mechanics, and whether set-aside and sealing are combined or sequential. (undetermined: packet_components)
- legal_design_blocker: Open question blocks the build (packet_components): Section 24-903(c)(2) factors and current Superior Court practice for YRA set-aside motions.
- legal_design_blocker: Open question blocks the build (notice_or_service): Service and response mechanics for a YRA set-aside motion.
- legal_design_blocker: Open question blocks the build (packet_components): Whether the set-aside and the sealing motion are filed together or in sequence.
- legal_design_blocker: Open question blocks the build (correct_form): Whether the Superior Court has any form or standing practice for these motions.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
