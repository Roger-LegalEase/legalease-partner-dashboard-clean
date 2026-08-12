# Restricted-file review — `rcap:verify-state-promotion`

**Purpose:** report only. No disposition is made here, and the gate is not
weakened, bypassed or narrowed. `rcap:verify-state-promotion` still fails, which
is the correct behaviour for this branch.

**Branch:** `fix/platform-document-delivery-core`
**Merge base with `origin/main`:** `9250ad1`
**Files tripping the gate:** 9
**Batch 1 legal-design work touched:** 0 of them.

---

## Why the gate fails

`assertNoRestrictedChanges` in `scripts/verify-state-promotion.mjs` compares the
branch against its merge base with `main` and fails if any changed path starts
with a forbidden prefix. The relevant prefixes here are `src/app/api/`,
`src/app/documents/` and `supabase/`.

The gate exists to keep a **state promotion** — adding or promoting a
jurisdiction — from quietly carrying platform, auth, billing, schema or
document-surface changes with it. This branch is not a state promotion. It is a
platform document-delivery branch, and the nine files are its substantive
payload. The gate is therefore firing exactly as designed, on a branch it was
designed to stop.

That is a scoping question about how this branch reaches `main`, not a defect in
the gate and not something the Batch 1 normalization work introduced or should
resolve.

---

## The nine files

| # | Path | Introducing commit | Lines |
|---|---|---|---:|
| 1 | `src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts` | `a3f7869` | +132 −13 |
| 2 | `src/app/api/rcap/packets/[fulfillmentId]/components/[componentId]/route.ts` | `8adcc45` | +69 |
| 3 | `src/app/api/rcap/packets/generate/route.ts` | `8adcc45` | +84 |
| 4 | `src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx` | `f0e0b92` | +9 |
| 5 | `src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx` | `f0e0b92` | +9 |
| 6 | `src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx` | `f0e0b92` | +9 |
| 7 | `src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx` | `f0e0b92` | +9 |
| 8 | `src/app/documents/[partnerSlug]/form/TexasHarrisPetitionInformationForm.tsx` | `f0e0b92` | +9 |
| 9 | `supabase/phase-48-rcap-document-artifact-storage.sql` | `a3f7869` | +202 |

All three introducing commits are dated 2026-07-30 and predate the Batch 1
legal-design work entirely.

---

### 1. `documents/[packetId]/pdf/[pdfType]/route.ts` — `a3f7869`

**Reason changed.** Packet download had no durable storage and no
authorization, and template resolution ended in an unconditional return of the
Mississippi petition — so a packet from any of the other 46 jurisdictions would
have been rendered onto Mississippi's court form. The commit replaces the
fallback with exact per-jurisdiction resolution that fails closed with a typed
reason, and adds authorization to the download path.

**Required for the accepted platform architecture.** Yes. Serving one
jurisdiction's participant a different jurisdiction's court form is a legal
correctness failure, and an unauthorized download path is a privacy failure.
Reverting restores both.

**Recommended treatment: approve.**

---

### 2–3. `packets/[fulfillmentId]/components/[componentId]/route.ts` and `packets/generate/route.ts` — `8adcc45`

**Reason changed.** These are the HTTP surface of the relief-track packet
engine: the shared runtime resolver, the three output engines and the artifact
lifecycle, with `packet_ready` computed rather than stored so that an expiry or
source change withdraws readiness on its own.

**Required for the accepted platform architecture.** Yes. This is the packet
engine the legal-design corpus is normalized *for*. Note that `packet_ready` is
0 across Batch 1, so these routes are reachable only for pre-existing
jurisdictions, not for anything imported in this batch.

**Recommended treatment: approve.**

---

### 4–8. The five `documents/[partnerSlug]/form/*InformationForm.tsx` — `f0e0b92`

**Reason changed.** All five jurisdiction forms ended a successful submission by
setting a message and leaving the participant on the form, with only a manual
link underneath, so a completed submission read as a dead end. Each now
navigates to the created document using the durable identifier the server
returned rather than a client-constructed path. Nine lines each, and the change
is identical in shape across all five.

**Required for the accepted platform architecture.** Yes for the navigation fix
itself. These are participant-facing UX corrections with no legal-design or
eligibility content, and they touch DC, Illinois, Mississippi, Pennsylvania and
Texas-Harris — none of which is a Batch 1 jurisdiction.

**Recommended treatment: split.** These five are cleanly separable from the
packet-engine and storage work: same 9-line shape, no shared dependency with
items 1–3 or 9, and no Batch 1 overlap. Splitting them into their own change
would let items 1–3 and 9 be reviewed on their security and schema merits
without five UI files in the same diff.

---

### 9. `supabase/phase-48-rcap-document-artifact-storage.sql` — `a3f7869`

**Reason changed.** Adds durable storage for packet artifacts — the storage half
of the same fix that removed the Mississippi fallback and added download
authorization.

**Applied?** No. The file is present in the tree and is referenced by no
application code; phase 48 is unapplied, and nothing in this branch applies it.

**Required for the accepted platform architecture.** Yes, if durable packet
artifacts are being kept. It is the largest single item at 202 lines and it is
the only schema change among the nine.

**Recommended treatment: split**, and hold. Schema deserves its own review and
its own application decision, separately from the API and UI changes it
currently rides with. It should not be applied as a side effect of merging a
document-delivery branch.

---

## Summary

| Recommendation | Files |
|---|---|
| approve | 1, 2, 3 |
| split | 4, 5, 6, 7, 8 (UI navigation) · 9 (schema, and hold) |
| revert | none |

No file here is recommended for revert: each fixes a real defect or supplies a
required surface, and reverting items 1 or 9 would restore a cross-jurisdiction
form-rendering bug and an unauthorized download path.

**This is a recommendation only.** No substantive disposition — approving,
splitting or reverting anything — has been made or should be made without
Roger's instruction. `rcap:verify-state-promotion` remains red and unmodified.
