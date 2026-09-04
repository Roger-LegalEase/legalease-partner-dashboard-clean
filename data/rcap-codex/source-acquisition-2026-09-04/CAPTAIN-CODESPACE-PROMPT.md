# Captain Codespace prompt

```text
CAPTAIN TAKEOVER — INTEGRATE THE 28-FAMILY OFFICIAL-SOURCE ACQUISITION

REPOSITORY
Roger-LegalEase/legalease-partner-dashboard-clean

CONTROLLING BRANCH
claude/source-acquisition-28-20260904

DRAFT PR
#223 — RCAP: promote 28-family source-acquisition ledgers and captain handoff

MISSION
Integrate the acquired official-source evidence into the authoritative RCAP source records, family bindings, currentness state, and release/readiness ledgers. Do not merely merge the evidence branch. Validate every source, apply the recorded identity corrections, preserve the owner-only binary custody boundary, regenerate derived artifacts, and report the exact remaining blocker.

FIRST ACTIONS

1. Establish environment identity and update the branch:

   git remote -v
   git status --short
   git fetch origin
   git switch claude/source-acquisition-28-20260904
   git pull --ff-only origin claude/source-acquisition-28-20260904
   git rev-parse HEAD

2. Read these controlling files before editing anything:

   data/rcap-codex/source-acquisition-2026-09-04/CAPTAIN-HANDOFF.md
   data/rcap-codex/source-acquisition-2026-09-04/results/README.md
   data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json
   data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/acquisition-summary.json
   data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/source-ledger.yaml
   data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/family-source-bindings.csv
   data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/acquisition-summary.json
   data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/supplement-disposition-summary.json

CONTROLLING RUNS

- Primary acquisition: 33866926858 — SUCCESS
- Corrected supplement: 33868246348 — SUCCESS
- Ledger promotion: 33870717231 — SUCCESS
- Failed supplement 33867794063 is superseded. Do not use it.

DOWNLOAD THE ISSUER-ORIGINAL BYTES

The repository is public, so original PDFs and DOCX files were deliberately kept in authenticated artifact custody. Download them and move the validated originals into durable owner-only custody before October 4, 2026:

   gh run download 33866926858 \
     -n rcap-targeted-source-acquisition-28-33866926858 \
     -D /tmp/rcap-source-primary

   gh run download 33868246348 \
     -n rcap-targeted-source-supplement-28-33868246348 \
     -D /tmp/rcap-source-supplement

Verify the artifact digests recorded in results/artifact-custody.json, then verify every retained source against its receipt SHA-256, byte length, printed title, printed form number, revision, MIME type, page count, final URL, scope, and component relationship. Record a durable owner-only custody locator. Do not commit the source binaries to this public repository.

FAIL-CLOSED BATCH ACCOUNTING

- 28 owner-assigned families.
- 26 families have every required downloadable source acquired.
- 31/33 required distinct downloadable sources acquired.
- 32/34 distinct source records acquired when reconciliation-only Colorado JDF 686 is counted.
- Delaware mandatory expungement is not a missing PDF. It is a no-public-binary SBI agency-process/source-identity disposition.
- Missouri CR301 is the sole remaining original-binary acquisition blocker: official OSCA file 116396 returns HTTP 403 and requires a normal interactive-browser download.

DO NOT REPORT “28/28 ACQUIRED.”

IDENTITY CORRECTIONS THAT MUST BE APPLIED

1. Missouri FI-05
   - One file serves six families.
   - SHA-256: 53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e.
   - Bytes came through the St. Louis County Courts endpoint and match the historical hash. Preserve provenance; keep a review open if the release gate requires OSCA-origin transport.

2. Missouri CR301
   - Status remains issuer_binary_blocked_http_403.
   - Official OSCA file ID: 116396.
   - Historical inventory SHA-256: 5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8.
   - Do not claim the historical repository inventory as a fresh acquisition.
   - Do not substitute CR310, CR311, or another form.

3. Delaware 281E
   - Continuation/charge-extension sheet attached to Form 281.
   - Not a standalone initiating filing.

4. Delaware mandatory expungement
   - The repository label DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION is descriptive, not an issuer-assigned form identity.
   - No public application binary is exposed.
   - Move the family to SOURCE_IDENTITY / PROCESS_GUIDANCE: contact SBI; if eligible, SBI supplies an eligibility letter and instructions.
   - Do not substitute a court form.

5. Massachusetts
   - ma-seal-admin-set and ma-seal-decrim-set use the same PETITION TO SEAL parent PDF.
   - Part A, box 4 is the decriminalized-conduct election inside that parent, not another PDF.

6. Colorado
   - JDF 683 is the petition.
   - JDF 684 is the denial order, not the proposed granting order.
   - JDF 686 is the Order to Seal Municipal Conviction Records and is the granting/sealing-order component.
   - Repair any 683→684 proposed-order mapping.

7. California
   - SDSC CRM-307 is acquired.
   - Preserve San Diego County-only scope. Never bind it statewide.

8. Georgia
   - The acquired GBI/GCIC form expressly serves arrests prior to July 1, 2013.
   - Do not substitute or generalize the post-2013 process.

9. Maine
   - Expected hash c72e74f191a1bddb48453e3094e8a657baabf552299f353acd8bf0d8a418fed1 belongs to CR-307.
   - Current CR-308 is a distinct verified order with SHA-256 b2e78f24cb33d52c692d20b5bff3f0ab58115da9f26363df99cf2970f0a645f5.
   - Do not reject CR-308 because one family-level hash was applied to both files.

10. West Virginia
    - The queue cross-assigned the hashes.
    - SCA-C906 current SHA-256: 43b5606c9faf6fcf4d6f73c1d97cf1bd87798158dee1b6f3381c8a0472b4b64c.
    - SCA-C907 current SHA-256: 2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222.
    - Correct the hash-to-form mapping. Do not mark the issuer files stale.

11. Montana
    - Preserve five actual documents: Form A, Form B, Proposed Order, Certificate of Service, and DOJ/CRISS Expungement/Removal Request.
    - Proposed Order and Certificate of Service are distinct files with distinct hashes even though the old MT-OCA-MMRTA label collided.
    - Assign distinct document IDs and retain shared-file bindings across the serving/completed families.

12. North Dakota and Texas
    - SFN 14859 is the regular pardon application; do not substitute the summary-marijuana form.
    - Texas § 411.0736 petition, order, and inability-to-afford statement are three separate components. The petition and order are in the corrected supplement.

EXECUTION RULES

- Reconcile each family and source individually from receipts. Workflow success is not source success.
- Preserve shared-source deduplication. Do not download or store identical files once per family.
- Do not let source acquisition decide legal suitability, field-map compatibility, reproduction permission, or supersession without issuer evidence.
- Do not broaden county-local sources to statewide scope.
- Do not preserve descriptive repository labels when the issuing authority uses a different identity.
- Do not expose private artifact URLs, credentials, or owner-only source bytes in Git.
- Do not rebuild the factory bureaucracy. Make the source records and participant deliverables correct.

INTEGRATION WORK

1. Verify artifacts and source hashes.
2. Move original binaries to durable owner-only custody and record non-secret custody locators.
3. Update the authoritative source records and family bindings for all 28 families.
4. Apply every identity, hash, parent/continuation, shared-source, and scope correction above.
5. Reclassify Delaware mandatory expungement out of PDF acquisition.
6. Keep Missouri CR301 open with the exact browser-download stop.
7. Regenerate the source queue, problematic-PDF register, authority/currentness ledgers, track/family readiness, and release artifacts.
8. Run the repository’s targeted source, shared-PDF, binding, terminalization, and launch-readiness verifiers. Run the broad monolithic suite only if a targeted failure proves it is necessary.
9. Commit bounded changes and push them.
10. Update PR #223 or open the appropriate integration PR according to the captain branch protocol.

STOP INSTEAD OF GUESSING WHEN

- an artifact digest or per-source hash fails;
- printed identity conflicts with a receipt;
- the issuer now serves different bytes and no supersession decision exists;
- a local form would be promoted statewide;
- two different documents would retain one document ID;
- a process route is being invented as a downloadable form;
- owner-only bytes would enter public Git.

RETURN EXACTLY

CAPTAIN SOURCE INTEGRATION RESULT

BRANCH:
STARTING SHA:
FINAL SHA(S):
PRIMARY ARTIFACT DIGEST VERIFIED: YES / NO
SUPPLEMENT ARTIFACT DIGEST VERIFIED: YES / NO
PER-SOURCE HASH VERIFICATION: <passed>/<checked>
DURABLE OWNER-ONLY CUSTODY LOCATOR RECORDED: YES / NO

FAMILIES CLEARED:
FAMILIES RECLASSIFIED:
FAMILIES STILL BLOCKED:

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

VERIFIERS RUN:
RESULTS:
REMAINING EXACT BLOCKERS:
```
