# Handoff — Petition to Seal a Felony Conviction (N.D.C.C. § 12-60.1-02(1)(b))

## Authority

- N.D.C.C. § 12-60.1-02(1)(b)
- N.D.C.C. § 12-60.1-03
- N.D.C.C. § 12-60.1-04
- N.D.C.C. § 12-60.1-01(7)
- N.D.C.C. § 12-60.1-02(2)
- N.D.R.Ct. 3.4
- N.D.R.Crim.P. 49

## Mechanism

A person who pled guilty to or was found guilty of a felony may petition to seal the record if they have not been convicted of a new crime for at least five years before filing (N.D.C.C. § 12-60.1-02(1)(b)). Felony offences involving violence or intimidation are barred during the § 62.1-02-01(1)(a) firearm-disability period, and registration offences under § 12.1-32-15 are excluded.

## Route decision

Custom pleading (controlled pleading, lane C). The petition is filed in the existing criminal case — district or municipal court, whichever holds it — with the mandatory proposed order (§ 12-60.1-03(3)) and proof of service on the prosecuting attorney (§ 12-60.1-03(4)). No official statewide form exists for this petition; the ND Legal Self Help Center publishes a research guide, not a form, so the custom pleading is the correct output strategy. The runtime pleading-state config pre-exists (src/lib/record-clearing/north-dakota-config.ts, export ndConvictionSealingConfig, runtime track adult_conviction_sealing) and this track's data artifacts are generated from it without forking; the felony/misdemeanor/pardon grounds are eligibility paths of the same petition.

## Open counsel flags

- Registry release blocker: the filing fee for a Chapter 12-60.1 petition is not established; the participant must confirm with the clerk before paying anything.
- Registry release blocker: the impaired-driving exclusion from Chapter 12-60.1 appears only in ND Courts guides, not in § 12-60.1-02(2); confirm the basis before release.
- The controlling legal review makes every felony petition an attorney handoff; any violence-or-intimidation or firearm-disability question ends self-help.
- The chapter contains no verification clause; no verification statute is asserted (citation null).
- Caption must name the specific county/judicial district and the existing criminal case number before filing; both stay participant-confirmed fields.
