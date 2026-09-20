# Lane C — Oregon official-PDF Grade-A reference packet

Sprint `2026-08-29-national-grade-a`. Lane branch `claude/oregon-official-pdf-grade-a-3rtuq7`.

This file is the lane's own status and evidence record. It is lane-local: it changes
no shared register, no launch graph, no commercial denominator and no route
ratification. What it needs from the captain is listed under **Shared-file patch
requests**.

## Environment identity gate

Run before any file was generated or committed.

| Field | Required | Observed | |
|---|---|---|---|
| Repository | `Roger-LegalEase/legalease-partner-dashboard-clean` | `Roger-LegalEase/legalease-partner-dashboard-clean` | pass |
| Remote | normalized `origin` to that repository | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` (fetch and push) | pass |
| Root | assigned checkout | `/home/user/legalease-partner-dashboard-clean`, the only checkout of this repository in the container | pass |
| Branch | assigned lane branch | `claude/oregon-official-pdf-grade-a-3rtuq7` | pass |
| Base | exact `BASE_SHA` from the envelope | envelope shipped the literal placeholder `<captain-provided SHA>`; branch base is `07675789a80e732d2b835c1e8ba2092b39201b79` | **unverifiable** |
| Production | disconnected and untouched | untouched; no deploy, migration, Stripe or secret path entered | pass |
| Oregon source SHA-256 | `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071` | every Oregon record in this lane is pinned to exactly that digest | pass |
| `private/source-corpus-environment.txt` | present | **absent — no `private/` tree exists in this container** | **fail** |
| Corpus: 51 jurisdictions, 499 files, 329 PDFs | present and verified | corpus not installed | **fail** |
| Corpus archive SHA-256 | `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` | corpus not installed; and the committed index in this repository describes a *different* archive — see below | **fail** |

This is **not** an `ENVIRONMENT MISROUTED` condition. Every repository identity
field is correct and this is the assigned checkout; what is missing is the private
corpus mount. Recovery searched the whole filesystem for another checkout of the
repository, for `source-corpus-environment.txt`, for the Master Library tree and for
any archive matching the required digest. None exists. The corpus was not
reacquired, per the lane's own instruction not to.

### Corpus fingerprint discrepancy — for the captain

The gate requires archive `a26e3ca7…` across **51** jurisdictions. This repository's
committed `data/rcap-all50/local-source-corpus-index.json` records archive
`c0937fa7fa0ff6e97c9e6f736dc17390496987d4d404e71b6960147bffbc53f8` across **45**
states, with 499 files declared, 499 present and 499 hash-verified, and 329 PDFs
indexed. The file and PDF counts agree; the archive digest and the jurisdiction
count do not. So the environment the gate describes is a different edition from the
one this repository's committed evidence was built against. Lane C did not choose
between them. The Oregon digest is identical in both statements, which is why the
Oregon work below stands regardless of how that is resolved.

## What this lane did

Oregon already had a complete, first-hand official-PDF implementation, built on
`claude/rcap-d3b-corrections-v2` and never carried onto `main` — `main` holds
production overlays for nine states and Oregon is not among them. Lane C did not
rebuild it. It brought that implementation onto the lane branch, verified it
against the artifacts' own bytes rather than against its own reports, added the
page-by-page review record it lacked, and proved it through the real product path.

### The form

| | |
|---|---|
| Official title | OJD Criminal Set-Aside Adult Packet — *Criminal Set-Aside (Adult Cases)* |
| Issuing authority | Oregon Judicial Department (`courts.oregon.gov`) |
| Revision | `REV-2026-01` — the pages print "(Jan 2026)" |
| Document id | `OR-OJD-ADULT-SET-ASIDE-PACKET` |
| Source SHA-256 | `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071` |
| Byte length | 256,978 |
| Corpus path | `STATES/OR/02_PACKET_FORMS/OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf` |
| Structure | 5 pages, all 612×792 portrait; flat — no AcroForm, no XFA, 0 widgets |
| Strategy | `flat_overlay` onto the official PDF. Not replaced by a custom pleading. |

Pages 1–3 are the court's instructions and the waiting-period table. Pages 4–5 are
the Motion to Set Aside and Seal and the Declaration of Eligibility — the pages the
participant signs and files.

### Census and classification

76 blanks measured out of the document's own content streams — 3 on page 1, 23 on
page 2, 5 on page 3, 30 on page 4, 15 on page 5. All 76 are classified, with no
slot classified twice and none left over: **7 written, 69 refused**. The 7 written
slots carry 9 anchors, because one rule on page 5 spans three captions (Address,
City/State/ZIP, Phone) bound as non-overlapping sub-regions.

Refused by protected category: the citing/arresting agency, the SID number, both
signature lines, and the prosecuting attorney's address on the certificate of
mailing. Also refused: the arrest date, the fingerprint number, all 28 charge-table
cells, and every eligibility and declaration checkbox. No protect rule, type guard
or readable-size floor was relaxed for this family, and no sensitive mapping was
authorized.

### Route and family binding

Three Oregon pathways resolve through the canonical resolver
(`resolvePacketRoute`) as `factory_v2` on the one shared renderer
`packet_document_v1`, each bound to this form:

- `OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a` → `or_contempt_setaside-set`
- `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` → `or_acquittal-set`
- `OR:marijuana-specific-set-aside-redesignation` → `or_conviction_setaside-set`

In every set this packet is the **primary filing**, required, with output strategy
`official_pdf_fill`. All three resolve `sellable: false` and
`creditConsumable: false`. Service disposition and the participant's own
obligations — obtaining the OSP LEDS criminal history, filing fingerprints, mailing
a copy to the prosecuting attorney and completing the certificate of mailing — are
carried by the packet-set manifests and are unchanged by this lane.

### Overlay, read out of the artifact

The finalized artifact's content streams were decoded and every participant value
recovered with its text matrix. Values are drawn as hex strings in the factory's own
ink, so nothing here was read from a report that could have been wrong.

Canonical fixture: 8 values, all on pages 4 and 5, each at exactly the coordinate
`overlay-profile.json` declares, each at 10.5pt, each equal to the fact the fixture
supplies. **Zero writes on pages 1–3.** Fullest blank is Email at 71.2% of its box.

Boundary fixture: two values shrink to fit (Defendant 9.5pt, Name 10pt — the latter
at 96.1% of its box and still inside it) and three are refused as unfittable at the
6pt readable floor rather than clipped: Email, Address and Phone. Phone is refused
in the canonical fixture too — the form's own phone sub-region is 34pt wide and a US
telephone number measures 37.4pt at 6pt. The blank is left for the participant.

Measured against real Helvetica metrics: 0 values wider than their write box, 0
past the rule the document draws, 0 below the readable floor, 0 clipped, 0
overlapping.

### Artifacts

| Artifact | SHA-256 | Bytes | Pages |
|---|---|---|---|
| `fixtures/canonical-filled.pdf` | `582100f2383ff0ad4b282a6d347eda76c5297c23cddbaf82ce164d6ff801543f` | 217,271 | 5 |
| `fixtures/boundary-filled.pdf` | `32213167ee3dfcda0ee5be1513b6682b1a6bc1fc91e2039edfc3a0c0c4837ed3` | 217,259 | 5 |
| `contact-sheet/blank-vs-filled.pdf` | `8e1b140576c5911df3ba83f1cc2b4a5c8d5db99bc2c599686c7600c862fcc3ed` | 1,248,162 | 5 |

Each hash and byte length was recomputed from the bytes on disk and matches
`reports/rendered-artifacts.json` exactly. All five pages are retained in both
fixtures, all at 612×792, and neither finalized artifact carries a form field.
Fixture facts are synthetic; no participant or production data is present.

### Real product proof

Exercised against the shipped modules, not restated:

- `resolvePacketRoute` admits all three Oregon routes as `factory_v2`, non-sellable.
- `buildRenderJobSpec` builds a job pinned to `sourceSha256 b22cc346…`, profile
  `OR` at `2026-06-19-source-conversion-1`, with a deterministic `inputHash` that
  is stable across identical requests and changes when the case number or the
  source changes.
- `assertClaimAcceptable` refuses an unadmitted source, an unknown profile version,
  a job the server never issued and an unknown renderer.
- `validateRenderOutput` **passes on the real Oregon artifact** at 5 pages and
  612×792, reporting `582100f2…`; and refuses a missing container digest,
  arbitrary bytes, a truncated artifact and a page-count shortfall.
- `authorizePacketDownload` serves the owning participant, serves a repeat download
  with identical bytes, and refuses — anonymous (401), another participant (403),
  the same participant on a matter they do not own (403), a job with no Briefcase
  item at all (403), an accounting-blocked job (409) and a substituted object
  (`artifact_corrupt`).

That last group is the invariant in force: screening may be anonymous, a Briefcase
may not, and a packet follows the securely claimed item rather than the requester.

## Focused tests

`node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs` — green.
`node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs --mutations` — 63/63 caught.

Shared release checks confirmed green with the Oregon evidence in place:
`render-rcap-flat-overlay-families.mjs --check`,
`verify-rcap-approved-release-checks.mjs` and
`verify-rcap-official-forms-d1-controls.mjs`. `npm run typecheck` and `eslint` clean.

The gate covers source identity and hash, census and page-geometry currentness,
route and packet-family binding, required-fact validation, protected-field denial,
artifact hash determinism, long-value overflow and refusal, retention of every
filing page, review-record completeness, stale-source invalidation, wrong
route/state/family denial, and product-path admission with private delivery on
synthetic data.

Where a report and the bytes could disagree, the bytes decide: writes, coordinates,
font sizes, page counts, geometry, form-field counts and artifact hashes are all
read from the PDFs themselves.

## Not established by this lane

- The source **bytes** were not re-hashed on this run. Identity rests on the
  committed corpus index, the source record's pack-manifest verification and the
  three independent records that pin the same digest. The verifier hashes the
  binary when the corpus is mounted and says plainly when it did not.
- The independent **human visual review** the family's production holds require is
  still outstanding. `reports/visual-review.json` is lane evidence for that
  reviewer, and says so.
- **Counsel review** of the completed motion's legal content is outstanding.
- Nothing here approves Oregon for live use, for sale, or for credit consumption.
  `generationAllowed` stays false, `runtimeStatus` stays `runtime_disabled`,
  `implementationStatus` stays `implemented_pending_independent_review`, and the
  jurisdiction summary keeps `approvedForLive: false`.

## Where this evidence lives, and why not in the release directory

The Oregon families are at
`data/rcap-all50/overlays/lane-c-candidates/oregon/`, **not** under
`data/rcap-all50/overlays/production/`.

That directory is the committed release, and membership in it is a claim with
records behind it. A family there is named by `pdf-implementation-freeze.json`,
described by `flat-overlay-render-report.json` and
`overlays/production/verified-binary-index.json`, and carries an
`artifact-provenance.json` whose `sourceIdentity.hashedFromInstalledBytes` is true.
Oregon has none of these: it does not appear in the freeze at all, whose 52 frozen
families do not include it.

Placing Oregon there was tried and the repository's own release checks rejected it,
correctly — `render-rcap-flat-overlay-families.mjs --check` reported the two Oregon
flat-overlay families as measured, carrying no provenance record, and absent from a
report that then described 2 of 4 measured families. Manufacturing the missing
provenance was not an option: it would have to assert a freeze binding that does
not exist and a source digest hashed from installed bytes this container does not
have. Both would be fabricated.

So the evidence stays lane-local and complete, and admission stays the captain's.
The lane's own gate enforces the boundary in both directions: it fails if Oregon
appears in the release directory without being in the freeze, and it fails if the
candidate directory is missing.

## Shared-file patch requests

Lane C edited no captain-owned shared register. Admitting Oregon needs, in order:

1. **A new PDF implementation freeze** naming the Oregon families.
   `noWorkerMayWriteAfterThis` on the current freeze means Oregon cannot be added
   to the existing one; it requires a new freeze at
   `scripts/generate-rcap-pdf-implementation-freeze.mjs`.
2. **`artifact-provenance.json` per Oregon family**, generated by
   `scripts/rcap-official-forms/rcap-artifact-provenance.mjs` against the mounted
   corpus, so `hashedFromInstalledBytes` is true and the freeze binding is real.
   **Requires the corpus.**
3. **Move** `overlays/lane-c-candidates/oregon/` to `overlays/production/oregon/`.
4. **Regenerate**, in dependency order:

| File | Needed |
|---|---|
| `data/rcap-all50/overlays/production/implementation-index.json` | the four Oregon families |
| `data/rcap-all50/overlays/production/verified-binary-index.json` | the four Oregon verified binaries |
| `data/rcap-all50/flat-overlay-render-report.json` | Oregon's two flat-overlay families |
| `data/rcap-all50/flat-overlay-render-cache.json` | Oregon's render-cache entries |
| `data/rcap-all50/field-classification-coverage.json` | Oregon's 76/76 classified coverage |

5. **Repoint** `FAMILY_DIR` in `scripts/verify-rcap-oregon-official-pdf-grade-a.mjs`
   to the production path — one line — after which its release check passes on the
   other branch of the same condition.

Steps 2 and 4 need the mounted corpus, because those generators hash and re-render
from source bytes.

Also for the captain, not for this lane:

- the corpus fingerprint discrepancy recorded above;
- the shared-factory ISO date presentation finding (`dob-format-not-form-format`),
  which belongs to the factory rather than to Oregon;
- whether the three Oregon routes' open blockers (`legal_reconfirmation`,
  `legal_review_pending`, `gate_build`) are cleared, which is a legal-decision and
  ratification matter this lane has no authority over.

## Companion Oregon families

Three further Oregon families were carried onto the branch with the target family,
because the packet sets reference more than one official form and splitting them
would leave the jurisdiction summary describing families that are not present:

- `or-osp-set-aside-criminal-history-request-and-instructions` — `OR-OSP-SET-ASIDE-CCH`, `REV-2022-01`, 2 pages, AcroForm. This is the **second official form all three Oregon routes are bound to**: the packet sets place it as `record_gathering_instructions` under `official_pdf_fill`, so without it the packet's official-form set is incomplete.
- `or-ojd-cla-request-for-set-aside-criminal-record-check` — `OR-OJD-CLA-SET-ASIDE-CHECK`, `REV-2022-01`, 2 pages, AcroForm
- `or-ojd-motion-and-declaration-to-set-aside-marijuana-conviction` — `OR-OJD-MJ-PCR`, `REV-2023-07`, 2 pages, flat

They carry their own source records, censuses, classifications, fixtures and
reports. Lane C's focused gate covers the Adult Set-Aside Packet, which is the form
this lane was assigned; the other three are brought over intact and unmodified and
remain `implemented_pending_independent_review`.

---

# Captain resolution (integration)

Integrated from `claude/oregon-official-pdf-grade-a-3rtuq7` onto controlling
base `0cad61625a74665db23ac64988c301e48909cf81`. The lane's two commits were
taken as one atomic unit; every path was new, and no file collided with the
controlling base.

## Oregon remains candidate, deliberately

All four packages stay under
`data/rcap-all50/overlays/lane-c-candidates/oregon/`. Nothing was promoted into
`data/rcap-all50/overlays/production/`, and nothing entered a commercial
fulfillment freeze. Promotion waits on corpus, provenance, independent review
and the captain-owned admission gates together — not on any one of them.

The Grade-A fulfillment authority enforces this rather than relying on the
directory name. Oregon's three routes hold candidate records, all INCOMPLETE,
and commercially eligible is zero: no lane has produced page-by-page visual
review, output-level legal approval or a bound final verification for them.
`admitCommercial` therefore denies Oregon at every commercial point today.

## Source custody was reverified on the bytes

The four Oregon source hashes the lane declared were recomputed at integration
from the mounted Master Library corpus and all four match:

| Document | SHA-256 |
|---|---|
| OJD Criminal Set-Aside Adult Packet, REV-2026-01 | `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071` |
| OJD Motion and Declaration to Modify or Set Aside Marijuana Conviction, REV-2023-07 | `6e7a2cde0c963159ad3b467a85985d8034f33f8bfa44d380bbaab774c55bcbd6` |
| OJD Request for Set-Aside Criminal Record Check, REV-2022-01 | `7f8ed25e959d8c942c0c4573c5cc235a1a1e61c31eeeaaf14d98cb7183fa6267` |
| OSP Set-Aside Criminal History Request and Instructions, REV-2022-01 | `a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6` |

The byte check was confirmed live rather than assumed: appending a single byte
to the mounted packet turns `I-bytes-mounted` and `I-bytes-length` red, and
restoring the file returns the verifier to green.

The verifier degrades honestly when the corpus is absent. It says so in its own
output and falls back to the committed corpus index, source record and
pack-manifest digest, rather than reporting a byte proof it did not perform.
That is why it is safe to wire into the chain in environments that cannot mount
the corpus.
