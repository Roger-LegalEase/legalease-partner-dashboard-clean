# Master Library authority

**Adopted:** 3 August 2026
**Authority:** Expungement.ai + RCAP Master Forms and Legal-Review Library, **Edition 1.0**
**Cutoff:** 2 August 2026
**Runtime posture:** `runtime_disabled` by default, nationwide

## 1. The decision

Master Library Edition 1 is the canonical internal source authority for the
nationwide Expungement.ai and RCAP record-clearing build.

This repository is a **derived implementation** of that library. It may not treat
a source as authoritative merely because a binary exists somewhere inside it.

Edition 1 controls source identity, canonical document identity, official title,
document role, asset class, revision, language, canonical path, workflow key,
SHA-256, duplicate treatment, excluded and retired treatment, source-gated
status, packet-candidate status, source-currentness status, missing-source and
gap status, legal-review identity, and the authoritative source from which
normalized track mappings are derived.

## 2. Where the edition lives

| | |
|---|---|
| Retention form | ZIP archive, adopted in place |
| Canonical path | `/workspaces/legalease-attorney-review-packages/Expungement_AI_RCAP_Master_Library_Edition_1.zip` |
| Archive SHA-256 | `c0937fa7fa0ff6e97c9e6f736dc17390496987d4d404e71b6960147bffbc53f8` |
| Bytes | 143,154,181 |
| Retained files | 499 |

The user retained Edition 1 outside this repository. This repository ignores
`*.zip` and keeps record-clearing source corpora out of version control
(`private/`, `artifacts/`), so the archive is **adopted in place and pinned by
SHA-256** rather than copied in. The ZIP itself is the immutable authority
artifact. It is read by temporary extraction or entry streaming; no extraction is
ever written into the repository and no second copy is created. An extracted tree
at the same path is read in place instead, with the same rule.

The adoption record is `data/record-clearing/master-library/authority.json`.

## 3. Immutable-edition policy

**Edition 1 is immutable.** No file inside it is edited, moved, renamed,
re-hashed or supplemented by this repository.

A newer law, a newer official revision, a post-cutoff acquisition or a correction
enters by exactly one path:

```text
current Edition 1  →  pending amendment  →  reviewed and adopted new edition  →  repository remapping
```

It never enters through an ad hoc repository override, and a repository binary is
never described as Edition 1.1.

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

A current official source may eventually supersede an Edition 1 source. It may
not silently override Edition 1 here.

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

Edition 1 sets `generation_allowed = no` on **all 378** retained assets. No asset
is resolver-selectable under Edition 1 alone. Promotion happens in this
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

Each is:

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
npm run rcap:reconcile-master-library        # regenerate the derived records
npm run rcap:verify-master-library-authority # fail-closed structural verification
```

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
| `authority.json` | the adoption record: edition, cutoff, path, archive hash, precedence, rules |
| `reconciliation.json` | edition integrity, checksum result, coverage reconciliation, runtime posture |
| `repository-asset-audit.json` | one reconciliation status for every repository source asset |
| `track-source-audit.json` | one authority result for every packet component, unit by unit |
| `pending-edition-amendments.json` | post-cutoff and unretained repository sources |
| `authoritative-blocker-ledger.json` | blockers joined across scopes and deduplicated |

The Master Library is **not** copied into this directory. These are derived
application records that point at the adopted edition.
