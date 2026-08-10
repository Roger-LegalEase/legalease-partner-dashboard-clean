# E-SPECIAL — Special-Evidence Adjudication

Evidence package for final E3, produced against base `abbc48a1`
(`claude/rcap-final-sprint-integration`), frozen queue sha256 `ca7758ef…`
(matching E2-D's pin), canonical crosswalk content hash `405c07ce…`.

Terminal A's dispatch block arrived with unfilled placeholders and no E-SPECIAL
lane exists in the committed dispatch assignment; every discoverable value was
taken from committed state and is recorded in the JSON's `dispatchNote`. All
official primary hosts (legis.state.pa.us, legis.la.gov, sdlegislature.gov,
legislature.ms.gov) were probed this session and are EGRESS_BLOCKED, so every
finding rests on committed repository evidence, pinned `path@ref` where the
bytes live on another branch.

## Results — 5 of 6 subjects closed, 1 blocked on one named fetch

| # | Subject | Outcome | Disposition |
| --- | --- | --- | --- |
| 1 | AK AS 12.55.085 vs AS 12.55.078 | terminal | deliberately deferred unregistered mechanism — the intake memo's own `ak-set-aside` track held at `legal_research_required`; the two statutes are distinct mechanisms (SEJ dismissal-without-conviction vs SIS set-aside of a conviction) and were never equated |
| 2 | LA trafficking fee-exempt route | resolved | certification overlay on the arts. 977/978 motions (state-pack-declared pair la-978 + la-977); relief, eligibility-overlay, and fee authority explicitly distinguished — the fee provision is never treated as relief authority |
| 3 | MS DUI nonadjudication | resolved | variant of ms-dui: the § 63-11-30 nonadjudication program, supported by the registry's implied-consent routing into the § 63-11-30 track and the ms-dui record's own prior-nonadjudication exclusion; the subsection pin (expected (14)) stays a named residual, not an asserted fact |
| 4 | PA Rule 490/790 discriminator | resolved | the registry itself declares the fork — summary-only case at the magisterial district court → Rule 490, any case with a misdemeanor/felony/murder charge → Rule 790 — so path-a is the § 9122(a) mechanism across a registry-declared procedural pair; the missing piece is a profile input (case composition/venue question), proposed for the profile owner, not made here |
| 5 | PA vacatur primary authority | **unresolved** | only a secondary source exists in committed form; the one resolving fetch (18 Pa.C.S. Chapter 30 / expected § 3019 on legis.state.pa.us) is EGRESS_BLOCKED — a registry-gap claim without primary authority would manufacture authority and is refused |
| 6 | SD juvenile SDCL pins (×2) | resolved | both operative citations are committed in the SD profile's source sections — SDCL §§ 26-7A-115–116 (sealing) and § 26-7A-115.1 (trafficking expungement) — in fields outside the pathway rows earlier passes searched; the two provisional gap blockers de-provision, the gaps themselves stand for the registry owner |

## Denominator

No change from this lane, on any subject. Two would-be changes are named with
their owners: registering `ak-set-aside` (registry owner + counsel) and acting
on the SD juvenile gaps (registry owner).

## For final E3

Import-ready: subjects 1, 2, 3, 4, 6. Subject 5 keeps `path-k` unresolved with
its exact missing evidence. Subjects 2 and 4 land one-pathway-to-track-pair
relationships whose composition is declared in committed architecture (the LA
state pack; the PA registry fork rule) — the fail-closed condition the canonical
crosswalk requires for any many-relationship. Subject 4 additionally carries a
proposed compiled-profile correction (venue/composition question) owned by the
profile lane.
