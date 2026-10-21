# Owner decision package, 2026-09-05

Assembled by the Captain from committed records at branch
`claude/legalease-sprint-captain-utucnw`. It decides nothing, approves nothing,
opens no route and touches no Production state. Each item names the exact
question, the record that carries it, a recommended answer with its basis, and
what engineering does once the owner answers. A recommendation is the Captain's
reading of the records; it is not counsel's answer and never substitutes for one.

Every family named below stays fail-closed until the owner's own decision is
recorded through the existing legal-decisions mechanism
(`data/rcap-grade-a/legal-decisions/`). Work that does not depend on an answer
continues.

## A. Fee questions (four exact questions)

### A1. Rhode Island Chapter 12-1.3 motion filing fee

- Families: `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set` (all LEGAL_BLOCKED on FEE_AND_WAIVER only; every other obligation measured clean by VF03 at 5727d573f).
- Question: what filing fee, if any, does the Superior Court charge for a Chapter 12-1.3 motion to expunge or seal, and is the fee stated on the Superior-55 instructions the controlling figure?
- Record: `data/rcap-grade-a/packet-factory-24h/vf03/rows.json` (FEE_AND_WAIVER BLOCKED_LEGAL_INPUT, waiver route stated in full); `data/record-clearing/legal-design-intake/RI.memo.json` release-blocking open question; `data/rcap-grade-a/legal-decisions/OWNER_RI_PROPOSED_ORDER_2026-09-05.json` (the proposed-order question already answered by the owner on 2026-09-05).
- Recommended answer: state the fee the pinned Superior-55 instructions print, cited to the form revision and to R.I. Gen. Laws § 12-1.3-3 as the memo reads it, with the waiver route already carried; if counsel reads the statute as fee-free for a first-offender motion, say so and the packet prints that instead. Basis: the packet already carries the waiver in full and refuses to invent a figure; the only open input is which committed sentence states the fee.
- Consequence: one repair lane through the shared RI host writes the sentence on all four, then raster and one independent read; four families return to the proven count.

### A2. Vermont 32 V.S.A. § 1431(e) fee after Act 60

- Family: `vt_seal_dui-set` (VF05 at 581cce1d0: FEE_AND_WAIVER BLOCKED_LEGAL_INPUT; the reader corrects the earlier citation from 13 V.S.A. to 32 V.S.A. § 1431(e)).
- Question: after Act 60, does the $90 fee in 32 V.S.A. § 1431(e) apply to a DUI sealing petition under 13 V.S.A. § 7602, and is a fee waiver available?
- Record: `data/rcap-grade-a/packet-factory-24h/vf05/rows.json`; `data/rcap-grade-a/packet-factory-24h/vf04/rows.json`; `data/record-clearing/legal-design-track-registry.json` track `vt_seal_dui`.
- Recommended answer: confirm from the current statutory text whether § 1431(e) reaches § 7602 DUI petitions; the registry's present reading is that it does and the amount is $90. Basis: the reader's citation correction is a measurement; the applicability is a legal reading the records do not settle.
- Consequence: FIX75 is already repairing this family's other two defects; the fee sentence is a one-line follow-up in the same host, then re-read.

### A3. Pennsylvania 790 non-conviction fee and waiver treatment

- Family: `pa_790_nonconviction-set` (wave-2 legal block, decisive obligation "fee and waiver treatment", class MISSING_ARTIFACT_SPECIFIC_APPROVAL_INPUT; the later vf12 PASS declares no review base and so cannot supersede the block).
- Question: is the fee and waiver statement on the delivered 790 packet the one counsel intends (the artifact-specific approval input the wave-2 read found missing)?
- Record: `MASTER_QUEUE.json` row `wave2LegalBlock` (return commit 677700997); `data/rcap-grade-a/packet-factory-24h/vf12/rows.json`.
- Recommended answer: an engineering step precedes the owner: a fresh independent read with a declared base on the current bytes. If that read passes FEE_AND_WAIVER against the record, no owner decision is needed; if it blocks, the exact sentence goes to counsel.
- Consequence: dispatch the re-read first (Captain action, no owner input).

### A4. Delaware certified SBI history: ordering channel and cost

- Family: `de_mandatory_expungement-set` (proven; the guide states in terms that how the certified history is ordered and what it costs are not source-approved).
- Question: may the packet state the SBI application channel, current fee, service code and submission requirements, and from which source?
- Record: `data/rcap-grade-a/packet-factory-24h/fix54/rows.json`; `DE.memo.json` tracks[1].unresolvedQuestions[0].
- Recommended answer: approve stating the channel only from an SBI-published source bound by content hash; until such a source is bound, the present wording ("confirm them with SBI") stands. Basis: the memo marks the channel a release blocker not yet source-approved; nothing in the repository carries the figures.
- Consequence: a source-acquisition item, not a packet repair; the family stays proven with the disclosure it carries.

## B. Legal-design inputs that block a build or a read

### B1. Mississippi non-conviction petition: the jurat

- Family: `ms-nonconv-set` (VF01 at 30a8b3b71, COMPONENT_SET BLOCKED_LEGAL_INPUT).
- Question: which committed record governs the VERIFICATION section: the specification's mandatory notarised jurat, or MS.memo.json's unresolved notarisation?
- Record: `vf01/rows.json`; the ms-petition-for-expungement specification; `MS.memo.json`.
- Recommended answer: the specification's mandatory jurat, rendered as a notarisation block the participant signs before a notary, because the specification is the later, more specific record and a petition verified on oath is never wrong for want of a jurat. Basis: the reader measured everything else in the component clean.
- Consequence: one repair renders the jurat block; raster and re-read.

### B2. Louisiana Article 987 motion: offence wording and statute lines

- Family: `la-987-set-aside-and-dismiss-set` (VF01 at b35fbc6ed, KNOWN_PREFILLS BLOCKED_LEGAL_INPUT).
- Question: are the "Conviction offense wording" and "Conviction statute" lines neutral case facts LegalEase prefills (the memo's narrative), participant inputs (the memo's participantInputs), or left blank on the instrument (the build)?
- Record: `vf01/rows.json`; `LA.memo.json` track la-987.
- Recommended answer: prefill both from the held charge facts as neutral case fields and print them in the instructions for the participant to check against the docket, because both facts are already held and printed elsewhere in the packet. Basis: the same treatment the repository applies where a held fact is asked for on a form.
- Consequence: one repair writes the two lines; raster and re-read.

### B3. New Hampshire: service of the fee-waiver papers on an annulment petition

- Family: `nh_petition_vacated-set` (VF03 at d974bcdd8, SERVICE BLOCKED_LEGAL_INPUT).
- Question: who must be served with the NHJB-2328 fee-waiver papers on an RSA 651:5 petition, and how?
- Record: `vf03/rows.json`; the NH legal-design record carries no answer.
- Recommended answer: none can be read from the records; counsel states the service rule or confirms none applies to the fee-waiver motion itself.
- Consequence: the packet prints the rule; re-read.

### B4. Oklahoma and Wyoming trafficking-survivor relief: filing destination

- Families: `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief` (VF01), `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708` (VF07); both FILING_DESTINATION BLOCKED_LEGAL_INPUT.
- Question: which court receives the filing (OK.memo.json records destination "Not determined"; the WY route-kind adjudication is pending).
- Recommended answer: name the court of conviction for both, which is what each statute's vacatur mechanism presupposes; counsel confirms.
- Consequence: the destination is written into the route record and the packet; re-read.

### B5. Washington homicide-victim prostitution vacatur: family-member form

- Family: `wa_vac_homicide_victim_prostitution-set` (vf34 at fc95a33ac; COMPONENT_SET and KNOWN_PREFILLS BLOCKED_LEGAL_INPUT).
- Question: does RCW 9.96.060(7) require a distinct family-member form or a modified pleading, and where do applicantName and victimName belong on 09.0100 and 09.0200?
- Recommended answer: none can be read from the records; counsel states the component and the name placement.
- Consequence: build follows the answer; raster and re-read.

### B6. Hawaii HRS 712-1200 deferred expungement

- Family: `hi_712_1200_deferred_expungement-set` (owner decision recorded: honour the existing block until the three-year rule and the current 712-1200 branch are confirmed from controlling authority).
- Question: confirmation of the current statutory text and the three-year waiting period's authority.
- Recommended answer: unchanged from the recorded owner decision; a source-currency confirmation, not a packet question.

### B7. Kentucky felony expungement after pardon: missing worklist inputs

- Family: `ky_felony_expungement_after_pardon-set` (PF10; thirteen route-obligation inputs unrecorded in the worklist).
- Question: the legal-design inputs for affidavit, service, notice, proposed order, hearing treatment and filing method.
- Recommended answer: a legal-design task, not a packet repair; counsel or the design owner completes the worklist row.

### B8. North Dakota automatic non-conviction close: corrected wait anchor

- Family: `composed-treatment:nd-nonconviction-auto-close-verify` (owner decision recorded: no adoption until counsel reconfirms the corrected waiting period, anchor and gates).
- Recommended answer: unchanged; counsel reconfirmation.

### B9. Nebraska trafficking set-aside and seal

- Family: `ne-trafficking-setaside-and-seal-set` (PF07 hold; the CC-6-12 limb answered by measurement in LEGAL_HOLD_LIMBS_ANSWERED.json).
- Question: the remaining limb, which vehicle (custom pleading or official fill) the route intends now that CC-6-12 resolves to a form.
- Recommended answer: official fill of CC-6-12 for the motion the form serves and a custom pleading only for what no form serves; counsel confirms.

### B10. Massachusetts BMC multi-record sealing

- Family: `ma-bmc-multi-set` (legalInputStatus SETTLED; nextExecutableAction says proceed through raster and independent verification).
- Recommended answer: no owner input needed; the hold is settled on the record and the family needs a fresh read. Captain action.

## C. Exact-output approvals already requested

- Oregon three disposition-bound configurations: approval REQUESTED, no grantor, per `docs/rcap/grade-a/captain/BLOCKERS.md`.
- Rolling counsel review batch 01: ten routes in nine proven families, every decision line blank, per `docs/rcap/grade-a/captain/ROLLING_COUNSEL_REVIEW_BATCH_01.md`.
- Owner adoption request pending: `data/rcap-grade-a/legal-decisions/OWNER_ADOPTION_REQUEST_PENDING.json`.

## D. Operational, not legal

- Colorado official bytes: the governed acquirer is refused by the session's egress policy at the issuing court; 0 of 8 held. Needs a network-policy change or an out-of-session acquisition.
- Illinois and Alabama recovery-pool mount: builds blocked until the corpus mount is present.

## What this package does not do

It records no answer, lifts no hold, and creates no approval. An owner answer is
applied only by writing it into `data/rcap-grade-a/legal-decisions/` in the
existing record shape and regenerating; the Captain then dispatches the
dependent repair or read.
