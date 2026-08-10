# E2-C — Unresolved surplus jurisdictions

Lane **E2-C** of the frozen E2 evidence queue. Six jobs, one per unresolved surplus jurisdiction:
ID (+1), LA (+2), MS (+4), OK (+8), PA (+1), SD (+3).

- Evidence artifact: `data/rcap-ledger/e2-evidence/E2-C.json`
- Base commit: `c7225bcf8f2fb2ab0deb5c333d2278937b257694`
- Queue sha256: `ca7758efa6e64f39c52c51038c3c3b455e6848d64ab031a3068b437ffb86754f`
- **Web access: unavailable.** Outbound HTTPS in this environment is restricted by the network egress
  policy; `law.justia.com`, `www.legis.state.pa.us` and `sdlegislature.gov` were all refused by the
  proxy (`EGRESS_BLOCKED`). Every citation below is therefore sourced to a repository path whose file
  actually contains the quoted text. No statute was cited from memory and no official URL is claimed
  as fetched.

This lane records evidence. It does not edit the crosswalk, the compiled profiles or the disposition
register; E3 adjudicates.

## Result

| Juris | Delta | Surplus pathways found | Absorbed | Left open | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| ID | +1 | 3 | 1 | 2 | unresolved |
| LA | +2 | 3 | 3 | 0 | unresolved |
| MS | +4 | 4 | 3 | 1 | unresolved |
| OK | +8 | 10 | 8 | 2 | unresolved |
| PA | +1 | 2 | 1 | 1 | unresolved |
| SD | +3 | 3 | 0 | 3 | unresolved |

No job closed. Each row below says exactly what is missing.

## The finding that runs across the lane

**The delta is a net, not a count.** The job framing assumes that a jurisdiction with a `+N` surplus
has exactly `N` compiled pathways claiming no registry track. That holds for MS and SD. It does not
hold for ID, LA, OK or PA, where pathways with no track are partly offset by *registry tracks with no
runtime pathway*:

| Juris | Pathways with no track | Registry tracks with no pathway | Net |
| --- | ---: | --- | ---: |
| ID | 3 | `id_set_aside_dismissal`, `id_felony_reduction` | +1 |
| LA | 3 | `la-999-expedited-expungement` | +2 |
| OK | 10 | `ok_identity_theft`, `ok_osbi_portal` | +8 |
| PA | 2 | *(none — `path-a` covers `pa_490_nonconviction` and `pa_790_nonconviction` at once)* | +1 |

WY closed cleanly because it had no offsetting gap: three tracks, three 1:1 pathways, two scoped-out
authorities. Nowhere else in this lane is the arithmetic that clean.

**Two families produce most of the unabsorbed surplus: juvenile records and trafficking-survivor
relief.** These are the same two families WY closed — and WY could close them only because its
registry tracks carried stop conditions naming `W.S. § 6-2-708` and `W.S. § 14-6-241` as routed
outside the track. MS carries the equivalent restriction (`§ 97-3-54.6(6)`, on all nine of its
tracks) and so closes its trafficking pathway the same way. ID, OK, PA and SD carry no such
statement, so their juvenile and trafficking pathways stay open. That is a registry-side gap, not a
runtime defect, and it is the single highest-value thing E3 or a registry pass could fix: five of the
nine open pathways in this lane would close if the registry named these authorities the way Wyoming's
does.

---

## ID — delta +1, one absorbed, two open

Two pathways bind 1:1 on subsection-level citations: `...-under-idaho-code-67-3004-10` →
`id_isp_expungement`, `clean-slate-shielding-...-67-3004-11` → `id_clean_slate_shield`.

**Absorbed (1).** `withheld-judgment-idaho-code-19-2604-review-branch` — this is not a relief route
(`routeType: "review"`); it is the runtime materialisation of a registry stop condition. The
`id_isp_expungement` track states: *"A dismissal granted under § 19-2604(1) is excluded from this
route. Taking the set-aside first permanently forecloses the non-conviction expungement route for
that record."* Three of the four ID tracks additionally carry *"A § 19-2604 dismissal already
happened or is being contemplated, because the sequencing changes what relief remains."* The compiled
branch says the same thing from the other side. Recorded as
`absorbed_by_registry_scope_restriction`, naming authority `I.C. § 19-2604(1)`.

**Open (2).** `juvenile-expungement` (`I.C. § 20-525A`) and
`human-trafficking-survivor-vacatur-and-expungement` (`I.C. § 67-3014`). Both citations are stated in
the compiled profile. Neither statute appears anywhere in the 497-track registry projection, and no
ID track names either one in a scope restriction. **Missing:** a registry track, or a registry stop
condition, for `§ 20-525A` and `§ 67-3014`.

The two ID registry tracks with no compiled relief pathway — `id_set_aside_dismissal`
(`§ 19-2604(1)`) and `id_felony_reduction` (`§ 19-2604(2)`) — are what net the three unrepresented
pathways down to a +1 delta.

## LA — delta +2, three absorbed, none open

Nine of twelve pathways bind 1:1 on a shared operative article (976, 977, 977(D)/998, 978, 985,
985.1, 985.2, 985.3, and the misdemeanor 894(B) set-aside against `la-987`).

**Absorbed (3), all by variant decomposition.**

1. `felony-article-893-e-set-aside-followed-by-expungement` → `la-987-set-aside-and-dismiss`. The
   registry track *is* the instrument: *"Motion to Set Aside Conviction and Dismiss Prosecution; Rule
   to Show Cause; Order of Dismissal (La. C.Cr.P. art. 987)"*, and its authority set carries both
   `art. 893(E)` and `art. 894(B)`. The compiled profile files exactly that instrument: *"Motion to
   Set Aside Conviction and Dismiss Prosecution - Art. 987"*. The misdemeanor and felony set-aside
   branches are two narrower variants of one track.
2. `first-offender-pardon-felony-expungement` → `la-978-felony-conviction`. It is branch 3 of the same
   compiled Article 978 eligibility test that the ten-year clean-period pathway is branch 2 of, and
   `la-978` already carries `La. Const. art. IV, § 5(E)(1)` and `La. R.S. 15:572`.
3. `human-trafficking-survivor-expungement-fee-exempt-route` → recorded against
   `la-977-misdemeanor-conviction`. It is not an independent remedy: *"If certification is obtained,
   applicable Article 977 and 978 time delays are waived, and the applicant is not required to pay
   expungement fees."* It modifies both `la-977` and `la-978`; the schema takes one track id, so E3
   may bind it to either.

**Why still unresolved.** `surplusAccountedFor` is 3 and the delta is 2. The candidate pool is empty
— nothing in LA is unexplained — but the stop condition requires the two numbers to match, and they
do not, because `la-999-expedited-expungement` (arts. 999, 999.1, the age-17-at-arrest route) has no
compiled LA pathway at all. Three unrepresented pathways minus one unrepresented track is the +2.
E3 should treat LA as fully evidenced and reconcile the count, not hunt for more pathways.

## MS — delta +4, three absorbed, one open

The one jurisdiction here where the premise holds exactly: nine pathways bind 1:1 to the nine
registry tracks, four claim no track, no track is left unrepresented.

**Absorbed (3).**

1. `human-trafficking-survivor-vacatur-and-expungement` — the closest analogue to WY in the lane. All
   nine MS tracks carry: *"Screen gently for trafficking-survivor relief under § 97-3-54.6(6) on every
   Mississippi intake, because it reaches any misdemeanour or non-violent felony at any time with no
   waiting period and no first-offender limit, and is therefore broader and faster than this track."*
   The registry routes that authority outside its own tracks and requires a handoff. Recorded as
   `absorbed_by_registry_scope_restriction`, naming authority `Miss. Code Ann. § 97-3-54.6(6)`.
2. `intervention-court-completion-expungement` → `ms-diversion`, whose legal name is *"Expungement
   After Pretrial Intervention or Intervention Court Completion (Miss. Code Ann. §§ 99-15-123,
   9-23-23)"* and whose authority set and stop conditions both carry `§ 9-23-23`. Two runtime branches,
   one registry track.
3. `dui-nonadjudication` → `ms-dui`, the section-level `§ 63-11-30` track. The binding rests on the
   shared Attorney General opinion (`Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020)`, which the registry
   lists as an `ms-dui` authority and which the compiled profile quotes precisely on *"expungement of
   nonadjudicated first-offense DUI charges in certain circumstances"*) and on the conviction branch
   excluding anyone who has *"previously had a DUI nonadjudication or expungement"* — the exclusivity
   of two branches of one scheme. This is weaker than a shared operative subsection, which is why MS
   is recorded at medium confidence.

**Open (1).** `uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59`. `Miss. Code Ann.
§ 99-15-59` is quoted operatively in the compiled profile and the string `99-15-59` occurs nowhere in
the registry projection or the authority ledger. The MS non-conviction track is pinned to a different
statute, `§ 99-19-71(4)`. **Missing:** a registry track or scope restriction for `§ 99-15-59`.

## OK — delta +8, eight absorbed, two open

The entire +8 is one mechanism. The registry names the `22 O.S. §§ 18-19` petition family by **record
class** — non-conviction/innocence, deferred dismissal, misdemeanor conviction, felony conviction,
pardon. The runtime splits each class into the numbered `§ 18` eligibility categories:

| Registry track (record class) | Compiled pathways | Surplus |
| --- | ---: | ---: |
| `ok_18_19_nonconviction` — *"Non-Conviction or Innocence Record"* | 4 (no charges filed; acquittal/dismissal; reversed and dismissed; DNA innocence) | +3 |
| `ok_18_19_deferred_dismissal` | 3 (misdemeanor; nonviolent felony; up to two felonies) | +2 |
| `ok_18_19_misdemeanor_conviction` | 2 (fine-only under $501; other eligible) | +1 |
| `ok_18_19_felony_conviction` | 3 (one nonviolent felony; not more than two; reclassified as misdemeanor) | +2 |
| | | **+8** |

Which member of a group is called "direct" and which "narrower variant" is arbitrary and does not
change the count. One flag for E3: the Oklahoma state pack cites `22 O.S. § 18a` for
`felony-reclassified-as-a-misdemeanor` while its own label places the route in `§§ 18-19`; `§ 18a`
appears nowhere in the registry, so the target track for that one pathway (felony-conviction vs
misdemeanor-conviction class) should be confirmed. The surplus count is +1 either way.

**Open (2).** `human-trafficking-survivor-relief` (`22 O.S. § 19c`, cited in the compiled profile) and
`juvenile-record-expungement` (`10A O.S. § 2-6-109`, cited in the state pack). Neither authority
appears in the registry — the ten OK tracks run on `§§ 18, 18b, 19, 19a, 19d, 60.18, 991c` — and no OK
stop condition names either. **Missing:** a registry track or scope restriction for `§ 19c` and
`10A § 2-6-109`. In the arithmetic they are offset by `ok_identity_theft` and `ok_osbi_portal`, two
registry tracks with no runtime representation, which is why the delta still reads +8.

## PA — delta +1, one absorbed, one open

**Absorbed (1).** `path-f-deceased-person-expungement` → `pa_age70_deceased`. The registry track is
authorised at `18 Pa.C.S. § 9122(b)` and its legal name carries both grounds: *"Petition for
Expungement on Age 70 or Death Grounds"*. The runtime splits that one track into `path-e`
(*"70 years of age or older and has been free of arrest or prosecution for 10 years"*) and `path-f`
(*"dead for three years"*). `path-f` is the narrower variant.

**Open (1).** `path-k-human-trafficking-vacatur-expungement` — the weakest-sourced pathway in the
lane. It cites no statute anywhere in its rule set; its only authority is a legal-aid FAQ, and it
self-describes as *"an attorney escalation path"*. No PA registry track names a vacatur authority and
no PA stop condition mentions trafficking. **Missing:** the operative PA vacatur statute on the
compiled side, or a registry scope restriction naming it.

On the deficit side, `path-a-non-conviction-expungement` is a single pathway covering two registry
tracks — its own rule text routes *"Pa.R.Crim.P. 790 for court cases, or Pa.R.Crim.P. 490 for summary
cases"*, i.e. `pa_790_nonconviction` and `pa_490_nonconviction`. Two unrepresented pathways against
one double-covered track nets to +1.

## SD — delta +3, none absorbed, three open

SD identifies cleanly and closes on nothing. Five pathways bind 1:1 on shared operative citations
(`§ 23A-3-27`, `§ 23A-3-34`, `§§ 23A-3-35 to 23A-3-37`, `§§ 23A-27-13 to 23A-27-17`, `§ 24-14-11`),
using up all five registry tracks, and exactly three pathways are left with no track — matching the
+3 delta:

| Compiled pathway | Authority | Status |
| --- | --- | --- |
| `controlled-substance-deferred-disposition-route` | `SDCL § 23A-27-53` | open |
| `juvenile-delinquency-sealing` | `SDCL §§ 26-7A-115 to 26-7A-116` | open |
| `juvenile-trafficking-expungement` | `SDCL § 26-7A-115.1` | open |

Neither closure route is available on the evidence:

- **Variant decomposition** would require the target track to carry the authority. `sd_sis_sealing`
  lists `§§ 23A-27-13, 23A-27-14, 23A-27-17` and not `§ 23A-27-53`. The compiled drug route says only
  that the court *"must dismiss the original charge"*; it does not state that the dismissal produces
  sealing under `§ 23A-27-17`. Treating it as a narrower variant of the SIS track would be an
  assumption dressed as evidence, and `23A-27-*` proximity is chapter numbering, not authority.
- **Registry scope restriction** is not available either. SD's three stop conditions concern the Class
  2 misdemeanor ceiling, pardons granted outside chapter 24-14, and `§§ 22-22-1`/`22-22-7` teaching
  licensure. None names a juvenile or trafficking authority the way `wy_nc_1401` names
  `§ 14-6-241` and all three WY tracks name `§ 6-2-708`.

**Missing:** an SD registry track or stop condition naming `§ 23A-27-53`, chapter `26-7A`, or
`§ 26-7A-115.1`.

---

## Method and self-check

- Every `source` in the evidence artifact is a repository path, and every `quote` was verified by
  substring match against that file at build time — the builder aborts if a quote is not found. No
  quote was transcribed by hand into the artifact.
- Name similarity was never used to bind a pathway to a track. Bindings rest on a shared operative
  citation, a registry authority-set entry, a registry legal name that unites the grounds the runtime
  splits, or an explicit registry scope restriction.
- No compiled pathway was dropped and no registry track was invented. Where the count and the evidence
  disagreed (LA), the evidence is reported and the disagreement is named.
- The nine pathways left open are named individually with the specific artifact that would close them.
