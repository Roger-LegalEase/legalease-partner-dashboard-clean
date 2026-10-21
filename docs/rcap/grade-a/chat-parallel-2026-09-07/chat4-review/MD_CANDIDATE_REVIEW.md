# Chat 4 independent Maryland candidate review

Session: `chat4-20260907-md-ky-independent-02`, September 7, 2026. Reviewer: ChatGPT, GPT-6 Astra Pro, a separate review session, not the packet author and not licensed counsel. Builder PR: #231, code/evidence head `362694c4fea3872e80778533fd477c6212f63791`. Ordinary family: `md_10105_favorable-set`.

## Result

**Supplied complete outputs: reviewed with no observed packet correction required. Candidate input guard: FAIL_REPAIR_REQUIRED, CHAT4-MD-01. Not terminal, not production admitted.**

This examination covers all fifteen complete PDFs and all sixty page instances, not old repository PDFs. Every official petition and every instruction page was viewed in a complete four-page sheet. Thirty distinct full-page images plus thirty exact aliases account for all sixty instances. Every declared whole-output hash matched. All 268 declared text writes read back in their mapped field rectangles; all 46 declared selection boxes contained added ink. All eleven protected source regions in each of fifteen petitions, 165 regions, were pixel-identical to the held blank. The actual boundary agency remains blank and is specifically disclosed as required before filing. No signature, date, attorney act, notarial act or judicial act was invented.

Do not discard the successful packet work because of the narrow guard finding below. A guard-only repair that leaves these outputs identical should reuse these identities and page findings.

## Measured identities

Retrieved through connected Google Drive: `1cwxyVrBP-xUSKyRe5iT04jt7tL-X35kH`, `CHAT5_MD_FAVORABLE_COMPLETE_2026-09-07.zip`.

* ZIP: **19,919,295 bytes**, 119 entries, SHA-256 `c161b8a78a62342677d716bacbfa72f3bdc7de0c93fe8b254889f012fff1433f`.
* Canonical whole PDF: `1b0c72fd95847a8097339061546246649b4a2465b7915c8dd54df0ebfd2d9101`, 199,274 bytes, four pages.
* Boundary whole PDF: `44c3c53433c133e0beb0cf05f771969ae53714526177aeb60806e2dac41f45be`, 199,476 bytes, four pages.
* Held official 09/2025 CC-DC-CR-072A: `8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2`, 195,791 bytes, one page.
* Existing source/output publication patch: `45625505304c4b5ad245c83e00a4fa24df021bc4a4c4a7ea35b52d397a30b042`, 4,510,813 bytes. All 52 files in its publication manifest matched independently measured archive file hashes. The reviewer did not apply the patch to a repository.

The matching `data/.../chat4-review/md-measurements.json` records all fifteen whole-PDF digests, all sixty ordered page references to thirty separately measured PNG digests, and source/map/instruction/manifest digests. PNG identity is not a whole-PDF hash. Review images were freshly generated from the candidate PDFs using PyMuPDF `Matrix(1.5,1.5)` (108 dpi, RGB, no alpha). The original retained PNGs were also independently hashed; every receipt entry matched and every fresh page's raw pixels matched the corresponding retained full-page image.

Author reports of two complete builds, 51 identical generated files, 58 renderer tests, 14 shared-primitive tests and five bad-complete-PDF controls were read, not rerun or relabeled reviewer measurements. No packet renderer, new central raster job or runtime fulfillment path was executed by this reviewer. The live issuer page/source face was examined; its raw binary SHA-256 was not independently downloaded and measured. The held source's raw digest above was measured.

## CHAT4-MD-01: internally inconsistent PBJ dates remain markable

Current connected-GitHub helper blob: `61f9b8f666882e67b57f26582d43be587947106e`. The archived helper independently hashes to that Git blob; SHA-256 `9f3a5f304e1cee49af7ba8576beab3192ac55a86dee5fbe90633d5a1a942787d`.

In `validateMdFavorable`, the date validation checks future dates and arrest/disposition chronology, but not whether discharge from the same PBJ predates its entry. Start with the archived `fixtures/selectable/pbj.facts.json`: PBJ entry and the charge disposition are `2020-04-02`. Change only `case.probationDischargeDate` to `2019-01-01`. The exact predicate returns:

```json
{"mayMarkDisposition":true,"earliest":"2023-04-02","missing":[]}
```

The period calculation silently accepts contradictory supplied events. The ordinary checkbox is therefore authorized on inconsistent known facts. This is a constructor input-validation finding, **not a claim that any of the fifteen reviewed PDFs contains those dates**. No contradictory PDF was generated. No installed upstream rejecting guard was demonstrated.

Reproduce without running a builder, from the extracted candidate root with Node:

```js
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const s = fs.readFileSync('scripts/rcap-packet-recovery/chat5/md-favorable.mjs', 'utf8');
const prelude = 'const DATE = /^\\d{4}-\\d{2}-\\d{2}$/; const clone = value => structuredClone(value);\n';
const code = prelude + s.slice(s.indexOf('export const BASIS_FIELDS'), s.indexOf('\nconst base =')).replaceAll('export ', '') + '\nglobalThis.validate = validateMdFavorable;';
const context = {
  assert, structuredClone,
  ROUTE: 'obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105'
};
vm.createContext(context);
vm.runInContext(code, context);
const f = JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj.facts.json', 'utf8'));
f.case.probationDischargeDate = '2019-01-01';
const r = context.validate(f);
console.log({ mayMarkDisposition: r.mayMarkDisposition, earliest: r.earliest, missing: r.missing });
```

Nine companion probes behaved correctly: unlike charge bases; unlike charge disposition dates; a pending criminal case; unknown selected-statement truth; supplied participant signature; requested early release; conviction instrument substitution; missing discharge; future discharge. Unknown recitals/discharge left the disposition unmarkable; the others refused their invalid inputs. These are isolated predicate probes, not complete-renderer tests. The first reviewer harness attempt omitted the ROUTE constant and was discarded before these observations.

**Exact action:** add a same-PBJ grant/discharge chronological consistency check, or demonstrate an existing current upstream rejecting guard bound to this exact constructor path. Add a valid same-day/boundary control and the pre-entry-discharge negative case. Do not change the official form, recitals or the correct existing fixture outputs merely to fix this guard.

## Legal/source and branch examination

Current primary checks included [Criminal Procedure 10-105](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105), [10-105.1](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105.1), [10-107](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-107), the [official 072A](https://www.mdcourts.gov/sites/default/files/court-forms/courtforms/joint/ccdccr072A.pdf/ccdccr072A.pdf), [Judiciary expungement instructions/fees](https://www.mdcourts.gov/legalhelp/expungement), [Rockville District Court](https://www.mdcourts.gov/district/directories/montgomeryROCKVILLE), and the [official Montgomery County court directory](https://msa.maryland.gov/msa/mdmanual/36loc/mo/html/moj.html).

Every selected branch was examined: dismissal, acquittal, arrest/summons/citation, ordinary PBJ, PBJ-no-longer-crime, PBJ-DUI, ordinary and treatment nolle/stet, NCR, compromise, original juvenile-transfer court and adult-transferee circuit court. All supplied dates and source selections are coherent. Mature nolle-treatment satisfies both its selected printed recital and treatment completion; the recent-treatment/no-release source question is not resolved by that fixture. The exact PBJ and DUI boundary dates were checked independently rather than inferred from author test totals.

The one-page filing plus three instruction pages is correct for these ordinary selections. No mandatory participant service form, proposed order, fee waiver or release is missing from these bounded packets. Court service, objection timing, no-fee treatment, venue exceptions, records/compliance follow-up and self-help stops are practical and supported. The defendant signs the source affirmation; 072A does not require a fabricated notarial jurat. The PBJ-no-longer-crime example does not authorize use of 072A for a cannabis **conviction**.

The broader registry anchor still reads as blob `5924798ceb808e8013ebb74838469ea9b39238d8`; it contains options outside source-A scope. Preserve the already-disclosed A/Chat6 selector reconciliation. Do not widen this review to early, conviction, cannabis-conviction or pardon families. Do not reopen those as ordinary-packet defects.

## Admission boundaries and preserved work

All fifteen repository obligations are recorded in `md-independent-review.json`. Fourteen pass for the stated candidate scope; ROUTE_OPTIONS fails only for the exact input guard above. These fixture measurements are not a zero-valued runtime census. Exhaustive production blank dispositions/intake completeness remain unmeasured; the intentional unknown agency and protected execution blanks are not erased.

A still must publish exact candidate source/output bytes, consume current matching review/code, perform the required central raster/admission and bind actual selected products. Existing GitHub PDFs, a local binding patch or author QA cannot substitute for that. No terminal promotion is claimed.

Only new Chat4 review evidence is written. Existing NC #230 and Nevada #232 review findings/publication branches remain unchanged. This review neither repeats them nor treats a local NC change as a published correction. Kentucky is the next candidate.
