# Fourteen binaries the index said the Master Library held, and never did

**Measured 2026-09-09.** Corrected in `data/rcap-all50/local-source-corpus-index.json`
at the commit carrying this file. Regression tests:
`scripts/verify-corpus-index-custody-attribution.test.mjs`.

## What was wrong

`data/rcap-all50/local-source-corpus-index.json` attributed fourteen binaries to
the `master_library` custody. The Master Library has never carried them.

The consequence was not subtle. `corpus_matches_committed_index` in
`scripts/verify-packet-build-environment.mjs` samples twenty-four entries of the
custodies this container actually mounts. `master_library` is mounted, so the
fourteen were resolved, found absent, and reported as corpus corruption — and
because the preflight is a gate, **every packet build in this container was
refused, for every family, on a false report about an intact archive.**

## The evidence

Nothing here is inferred from the path shape alone.

1. Neither Master Library extraction in this container contains a
   `LegalEase <State>/` directory at all — not the 499-file extraction under
   `private/source-imports/`, not the 501-file operational mount. All 336
   `STATES/…`-shaped `master_library` entries verify byte-exact; all fourteen
   `LegalEase …`-shaped ones are absent. Their **content** is absent too:
   every file under the root was hashed and none matches any of the fourteen
   digests, so they are not present under another name.
2. `scripts/generate-rcap-local-source-corpus-index.mjs` states the invariant
   they break, in its own custody table: *"the Master Library's top level is
   `STATES/` and `00_GOVERNANCE/`, and every repository-relative custody root
   lives under `private/`, so no other custody produces a `LegalEase <State>/`
   path."* The generator could not have emitted these under `master_library`.
   It also refuses to run when a declared custody is unmounted, so it cannot be
   regenerated in this container to correct itself.
3. They entered at `c1ba78023` — *"Attach SRC05 materialized source cohort"*.
   `data/rcap-grade-a/packet-factory-24h/src05/SOURCE_MATERIALIZATION_RETURN.json`
   records the Codex worker `CODEX-CS2-SRC05` fetching twenty-one binaries from
   Google Drive into
   `/workspaces/cs2src05/private/source-imports/…/LegalEase <State>/` — the
   field is literally named `exactIgnoredLocalPath` — and reports
   `sourceBodiesStagedOrCommitted: false`. The bytes lived in an ephemeral
   container, were never staged or committed, and are in no release. Fourteen of
   the twenty-one were attached to the index; the other seven were not attached
   at all.
4. They are not the Nationwide recovery pool either. None of the fourteen paths
   appears in `data/rcap-all50/NATIONWIDE_PARTIAL_CUSTODY_2026-09-02.json`, and
   none is named in its `absentFromRecoveryPool` list of seventy.

## What the correction does, and does not do

The fourteen entries move to a declared custody,
`src05_worker_materialization_2026_09_02`, with
`custodyType: EPHEMERAL_WORKER_MATERIALIZATION_NOT_PERSISTED` and
`bytesHeldByAnyMountedCustody: false`. Its root is not mounted, so the resolver
excludes it from comparison and the preflight names it among the custodies it
did not compare. Per-custody counts were recorded down: `master_library` 350 →
336.

They were reattributed rather than deleted. Deleting them would erase the record
that fourteen source obligations were once recorded as satisfied, and the trail
back to the acquisition that fetched them.

**No family gained anything.** The 73 `SOURCE_READY` families were preflighted
before and after: `family_sources_bind` is byte-identical for all 73. It already
refused the families that depend on these bytes — `al-pardon-set`,
`nc_145_8a_youthful-set`, `mo-610-145-mistaken-identity-set` and
`official-form-treatment:…:CA:ca-1203-4b` — and still refuses them. The only
thing that changed is that an intact corpus is no longer reported as corrupt.
Every other entry in the index is byte-identical apart from the custody id:
984 entries in, 984 out, 0 otherwise changed.

## The open requirement this exposes

These are real source obligations with no held bytes. Each carries an owner-only
Google Drive `fileId` in the SRC05 return, so re-acquisition by the owner is
executable; nothing here can fetch them.

| form | file | sha256 (16) | bytes | Drive fileId | families |
|---|---|---|---|---|---|
| CR-432 | LegalEase California/CR-432.pdf | 8ef45f07cf9fac15 | 109666 | 1PtXCgSbU_i86XEJC7Een4FGo1ZAdhyv8 | ca-1203-4b |
| ABPP-3 | LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf | 874e738a83c35774 | 160009 | 1gtsVBXAjLedr0MzrF6eMNWBw3rw-NVkh | al-pardon-set |
| CR310 | LegalEase Missouri/MO_CR310.pdf | 2592efa5a9cbe170 | 106723 | 1S-dg44ushGUcYAALjEgYBKmjieRl3QsY | mo-575-120-identity-theft-correction-set |
| CR143 | LegalEase Missouri/MO_CR143.pdf | e39619185578a4a2 | 69818 | 1cn8Gu8gAgTWi4pLYqPne4CXvUqWUN85Z | mo-610-122-arrest-expungement-set |
| CR370 | LegalEase Missouri/MO_CR370.pdf | 8a4d32d66d3fc05a | 103658 | 1mcBDDIGVtm05PZraqLUOgmWVo1d8hT_d | mo-610-140-arrest-set, mo-610-140-conviction-set |
| CR311 | LegalEase Missouri/MO_CR311.pdf | 3ce91ab2c9bbcdb4 | 97529 | 1r45LLdLn0xlMtniVGyHIBGAbkIOa7eG5 | mo-610-145-mistaken-identity-set |
| AOC-CR-293 | LegalEase North Carolina/AOC-CR-293_Rev-3-25.pdf | 37308914289a0164 | 271932 | 1IBHAQ2Dh9IWymWZwI1R7SsAucyBEdy9N | nc_145_8a_youthful-set |
| AOC-CR-293-INSTRUCTIONS | LegalEase North Carolina/AOC-CR-293-INSTRUCTIONS_Rev-3-25.pdf | ae9e161bf5a190b2 | 217181 | 1dLzbn4_9v8A3ZcJSRK4_1PANMofHXo6V | nc_145_8a_youthful-set |
| AOC-G-260 | LegalEase North Carolina/AOC-G-260_Rev-5-24.pdf | cf998cecefea090e | 290429 | 1Hxui0PCjlfPlsImFv2gnFYDs4Sux4yNQ | nc_auto_146_a4_agency_followup-set |
| 1501CR | LegalEase Utah/1501CR.pdf | 69c37d4da60eeccd | 175626 | 1hnvPeDSAxw4xvosbP0rxpI0HdFlNIcUP | ut_pet_remove_link-set |
| 1501CR-C | LegalEase Utah/1501CR-C.pdf | 25e24089f588bf32 | 177335 | 1YgTrSPRe51ndKjL9vPqD1kdZ-Mo1rwwX | ut_pet_remove_link-set |
| 1502CR | LegalEase Utah/1502CR.pdf | d23d74d35aafbc5e | 106034 | 1QuYjAhIixVwN14sgbzfCq2KLFDY7hn0V | ut_pet_remove_link-set |
| 1001EX | LegalEase Utah/1001EX.pdf | 0f575aa4c08f9ce0 | 112139 | 1sHLFJOcqbdk2Z4Gs-KBP_PSib2rqw7HW | ut_pet_special_certificate-set |
| 1021EX | LegalEase Utah/1021EX.pdf | 2b730d0a34f91a69 | 104276 | 1zHmG__sBZ3c41xBQIfBfXotHQ_fwp_Av | ut_pet_special_certificate-set |

One of these bears on an already-terminal family.
`mo-610-145-mistaken-identity-set` is `COMPLETE_PACKET_PROVEN` and its preflight
here refuses two of its sources (`official-form:CR301`, `official-form:FI-05`).
That is a separate question from this correction — its own source receipt pins
the digests it was proven against — and it is recorded here rather than acted
on, because acting on it needs the bytes this table is asking for.
