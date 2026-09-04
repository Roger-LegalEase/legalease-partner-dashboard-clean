# Captain resume directive — source-integration stop resolved

**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Branch:** `claude/source-acquisition-28-20260904`  
**Previous captain start:** `326a567c34626a416ca9b8c43980e11210135bd8`  
**Status:** Authoritative integration may resume. One source binary remains blocked: Missouri `CR301`.

## Read first

```text
data/rcap-codex/source-acquisition-2026-09-04/results/captain-stop-resolution.json
data/rcap-codex/source-acquisition-2026-09-04/results/corrections/DE-FORM-281-date-provenance.json
data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json
data/rcap-codex/source-acquisition-2026-09-04/CAPTAIN-HANDOFF.md
```

The promoted primary and supplement artifacts remain immutable acquisition evidence. Do not rewrite their archived contents. Use the correction record as the controlling integration overlay.

## Stop 1 resolved — Delaware Form 281

There is no source-identity conflict.

The three dates describe three different metadata layers:

- **Official Delaware Courts forms-index revision date:** `11/26/2025`.
- **Revision printed in the issuer-original Form 281:** `Rev 11/25`.
- **Date embedded in the issuer filename:** `11192025`, meaning November 19, 2025.

The official forms index currently lists Form 281, *Petition For Expungement of Adult Record*, with revision date `11/26/2025`. The retained issuer-original `.doc` prints `Form 281` and `Rev 11/25`; its Content-Disposition filename is `281 - petition for expungement of adult record 11192025.doc`.

### Required authoritative treatment

Store these separately whenever the schema permits:

```text
issuerCatalogRevisionDate = 2025-11-26
printedRevision = "Rev 11/25"
issuerFilenameDate = 2025-11-19
legalEffectiveDate = null unless separately established
```

Do not replace the printed revision with the catalog date. Do not discard the catalog date. Do not describe `11/26/2025` as a legal effective date without separate issuer authority.

The exact machine-readable resolution is:

```text
data/rcap-codex/source-acquisition-2026-09-04/results/corrections/DE-FORM-281-date-provenance.json
```

This clears the captain’s Delaware stop condition.

## Stop 2 resolved — durable owner-only custody

The immutable source archives are now in an owner-only Google Drive folder:

```text
Folder ID: 1fbmrR7ArOXw9CMvKlWFtZwQKq7XYju5R
Folder: 2026-09-04 — 28-family acquisition
Parent: RCAP Owner-Only Source Custody
Visibility verified: shared=false; owner-only permission observed
```

Primary archive:

```text
Drive file ID: 1xWvjkwl3ev-vx8b56PubDwJyHqulV9Nu
Filename: rcap-targeted-source-acquisition-28-33866926858.zip
Bytes: 16154170
SHA-256: 7e30f1b2e49c6fa47714b24c18d88cd764e554fe22a6072bd6faf429fef0f813
```

Supplement archive:

```text
Drive file ID: 1iLYGgg-vZUMGB5F5iR94e1EAVeibmOOt
Filename: rcap-targeted-source-supplement-28-33868246348.zip
Bytes: 794519
SHA-256: 2390f30919ab7eecda2c384023900f9f45cd983e86fb2b7a468510b354e38b90
```

The repository custody record is authoritative:

```text
data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json
```

The captain may now return:

```text
DURABLE OWNER-ONLY CUSTODY LOCATOR RECORDED: YES
```

## Remaining source blocker — Missouri CR301

`MO-CR301` remains `issuer_binary_blocked_http_403`.

```text
Family: mo-610-145-mistaken-identity-set
Official form: CR301
Official binary: https://www.courts.mo.gov/file.jsp?id=116396
Historical expected SHA-256: 5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8
Historical expected bytes: 952015
```

The current 16th Judicial Circuit forms page still identifies `CR301` and points to OSCA file `116396`, but direct, browser-context, and authenticated-tool transfers continue to receive HTTP 403. No substitute was accepted.

Keep this family blocked until a normal interactive browser produces the OSCA binary and it passes identity, byte-length, and SHA-256 inspection. Do not substitute `CR310`, `CR311`, or another form.

## Integration mission now authorized

Proceed with authoritative source integration rather than stopping the entire batch.

1. Fetch and fast-forward the controlling branch.
2. Verify the three stop-resolution commits are present.
3. Read the correction and custody records above.
4. Apply the acquisition results and identity corrections to the authoritative source records, packet-family bindings, currentness state, and readiness ledgers.
5. Integrate or reclassify the 27 families that are no longer source-blocked.
6. Preserve `mo-610-145-mistaken-identity-set` as the one remaining original-binary source hold.
7. Apply all previously listed corrections: Delaware 281E continuation; Delaware mandatory SBI process guidance; Massachusetts shared Petition to Seal parent and Part A box 4 election; Colorado JDF 684 denial versus JDF 686 granting order; Georgia pre-July 1, 2013 scope; Maine hash assignment; West Virginia cross-assigned hashes; Montana distinct document identities; California San Diego-only scope.
8. Regenerate every affected source, relationship, problematic-PDF, authority, currentness, track-readiness, family-readiness, and release artifact from the authoritative generators.
9. Run the targeted source, shared-PDF, relationship, terminalization, and launch-readiness verifiers.
10. Commit the integration in bounded commits and update draft PR `#223`.

Do not use workflow success as a substitute for per-source disposition. Do not report `28/28 source-cleared` while `CR301` remains unavailable.

## Captain codespace prompt

```text
CAPTAIN RESUME — THE FAIL-CLOSED STOPS HAVE BEEN RESOLVED

Repository: Roger-LegalEase/legalease-partner-dashboard-clean
Branch: claude/source-acquisition-28-20260904
Draft PR: #223

The previous integration pass stopped before mutation because:
1. Delaware Form 281 carried apparently conflicting dates.
2. No durable owner-only custody locator had been recorded.
3. Missouri CR301 remained unavailable.

Stops 1 and 2 are now resolved. Stop 3 remains intentionally open.

FIRST

git fetch origin
git switch claude/source-acquisition-28-20260904
git pull --ff-only origin claude/source-acquisition-28-20260904
git status --short
git rev-parse HEAD

READ

data/rcap-codex/source-acquisition-2026-09-04/CAPTAIN-STOP-RESOLUTION-2026-09-04.md
data/rcap-codex/source-acquisition-2026-09-04/results/captain-stop-resolution.json
data/rcap-codex/source-acquisition-2026-09-04/results/corrections/DE-FORM-281-date-provenance.json
data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json
data/rcap-codex/source-acquisition-2026-09-04/CAPTAIN-HANDOFF.md

DELAWARE FORM 281 DECISION

There is no identity conflict.

- Delaware Courts catalog revision date: 2025-11-26.
- Printed form revision: Rev 11/25.
- Issuer filename date: 2025-11-19.
- Legal effective date: not separately established.

Preserve those as distinct provenance fields. Do not overwrite the printed revision with the catalog date, and do not discard the catalog date.

OWNER-ONLY CUSTODY

Recorded and verified:
- folder ID 1fbmrR7ArOXw9CMvKlWFtZwQKq7XYju5R
- primary archive file ID 1xWvjkwl3ev-vx8b56PubDwJyHqulV9Nu
- supplement archive file ID 1iLYGgg-vZUMGB5F5iR94e1EAVeibmOOt
- folder and both files: shared=false, owner-only permission observed

You may return DURABLE OWNER-ONLY CUSTODY LOCATOR RECORDED: YES.

MISSOURI CR301

Keep only this source hold open:
- family mo-610-145-mistaken-identity-set
- OSCA file 116396
- expected historical SHA-256 5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8
- expected historical bytes 952015

Do not substitute another Missouri form and do not claim fresh acquisition.

MISSION

Resume authoritative integration now. Integrate or reclassify the 27 families that are no longer source-blocked. Apply every identity, scope, shared-parent, continuation, and hash correction in CAPTAIN-HANDOFF.md. Keep CR301 as the one remaining source-binary hold. Regenerate all derived ledgers and readiness artifacts, run targeted verifiers, commit bounded changes, push, and update PR #223.

RETURN EXACTLY

CAPTAIN SOURCE INTEGRATION RESULT — RESUMED

BRANCH:
STARTING SHA:
FINAL SHA(S):
PRIMARY ARTIFACT DIGEST VERIFIED: YES
SUPPLEMENT ARTIFACT DIGEST VERIFIED: YES
PER-SOURCE HASH VERIFICATION: 32/32
DURABLE OWNER-ONLY CUSTODY LOCATOR RECORDED: YES

FAMILIES INTEGRATED:
FAMILIES RECLASSIFIED:
FAMILIES STILL SOURCE-BLOCKED:

DE FORM 281 DATE PROVENANCE:
- Catalog revision:
- Printed revision:
- Filename date:

IDENTITY CORRECTIONS APPLIED:
- DE 281E continuation:
- DE mandatory SBI process:
- MA shared parent / box 4:
- CO JDF 684 vs JDF 686:
- GA pre-2013 scope:
- ME hash assignment:
- WV hash assignment:
- MT distinct document identities:
- CA San Diego scope:

GENERATORS RUN:
VERIFIERS RUN:
RESULTS:
COMMITS PUSHED:
PR #223 UPDATED: YES / NO
REMAINING EXACT BLOCKERS:
```
