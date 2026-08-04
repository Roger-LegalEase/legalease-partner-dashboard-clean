# Acquisition intelligence — the 109 external source documents

**Researched** 3 August 2026 · **Base commit** `071dcad` · **Authority** Master Library Edition 1.2
**Status** Read-only research output. Nothing here changes a blocker, a `generation_allowed`, a legal-design memo, an authority record or any registry.

Every one of the 109 documents identified by the 100-percent production plan has been researched against its issuing authority and given exactly one final research status.

---

## 1. Where the 109 comes from

`source-acquisition-queue.json` holds **239 rows** resolving to **118 distinct acquisition keys**. The 109 are those whose hardest remaining dependency is **external** — an acquisition, a currentness or provenance re-confirmation, or a licence:

| | |
|---|---:|
| Distinct acquisition keys in the queue | 118 |
| less: already retained under another identity | −5 |
| less: needs an edition re-class, not an acquisition | −4 |
| **Documents dispositioned here** | **109** |

The nine excluded are named in `documents.json` under `inventoryDerivation.excludedFromScope`. This reproduces the 109 recorded at `blockerPartition.needsExternalAcquisitionOrLicensing.distinctDocuments` in `production-plan.json`.

---

## 2. Disposition

| Final research status | Documents |
|---|---:|
| `public_official_download` | **60** |
| `official_download_automation_blocked` | **20** |
| `commercial_license_required` | **13** |
| `official_request_required` | **5** |
| `identity_unresolved` | **4** |
| `not_required_custom_pleading` | **3** |
| `not_required_no_filing_route` | **2** |
| `local_court_selection_required` | **1** |
| `superseded` | **1** |
| `official_index_only` | 0 |
| `excluded` | 0 |
| **Total** | **109** |

**Only five documents in the entire set cannot be closed by some form of retrieval** — four Missouri judgment and order forms that OSCA publishes on no public index, and the Delaware SBI mandatory-expungement application, which the Bureau mails to an identified applicant after a fingerprint-based criminal-history review.

---

## 3. The finding that most changes the plan

**The backlog materially overstates genuine acquisition need.** Across the set, document after document turned out to be already held at the publisher's current bytes, or already retained under a different document ID, or not a document at all.

- **Arkansas** — 17 of 20 are already retained in Edition 1.2 under `AR-ACIC-*` IDs while the tracks name them `ACIC-*`. All 22 retained ACIC binaries are byte-length identical to a live ACIC file. Three genuine downloads remain, and four document IDs need splitting before any remap — two into felony and misdemeanor, two into pre- and post-adjudication drug court. Remapping before splitting would silently bind the wrong binary.
- **Maryland** — all four CC-DC-CR-072 petitions are **SHA-256 identical** to the retained assets and every printed revision matches. The source gate was an access artefact, not a staleness finding. **This single answer unblocks five Maryland routes.**
- **Nine of sixteen** documents in the small-state group were already held at the publisher's current bytes. Only Alabama's ABPP-3 is a true new acquisition there.
- **Three documents do not exist as documents.** Colorado `JDF-417-ORDER` (no Colorado JDF form carries that number; the order is JDF 418, already retained), the Iowa certification of service (a titled section inside every Rule 2.86 form), and the Iowa Form 2 attached sheet (a participant-supplied plain page).

Deterministic fail-closed behaviour worked exactly as designed — it surfaced identity errors as acquisition rows. They should be closed as identity corrections so the backlog reflects real work.

---

## 4. What a failed fetch did and did not prove

Four publishers returned errors to automation. In every case the document was live and public.

| Publisher | What happened | What it actually is |
|---|---|---|
| `courts.mo.gov` | HTTP 403 to everything, including `/robots.txt` | An **express OSCA policy** prohibiting scrapers. Official Missouri circuit sites route the public to the same URLs. Anti-automation, not an access restriction — and because the prohibition is express, engineering must not build a bypass. |
| `kjc.ks.gov` | HTTP 403 to every agent including full Chrome | A publisher block. Worked from archived captures of the Council's own pages. |
| `coloradojudicial.gov`, `sdcourt.ca.gov`, `courts.delaware.gov`, `mass.gov/doc/…`, `mncourts.gov` | HTTP 403 / F5 WAF | Host-scoped bot protection on live public pages. |
| `azcourts.gov` | HTTP 403 to the default agent | **Not a publisher restriction at all** — a client User-Agent artefact. A browser UA returns 200. Arizona should not be carried in any blocked-publisher ledger. |

And two "unreachable" hosts resolved on the first attempt: `courts.mt.gov` served both MMRTA forms today, discharging an Edition 1.2 `currentness_unresolved` disposition that rested on a transient network failure.

**Stale URLs are not missing documents.** Arkansas migrated its binaries from `dps.arkansas.gov` to `media.ark.org`; Idaho migrated from `isc.idaho.gov/files/` to `api.isc.idaho.gov`. Both recorded URLs now 404 and both documents are current and free. In roughly one document in seven, an automated failure would have produced a false negative.

---

## 5. The three hard blockers

**Kansas — a licence, not an acquisition.** All ten Kansas documents carry the Judicial Council's published term: *these forms are for non-commercial use only*, and may not be sold, republished or transferred for compensation without express permission. The term is rendered on every page of the Legal Forms section with no carve-out, and the Kansas Judicial Branch publishes no alternative set — its self-help page points straight back to the Council. Lead the licence request with the **Petition for Relief from Offender Registration**: K.S.A. 22-4908(d)(3) directed the Council to develop that form, which is the strongest single argument available. **The gate must not be evaded by relabelling a Council route as a custom pleading.**

**Indiana — the same shape, a different publisher.** The Coalition for Court Access forms are approved by a Supreme Court-created body and promoted by the judiciary's own self-service page, but published on a site whose Terms of Service bar commercial use and derivative works. Currentness is already resolved — the Section 1 bundle is byte-identical to the retained asset. Only the licence is open, and the first question is which of four candidate entities is the correct grantor.

**Delaware SBI — the only document with no retrieval route at all.** It is issued by mail to an identified applicant after a $72 fingerprint-based review, with $75 due within 30 days on the mandatory route. Write to the Bureau citing 11 Del. C. § 4373(d); do not attempt to obtain it by running a live applicant through fingerprinting.

---

## 6. Campaigns

32 campaigns, one per issuing office, in `acquisition-campaign.json`:

| Campaign type | Count | Meaning |
|---|---:|---|
| `scripted_download` | 16 | Public and automatable today |
| `attended_retrieval` | 9 | Published, but a human must fetch it |
| `internal_correction` | 3 | No issuer involved |
| `licence_request` | 2 | Permission must be granted before use |
| `outbound_request` | 2 | The issuer must supply a document it does not publish |

**No request has been sent and no contact has been made.** These are prepared campaigns, not actions taken. Contact details appear only where the issuer officially publishes them; a null is a null, never an inferred address.

**Highest-priority groups:** Arkansas ACIC (20 documents, 11 tracks, one issuer, zero requests needed) · Maryland Judiciary (4 documents, 5 routes, already hash-confirmed) · Alabama AOC (CR-65 alone touches 17 components across 8 tracks) · Hawaii HCJDC (one form is the entire Hawaii forms position, 8 tracks) · Florida Department of State (4 FAC-incorporated forms, free and automatable, superseding three stale archive copies).

---

## 7. Format findings that outlive this research

Several documents are not the file type the pipeline assumes:

- **DOCX, not PDF** — Arizona's current Rule 41 and second-chance forms; Montana MMRTA Forms A and B; Delaware Family Court Form 281 (`application/msword`).
- **Flat PDFs with zero form fields carrying primary filings** — Hawaii HCJDC 159(b) and Alaska Seal Req 2-04. No amount of acquisition closes that.
- **XFA** — the Massachusetts Probation Service Petition to Expunge is genuinely XFA, served from an Adobe LiveCycle template. The repository flags TC0021 instead, and contradicts itself inside a single record. California CR-180 is published by the Judicial Council as an **AES-256-encrypted XFA** form on bytes Edition 1.2 classifies `acroform_pdf`.
- **Maine CR-307 is encrypted by the publisher itself** — the retrieved binary is byte-identical to the held copy, so the encryption is the Maine Judicial Branch's own. Printing and copying are permitted; only modification is barred, so fill-and-print may well be within the permitted set.

The `structural_class` column should be re-measured edition-wide rather than patched row by row.

---

## 8. Files

| File | Contents |
|---|---|
| `documents.json` | All 109 records with full provenance, evidence and next action |
| `issuer-directory.json` | 32 issuing offices, officially published contacts only |
| `acquisition-campaign.json` | 32 consolidated campaigns grouped by issuer |
| `unresolved.json` | 12 open questions and every document with an unconfirmed revision |

---

## 9. What this research did not do

No request was sent. No contact was made. No binary was downloaded into a production source directory. No blocker status, `generation_allowed`, legal-design memo, Master Library authority record, or source, artifact or track registry was changed. `production-plan.json` and the existing job manifests are untouched.

Every currentness finding is stated with the date it was confirmed. Where a revision rests on an archived capture rather than a live read — most of Minnesota, most of Missouri, all of Delaware — the record says so, and the operator must re-confirm at retrieval.
