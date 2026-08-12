# Handoff — ct-under18-misdemeanor (CT, lane C1, composed route)

Job `T-C-CT-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| C.G.S. § 54-142a(f)(1) | Automatic branch. Offense on or after 1 January 2000 and before 1 July 2012; erased, or deemed erased by operation of law for scanned and non-electronic records. |
| C.G.S. § 54-142a(f)(2) | Petition branch. Offense before 1 January 2000; petition filed with the Superior Court at the location where the conviction was effected, and the court shall direct erasure. |
| C.G.S. § 54-142a(f)(3) | Same-information limitation, notwithstanding the multi-count rule at subsection (i). |
| C.G.S. § 54-142a(k) | No fee. |

## Mechanism

This is an adult record: an adult conviction for conduct committed before the person turned 18. It is not juvenile delinquency relief. Two branches turn on when the offense occurred, and only one of them requires a participant petition.

(Verbatim from `route.json` `mechanism`, itself the registry `mechanism` excerpt for this track.)

## Route decision

Alternative composed route, two units, **one deliverable**:

1. **§ 54-142a(f)(1) automatic branch** — participant instruction (`process-guidance.md`). No filing.
2. **§ 54-142a(f)(2) petition branch** — `pleading_document`, blocked. Venue and relief are known; the vehicle is not.

## The JD-CR-202 conflict — the thing to resolve first

The registry and the compiled profile disagree, and the disagreement decides whether unit 2 opens:

- **Registry:** "JD-CR-202 on its face is a Clean Slate form, not an (f)(2) form," and whether the Judicial Branch publishes an (f)(2) form at all is an open build blocker.
- **Profile:** "Pre-2000 convictions need a petition. The automatic process only reaches post-1/1/2000 convictions; older ones require JD-CR-202," and `sourceSections[5]` lists JD-CR-202 as the form for convictions entered before 1/1/2000.

A copy of JD-CR-202 is on file in the Nationwide inventory (`CR202.pdf`, sha256 `b5a917c2…`, plus an HTML rendering). So the blocker is not acquisition — it is whether that form is the right vehicle for this subsection. This route does **not** name JD-CR-202 as the dependency, because doing so would adopt the profile's reading over the registry's finding. It records the candidate, the rejection and the conflict in `components/ct-under18-misdemeanor-petition-branch-2/dependency.json`.

Note also that the profile frames the pre-2000 gap as a *Clean Slate* question (convictions entered before 1/1/2000), while this track turns on the *offense* date and on the person's age at the offense. Those are different tests, which is a further reason not to assume the JD-CR-202 path carries over.

## Open counsel flags (14)

Two build blockers (no (f)(2) vehicle; the JD-CR-202 conflict); adult-record-not-juvenile-relief; the (f)(3) same-information limitation; the automatic-branch carve-outs (motor vehicle, title 14, § 51-164r); branch selection by offense date, never computed here; the **unaddressed post-1 July 2012 window**; service, notice and notarization unstated; the § 54-142a(k) fee bar; never assume auto-erasure; terminology; immigration stop; `legal_review_pending`; source-freshness gate.

## F-review pointers

- **F / coverage gap:** no source read for this track says what happens to conduct committed while under 18 on or after 1 July 2012. The automatic branch stops there and the petition branch starts before 2000. That window has no owner. Worth an explicit answer before screening goes live.
- **F / source conflict:** the JD-CR-202 question above. This is the single decision that unblocks unit 2.
- **F / source freshness:** § 54-142a and the Clean Slate portal both carry `sha256: null`. CR202.pdf itself is hashed in the Nationwide inventory but has no recorded revision date or retrieval URL on this track.
- **F / adjacency:** a participant on the automatic branch whose record was not erased belongs on `ct-missed-erasure`, whose submission unit is itself blocked on DESPP's form and manner.

## Mandatory official-form handoffs

- **An official Judicial Branch form for a § 54-142a(f)(2) petition, if one exists** — identity, revision and URL unknown. Component `ct-under18-misdemeanor-petition-branch-2`. JD-CR-202 is recorded as a considered-and-rejected candidate, not as the dependency.

## Evidence

- `src/lib/rcap/state-packs/connecticut/all50-build-metadata.ts` (JD-CR-202 / CR202.pdf file identity and hashes), `src/lib/rcap/state-packs/connecticut/index.ts`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json` (sha256 `47a86bd5edec245949664a3302aecd1d077bafe11dad2876d866158c7437cdb7`)
- Pinned registry entry `tracks[trackId=ct-under18-misdemeanor]`
