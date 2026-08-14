# Handoff — il-immediate-seal (IL, lane C1, controlled pleading)

Job `T-C-IL-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry entry `tracks[140]`

## Authority

| Citation | What it supplies |
| --- | --- |
| 20 ILCS 2630/5.2(g) | Immediate sealing. The relief and the same-day, same-hearing filing rule |
| 20 ILCS 2630/5.2(g)(5)(A) | The defendant's attorney may immediately petition the court on the defendant's behalf — the provision that makes this attorney-mediated |
| 20 ILCS 2630/5.2(a)(3)(B) | Minor traffic offenses, recorded as an exclusion |
| 20 ILCS 2630/5.2(c)(3)(A) | Not authority for the relief. The recorded fallback: ordinary non-conviction sealing, available at any time, routed through `il-seal-nonconv` |

Official sources on the track: 20 ILCS 2630/5.2 (ilga.gov), Public Act 104-0459 (Clean Slate Act, enrolled HB 1836), the Approved Statewide Forms expungement/sealing page, the EXP-AD Request PDF, and the ISP Bureau of Identification fee schedule. **All five carry `sha256: null`.**

## Mechanism

Arrests or charges not initiated by arrest resulting in acquittal or dismissal with prejudice on or after January 1, 2018 may be sealed immediately. The petition is filed with the circuit clerk on the same day and during the same hearing in which the case is disposed. A copy is served on the State's Attorney in open court and on no one else. The presiding trial judge enters an order granting or denying during that hearing.

## Route decision

**Custom pleading, drafted.** `outputStrategy` and `outputStrategyDeclared` are both `custom_pleading`; `compositionMode` is null and `units[]` is empty — a single-unit controlled pleading, not a composed route. `packetSet.components` lists three required custom-pleading components with no `officialFormId` on any of them:

1. `il-immediate-seal-primary-filing-1` — the petition. Drafted.
2. `il-immediate-seal-proposed-order-2` — the proposed order. Drafted as an empty-outcome instrument.
3. `il-immediate-seal-instructions-3` — the filing instruction sheet. Delivered as `participant-instructions.md`, participant-only.

No official-form dependency exists for this track. The statewide adult suite expressly does not reach it: *"Relief tracks governed: A, B, C, D, E, F, G, H, J, and stage 2 of K."* Nothing is blocked on lane D or E.

Delivery is attorney-mediated. The packet is prepared for retained counsel, appointed counsel or the public defender to file during the disposition hearing. Nothing in the packet asserts that LegalEase files, appears, or serves.

## What is deliberately absent

- **Certificate of service.** No component exists; service is a copy handed to the State's Attorney in open court by counsel and produces no certificate. The suite's *Certificate of Service by Circuit Clerk* belongs to § 5.2(d) and is not carried across.
- **Notice of Filing.** The § 5.2(d) four-recipient notice (State's Attorney, arresting agency, chief legal officer, ISP) belongs to the statewide-suite route. The only notice rule on this track is a duty on the **court** to inform the defendant of the right and the procedure — not a document the participant produces.
- **Verification statute citation and penalty label.** Both null. The petition is verified and notarization is `none`, but no statute, no penalty wording and no prescribed form is stated. Handled the way the ND config handles its missing verification statute.
- **Sovereign party name, sovereign role, party-versus-party caption line.** Null. A full-value scan of the compiled profile for `People of the State` and `PEOPLE` returns zero hits; the profile's only illustrative Illinois caption (`sourceSections[25]`) has no party line at all.
- **Record custodian list and relief scope beyond the identified arrest or charge.** Null. No source states which agencies a § 5.2(g) sealing reaches.
- **Cover sheet, affidavit.** Neither source records one.
- **Any fee figure.** No statewide schedule exists and the track's own fee statements conflict.

## Open counsel flags (15)

**Release blockers (3).** No verified form for the § 5.2(g) mechanism and no known local form, so title/caption/structure are legal-ops constructions (`il-immediate-seal-no-verified-form`); whether an attorney-handoff packet is the accepted delivery model at all (`il-immediate-seal-attorney-handoff-delivery-model`); the accepted caption and party styling (`il-immediate-seal-caption-and-party-line-unconfirmed`). The first two carry the registry's own two release blockers; the third is added here.

**Source conflicts (2), both material.**

1. *Internal to the registry entry.* `scopeRestrictions[3]` still says *"LegalEase does not generate a filing for this route,"* sourced to the superseded memo line *"Output strategy: process_guidance."* `scopeRestrictions[0]` says the opposite and is the later statement — the packet-only re-review that reclassified the track to `custom_pleading` and found that *"a participant-facing petition and proposed order exist under § 5.2(g)."* `outputStrategy` and `packetSet` agree with `[0]`. **This config follows `[0]` and drafts.** `[3]` needs striking or rewriting upstream.
2. *Registry versus compiled profile.* The profile instructs the opposite of this route decision: *"The agent should always steer users to these official forms rather than drafting a bespoke pleading"* and *"never tell a user a county requires a different bespoke petition"* (`sourceSections[20]`, `sourceSections[2]`). The registry's track-level finding is that the mandatory suite does not reach § 5.2(g). The registry governs here, but the profile will mislead anything that reads it alone.

**Build gap (1).** The track collects only four screening keys — `hasUpcomingDisposition`, `isRepresented`, `offenseDateOnOrAfter2018`, `dismissalWithPrejudice`. **None of them identifies the case, the county or the court**, yet a caption needs a county and a case number. Every fixture leaves them blank in consequence.

**Unstated field (1).** Fee posture is internally inconsistent: `rules.fees` says no fee, while `participantActionRequired` carries a *required* `pay_fee` action and a conditional Rule 298 waiver *"where a county fee applies."*

**Scope restrictions (4).** Sealing-only vocabulary; oral in-open-court service with no assertion of service; the same-hearing window plus the § 5.2(c)(3)(A) fallback stated plainly; attorney-mediated end to end with OSAD Expungement Unit (866-787-1776) as the default referral.

**Counsel confirmation (2).** `il-immediate-seal-verification-statute-null` — the required verification form, any applicable statute or Supreme Court rule, and whether the civil-practice certification language applies. `il-immediate-seal-movant-label` — whether the moving party is styled Defendant (registry, § 5.2(g)(5)(A)) or Petitioner (profile example); both are recorded rather than one being silently chosen.

**Gates (2).** `il-immediate-seal-legal-status-gate` — `legalStatus: legal_review_pending`, output, visual and technical-proof review all outstanding. `il-immediate-seal-source-freshness-gate` — all five official sources lack a SHA-256.

## F-review pointers

- **F / source conflict — route classification.** The registry entry asserts both `custom_pleading` and `process_guidance` postures in the same `scopeRestrictions` array. Resolve at the registry, not per-artifact.
- **F / source conflict — statewide-forms mandate.** Record the § 5.2(g) carve-out in the compiled IL profile so `sourceSections[20]` stops contradicting the track.
- **F / source gap — local form.** Whether *any* Illinois circuit publishes a local § 5.2(g) petition form is unknown and gates release. This is the single most valuable research item on the track: finding one would replace the constructed title and caption outright.
- **F / source gap — screening completeness.** The track's `generationRequirements` cannot support a caption. Either the case identity is read across from the existing criminal matter or the requirement list is short.
- **F / source freshness.** Five sources at `sha256: null`, retrieved 2026-07-30, against a statute amended by the Clean Slate Act with most provisions effective June 1 / June 30, 2026. Re-retrieve and hash before release.
- **F / fee data.** No statewide fee schedule for Illinois. The profile records McLean County at $136 ($60 filing + $60 ISP + $16 certified copies) and a Cook County single-fee-per-day rule; those are § 5.2(d) figures and none of them is printed here. A county fee table is an open release blocker across IL.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/illinois/` — `index.ts`, `all50-build-metadata.ts`, `court-routing.ts`, `filing-instructions.ts`, `eligibility-rules.ts`, `fee-notes.ts`, `safety-language.ts`, `required-fields.ts`, `document-types.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/IL-illinois.json` (sha256 `ee28d428d52f2c8ae7583b889f8f74aa0a83c5730cf13636b50bc7072e12c169`, profileVersion `2026-06-19-source-conversion-1`)
- Pinned registry entry `tracks[140]` (trackId `il-immediate-seal`)

The committed Illinois state pack records nothing about § 5.2(g) specifically. It supplies the court name, the fee-variability and fee-waiver posture, the sealing-versus-expungement vocabulary rule, the RAP-sheet step, the safety disclaimer and the no-invented-addresses rule. Track prose, authority, rules, packet composition, exclusions and manual completion items all come from the pinned registry entry. The compiled profile records no pathway, question, decision rule or packet-generator entry for this track; its eighteen `immediate seal` hits all belong to the § 5.2(h) human-trafficking survivor route, a different track.

Build-first internal review material. Not approved for live use.
