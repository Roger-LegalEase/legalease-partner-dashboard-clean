# F2/F3 Wave-2 Lane C Independent Review Report

- **Window:** 2026-08-12-w3
- **Review base:** `a20987d1e55fc759960b05d4991b8263a63656c1` (verified ancestor of the integration tip; the tip differs only by the wave-2 dispatch record, and every reviewed artifact path is byte-identical between tip and review base)
- **Reviewer:** independent F2+F3 reviewer for lane C, wave 2 — not the implementing lane; no lane-owned artifact was edited
- **Scope:** every F2 job with lane C in `data/rcap-all50/review-artifacts/f2-independent-technical-review.json` (44 pleading jobs + 16 composed-route jobs) and every F3 job with lane C in `data/rcap-all50/review-artifacts/f3-visual-review.json` (44 render jobs). In-flight ID/NV/SC/VA/WI configs without renders are review-exempt and were not closed.
- **Dispositions:** `docs/rcap/review/f2-wave2/C-DISPOSITIONS.json`, committed per atomic group (one commit per state, 26 states)

## Evidence-hash verification

All 104 recorded evidence hashes were recomputed from the committed bytes and match:

- 60 F2 `markerSha256` values — sha256 of `pleading-config.json` (pleadings) or `route.json` (composed routes)
- 44 F3 `renderedArtifactsSha256` values — sha256 over the sorted `name:sha256` listing of each `rendered/` directory
- All 44 `render-report.json` self-recorded pdf/text hashes also match the committed `canonical.pdf` / `canonical.txt` bytes

## Verifier runs (after `npm ci`)

| Verifier | Result |
| --- | --- |
| `scripts/verify-rcap-terminalize-c1.mjs` | PASS (11 pleading tracks, 16 composed tracks, 64 components, 18 canonical renders) |
| `scripts/verify-rcap-terminalize-c2.mjs` | PASS (8 jobs, 24 tracks) |
| `scripts/verify-rcap-terminalize-c3.mjs` | PASS (11 jobs, 22 tracks) |
| `scripts/verify-rcap-no-null-presentation.mjs` | PASS (93 checks, 41 live renders, no escaped null/undefined/NaN) |

On the first run the registry authority cross-check was skipped ("pinned registry commit not available locally"). The pinned commit `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` was fetched from origin, its registry file hash confirmed (`9d37ca7c…4ae9`), and all three terminalization verifiers re-run: all green with the authority cross-check active and zero drift warnings.

## Independent F2 checks (not delegated to lane verifiers)

- **Operative authority:** for all 44 pleading tracks, the root authorizing citation recorded in the pinned registry appears in the rendered pleading. Items absent from some renders are subsection granularity, fee statutes and court rules — supplemental, not operative. The 11 C1 tracks (whose lane verifier checks only the registry *pin*, not authority content) were cross-checked citation-by-citation: every registry-recorded authority appears in the render.
- **Fixture gate probe:** the QA engine was invoked directly (outside the lane verifier) on C1 tracks. Canonical fixtures pass pleading QA; negative fixtures trip **every** declared signal (`protected_case_identifier`, `unstated_fee_asserted`, `court_finding_asserted`, `destruction_asserted`) on all probed tracks (TX ×2, CT, KY).
- **Protected fields:** independent regex sweep of all 44 canonical renders — zero SSN shapes, zero OTN values, zero judge names, dockets render blank (`[TO BE CONFIRMED]` or empty). Date matches are charge/disposition dates from synthetic fixtures, not DOB values.
- **Literal null:** independent scan of all 44 `canonical.txt` and all 44 `canonical.pdf` (text extracted from content streams) — no literal `null`/`undefined`/`NaN` outside bracketed merge fields, corroborating the central renderer fix.
- **Payment suppression:** the only "payment" language anywhere in participant artifacts is statutory eligibility content (restitution, § 44-53-450(C) fee, legal financial obligations) and a court-form URL. Nothing opens payment outside a sellable route.
- **EN/ES parity:** no lane C participant copy is bilingual (the only "bilingual" references are to Texas's own bilingual statewide form). The parity gate binds nowhere and is vacuously satisfied.

## Independent composed-route checks (blocked-component rule)

All 16 routes were re-scanned unit-by-unit against the committed bytes, independently of the C1 verifier:

- Every unit resolves to its component directory by `componentId`; no orphan component directories.
- Every `official_form_dependency` unit is either **supplied** or carries a `dependency.json` that names the official form (or states a drafting bar) plus the exact missing source and an owning lane — no blocked component disappears inside any route.
- No pleading is drafted where an official form is mandatory.
- `filingSeparation` partitions the unit set exactly (verifier-checked; spot-confirmed on IL and AR).
- Participant instructions disclose blocked branches honestly (e.g. il-prb-cert: "We do not have a form for you, and we will not guess at one").
- The only `{{merge}}` fields in participant documents (CA and IA process-guidance components) are fixture-backed templates, per the lane contract.

## Independent F3 checks

- PDF text was extracted from the content streams of all 44 `canonical.pdf` files and is **byte-parity** with `canonical.txt` after WinAnsi decoding.
- Layout: every text line was measured with real Courier/Times-Roman font metrics (pdf-lib `widthOfTextAtSize`) — zero horizontal overflows, zero lines off-page or below a 36 pt bottom margin, at declared print size.
- Structure: captions, titles, statutory-authority and signature/verification blocks present on all court pleadings; the six tracks without court captions (GA jail-k2, ME screening, NC agency follow-up, TN illegal-voting/post-pardon/recovery-court) are administrative letters by design, each with complete sender/signature blocks.
- No placeholder or internal vocabulary in any rendered document.

## Non-blocking observations (recorded, no closure impact)

1. **Registry-wide British spellings** ("offence", "programme", "1 July 1984" date style) reach participant-facing US filings in 19 of 44 renders. The spellings originate in the pinned registry itself (3,025 occurrences of "offence"), so the pleadings are *faithful* to their recorded authority; this is a global copy-style question for post-build QA/attorney review, not a lane C defect.
2. **Stale absolute worktree paths** — 44 `implementation.componentPath` values in composed-route `route.json` files point at `/home/user/wt-c1-pleadings/…`. No consumer reads `componentPath` (the verifier and this review resolve by `componentId`, and all components exist in-repo), so this is advisory-metadata hygiene for a future C1 pass.
3. Minor typo in `il-prb-cert` participant instructions: "(section 5.2(e-5)?)".

## Closing totals

| Outcome | F2 pleading | F2 composed route | F3 | Total |
| --- | --- | --- | --- | --- |
| technical_approved | 44 | 16 | 44 | **104** |
| correction_required | 0 | 0 | 0 | 0 |
| held_on_source_or_design | 0 | 0 | 0 | 0 |

All approvals are grounded in the committed bytes at the review base and remain subject to runtime wiring, legal-adoption continuity and the final ledger state.
