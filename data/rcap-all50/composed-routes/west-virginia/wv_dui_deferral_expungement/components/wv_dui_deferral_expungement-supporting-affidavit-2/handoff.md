# Handoff — Defendant's affidavit (§ 17C-5-2b(c))

Stage-one supporting affidavit. See the route-level `handoff.md` for the full picture.

- **Authority**: § 17C-5-2b(c) — "that motion must be supported by the defendant's affidavit".
- **The one notarised document on the route.** The registry records notarization as "Required on the unit 1
  supporting affidavit" and lists the affidavit signature, date and jurat as a manual completion item.
- **`verificationStatute.citation` is cited here and only here**, and only for the subsection that requires
  an affidavit to exist. No source read for this track prescribes the jurat wording, the class of officer
  or any penalty language, so `presentation.verificationPenaltyLabel` stays null and no attestation clause
  is invented. `presentation.verificationVerb` is `swear`, sourced from `rules.participantSignature`
  ("swears the unit 1 affidavit"). See counsel flag `wv-dui-deferral-verification-form-unprescribed`.
- **Averment scope**: participant knowledge only. Nothing is averred about the contents of the DMV
  certification — LegalEase never obtains, receives or inspects it, and the negative fixture exists to
  catch an affidavit that swears to it.
- **Vocabulary**: stage-one prohibitions apply, including the expungement vocabulary.
