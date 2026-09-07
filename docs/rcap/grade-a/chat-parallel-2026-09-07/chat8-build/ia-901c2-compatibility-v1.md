# Form 1 compatibility v1: preserved packets, measured standard reports

Base branch head: `7cd091be37457d7642d0435f459234ffba954ec6`.
Original Form 1 renderer/tests and complete candidate at `9da680c4412a1d551d679c0f425f3c5f96cf1077` are preserved. This follow-up completes the standard-report work identified by Chat10's `LIMITED_FINDING` (`fddd72cd52c1f3fb085b9bfb079d40f99783b49f`, IA-03). It is author implementation QA, not independent review.

## What actually changed

No renderer was invoked. All 16 original PDF files, including all five combined fixtures / 26 pages, are byte-identical to the retained original archive. The original 69-test suite and original render implementation are unchanged. Three original text reports were enriched: source-receipt, rendered-artifacts, and participant-instructions (the latter now preserves each unchanged PDF's actual guide plus field-specific completion disclosures). New standard field census, map, actual-write, blank-disposition, counter and readiness records were produced.

The unchanged central importer reads all 285 source-area occurrences: 106 writes and 179 blanks. Source/field identities, expected versus actual text, final flattening, all selection interiors, source-versus-output protected blank pixels, component hashes and Poppler text import were remeasured from the actual source and final bytes. The measurement script does not generate a PDF. All mapped text writes match and all classified blank interiors remain unfilled. The same source census accounts for 56 terminal fields / 59 widgets plus the printed signature in each fixture.

## Results: no cosmetic all-zero claim

The full-family raw result is **FAIL_ROUTE_SELECTION**, with **requiredOptionsMissing: 2**, both in the exact-day-180 diagnostic. The other eight counters are measured zero. The source says more than 180 days, whereas the supplied assessment is exactly day 180. Neither false assertion nor fictional waiver is inserted to satisfy the parser. This is a retained source-wording diagnostic, not a newly discovered packet placement defect.

Canonical, boundary and participant-authored waiver imports have no counter failures and remain unexecuted drafts. The missing-contact import has no *undisclosed* missing-fact counter but contains **12 REQUIRED_BEFORE_FILING blank control areas**, including two telephone parts and the intended recipient. Its packet-level readiness remains false. It is not a filing-positive fixture. Both diagnostics are explicitly separated in `reports/packet-level-readiness.json`.

The declared blanket use of an attorney label for the paper recipient was replaced with precise participant-prepared recipient semantics while retaining the printed source label. Actual attorney execution fields remain protected/inapplicable. Viewer buttons are supported by the exact-source census and flags, not by an unverified free-form exemption. Fact and document identifiers are fixture-scoped to prevent one fixture's known contacts from satisfying another fixture's unknown contacts.

## Executed checks

```sh
node scripts/rcap-packet-recovery/chat8/ia-901c2-compatibility.mjs
node --test scripts/rcap-packet-recovery/chat8/ia-901c2-compatibility.test.mjs
```

Both commands exited 0. **22 new tests passed, zero failed**, including real `auditFamily` positive cases, retained diagnostic failures, a failure-producing mutation for each of the nine counters, bogus source-presentation proofs, missing-contact misclassification, changed measurement/PDF identity rejection, and report-only two-run reproducibility. These are not another full packet build or a replay of the old 69-test result. The aggregate raw audit is deliberately not PASS_COMPLETE.

## Handoff

Chat10: examine the new standard schema, source proof, blank ownership, every measured counter and explicit diagnostic readiness. The earlier complete-page review remains bound to identical PDF bytes. No new visible-page alteration is claimed or requires reassessing changed page geometry.

A: the compatibility patch is applied **after** the original candidate's pending source/output publication. It changes no PDF and must not be substituted for the original binary archive. Patch replay and all changed-file bytes are bound in `publication-manifest.json`. Source/current-fee reconciliation, current central raster admission, independent acceptance, runtime fulfillment and terminal status remain unapproved. No shared primitive, registry, queue, workflow, live route, payment or production file was edited.
