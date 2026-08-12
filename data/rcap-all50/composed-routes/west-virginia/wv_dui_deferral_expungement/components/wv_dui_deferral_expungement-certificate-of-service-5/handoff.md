# Handoff — Certificate of service (§ 17C-5-2b(c) and (g))

Stage-parameterised. Rendered once per submission. See the route-level `handoff.md` for the full picture.

- **Authority**: § 17C-5-2b(c) and (g) — the 30-day objection window runs from service in both.
- **Two renderings, one drafted document.** At the (c) stage it names the Motion to Dismiss the Charges and
  the Affidavit of the Defendant and the movant role is `Defendant`; at the (g) stage it names the
  Application and the Timeline and the role is `Applicant`. The config's `stageVariants` records both; the
  stored `presentation.movantRole` is the stage-two value. The renderer has no stage parameter — recorded
  as adapter defect `no-stage-parameterisation`.
- **`primaryReliefTerm` is `expungement`**, the jurisdiction's primary consumer term. At stage one the term
  does not appear in the rendered text, and the pleading-QA *warning* that the primary relief term is
  absent is expected and accepted there. It is a warning, not a failure. No relief vocabulary may be added
  to the stage-one rendering to silence it. The boundary fixture is that stage-one rendering and records
  the expected warning explicitly.
- **Everything that makes it true is a manual completion item**: the prosecuting attorney's street address,
  the manner of service, the date and the signature. No service is ever asserted as completed, no
  prosecutor is named or addressed by LegalEase, and no prosecutor position is stated. See
  `wv-dui-deferral-service-is-a-participant-act`.
