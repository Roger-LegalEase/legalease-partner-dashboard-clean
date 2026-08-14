# Handoff — Petition to Seal a Pardoned Conviction (N.D.C.C. § 12-60.1-02(1)(c))

## Authority

- N.D.C.C. § 12-60.1-02(1)(c)
- N.D.C.C. § 12-60.1-03
- N.D.C.C. § 12-60.1-04
- N.D.C.C. § 12-60.1-01(7)
- N.D.C.C. § 12-60.1-02(2)
- N.D.R.Ct. 3.4
- N.D.R.Crim.P. 49

## Mechanism

A person granted an unconditional pardon for a North Dakota conviction may petition to seal the record (N.D.C.C. § 12-60.1-02(1)(c)); the ground carries no look-back period of its own. A conditional pardon does not qualify, and the chapter-level bars in § 12-60.1-02(2) still apply.

## Route decision

Custom pleading (controlled pleading, lane C). The petition is filed in the existing criminal case — district or municipal court, whichever holds it — with the mandatory proposed order (§ 12-60.1-03(3)) and proof of service on the prosecuting attorney (§ 12-60.1-03(4)). No official statewide form exists for this petition; the ND Legal Self Help Center publishes a research guide, not a form, so the custom pleading is the correct output strategy. The runtime pleading-state config pre-exists (src/lib/record-clearing/north-dakota-config.ts, export ndConvictionSealingConfig, runtime track adult_conviction_sealing) and this track's data artifacts are generated from it without forking; the felony/misdemeanor/pardon grounds are eligibility paths of the same petition.

## Open counsel flags

- Registry counsel question: must a petition on the pardon ground still plead and prove the § 12-60.1-04(1) findings, including reformation?
- A conditional pardon (N.D.C.C. § 12-55.1-01(2)) does not support this ground.
- Registry release blocker: the filing fee for a Chapter 12-60.1 petition is not established; the participant must confirm with the clerk before paying anything.
- The chapter contains no verification clause; no verification statute is asserted (citation null).
- Caption must name the specific county/judicial district and the existing criminal case number before filing; both stay participant-confirmed fields.
