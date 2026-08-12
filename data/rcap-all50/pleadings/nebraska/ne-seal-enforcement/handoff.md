# NE:ne-seal-enforcement — action to compel compliance (Neb. Rev. Stat. § 29-3528)

Job `T-C-NE-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **drafted** (controlled custom pleading).

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- Neb. Rev. Stat. § 29-3528
- Neb. Rev. Stat. § 29-3523(3)
- Neb. Rev. Stat. § 29-3523(7)
- Neb. Rev. Stat. § 29-3527
- State v. Coble, 299 Neb. 434 (2018)

Content is asserted only for the provisions the committed mechanism describes;
§ 29-3523(7) and § 29-3527 are carried without content asserted.

## Mechanism

Where any officer or employee of the state, its agencies or its political
subdivisions, or any state agency or political subdivision, fails to comply with
the Security, Privacy, and Dissemination of Criminal History Information Act, any
person aggrieved may bring an action — **including but not limited to an action
for mandamus** — to compel compliance.

Venue is statutory and elective: the district court of any district in which the
records involved are located, **or** the district court of Lancaster County.

*State v. Coble*, 299 Neb. 434 (2018) identifies this as the correct route, in
contrast to a motion filed in the criminal case.

The action presupposes the underlying sealing duty: it becomes available where the
applicable § 29-3523(3) period has run or its trigger has occurred and the record
is still public.

## Route decision

Drafted as a custom pleading. This is an **enforcement action**, not a sealing
petition, and § 29-3528 authorises the general action to compel compliance on its
own terms — so the vehicle is settled even though the mandamus variant's procedure
is not.

Caption is movant-first, as a civil action: the aggrieved person is Petitioner and
the non-complying officer, agency or political subdivision is Respondent. This is
deliberately **not** a criminal caption — the State is not a party in its
prosecutorial capacity, and no prosecutor is named or positioned anywhere.

The respondent is left as a participant-named value. Identifying the wrong
respondent defeats the action, and the source flags a participant who cannot
identify the non-compliant agency as a self-help stop condition. Likewise the
venue election is left to the participant; the source expresses no preference and
neither does the packet.

### Two things deliberately not drafted

**Certificate of service — source silent.** The rule for service on a Nebraska
state agency or political subdivision was not surveyed. No certificate of service
is drafted and no service method is asserted. Recorded as a source silence with a
confirm-with-clerk-or-counsel instruction, and stated plainly in the participant
guide rather than papered over.

**Mandamus components — blocked with a dependency.** Section 29-3528 permits an
action for mandamus without setting out the procedure, and Nebraska mandamus
procedure was not surveyed. Whether an application and affidavit and an
alternative writ are required decides the packet component list for that form of
the action. `componentInventory.notice_affidavit` is `blocked` and carries a
`procedure_dependency` recording the registry's own counsel question: *"What
procedure governs a mandamus action under section 29-3528, and what accompanies
the complaint?"* The general action is drafted; the mandamus extras are not
invented.

## Open counsel flags

- **Attorney review strongly recommended before filing** — a recommendation in the
  source rather than a gate. It hardens into a stop condition where the agency
  contests and appears through counsel, or the participant needs representation.
- **Qualification under § 29-3523(3) is the gate.** A case that never qualified has
  nothing to enforce. Screening must confirm qualification before this route is
  offered.
- **Registry release blocker (open):** Nebraska mandamus procedure not surveyed.
- **Registry release blocker (open):** service rule for a Nebraska state agency or
  political subdivision not surveyed.
- **Verification — source silent.** No statute identified; governing procedure
  unsurveyed.
- **Filing fee — source silent.** No amount stated.
- **Scope limits matter here more than usual.** No order under this section reaches
  a private data broker or a privately maintained website, or federal and
  out-of-state agencies. Where a participant's real problem is a commercial
  background-check site, this action does not solve it, and the participant guide
  says so before any money is spent.
- **Non-compliance is alleged, never adjudicated,** and the respondent's position
  is never stated.
- The Nebraska state pack commits only `index.ts` and `all50-build-metadata.ts`, so
  the pinned registry entry carries the whole evidentiary weight for this track.

## Anti-invention proof

`fixtures/negative.json` asserts a court finding of agency non-compliance, states
the respondent agency's position for it, states a filing fee the source does not
establish, asserts completed service where the service rule was never surveyed,
and populates protected fields. It declares `qaPassed: true` because
`runPleadingQa` genuinely passes it; the verifier's invention/protected-field
scanner is what rejects it.
