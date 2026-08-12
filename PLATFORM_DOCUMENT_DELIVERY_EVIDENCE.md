# Platform Document Delivery — Evidence

**Branch** `fix/platform-document-delivery-core`
**Base SHA** `9250ad1b6bc4910d9447ba90638762a67b3fe369` (origin/main, PR #86 merge)
**Final SHA** `f0e0b92`
**Worktree** `/workspaces/legalease-partner-dashboard-clean-document-delivery`
**Draft PR** not opened — see *Remaining boundary*.

**Status: the platform subset is complete. Document delivery is NOT proven and the lane is NOT complete.** No jurisdiction is `packet_ready`, the runtime renderer is untouched, and the launch gate is red by design.

---

## P0 — proof-source checkpoint

**Outcome: BLOCKED. The official Mississippi source PDFs do not exist in this environment.** Renderer work was not started, and no mapping was created or inferred.

Expected, from `data/rcap-all50/nationwide-source-inventory.json` (`sourceDir: /workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing`, `sourceExists: true`, generated 2026-06-17):

| File (under `LegalEase Mississippi/`) | SHA-256 | Bytes |
|---|---|---|
| `Order-of-Expungement-for-Conviction.pdf` | `53fb893efcbf682a…` | 120,212 |
| `Order-of-Expungement-for-Dismissed-Case.pdf` | `eaa201740129a88b…` | 119,755 |
| `Petition-for-Expungement-of-Criminal-Record-of-Criminal-Conviction.pdf` | `7cc8ebba3a77b554…` | 150,674 |
| `Petition-for-Expungement-of-Criminal-Record-on-Dismissed-Case.pdf` | `8c9a450a6eed56c0…` | 150,562 |

Discovery performed, all negative:

- `/workspaces` is a separate filesystem (`/dev/loop4`); an earlier `find / -xdev` never descended into it. Re-searched without that restriction.
- Expected `sourceDir` absent. No `private/` directory in either checkout.
- Search by all four filenames, by `Nationwide Record Clearing`, by `LegalEase Mississippi*` — empty.
- Not LFS: `git lfs ls-files` empty, no LFS filter in `.gitattributes`.
- Not sparse: `git sparse-checkout list` → *"this worktree is not sparse"*.
- Ignored and absent: `git check-ignore -v` → `.gitignore:53:private/`; `git status --ignored` shows no `private/` in either checkout.
- Size sweep across every mount, any extension, for all four exact byte sizes — zero matches among 3,000 PDFs machine-wide.
- SHA-256 sweep over every PDF in all workspaces — zero matches.

`sourceExists: true` is a stale 2026-06-17 record. The directory is correctly gitignored and did not survive into this environment.

**Structural signal, recorded but not used as a classification.** The shadow-batch derivative carries the official page content and has zero AcroForm fields and zero image XObjects — a flat text/vector PDF with rule lines, not a scan and not fillable, which points to visually-confirmed coordinate overlay. The corpus-wide numbers agree: of 300 field-map drafts, 4 are `clean_acroform` and 288 have an empty `acroFields` array, and all 1,222 overlay anchors share just two placeholder geometries (`72,120,240,24` and `72,680,260,24`), every one flagged `confidence: low` / `manual_coordinate_confirmation_required`. **The fixture was not classified from a derivative and no mapping was built.**

---

## Final call graph, as changed

```
POST /api/rcap/documents/{state}/create        (unchanged — still unauthenticated, see Findings)
  -> createXDocumentPacket -> persistOrFallback -> rcap_document_packets (+ _inputs, _record_events)

form submit (5 components)
  -> on success: router.push(/documents/{slug}/{packet.id})        [NEW]

fulfillPacketArtifact({packetId, kind, jurisdiction, county, renderer})   [NEW]
  -> getStoredPacketArtifact            -> returns existing, idempotent
  -> resolvePacketAsset                 -> exact, fails closed
  -> status document_generating
  -> renderer(...)                      -> INJECTED; no renderer is wired
  -> PDFDocument.load(bytes)            -> must parse, page count > 0
  -> uploadPacketArtifact               -> rcap-document-packets-private
  -> insert rcap_document_artifacts     -> unique(packet, kind) = idempotency
  -> status document_ready + document_ready_at

GET /api/rcap/documents/{packetId}/pdf/{kind}
  -> isPacketArtifactKind               -> 400
  -> getRcapDocumentPacket              -> 404
  -> isAuthorized(owner | partner)      -> 404 (indistinguishable, deliberately)   [NEW]
  -> getStoredPacketArtifact            -> 409 not_ready / generation_failed
  -> readStoredPacketArtifactBytes      -> 503 storage_unavailable
  -> 200 application/pdf + content-length
```

`renderRcapPacketPdf` (Playwright) is **no longer reachable from the download route** but the module is untouched and still used by the five generator verifiers. It was not removed, per the constraint.

---

## Material design decisions

1. **A new registry rather than reusing `state-promotion-manifest.ts`.** That manifest already exists and is typed for all 51, but it models legal promotion (QA / attorney / source-freshness review) and currently declares all 51 `live: true`. It has no source-template binding, no mapping-approval concept and no county scoping — it cannot express "a document can actually be produced". `verify-all51-launch-enabled` asserts its contents, so it was left untouched. The new registry is the delivery layer beside it.

2. **`packet_ready` is unrepresentable without an approved mapping.** `assertRegistryIntegrity()` fails the build if a jurisdiction claims readiness with no `mappingApproved` asset, and refuses statewide `packet_ready` on a county-scoped jurisdiction. This is what stops configuration drifting ahead of runtime.

3. **Texas is county-scoped at the data level.** The statewide entry is `guidance_only`; only `harris` carries assets. `courtTemplatePathFor` additionally requires the county, so `TX` with no county — which `isTexasHarrisState` currently treats as Harris — cannot resolve the Harris template.

4. **The renderer is injected into the lifecycle, not imported.** The lifecycle can therefore be completed, reviewed and tested while the real renderer is still blocked, and swapping renderers later touches one call site.

5. **Unauthorized download returns 404, not 403**, so a caller cannot use the status to enumerate packet identifiers.

6. **The delivery gate reports BLOCKED rather than passing quietly** when nothing is declared ready, and `--require-proof` exits non-zero. Rationale in *Remaining boundary*.

---

## Files changed

**Added**
- `supabase/phase-48-rcap-document-artifact-storage.sql` — artifact table, 3 packet statuses, 2 packet columns, private bucket, RLS. Additive, **unapplied**, rollback notes in-file.
- `src/lib/rcap/jurisdictions/packet-capability.ts` — all-51 registry + integrity assertion
- `src/lib/rcap/jurisdictions/resolve-packet-assets.ts` — exact resolver, typed failures
- `src/lib/rcap/documents/artifact-storage.ts` — private bucket helper
- `src/lib/rcap/documents/artifact-service.ts` — idempotent fulfillment lifecycle
- `scripts/verify-rcap-packet-capability-registry.mjs` — 15 contract checks
- `scripts/rcap-audit-packet-delivery-all51.mjs` — all-51 audit + JSON matrix
- `scripts/verify-rcap-packet-delivery-ready-jurisdictions.mjs` — HTTP delivery gate

**Modified**
- `src/lib/rcap/documents/packet-pdf.ts` — `templatePathFor` → exported `courtTemplatePathFor`, fail-closed. Renderer body untouched.
- `src/lib/rcap/documents/types.ts` — 3 new statuses
- `src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts` — authorization + stored-artifact retrieval
- 5 × `src/app/documents/[partnerSlug]/form/*InformationForm.tsx` — post-submit navigation
- `scripts/rcap-scope-allowlist.mjs` — `PLATFORM_DOCUMENT_DELIVERY_FILES` (required: `supabase/` is a forbidden prefix in `assertNoRestrictedChanges`)
- `package.json` — 4 scripts; test chain 57 → 61
- `.github/workflows/rcap-all50-handoff.yml` — 4 steps + matrix artifact upload

---

## Commands and results

| Command | Result |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm run lint` | **exit 0** (21 warnings, all pre-existing) |
| `npm test` (61 gates, fail-fast) | **exit 0** |
| `npm run build` | **exit 0** with `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` placeholders |
| `npm run rcap:verify-packet-capability-registry` | **exit 0**, 15 checks |
| `npm run rcap:audit-packet-delivery-all51` | **exit 0**, matrix written, reports BLOCKED |
| `npm run rcap:verify-packet-delivery-ready-jurisdictions` | **exit 0**, reports BLOCKED |
| `npm run rcap:verify-packet-delivery-proof-required` | **exit 1** — the launch gate, red by design |
| `verify-all51-launch-enabled`, `verify-all50-handoff`, `verify-all50-internal-preview`, `verify-encrypted-pdf-rescue`, `verify-all50-build`, `verify-all51-final-approval` | all **pass** (allowlist accepted) |
| `verify-rcap-slot-lifecycle`, `verify-rcap-partner-mode`, `verify-rcap-partner-intake-slot-claim`, `verify-expungement-drop-point-nudges` | all **pass** (read the allowlist as text) |
| `verify-product-aware-rcap-ci` | **pass** (workflow markers intact) |
| `verify-expungement-dtc-flow-unchanged` | **pass** — now in the mandatory chain |

**`npm run build` requires Supabase env.** Without it, prerendering `/dashboard/partners` fails with *"Supabase public URL and anon key are required"*. Reproduced at the base commit; environmental, not from this change.

---

## Acceptance evidence by step

| # | Step | Result |
|---|---|---|
| 1–5 | Intake → screening → sponsored authorization → submit packet information | **Not attempted.** Needs a Supabase stack this environment does not have. |
| 6 | Reach the created document without editing the URL | **Implemented, not end-to-end verified.** All five forms navigate on the server-returned id. |
| 7–10 | Open, download, parse bytes, confirm the form visually | **BLOCKED.** No renderer, no mapping, no artifact. |
| 11 | Refresh and download the same stored artifact | **Implemented, not verified.** Unique `(document_packet_id, kind)` + existing-artifact short-circuit. |
| 12 | Unsupported jurisdiction receives an explicit not-ready result, never the Mississippi form | **VERIFIED.** 8 jurisdictions assert-throw; audit checks all 51; TX/Dallas and TX-without-county cannot reach Harris. |
| 13 | Run the ready-jurisdiction HTTP gate through the mandatory test command | **VERIFIED present and mandatory.** Reports BLOCKED — 0 to prove. |
| 14 | Run the all-51 audit and produce the JSON matrix | **VERIFIED.** `artifacts/packet-delivery/all51-capability-matrix.json` |

---

## Capability result

| Jurisdiction | Status | Approved mappings | Draft mappings |
|---|---|---|---|
| Mississippi | `mapping_in_review` | 0 | 2 |
| District of Columbia | `mapping_in_review` | 0 | 1 |
| Illinois | `mapping_in_review` | 0 | 1 |
| Pennsylvania | `mapping_in_review` | 0 | 1 |
| Texas (statewide) | `guidance_only` | 0 | 0 |
| Texas — Harris County | `mapping_in_review` | 0 | 1 |
| Other 46 | `guidance_only` | 0 | 0 |

**`packet_ready`: 0 of 51.** Matrix: `artifacts/packet-delivery/all51-capability-matrix.json` (generated, not committed; uploaded as a CI artifact).

---

## Findings outside this lane

1. **The five RCAP create routes, `GET /api/rcap/documents/{packetId}`, and `/save` have no authentication.** Only `verifyRcapCaptchaToken`, which no-ops unless `ENABLE_RCAP_CAPTCHA=true` — and no form sends a token, so enabling it would 403 every submission. `partnerSlug` is caller-supplied. The download route is fixed here; **the others are not**, and the TX route accepts `petitionerSsnLastFour` and `petitionerDateOfBirth`.
2. **Illinois, Pennsylvania and Texas forms create a new packet on every click.** They always POST `/create`, never `/save` or `/generate`. `/save` only supports MS and DC, so fixing this is generator work.
3. **`briefcaseId` is never set**, so `rcap_document_artifacts`' sibling `rcap_briefcase_items` is never written from the documents path, while all five forms say "saved to your Briefcase".
4. **The five legacy generator verifiers fail at the base commit** — `src/lib/rcap/documents/{mississippi,illinois,dc,pennsylvania,texas-harris}/` do not exist; the all-51 migration removed them while `AGENTS.md` still requires them "preserved". Not added to the test chain for this reason.
5. **`src/lib/reports/render-weekly-report-pdf.ts` also uses Playwright** — the partner weekly report has the same serverless defect.
6. **`generated_html` / `generated_plain_text` are the same constant string for every jurisdiction.**

---

## Remaining boundary

**To finish this lane, exactly one thing is needed: the four original Mississippi PDFs under `private/Nationwide Record Clearing/LegalEase Mississippi/`.** With them: verify SHA-256, complete Step 0, build the renderer against the real structure, confirm one mapping by eye, wire it as the injected renderer, flip Mississippi to `packet_ready`, and the existing HTTP gate proves delivery with no further changes.

**Deliberate gap.** The delivery gate exits 0 when nothing is declared `packet_ready`, because a permanently-red gate in a fail-fast chain wedges CI for every other lane. The contract is not weakened: it still fails whenever a `packet_ready` jurisdiction cannot complete the real HTTP/PDF proof, and the blocked state is loud in stdout, recorded in the JSON matrix (`blocked: true`), and enforced by `rcap:verify-packet-delivery-proof-required`, which is **red today**. That script is the launch gate and should block release; it is not in the fail-fast chain. **If you would rather CI be red until a document is delivered, move it into the `test` chain — a one-line change.**

**Not done in this lane:** storage/status/download plumbing tests using synthetic non-legal PDF fixtures. The lifecycle is covered by contract only. A PGlite harness plus a `PDFDocument.create()` fixture is the shape; PGlite is already a dependency and 14 chain scripts use it.
