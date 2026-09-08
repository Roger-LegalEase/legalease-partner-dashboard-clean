# Chat 5: Kentucky nonconviction complete candidate

September 7, 2026. Family `ky_nonconviction_expungement-set`.

## Completed and measured

13 complete packets, 90 pages, 45 generated family files. Required official AOC-497.2 (two pages), a real case-specific charge/agency filing attachment, optional official AOC-497 (two-page proposed order), and three participant instruction pages. Canonical: six pages. Boundary: eight pages with seven charges, mixed statutory predicates, long accented name and a disclosed missing phone. Five statutory bases each exercised with and without proposed order; a missed automatic-expungement exact-60-day fallback is also rendered.

63 renderer tests passed. Six modified COMPLETE PDF controls all failed the actual-byte audit as intended: missing page, invented participant signature, judicial action ink, clerk-service ink, false predicate selection and missing charge attachment text. Two full renderer runs plus the final owned directory match on every one of 45 files. All 36 distinct complete-page images were visually inspected; all 90 pages are hashed, including 54 exact PNG-byte aliases. This is author QA only.

Canonical SHA256: `348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2`.
Boundary SHA256: `93f902bfe7108680379c49d5a4cf27273369b67a7794e989ee17c52a8ee20474`.

## Commands actually executed

```sh
node scripts/rcap-packet-recovery/chat5/test-ky-nonconviction.mjs /mnt/data/chat5-ky-tests.json
node scripts/build-census-v1-ky_nonconviction_expungement-set.mjs
python scripts/rcap-packet-recovery/chat5/audit-ky-nonconviction.py --root . --evidence /mnt/data/chat5-ky-author-qa
node scripts/build-census-v1-ky_nonconviction_expungement-set.mjs --out /mnt/data/chat5-ky-full-pass-1
node scripts/build-census-v1-ky_nonconviction_expungement-set.mjs --out /mnt/data/chat5-ky-full-pass-2
```

Every command exited zero. Full-file comparison and exact measured output hashes are in the artifact's `build-summary.json` and `full-renderer-comparison.json`. The renderer suite also imports the wrapper without side effects. `--check` is never counted as regeneration.

## Exact sources and adopted decision

The held two-page AOC-497.2 and AOC-497, Rev. 7-20, were recovered from source run33866926858/artifact9934370357. Complete ZIP SHA256 `7e30f1b2e49c6fa47714b24c18d88cd764e554fe22a6072bd6faf429fef0f813` was verified, then members safely extracted and individually hashed. Current official four source pages were visually compared; a freshly downloaded issuer-binary digest is not claimed. Current track and source contracts, current queue family/source bindings, shared helpers, lockfile and the adopted August28 decision were read/reconciled. No stale global manifest or regenerated queue is consumed or changed.

The adopted Q-003 holding makes the five predicates charge-specific alternatives. The attachment identifies each charge's actual basis and date, not a blanket check-all rule. No new legal approval is requested for that already-decided issue.

## Truthful manual completion and source-owner fields

No SSN is fabricated or stored in these synthetic fixture inputs. The source's SSN field is expressly disclosed as requiring private completion with the clerk and applicable redaction handling. Participants must also personally sign/date before the notary or Circuit Court Clerk; the witness completes the jurat. The boundary phone must be supplied. These manual requirements are not represented as completed facts or zero missing fields.

The clerk's service certificate, every proposed judicial finding, grant/deny selection, judge signature/date and agency compliance certificate remain blank. Fee instructions correctly treat this as a free nonconviction petition with no eligibility certification or unnecessary fee waiver. No-indictment service/timing stays separate from ordinary dismissal/acquittal and from the automatic process.

## Exact-byte publication and review

The complete artifact includes all 45 generated family files, both official sources, code/tests, byte audit, per-page images and a Git binary patch for exactly47new paths. Patch SHA256 `6ba3939b078276cc78c56d1496eb7763eed11a15ef18eda891541c0ff21785e1`, 4623567bytes. It was applied in a separate empty repository and every resulting byte matched the actual renderer/source files.

The code/evidence PR does not by itself install the PDF paths in GitHub. A must apply these exact existing bytes after checking current paths and preserving newer work. This is a publication handoff, not a request to author or rebuild. See `artifact-handoff.json` for the checksum-bound archive locator. Chat4 independently reviews these complete bytes; A owns central raster/admission/runtime binding. No independent pass, production readiness or terminal promotion is claimed.
