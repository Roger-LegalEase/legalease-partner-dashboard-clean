// Georgia disqualifying / excluded offenses. Sourced from the Georgia Agent
// Training Reference (section 3), reflecting the § 35-3-37(j)(4) SB 288 excluded
// list and other categorical limits. Screening notes, not an exhaustive legal
// test; map the exact O.C.G.A. Code section before relying.
export const gaDisqualifyingOffenseNotes = [
  "SB 288 excluded list (§ 35-3-37(j)(4)) — these misdemeanor convictions generally cannot be restricted regardless of time elapsed: DUI and all other serious traffic offenses under O.C.G.A. §§ 40-6-390 through 40-6-397 (e.g., reckless driving, fleeing).",
  "Family-violence simple assault, simple battery, and battery under §§ 16-5-20(d), 16-5-23(f), and 16-5-23.1(f) — excluded unless the person was under 21 at the time of the arrest.",
  "Theft offenses under Chapter 8 of Title 16 — excluded, except theft by shoplifting and refund fraud, which can be restricted.",
  "Sexual offenses, including sexual battery, public indecency, and related crimes; crimes against children/family, including certain child-related and exploitation offenses; and offenses involving serious injury or endangerment as enumerated in the statute.",
  "Categorical limits: a two-misdemeanor lifetime cap (no more than two misdemeanor convictions may ever be restricted under SB 288); felony convictions generally cannot be restricted except through a pardon (§ 35-3-37(j)(7)) or retroactive first-offender treatment.",
  "Pending charges or new convictions disqualify, and a new conviction can undo eligibility and reset the four-year clock; a charge dismissed as part of a plea to another charge arising from the same conduct (plea-bargain dismissal) is not restrictable.",
  "Scope limit: out-of-state and federal records are not reachable by Georgia restriction. The § 35-3-37(j)(4) excluded list and the family-violence (under-21) and theft (shoplifting/refund-fraud) carve-outs turn on the exact O.C.G.A. section and facts — verify against the current excluded list before declaring a misdemeanor eligible."
];
