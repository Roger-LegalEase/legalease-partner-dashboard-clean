# C6 Category A branch identities

C6 converts three former Category B exclusions into participant-facing Category A identities. No B stage remains for any route. The legacy excluded selection is retired, and each new selector targets the exact `::participant-branch` identity.

This lane names `rcap-ne-custom-pleading` and `rcap-wv-custom-pleading`. It does not create either family, choose an exact form, render an artifact or open a product route. The filing descriptions below come from the committed revalidation record. Packet-family integration must verify the current instrument and route subtype before publishing participant instructions.

Commercial routes opened: 0

## Nebraska firearm-rights restoration

**Original route:** `obligation:track-only:NE:ne-firearm-restoration-routing`

**Category A identity:** `obligation:track-only:NE:ne-firearm-restoration-routing::participant-branch`

- **Files:** Nebraska Board of Pardons application requesting a pardon and/or restoration of civil rights, including firearm rights where legally available.
- **Filed by:** The convicted person.
- **Destination:** Nebraska Board of Pardons.
- **Trigger:** A Nebraska conviction continues to impose firearm disability after sentence completion and the person seeks discretionary restoration.
- **Deadline evidence:** No fixed filing deadline; Board eligibility and waiting policies in the current application instructions apply.
- **Components:** Signed Board application, complete conviction history, sentence or discharge records, personal statement, rehabilitation and community evidence, references, and a specification of the rights requested.
- **Notice:** Board staff investigate. The Board gives hearing notice and may require publication or victim or prosecutor input under its rules.
- **Self-help stop:** Federal firearm disability, out-of-state convictions, violent or sexual offenses, disputed eligibility, and discretionary hearing preparation require escalation.
- **Output identity:** `custom_pleading` in `rcap-ne-custom-pleading`, family named and not created.

The committed instrument has no form number or source-pinned application. Do not invent a standalone firearm-restoration form, submission address, delivery method or executable selector values. Packet implementation stops until Captain work binds the current Board instrument.

## West Virginia nonconviction expungement

**Original route:** `obligation:track-only:WV:wv_common_nc_procedure`

**Category A identity:** `obligation:track-only:WV:wv_common_nc_procedure::participant-branch`

- **Files:** Civil petition for expungement of a nonconviction record under W. Va. Code § 61-11-25.
- **Filed by:** The person whose criminal charges ended in the qualifying nonconviction disposition.
- **Destination:** Circuit court of the county where the criminal charge was filed.
- **Trigger:** The person was acquitted or the charge was dismissed, subject to statutory exclusions and waiting requirements.
- **Deadline evidence:** The committed revalidation says: “Generally 60 days after acquittal or dismissal; if the person waits beyond that period, the court may still accept the petition upon good cause where authorized. Exact subsection timing controls.” Packet integration must verify that statement against the current subsection before publication.
- **Components:** Petition identifying the charge, case, disposition, arresting agency, prosecutor, record custodians, eligibility, prior expungements and requested order, with a certified disposition.
- **Notice:** Serve the prosecuting attorney and the agencies or custodians required by § 61-11-25. Objections and hearing procedures apply.
- **Self-help stop:** Objections, excluded offenses, a related civil action, factual disputes, a contested hearing or an appeal require escalation.
- **Output identity:** `custom_pleading` in `rcap-wv-custom-pleading`, family named and not created.

The common procedure selects more specific disposition routes, and the C6 instrument names no form number. Do not choose one form for every qualifying disposition. Packet implementation stops until Captain work binds the route subtype and current filing vehicle.

## West Virginia conviction expungement

**Original route:** `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26`

**Category A identity:** `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26::participant-branch`

- **Files:** Civil petition for expungement of an eligible misdemeanor or nonviolent felony conviction under W. Va. Code § 61-11-26.
- **Filed by:** The convicted person.
- **Destination:** Circuit court of the county where the conviction occurred.
- **Trigger:** The person has an eligible conviction, completed all sentence obligations, satisfied the applicable waiting period and has no disqualifying matters.
- **Deadline evidence:** File after the statute's waiting period measured from sentence, discharge or completion as applicable. The committed revalidation describes one year for eligible misdemeanors and longer periods for eligible nonviolent felonies, subject to the precise subsection and enhanced rules.
- **Components:** Verified civil petition; every conviction and charge; completion and waiting-period facts; criminal-history information; employment, education and rehabilitation facts where requested; prosecuting and record-keeping agencies; certified records; and a proposed order.
- **Notice:** Serve the prosecuting attorney and all required agencies. The State and victims may receive notice and object, and the court may hold a hearing.
- **Self-help stop:** Offense-exclusion ambiguity, multiple convictions, a disputed single-use limit, an objection, hearing or appeal require escalation.
- **Output identity:** `custom_pleading` in `rcap-wv-custom-pleading`, family named and not created.

The common procedure covers more specific conviction routes, and the C6 instrument names no form number. Do not choose one form or one waiting-period calculation for every subtype. Packet implementation stops until Captain work binds the exact route subtype and current filing vehicle.

## Control and commercial boundary

- `branch-identities.json` records the three Category A identities, their selectors, output strategies, product outcomes and commercial treatment.
- `crosswalks.json` records zero `REUSE_AS_IS` bindings. All three routes retain the fixed `NO_EXISTING_WORK` decision, which means no form-level match was attempted.
- The actual launch-status mirror is `docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`. The assignment manifest and prompt point to a nonexistent `data/.../GRADE_A_LAUNCH_STATUS.md` path.
- No identity in this lane authorizes generation, payment, sponsorship, packet-credit consumption, attachment, delivery, commercial eligibility or `COMPLETE_PACKET_PROVEN`.
