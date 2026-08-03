# Master Library authority

**Adopted:** 3 August 2026
**Authority:** Expungement.ai + RCAP Master Forms and Legal-Review Library, **Edition 1.1**
**Parent edition:** 1.0 (immutable, independently verifiable)
**Cutoff:** 3 August 2026
**Legal-review coverage:** 51 of 51 jurisdictions
**Runtime posture:** `runtime_disabled` by default, nationwide

## 1. The decision

Master Library **Edition 1.1** is the canonical internal source authority for the
nationwide Expungement.ai and RCAP record-clearing build. It inherits all 378
Edition 1.0 canonical assets unchanged and adds the controlling Batch 1 amended
legal-review authority.

This repository is a **derived implementation** of that library. It may not treat
a source as authoritative merely because a binary exists somewhere inside it.

Edition 1 controls source identity, canonical document identity, official title,
document role, asset class, revision, language, canonical path, workflow key,
SHA-256, duplicate treatment, excluded and retired treatment, source-gated
status, packet-candidate status, source-currentness status, missing-source and
gap status, legal-review identity, and the authoritative source from which
normalized track mappings are derived.

## 2. Where the editions live

Both editions are retained. A published edition is never replaced.

| | Edition 1.1 (adopted) | Edition 1.0 (parent) |
|---|---|---|
| Path | `…/Expungement_AI_RCAP_Master_Library_Edition_1_1.zip` | `…/Expungement_AI_RCAP_Master_Library_Edition_1.zip` |
| SHA-256 | `c66ea58a96618e7c8b07406e4e6e6eb14185785e7e00cea48ab038e120d28a99` | `c0937fa7fa0ff6e97c9e6f736dc17390496987d4d404e71b6960147bffbc53f8` |
| Bytes | 144,123,507 | 143,154,181 |
| Retained files | 539 | 499 |
| Canonical assets | 394 | 378 |
| Legal reviews | 51 | 39 |

Both live under `/workspaces/legalease-attorney-review-packages/`.

### Source archives behind Edition 1.1

| Role | Archive | SHA-256 |
|---|---|---|
| Parent edition | `Expungement_AI_RCAP_Master_Library_Edition_1.zip` | `c0937fa7…bffbc53f8` |
| **Controlling** Batch 1 authority | `LegalEase_Batch_1_Amended_Import_Bundle(1).zip` | `99cf3f4c…97e529ddc` |
| Batch 1 provenance only | `LegalEase Nationwide Legal Review(3).zip` | `b1f7eccb…656c8e74f` |

The amended bundle's own `SHA256SUMS.txt` verified 51/51 before use. All twelve
original reviews were confirmed **preserved verbatim** beneath their state
addendum, so the provenance archive is evidence for that claim — never a second
active set of state authorities and never counted as legal-review coverage.

The authority archives live outside this repository. This repository ignores
`*.zip` and keeps record-clearing source corpora out of version control
(`private/`, `artifacts/`), so each edition is **adopted in place and pinned by
SHA-256** rather than copied in. The ZIP itself is the immutable authority
artifact. It is read by temporary extraction or entry streaming; no extraction is
ever written into the repository and no second copy is created. An extracted tree
at the same path is read in place instead, with the same rule.

The adoption record is `data/record-clearing/master-library/authority.json`.

### Portable authority lookup

The loader resolves an edition in a fixed order and then validates what it found:

1. an explicit path passed by the caller (`--library=`);
2. the `RCAP_MASTER_LIBRARY_PATH` environment variable;
3. the `canonicalPath` recorded in `authority.json`;
4. **fail closed.**

There is no fifth step. In particular the repository's own source corpus is never
a fallback, and neither is folder or filename discovery — reading forms out of
`private/` when the archive is missing would silently reinstate the "a binary
exists, so it must be fine" rule this whole layer exists to prevent.

Once resolved, the loader validates the requested edition, the recorded file size,
the archive SHA-256, the governance files, the manifest and the checksums before
anything downstream may rely on it.

## 3. Immutable-edition policy

**Every published edition is immutable.** No file inside an adopted edition is
edited, moved, renamed, re-hashed or supplemented by this repository, and a
published archive is never rebuilt in place — a changed archive is a different
edition, not a correction.

A newer law, a newer official revision, a post-cutoff acquisition or a correction
enters by exactly one path:

```text
current edition  →  pending amendment  →  reviewed and adopted new edition  →  repository remapping
```

Edition 1.1 is what that path looks like when it runs: the twelve Batch 1
reviews Edition 1.0 recorded as missing entered through a published successor
edition, not through a repository override. Edition 1.0 is untouched and still
verifies against its original SHA-256.

It never enters through an ad hoc repository override, and a repository binary is
never described as a new edition.

## 4. Authority precedence

1. The current adopted Master Library edition.
2. The adopted legal-resolution memorandum retained inside that edition
   (`00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`), where it
   changes legal structure, output strategy, packet capability, product scope,
   blocker treatment or node classification.
3. The jurisdiction legal review retained inside that edition, for conclusions
   the adopted memorandum does not change.
4. The Master Asset Manifest, state manifests, missing/source-gap ledger,
   exclusion log, duplicate log and checksums, for source identity and asset
   treatment.
5. Normalized legal-design records and application registries, as derived
   implementation outputs.

A current official source may eventually supersede a retained source. It may not
silently override the adopted edition here.

### Batch 1 precedence

For the twelve Batch 1 jurisdictions — AK, AL, AR, AZ, CA, CO, CT, DC, DE, FL,
HI and ID — the retained review is the **amended** review, and its internal
precedence is:

1. the state-specific controlling addendum at the beginning of the amended review;
2. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Batch-1-Amendment-Decision-Matrix.md`;
3. `00_GOVERNANCE/BATCH_1_AUTHORITY/00-Source-Packet-Only-Product-Model-Amendment.md`;
4. the original state review preserved beneath the addendum;
5. `00_GOVERNANCE/BATCH_1_AUTHORITY/pre-amendment-crosswalk/` only as a
   completeness inventory — never as final legal truth.

The addendum controls output strategy, packet capability, participant-document
treatment, manual completion, product scope, handoff treatment, legal-design
blockers, release blockers, guidance classification and staged-route treatment.
The preserved original review continues to control legal research, statutes,
terminology, venue, filing procedure, form identity, eligibility analysis,
source requirements and unresolved legal questions unless expressly amended.

**One jurisdiction, one active controlling review.** The addendum, the preserved
original and the provenance-archive copy are parts of or evidence for that one
asset, never separate authorities competing over the same legal conclusion. The
verifier fails if any jurisdiction acquires a second.

## 5. Two rules that decide most questions

### File presence is not source approval

A binary existing in the Master Library, this repository, a prior source folder,
a legal-review package or an imported archive does not make it runtime-ready.
The manifest carries the controlling classification.

### Filenames do not route

Legal eligibility, track identity, packet strategy, document role and runtime
selection are never derived from a filename, a folder scan or a directory
listing. A legal-design track reaches a source through one **explicit approved
mapping**, by workflow key or document ID.

Track IDs live in the registry and the mapping layer, never in a canonical
filename — which is why a form shared by several tracks is **one** canonical
asset with several mappings, not one binary per track.

## 6. Stable source identity

The library's own fields are used. No second document-identity system exists.

```text
workflow key = {STATE}:{DOCUMENT_ID}:{DOCUMENT_ROLE}:{LANGUAGE}
```

plus `jurisdiction_code`, `canonical_relative_path` and `sha256`.

## 7. Asset treatment

| Class | May establish | May never do |
|---|---|---|
| `packet_form` | packet identity, field structure, packet composition | be selected before every release gate passes |
| `instructions` | filing sequence, fees, copies, service | replace the legal route |
| `supporting_process` | record requests, fee waivers, certifications | block generation by default |
| `source_gated` | form identity, packet identity, document role, field structure, packet composition, legal-design capability | be runtime-selected, marked generation-allowed, promoted to a packet form, treated as commercially cleared, or treated as current |
| `legal_review` | controlling analysis, track structure, form identity | be rendered as a participant packet |
| excluded / retired / redundant / superseded | nothing | be mapped as a current source, used by a renderer, treated as a release candidate, or reintroduced because another copy exists elsewhere |

Edition 1.1 sets `generation_allowed = no` on **all 394** retained assets. No
asset is resolver-selectable under Edition 1.1 alone. Promotion happens in this
repository through an auditable legal-design and renderer change, never by moving
a file inside the archive.

### Third-party fields

Judge, clerk, prosecutor, law-enforcement, agency, notary and process-server
fields remain blank unless the governing form expressly assigns the field to the
participant.

## 8. Custom pleadings and guidance are not source gaps

A **`custom_pleading`** track needs no official form binary. Under the adopted
memorandum a counsel-approved pleading is the statewide fallback where the law
permits a participant petition and no current mandatory or controlling local form
is identified. It must map to a retained governing legal review, the adopted
legal-design decision, its custom-pleading specification, and the correct
jurisdiction and track. **Do not flag a missing official form where the approved
strategy is custom pleading by design.**

A **`process_guidance`** track needs no packet binary where no participant filing
exists. It must map to a retained legal review, the governing automatic, agency,
prosecutor, clerk or portal source, and a valid guidance rationale. **Do not
convert a missing-by-design form into a source gap.**

A **source-gated** official form keeps `official_pdf_fill` as its legal packet
identity while remaining release-disabled. It is **not** relabelled
`custom_pleading` to evade a source gate.

A **composed** route is audited unit by unit. One unit may be an official packet
form and the next a portal handoff; a single track-level verdict would be wrong
for both.

Non-relief nodes — supporting actions, completed-or-verification nodes, routing
nodes and local variants — map to the correct asset class and are never counted
as paid relief mechanisms because a form exists.

## 9. Resolver-selection rule

A packet resolver may select an asset only through an explicit approved mapping
from a normalized component to **one** retained asset, matched by workflow key or
document ID, with a **matching SHA-256**, the correct document role, the correct
language and an approved revision.

Selection by filename, folder scan, directory listing, title similarity or file
presence is prohibited. A `source_gated`, excluded, retired, superseded or
unmanifested asset is never resolver-selectable.

## 9a. A retained review is not readiness

Adding a controlling legal review removes a **missing-authority** problem. On its
own it establishes nothing else. It does not satisfy track-source mapping, clear
a form, establish source currentness, resolve licensing, or show that a
normalization written *before* the review was adopted agrees with it.

That last point has teeth. Edition 1.1 adopted the twelve Batch 1 reviews as
authority after those jurisdictions were normalized, so every track in them now
fails closed with `legal_design_reconciliation_required` until the bounded Batch 1
amended-normalization pass reads the crosswalk against the live registry track by
track. The flag that lifts it is `batch1AmendedNormalizationApplied` in
`authority.json`, and it flips only in that dedicated pass — never as a side
effect of publishing an edition.

Without that gate, publishing Edition 1.1 would have moved two Batch 1 tracks to
`packet_ready` purely because a review now existed. It did, mid-build; the gate is
why `packet_ready` is back to 0.

## 9b. The 117-track Batch 1 crosswalk

The amended bundle defines 117 pre-amendment source track IDs (AK 11, AL 11,
AR 12, AZ 9, CA 13, CO 11, CT 14, DC 8, DE 6, FL 9, HI 9, ID 4). The current
normalized inventory was **measured**, not assumed: 110 live Batch 1 tracks.

`data/record-clearing/master-library/batch-1-authority-crosswalk.json` gives every
one of the 117 exactly one disposition, and
`batch-1-authority-delta.json` summarises the difference.

| Disposition | Count |
|---|---|
| `exact_current_track` | 110 |
| `missing_from_current_normalization` | 7 |
| `unresolved_crosswalk` | 0 |

Zero current Batch 1 tracks lack an expected source ID, so there are no
unexplained additions in either direction.

The seven are `ak-set-aside`, `ak-cannabis-seal`, `ak-correct-record`, `al-olr`,
`al-uncharged-arrest`, `ca-1203-4b` and `co_mistaken_identity_expungement`. Each
was deferred under `legal_research_required` at intake, each is unregistered and
unreachable, and each traces to a row the amended decision matrix keeps in its
"True blockers after amendment" table — AK-4, AK-7, AK-9, AL-9, AL-11, CA-12 and
CO-11 respectively. **A count difference is not an error where every ID carries an
express, source-supported disposition. A silently dropped ID would be.**

Each is also queued in `batch-1-amended-normalization-queue.json` (status
`not_started`). The verifier fails if any non-exact ID is missing from that queue,
so an unreconciled ID cannot be absorbed by being ignored.

## 10. Release gate

The gate lives in `src/lib/rcap/legal-design/master-library-authority.ts` and is
applied in the legal-design registry build (`scripts/rcap-legal-design-intake.mjs`).

It **fails closed**: a track with no audit entry is blocked. Absence of a check
is not a pass.

A track cannot become `packet_ready`, `guidance_ready`, runtime-enabled or
resolver-selectable where:

- an official-PDF component has no Master Library mapping;
- the mapped asset is excluded or retired;
- the SHA-256 does not match, or none is pinned;
- the asset is `source_gated`;
- the asset is unmanifested;
- the revision is not approved;
- the component role does not match;
- a required source file is missing;
- the track lacks its retained legal-review authority.

Authority clearance is a **provenance** result only. It never makes a track
ready: every gate in `readinessCeilingFor` still applies, and so do output
review, visual review, technical proof, source currentness and runtime
enablement.

## 11. Blocker scopes are joined, not summed

`data/record-clearing/master-library/authoritative-blocker-ledger.json` preserves
distinct scopes and deduplicates by `dedupeKey` so one issue appearing in both a
state review and the edition's gap ledger is counted once.

| Scope | Meaning |
|---|---|
| `legal_review_coverage_blocker` | No controlling legal review is retained for the jurisdiction. Counted once per jurisdiction. **Now 0 — was 12 under Edition 1.0.** |
| `legal_design_reconciliation_blocker` | The controlling source and the current normalization have not been reconciled, or an expected source ID has no current track. |
| `commercial_use_blocker` | The publisher's licensing or commercial-use terms are unresolved. Distinct from currentness: a form can be confirmed current and still be commercially unusable. |
| `runtime_promotion_blocker` | Edition-wide: every retained asset is generation-disabled, so nothing can be promoted from the library alone. |
| `master_library_source_gap` | The edition records the source as missing, unposted, unconfirmed or local-only. |
| `legal_design_blocker` | LegalEase cannot determine what to generate. |
| `source_or_currentness_blocker` | The source exists; revision, currentness, provenance, licensing or official status is open. |
| `mapping_blocker` | The source exists but is not mapped to the correct track or packet unit. |
| `technical_blocker` | Field mapping, rendering, storage, access or completed-output proof is incomplete. |
| `visual_or_legal_output_blocker` | A rendered output has not passed legal and visual review. |
| `jurisdiction_input_requirement` | A priority county, court, district, circuit or local implementation has not been supplied. |

These are **different metrics**. An Edition 1 source-gap count and a normalized
legal-design blocker count answer different questions and must never be presented
as the same number. No total is hard-coded in application logic.

## 12. Pending-amendment workflow

`data/record-clearing/master-library/pending-edition-amendments.json` holds valid
repository sources that Edition 1 does not retain.

Every candidate carries exactly one final disposition. Under Edition 1.1 the 180
Edition 1.0 candidates resolved as: 4 `adopt_source_gated` (retained), 37
`adopt_reference_only`, 103 `hold_legal_identity`, 28 `hold_provenance`, 8
`hold_currentness`.

An `adopt_*` disposition is only reachable where identity is already established.
Adopting an unprovenanced binary as canonical would assert exactly the identity
nobody has confirmed, so the honest outcome for one is a **hold**, not an
adoption — which is why 139 of 180 are held rather than published. A valid but
unresolved source may be adopted as `source_gated`: that preserves packet
identity without authorizing runtime use, and it is what the four Kansas Judicial
Council forms received.

Each held candidate is:

- **not discarded** — the binary stays where it is;
- **not authoritative** — `library_authority_pending`, `runtime_disabled`;
- recorded with jurisdiction, document ID, title, revision, source URL,
  retrieval date, structural class, field count, SHA-256, existing repository
  path, proposed asset class, proposed track mappings, reason for addition,
  source/currentness questions, and whether its absence creates a build or
  release effect.

This ledger is the **input** to a later explicit Edition 1.1 publication task. It
does not amend Edition 1 and is not itself an edition.

## 13. Commands

```bash
npm run rcap:publish-master-library-edition  # publish a new immutable edition
npm run rcap:reconcile-master-library        # regenerate the derived records
npm run rcap:verify-master-library-authority # fail-closed structural verification
```

Publication refuses to overwrite an existing edition archive without `--force`,
verifies the parent edition and every source archive by hash, verifies the
amended bundle's internal `SHA256SUMS.txt`, and confirms each preserved original
review line by line against the provenance archive before writing anything.

The verifier fails on a structural authority defect — a duplicate workflow key or
canonical path, conflicting hashes for one asset, a manifest row with no retained
file, a checksum mismatch, a retained asset absent from the manifest, an excluded
or retired source presented as active, a source-gated asset marked
resolver-selectable, an unmanifested asset marked generation-allowed, or a live
mapping pointing at a prohibited source.

It does **not** fail because Edition 1 records an open gap. A recorded gap is the
edition working correctly, and it is reported with its authoritative impact.

Regeneration order is **intake first, reconcile second**: the reconciler reads the
track registry, and the registry build reads the audit. A missing or stale audit
blocks every track rather than passing it.

## 14. Derived records

| File | Contents |
|---|---|
| `batch-1-authority-crosswalk.json` | one disposition for each of the 117 expected Batch 1 source IDs |
| `batch-1-authority-delta.json` | expected-versus-current difference, measured and summarised |
| `batch-1-amended-normalization-queue.json` | the bounded follow-up pass; `not_started` |
| `authority.json` | the adoption record: edition, cutoff, path, archive hash, precedence, rules |
| `reconciliation.json` | edition integrity, checksum result, coverage reconciliation, runtime posture |
| `repository-asset-audit.json` | one reconciliation status for every repository source asset |
| `track-source-audit.json` | one authority result for every packet component, unit by unit |
| `pending-edition-amendments.json` | post-cutoff and unretained repository sources |
| `authoritative-blocker-ledger.json` | blockers joined across scopes and deduplicated |

The Master Library is **not** copied into this directory. These are derived
application records that point at the adopted edition.
