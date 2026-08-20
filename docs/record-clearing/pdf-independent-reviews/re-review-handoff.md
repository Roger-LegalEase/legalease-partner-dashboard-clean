# Re-review handoff

Four shared corrections in scripts/rcap-official-forms/rcap-field-semantics.mjs and the D1 binder/verifier pair, then a re-derivation and re-render. No family map was hand-edited; the maps are generated, and every binding that disappeared did so because the shared rule refused it.

Each family below carries a correction_required verdict against superseded bytes. The gate reads artifact hashes, so those records now fail their own hash check — which is the correct behaviour and the reason a new record is required rather than an edit.

| family | objected field(s) | still bound | artifacts changed |
| --- | --- | :-: | ---: |
| AK:tf-800-form-en | certDate | no | 3 |
| AK:tf-805-form-en | certDate | no | 3 |
| KY:aoc-334-form-en | Defendants ssn | no | 2 |
| KY:aoc-496-2-form-en | Def.VitalStats.SSN, Def.Info.JailId | no | 2 |
| KY:aoc-496-form-en | Def.VitalStats.SSN, Def.Info.JailId | no | 2 |
| NC:aoc-cr-287-form-en | PetitionerAddr2 | YES | 3 |
| NC:aoc-cr-288-form-en | NameAtty, CityAtty, StateAtty, ZipCodeAtty | no | 3 |
| NC:aoc-cv-226-support-en | NameOfBank, BankStreetAddress | no | 3 |
