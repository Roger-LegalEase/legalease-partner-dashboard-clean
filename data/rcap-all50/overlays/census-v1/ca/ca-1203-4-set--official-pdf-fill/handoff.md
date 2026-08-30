# ca-1203-4-set — California Penal Code § 1203.4 (official_pdf_fill)

**Result: the build stopped at step 1. No field map, no fixtures, no rendered
artifacts, no rasters.** The reason is not a mismatch and not a missing
acquisition. It is that the already-held source corpus is not mounted in this
environment.

This family is *not* `ca-1203-41-set`. That is a sibling worker's family, a
different statute and a different packet. Nothing measured or recorded here was
transferred to it, and nothing here should be read as applying to it.

## What the gate found

`source-custody-reconciliation.json` classifies this family
`SOURCE_ALREADY_HELD`, and that classification is correct — but "held" means
held in the operator-supplied Master Library, not held here.
`local-source-corpus-index.json` says so itself: `corpusRoot` is
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, and
`private/` is git-ignored (`.gitignore:53`) and absent from this clone.

All five named sources came back `UNVERIFIABLE_BYTES_ABSENT`:

| Form | Role | Pinned official SHA-256 | Official bytes here | Derivative here |
|---|---|---|---|---|
| CR-180 | Petition | `06c1b643…c98bbdbe` | absent | yes, `a2399fc3…` |
| CR-181 | Proposed order | `f737503a…95ce504` | absent | yes, `202c3384…` |
| CR-106 | Proof of service | `f8a37a9a…bf190c5a` | absent | yes, `b20f56ea…` |
| MC-025 | Attachment | `b0ca1509…94f6f0af` | absent | **none** |
| MC-031 | Attached declaration | `defc9108…95191075` | absent | **none** |

Absence was established three ways, not asserted: every `.pdf` on the container
outside `.git` was hashed and none matched any pinned value; `private/` does not
exist; and the factory's own binder,
`scripts/materialize-rcap-family-sources.mjs --check`, hard-failed with `ENOENT`
on the *first* family it reached (Alabama C-94A), which shows the corpus is
missing for every state rather than only this one. No second binder was written.

**Nothing was acquired.** No egress to a court host was attempted, per
instruction.

## Why the committed derivatives were not treated as a pass

Three decrypted derivatives *are* committed under
`data/rcap-all50/overlays/rescued-encrypted-pdfs/`. They load, and they
corroborate the prior lane's records well: CR-180 carries 81 AcroForm fields
against that lane's recorded 81/81, CR-181 carries 58 against 58/58, both at
612×792, and both observed hashes match the prior lane's `source-record.json`
exactly.

That is good evidence, and it is still not a gate pass. The derivative's tie to
the official form rests on `encrypted-pdf-rescue-report.json` asserting
`sourceSha256Before == sourceSha256After == 06c1b643…`. That assertion cannot be
checked here, because the bytes it refers to are the missing ones. Measuring
write-box geometry off the derivative and publishing it as this family's field
map would put a legal filing's coordinates on an unverifiable claim while
presenting them as measured — which is the specific failure this gate exists to
prevent, and a close cousin of the margin-derived checkbox the dispatch warned
about.

`scripts/lib/pdf-stroked-boxes.mjs` was read before any mapping was contemplated,
as instructed. It walks the content stream as a graphics-state machine with a CTM
stack and reports only stroked paths, so it would not repeat the earlier
`re`-only failure. It was not run in anger, because there is no verified document
to run it against.

**Unblock:** mount the Master Library at
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, or commit
the five official binaries. Either makes the pinned hashes checkable and steps
2–7 runnable exactly as written. Rasterisation is *not* a blocker — the
Chromium path in `rcap-pdf-rasterize.mjs` is available here.

## Local variation — completed in full

This step does not depend on the form bytes, so it was finished rather than
skipped. See `local-variation-record.json`. In short:

- **Established, statewide, with citation:** venue is the Superior Court of the
  county of *conviction* (not residence), and multi-county cases file separately
  in each; the prosecuting attorney must get at least **15 days' notice** before
  § 1203.4 relief; CR-180 and CR-181 travel together; the statute box (1203.4 vs
  4a vs 41 vs 42) must match the disposition; the fee is **county-set**, roughly
  $60–$150, some counties charging nothing; FW-001 waives it.
- **Established that variation itself exists:** local Superior Courts publish
  their own § 1203.4 packets and fee schedules. This is the most useful finding —
  it turns every unenumerated county detail from "unknown" into "known to vary
  and known to be unrecorded."
- **Established for individual counties: nothing. Zero of 58.** Named explicitly
  as not established: per-county fee amounts and which counties waive; per-county
  local packets and cover forms; clerk filing addresses and divisions; DA or
  city-attorney service addresses; e-filing vs mail vs in-person; copy counts and
  return envelopes; probation-department referral practice; per-county
  hearing-setting practice; and when MC-025/MC-031 attach.

The single citation is the committed compiled profile
`src/lib/rcap-engine/compiled/profiles/CA-california.json`
(`profileVersion 2026-06-19-source-conversion-1`). Its own upstream reference PDF
is **not** present here, so the quoted text could not be re-verified against
reference bytes, and that reference is a vendor agent-reference document rather
than a Judicial Council or county publication. It is adequate for a statewide
frame and inadequate for any county's local practice — which is exactly how it
has been used.

## Participant blanks

No field map was produced, so there is no per-field blank list to report. What is
already settled by rule, and would have bound the map had the gate passed:

- **CR-106 (proof of service) stays entirely unfilled.** A proof of service
  asserts under signature who was served, where, and when. It cannot be prefilled
  before mailing actually happens. The prior lane's `cr-106-proof-of-service`
  profile holds it for the same reason and adds a second one: the committed
  California design fixes only the recipient *class*, never the agency's identity
  or address for a given case — and this record could not establish those
  addresses for any county either.
- **CR-181 is a proposed order.** Its operative content is the court's. The judge
  signs it; the clerk distributes it.
- **Never prefilled anywhere in this family:** participant signatures, signature
  dates, and any court-only, clerk-only, prosecutor-only or agency-only field.

## Status of the assigned missing work

| Item | Status |
|---|---|
| `OFFICIAL_SOURCE_ACQUISITION_REQUIRED` | **Not cleared.** Correctly not by acquisition; not by binding either — the held corpus is not mounted here. |
| `OFFICIAL_FORM_MAP_REQUIRED` | **Not cleared.** Blocked by the step 1 gate. |
| `LOCAL_VARIATION_REQUIRED` | **Addressed.** Establishable variation recorded with citation; the rest named explicitly. |
| `ARTIFACT_REVIEW_REQUIRED` | **Not cleared.** No rendered artifact exists to review. |
| `OUTPUT_LEGAL_APPROVAL_REQUIRED` | **Requested, not granted.** This worker grants no approval. |

No commercial route was opened, no fulfilment record created, no packet marked
proven. No verifier was weakened, skipped or quarantined. The frozen census, the
stale-artifact block, `data/rcap-ledger/**`, compiled profiles, migrations,
workflows, `package.json`, Stripe/Supabase and Production were not modified.
