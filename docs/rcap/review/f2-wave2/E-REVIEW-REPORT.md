# Lane E — F2+F3 Independent Review, Wave 2

- **Reviewer role:** independent F2+F3 reviewer for lane E's corrected inputs. Not the implementing lane; no lane-owned artifact was edited. The only outputs are this report and `E-DISPOSITIONS.json`.
- **Review base:** `a20987d1e55fc759960b05d4991b8263a63656c1`, verified an ancestor of the checked-out tip. The single commit above it (`6a80bd5`) adds the wave-2 dispatch record and touches no reviewed artifact, so every byte reviewed is the review base's byte.
- **Scope:** the four corrected California Tier-1 families (CR-180, CR-181, CR-409, CR-410) as F2 jobs and F3 jobs, plus the corrected DE Form 281 and ME CR-289 exact-supported-deferral profiles as F2 jobs. CR-106 is a preserved hold — verified, not closed.
- **Date:** 2026-08-12

## Evidence hashes

All ten recorded evidence hashes match the reviewed bytes (`sha256sum`, byte-for-byte):

| Job evidence | Recorded | Matches |
| --- | --- | --- |
| CA CR-180 profile.json | `a87b9c950ba2…` | yes |
| CA CR-181 profile.json | `091b032fbebb…` | yes |
| CA CR-409 profile.json | `633065744f81…` | yes |
| CA CR-410 profile.json | `c1c68e7b42d0…` | yes |
| DE Form 281 profile.json | `c8047b559324…` | yes |
| ME CR-289 profile.json | `02d156de6968…` | yes |
| CR-180 output-fingerprints.json | `ef65bc5e2757…` | yes |
| CR-181 output-fingerprints.json | `9a9103cbf0c2…` | yes |
| CR-409 output-fingerprints.json | `9a5e6a0c108f…` | yes |
| CR-410 output-fingerprints.json | `bd6313fb7f46…` | yes |

## Gates run (after `npm ci`)

| Command | Result |
| --- | --- |
| `node scripts/verify-rcap-hard-form-outputs.mjs` | pass — 13 fixtures re-rendered from pinned derivatives across 7 profiles, fingerprints byte-compared |
| `node scripts/verify-rcap-hard-form-rendered-assertions.mjs` | pass — 43 assertions over the flattened participant bytes |
| `node scripts/verify-rcap-hard-form-dispositions.mjs` | pass — 3 non-packet treatments (CR-106 hold, DE, ME) |
| Reviewer-authored geometric containment sweep | pass — 149 populated fields, 156 drawn text runs, all inside their widget appearance boxes at print size |

The outputs verifier was read line-by-line before trusting its green: it genuinely re-renders every fixture from the sha-pinned derivative, observes XFA presence **before** `getForm()`, proves flattening, scans raw bytes for `/XFA /JavaScript /Launch /SubmitForm /ImportData`, checks page geometry and anchors, forbids protected-field bindings, requires `checkoutProhibited: true`, enforces en/es key parity with an untranslated-string check, and cross-checks bindings against the field census including column-x and printed-label geometry. The rendered-assertions verifier extracts text from appearance XObjects (not just page streams), which is where flattened values actually live.

## CA Tier-1 families — F2

### CR-180 Petition for Dismissal → **correction_required**

Everything on the job's mustVerify list passes:

- **XFA/widget shadow:** XFA observed in input, deleted before `getForm()`, output flattened, rebuilt from pages so orphaned XFA/JS objects do not survive in the raw bytes; re-scanned at the byte level.
- **Fixtures:** canonical, boundary, negative and route-1203-43 all re-render to their recorded fingerprints.
- **Protected fields / anchors:** court-use, footer-control and signature fields never bound (engine throws; verifier re-asserts); both anchors (`PETITION FOR DISMISSAL`, `CR-180`) survive in extracted output text.
- **tracksServed:** exactly the five dismissal/reduction tracks; arrest sealing is correctly elsewhere (CR-409/410).
- **F2-12a corrected:** `petitionDate` no longer touches item 7. The binding is now `deferredEntryDismissalDate`, supplied only by the route-1203-43 fixture, and `lineMustNotMatch` proves the item-7 § 1000.3 date line stays blank on every non-1203.43 fixture. Caveat recorded: `routeGate` is declarative — no script reads it; the enforcement is fact-supply discipline plus the rendered assertions.
- **F2-12b corrected:** the mislabeled `Offense1`/`Reduce1` columns are in `unboundByDecision` with the printed headers quoted; every conviction-table binding carries a census-checked `columnCheck` at the column's x.
- **F2-07 corrected:** `participantFacingStrings` en/es key-for-key, machine-checked for parity, emptiness and untranslated strings.
- **F2-19 corrected structurally:** the profile carries `checkoutProhibited: true`, which the outputs verifier fails without; and `LEGACY_VERIFIED_JURISDICTIONS` in `src/lib/rcap/documents/packet-route-resolver.ts` is exactly `["MS", "IL", "DC", "PA", "TX"]` — a CA route resolves `guidance_only` with `sellable: false`, `creditConsumable: false`, fail-closed.

Two defects require correction:

1. **F2-10 residual.** The participant-facing service surface now exists (CR-106's held profile covers all six CA tracks and passes the dispositions verifier) — the dependency is stated, not hidden — but it nowhere states the **15-day prosecutor-notice period** that `CA-california.json` carries verbatim for the 1203.4 routes, and the wave-1 acceptance condition's second conjunct — **a verifier assertion that a CA petition family declares its service component or an explicit service instruction** — exists in no verifier: deleting `cr-106-proof-of-service/profile.json` would fail nothing for this family. *Acceptance:* state the 15-day notice on the participant-facing service surface (en and es, carrier: `CA-california.json`), and add a machine check that fails any CA petition-family profile that neither ships a service component nor declares a participant-facing service instruction.
2. **False enforcement claim in `overflowPolicy.note`.** The note asserts "bounds are enforced and an over-length value fails the render instead of inventing an attachment." Both halves are false of the committed engine: `renderHardFormPacket` records `report.overflowed` and returns success — verified empirically at the review base by binding a 100-character value into the 14-char `Code1` field (render succeeded, exit 0, one overflow recorded, zero failures) — no verifier reads `report.overflowed`, and `scripts/rcap-hard-form-xfa-shadow-fill.mjs:138` still carries the `truncate_with_addendum` branch that fabricates "see Attachment A" (dead for committed profiles, live code). *Acceptance:* make the claim true — fail the render or turn the outputs verifier red when `report.overflowed` is non-empty, and remove or fail-closed the fabrication branch — or restate the note to exactly what the bytes do. Verifiers stay green; fingerprints unchanged unless rendered bytes genuinely change.

### CR-181 Order for Dismissal → **technical_approved**

F2-13 corrected: the page-1 caption block and both page-2 header fields are bound to participant facts; rendered assertions prove the defendant name and case number appear in all three fixtures; every grant/deny disposition box and the judicial signature/date remain protected and blank. F2-07 and F2-19 corrected as above. Fixtures re-render to recorded fingerprints; anchors hold; tracksServed matches the petition's five tracks, which the companion order genuinely serves.

### CR-409 Petition to Seal Arrest Records → **technical_approved**

F2-14 corrected: `CourtInfo` binds `courtCountyAndAddress` and `TCCaseName` binds `defendantName` only, each with the pre-printed text quoted in a binding note; assertions prove "People v." never appears and the pre-printed court line is never doubled. F2-07/F2-19 corrected. tracksServed is exactly `ca-851-91`. F2-10 as it applies here: the service dependency is stated via CR-106 (which names `ca-851-91` and tells the participant they may also have to serve the arresting law-enforcement agency); the 1203.4-specific 15-day rule does not attach to this track; the missing family-side verifier assertion is returned on the CR-180 closure and will cover this family when it lands.

### CR-410 Order to Seal Arrest Records → **technical_approved**

F2-15 corrected and the fill is no longer inverted: the three clerk `Stamp_court_case` fields are protected, the petitioner's identity (T186 Last/First/Middle) and mailing address (FillText38/37) are bound — each with a `printedLabelMustContain` assertion checked against the source page's own content-stream geometry — and the canonical assertion proves the case number does **not** appear (the clerk fills it). Caption duplication fixed as in F2-14. F2-07/F2-19 corrected. tracksServed is exactly `ca-851-91`.

**Promotion rules for every CA approval above:** technical approval makes a family eligible for captain integration only. The six CA packet routes additionally require **F3 approval, runtime wiring, legal-adoption continuity and staging acceptance** before any terminal promotion.

## CA Tier-1 families — F3

All four F3 jobs close **technical_approved**:

- **Fingerprint match:** the outputs verifier re-renders every fixture from the sha-pinned derivative and byte-compares the serialized `output-fingerprints.json` — any drift fails the run. Pass at the review base; the committed fingerprint files match their recorded `renderedArtifactsSha256`.
- **Containment at print size:** this review independently reproduced each fixture's fill (same binding application, same appearance regeneration) and measured **every drawn text run in every populated widget's normal-appearance stream** against its BBox using the embedded font's width tables: 149 populated fields, 156 runs (multiline `CourtInfo` measured per wrapped line), zero exceptions at 0.75pt tolerance, including the boundary fixtures' longest values.
- **Viewer matrix as recorded:** `pdf-lib parse: verified` (the verifier re-loads every rendered artifact); `Adobe Reader: not_required_by_design` (XFA deleted, output flattened, rebuilt from pages — proven by raw-byte scan).
- The environment has no rasterizer (no qpdf/mutool/ghostscript/poppler), matching the contact sheets' own recorded caveat; the geometric measurement above is this review's print-size evidence.

CR-180's F3 approval covers the rendered bytes at the review base. The F2 correction returned on that family is profile-prose and verifier-scope and must not change rendered bytes; if any correction changes them, the fingerprints refresh and the F3 closure re-opens.

## CR-106 Proof of Service — hold preserved (not closed)

The hold is enforced, not merely described: CR-106 has its own `profile.json` with `strategy.tier: held_on_source_or_design`, `checkoutProhibited: true` at both levels, a complete participant treatment (who must be served, what to gather, what not to do), an exact blocker with owner and next action, and **no bindings and no fixtures** — the dispositions verifier would fail a non-packet treatment declaring either, and it passes. Nothing under `src/` references CR-106; no family or artifact treats it as supplied; its own participant strings say it is not included in any packet; and every CA route is structurally non-sellable (CA absent from `LEGACY_VERIFIED_JURISDICTIONS`). The wave-1 F2-11 defect (the hold living outside every verifier) is corrected. No closure is recorded; the hold stays nonterminal per the dispatch.

## DE Family Court Form 281 — exact_supported_deferral → **technical_approved**

**F2-05 corrected at its root.** The venue premise that previously had no committed source — every-charge-disposed-in-Family-Court files in Family Court — is now grounded in a pinned committed carrier. This review verified independently, against the committed bytes:

- `evidence/DE_FORM-1021IP_…REV-2023-10.pdf` — 630,042 bytes, sha256 matches the pin (`f2c8a0b1b8a4…`); extracted-text companion matches its recorded sha256.
- `evidence/DE_FORM-281E_charge-sheet_REV-2018-09.docx` — 26,118 bytes, sha256 matches the pin (`aaca121e3bb4…`); extracted text matches.
- **All eight `quotesRelieduponVerbatim` are present** in the committed extracted text (re-checked by this review, not taken from `quotesVerifiedAtPinTime`).
- The county rule ("…disposed of in Family Court, then you must file in Family Court in the county where your most recent case was terminated") and the notarization step ("Petition (notarized) (Form 281)") were additionally located verbatim in the pinned carrier.
- The uncarried `§ 4374(c)` subsection claim is dropped; the citation now reads "10 Del. C. § 1025 and 11 Del. C. § 4374" exactly as the petition language printed in 1021IP.
- The rejection of the committed Superior Court petition candidate is re-grounded on the carrier ("If you have any charges or convictions outside of Family Court, then you must file in Superior Court…") rather than the former assumption.

**Deferral completeness:** exact — Form 281 and Form 283 are absent from every committed source (1021IP names both as the packet contents; the bundle carries only the 281E continuation sheet); all three rejected candidates carry full sha256, what-it-actually-is, and why they cannot serve the track.

**No payment surface on the deferred route:** `checkoutProhibited` and `paymentProhibited` at both levels, enforced by `verify-rcap-hard-form-dispositions.mjs` (pass); structurally, DE is absent from `LEGACY_VERIFIED_JURISDICTIONS`, so `resolvePacketRoute` returns `guidance_only` with `sellable: false`, `creditConsumable: false`.

**F2-07** corrected (en/es key-for-key across all seven participant strings). **F2-18** reconciled: the profile's `ledgerReconciliation` records the `production_packet → exact_supported_deferral` downgrade with the reason and the ledger owner, and `data/rcap-ledger/track-terminalization.json` now carries `candidateTreatment: exact_supported_deferral` with `candidateEvidence` pointing at this profile.

**Non-blocking exactness notes for the owner:** (1) the 45-day criminal-history expiry in `whatToGather` is supported by committed bytes (`DE-delaware.json` states it repeatedly — verified) but is not among the pinned quotes, so `legalIntegrityDisposition`'s "every claim traces to a verbatim quote in a pinned carrier" slightly overstates; pin the quote or cite `DE-delaware.json`. (2) "Photo identification" over-specifies the carrier, which says only "along with your identification" — match the carrier's word.

## ME CR-289 Motion to Seal — exact_supported_deferral → **technical_approved**

**F2-06 corrected at its root.** The adopted Maine legal design the adjudication cites — which wave 1 found cited but absent from the repository — is now pinned into the family, and every previously-uncarried claim quotes it. This review verified independently, against the committed bytes:

- `evidence/ME_LEGAL-REVIEW_maine-record-clearing_ASOF-2026-07-30.md` — 93,459 bytes, sha256 matches the pin (`fe11e0a4fb17…`).
- `evidence/ME_CR-289_REV-2024-10.pdf` — 166,837 bytes, sha256 matches the pin (`bbf89387690d…`) **and** matches the `formCandidate` sha256 already pinned in `ME-maine.json`; the extracted-text companion matches its recorded sha256.
- **All seven `quotesRelieduponVerbatim` are present** in the committed bytes (re-checked by this review).
- The three claims wave 1 flagged are now carrier-backed verbatim: the deferral premise (c. 513 repealed the § 2262-A(1) prerequisite; "Release blocker for participant-facing accuracy…"), the no-self-reporting claim (grounded in the quoted § 2264(7) carve-out), and the CR-307 next step, which the pinned review states in the profile's exact words ("reaches any conviction and has no waiting period").
- Additionally located verbatim in the pinned carrier: the CR-218 contrast (four-year clock, lifetime self-reporting on the general track), the § 2262-A one-year route, § 2264(5) "shall grant the motion" on a preponderance — the participant text's "greater weight of the evidence" is the plain-language equivalent — and the blocker's harmless-in-most-cases reasoning for former § 853-A convictions.

**Deferral completeness:** exact — Rev. 10/24 predates PL 2025 c. 513, paragraph 1 recites a repealed prerequisite, and signing would assert a condition the law no longer imposes; both unblock branches (revised form issued / Rev. 10/24 confirmed current with counsel recording the recital harmless) are spelled out with owner and next action.

**No payment surface on the deferred route:** `checkoutProhibited` and `paymentProhibited` at both levels, enforced by `verify-rcap-hard-form-dispositions.mjs` (pass); structurally, ME is absent from `LEGACY_VERIFIED_JURISDICTIONS`, so `resolvePacketRoute` returns `guidance_only` with `sellable: false`.

**F2-07** corrected (en/es key-for-key). **F2-18** reconciled in both places (profile `ledgerReconciliation`; ledger `candidateTreatment`/`candidateEvidence`).

## Cross-cutting observations (non-blocking, for the owner and counsel)

- The Spanish participant strings across all lane-E profiles are written without diacritics ("peticion", "esta", "unicamente"). Key parity and translation are machine-checked and pass; orthography is a counsel-review item, which remains an open gate before `approved_for_live`.
- `quotesVerifiedAtPinTime` is a pin-time self-report; no verifier re-checks pinned quotes at verify time. This review re-checked them all manually. A small verifier loop over `pinnedCarriers` would make the quote discipline machine-enforced.

## Totals

| Outcome | F2 | F3 |
| --- | --- | --- |
| technical_approved | 5 (CR-181, CR-409, CR-410, DE 281, ME CR-289) | 4 (CR-180, CR-181, CR-409, CR-410) |
| correction_required | 1 (CR-180) | 0 |
| held_on_source_or_design | 0 closed (CR-106 hold verified preserved, not closed) | 0 |

All six lane-E F2 jobs and all four lane-E F3 jobs in the wave-2 manifests are closed. Every CA approval is eligible for captain integration only — the six CA packet routes additionally require F3 approval, runtime wiring, legal-adoption continuity and staging acceptance before any terminal promotion.
