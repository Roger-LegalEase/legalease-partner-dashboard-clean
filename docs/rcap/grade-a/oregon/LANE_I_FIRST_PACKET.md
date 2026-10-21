# Lane I — Oregon first Grade-A packet closeout

Lane branch `claude/grade-a-v6-first-packet-oregon`, from the post-Colorado-audit
base `148382ab2a2acbe673b6d35c8967f5a908342e60`.

Oregon stays **`CANDIDATE_ONLY`**. Nothing in this lane opens checkout,
sponsorship, a packet credit, a render, a delivery or any commercial status. All
three Oregon routes remain `INCOMPLETE` at the Grade-A authority and all ten
commercial admission points refuse them, before and after this work.

## Identity gate

All six conditions the envelope names were established before a file was edited.

| Required | Observed | |
|---|---|---|
| `origin` names `Roger-LegalEase/legalease-partner-dashboard-clean` | it does | pass |
| `148382ab…` exists in this clone | exists | pass |
| `148382ab…` is an ancestor of `origin/claude/legalease-sprint-captain-utucnw` | it is; the captain tip is `57bf4110` and well ahead | pass |
| `148382ab…` is an ancestor of `origin/claude/grade-a-v6-first-packet-oregon` | it is; the lane branch is exactly that commit | pass |
| Nothing but this lane's commits between the base and the lane tip | `git rev-list --count` returns 0 | pass |
| `git status --porcelain` prints nothing at worker start | it did | pass |

Not `ENVIRONMENT MISROUTED`. Production untouched.

### One deviation, recorded rather than worked around

The harness provisioned this session's branch as `claude/oregon-grade-a-packet-9dq1ay`
at `07675789`, which is an ancestor of the base rather than a descendant of it.
The branch was reset to the base — `07675789` is contained in `148382ab`, so
nothing was discarded — and the work is pushed to both that branch and the
envelope's `claude/grade-a-v6-first-packet-oregon` at the same commit. The
captain integrates the exact SHA either way.

### The corpus is mounted, and that is new

Lane C could not re-hash a single Oregon byte: no `private/` tree existed in its
container and it said so rather than reading digests back out of committed
records. This lane bootstrapped the pinned corpus and verified it.

- archive `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89`, verified
- 51 jurisdictions / 499 files / 329 PDFs, as the gate requires
- all **seven** source digests the Lane I envelope declares recomputed from the
  installed bytes and matching exactly
- all **329** binaries the committed corpus index describes byte-identical in the
  mounted archive

That last line settles the discrepancy Lane C flagged and could not resolve. The
committed index names archive `c0937fa7…` and the mounted release names
`a26e3ca7…`; every file digest is identical under both, so the two identifiers
differ in packaging, not in content. No source proof anywhere in the product is
affected by the difference.

## Route selection

`OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`.

Chosen by four signals other generators already wrote, read rather than judged.
The ranking is computed in the verifier, so a change upstream re-ranks the routes
instead of leaving a stale sentence here.

| Route | Public witness | Payment at evaluator | Subject form bound | Participant actions |
|---|---|---|---|---:|
| **`…without-conviction-under-ors-137-225-1-c`** | **`packet_ready_with_caution`** | **allowed** | **yes** | **16** |
| `…eligible-convictions-under-ors-137-225-1-a` | `needs_review` | refused | yes | 20 |
| `marijuana-specific-set-aside-redesignation` | `guidance_only` | refused | **no** | 18 |

It wins on every decisive signal at once, and the margin is not a tie broken by
name — the verifier asserts that too.

**Why the marijuana route is not first.** Its public witness settles it as
`guidance_only`, so the product never offers it as a packet and there is no
consumer path to exercise. Decisively, its packet set names only the generic
adult set-aside packet and the OSP history request. It never names
`OR-OJD-MJ-PCR`, the Oregon Judicial Department's own *Motion and Declaration to
Modify or Set Aside a Marijuana Conviction*, which sits in the corpus at
`6e7a2cde…` and already has a built overlay family. The state's own committed
legal review rates the marijuana track "Additional research required" and cites
ORS 475C.397, a statute the route never mentions. A route bound to the wrong
court form is not made first by proving things about the form it is wrongly bound
to.

**Why the eligible-convictions route is not first.** Its witness settles as
`needs_review` rather than as a packet and payment is refused at the evaluator.
Its packet set's participant actions do carry ORS 137.225(1)(a) full-compliance
language, so the content is right; the legacy registry track it is adjudicated to
is nevertheless named `or_contempt_setaside`, which is a reconciliation a
reviewer should not have to do on a first packet. It also requires the most
participant-gathered attachments of the three.

The selection is corroborated by a fifth signal this lane did not use to rank:
the committed Oregon legal review rates the acquittal track **"Approved for
implementation with limitations — cleanest disposition in the state and there is
no reason to delay a filing."**

- **Packet family:** the Grade-A record carries `packetFamilyId: null`. The
  build-side identity is the overlay folder `oregon` and, within it, the families
  `or-ojd-adult-set-aside-packet-motion-and-declaration` (primary filing) and
  `or-osp-set-aside-criminal-history-request-and-instructions` (record
  gathering). These are not the same field; see finding 5.
- **Source set:** `OR-OJD-ADULT-SET-ASIDE-PACKET` at `b22cc346…` (5 pages, flat)
  and `OR-OSP-SET-ASIDE-CCH` at `a523a9ff…` (2 pages, AcroForm, 22 fields).
- **Artifact set:** the finalized primary filing at `582100f2…` (5 pages,
  217,271 bytes) and its companion record-gathering artifact at `c1e8211f…`
  (2 pages).

## What closed, and what did not

29 dimensions, each either closed, closed under a stated counterfactual, or
classified with the exact thing that is missing. The full table with its
reasoning is `data/rcap-lane-c/oregon/lane-i-proof-closure.json`.

| | Count |
|---|---:|
| Closed from bytes on this run | 6 |
| Closed under the counterfactual (see below) | 13 |
| Not applicable by architecture | 1 |
| Classified — engineering or record defect | 5 |
| Open owner decision | 2 |
| Open counsel question | 2 |

### The counterfactual, and why it is honest

Every admission point refuses today, so exercising the product path against the
live record would have proved only that a denied route denies. That is worth
asserting and it is asserted — the live record refuses all ten points — but it
establishes nothing about whether the money, credit and delivery rules would be
right once the owner signs.

So the path was run twice more, against in-memory records that exist for the
length of one function call and are never written anywhere.

**Tier A — the owner signs, and nothing else changes.** The route evaluates as
`COMPLETE_PACKET_PROVEN`, and **every admission point still refuses**, with
`fulfillment_schema_below_admission_minimum`. That is the finding: the two owner
decisions are not sufficient, and what is left is not another owner decision. See
finding 4.

**Tier B — and the record is also raised to the admission schema with a
fileability proof bound to the real filed PDF.** Now the participant rules
actually run, against the shipped `admitCommercialAction` and
`collectContextDenials`:

| | |
|---|---|
| consumer checkout | admits |
| sponsored entitlement | admits, through the same function and the same rule |
| consumer vs sponsored | byte-identical denial sets |
| packet credit | admits once |
| generation on a fresh credit | admits |
| generation on a spent credit | refused as a double charge |
| render retry on a spent credit | tolerated, so a failed render costs no second credit |
| artifact attachment, Briefcase ready, first download | admit, private storage and bound digest required |
| repeat download | admits with no entitlement at all |
| repeat download with no prior download | refused |
| wrong user | refused — does not own this matter |
| wrong matter | refused — snapshot belongs to a different matter |
| substituted artifact | refused — no digest binds delivery |
| publicly reachable artifact | refused |
| invalidated verification | refused, and the payment survives it |
| verification taken for another route | refused |
| this record offered for another route | refused as a binding mismatch |

**Expired-link denial has no subject.** Packet artifacts are never served through
a signed URL with a TTL: `artifact-storage.ts` downloads through the server's own
storage client and `streamAuthorizedPacket` re-reads the object and re-verifies
its hash before serving a byte. There is no link to expire. The property that
stands in its place is content re-verification on every delivery, and that is
what the substituted-artifact denial proves.

**Durable render was not exercised.** The worker writes through Supabase storage
with `upsert: false`. No Supabase is configured here and configuring one would be
a production action, so durability rests on the adapter's contract rather than on
a written object. Recorded, not worked around.

## Five findings

Each is measured by the verifier rather than asserted, and none is in a path this
lane may edit.

### 1 — The Grade-A record validates the wrong object

`artifactValidation.artifactSha256` for this route is `b93aad1d…`. That is a
**3,405-character text composition in 12 sections**, produced by the launch
graph's artifact probe — whose own `limitation` field says, in the committed
ledger, that official-form filling could not be exercised because the source PDFs
were not present.

The object a participant would actually file is `582100f2…`: the OJD Criminal
Set-Aside packet, 5 pages, 217,271 bytes, with values written at the declared
anchors on pages 4 and 5 and every page retained. It is deterministic — creation
and modification dates are pinned, so the same facts against the same source
binary reproduce the hash byte for byte.

Nothing binds them together, and under `FILEABLE_ARTIFACT_FORMATS` a text
composition **is not a filing format**. So the record's artifact proof is about a
document nobody files, and the document they do file has no Grade-A record.

This is why the approval packet is bound to the PDF and says so in as many words.

### 2 — The specification hash does not pin the specification

The bound value is

```js
sha256(stableStringify({ packetSetIds, componentCount, participantActionsRequired }))
```

— a set id, a count and a count. Replace a component's bound official form,
change its role, rewrite every participant instruction: the hash does not move.
The verifier proves this by doing exactly that. `collectStaleness` compares this
value, so the specification can change under the record without ever reading as
stale.

This is the same defect Lane C found in the source dimension, in a different
dimension. A content digest over the packet-set manifest is recorded in the
closure file and is offered as the replacement.

**Requested:** derive `packetSpecification.sha256` from the packet-set manifest's
own content.

### 3 — Two committed records disagree on the controlling subsection

The route id names **ORS 137.225(1)(c)**. The legal-design track registry files
`or_acquittal` — the track this route binds — under **ORS 137.225(1)(d)**.

This is not a typo to correct in passing. Oregon's own committed legal review
flags the same area as unsettled in its fifth headline finding: current
subsection (8) opens *"The provisions of subsection (1)(c) **or (d)** of this
section do not apply to"*, and the source reference it reviewed never mentions
(1)(d) at all. Two committed records disagree, the underlying statute is
genuinely ambiguous in the material available, and a build lane does not get to
pick one. It is question **Q1** in the approval packet.

### 4 — The owner decisions are not the last gate

Every Oregon record declares `rcap-grade-a-fulfillment-authority/v1`. Commercial
admission requires `/v2`, which carries the packet fileability proof. Tier A
above demonstrates the consequence: with both owner proofs granted and nothing
else changed, all ten admission points refuse.

The authority's own comment names this case exactly — *"a v1 record with every v1
proof is precisely the dangerous case, because nothing about it looks wrong"* —
and it is right. A status page reading "2 missing proofs" understates what is
left.

**Requested:** raise the Oregon records to `/v2` and bind `packetCompleteness`.
Lane I has established every value that proof needs; they are in
`lane-i-product-path.json` under `tierB`, with `filingFormatArtifact` bound to
`582100f2…`, format `pdf`, 5 pages.

### 5 — The packet-family cross-check agrees for the wrong reason

`resolvePacketFamilyId` reads `packetSpecificationFor(routeId)`, and
`src/lib/rcap/grade-a/packet-specification.ts` loads exactly one specification —
North Dakota's. Every Oregon route resolves to `null`, and the record's
`packetFamilyId` is also `null`, so the comparison the module's own comment
describes as *"the independent server-side statement of the same fact"* passes as
`null === null`.

It is not wrong today, because both sides are genuinely absent. It would fail to
notice if one side gained a family and the other did not.

## The exact owner decision

One decision, on one artifact, for one route:

> Approve or reject the artifact at SHA-256 `582100f2383ff0ad4b282a6d347eda76c5297c23cddbaf82ce164d6ff801543f`
> (5 pages, 217,271 bytes), together with its companion record-gathering artifact
> at `c1e8211f5e11ca5f77bc9d7bcaf255b39e82022f05aaa66fe14725bb55e7942a` (2 pages),
> as the completed output of route
> `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`,
> built from packet set `or_acquittal-set` v1.0.0 against official sources
> `OR-OJD-ADULT-SET-ASIDE-PACKET` at `b22cc346…` and `OR-OSP-SET-ASIDE-CCH` at
> `a523a9ff…`.

Two of the reviewer's four questions are blocking (Q1, the controlling
subsection; Q2, whether a route labelled for arrests or charges without
conviction may deliver the acquittal packet only). The full packet, with the
page-by-page review, the actual-write evidence and the known limitations, is
`docs/rcap/grade-a/oregon/OUTPUT_LEGAL_REVIEW.json`.

No broad Oregon legal research is requested and none is needed for this decision.

## Owned paths

- `data/rcap-lane-c/oregon/**` — the envelope copy, route selection, proof
  closure, product path
- `docs/rcap/grade-a/oregon/**` — this document and the approval packet
- `data/rcap-all50/overlays/lane-c-candidates/oregon/**` — read only; **no
  overlay was rebuilt or edited**

One file outside those three: `scripts/verify-rcap-lane-i-oregon-first-packet.mjs`,
new and lane-scoped, because the required focused tests cannot be run without it.
No existing script was modified.

Untouched: fulfillment authority, render and payment implementation, global
registries, the launch graph, migrations, package files, production overlays,
Colorado, and every captain-only path including `data/rcap-grade-a/`.

## Tests

| Command | Result |
|---|---|
| `node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs` | green |
| `node scripts/verify-rcap-oregon-grade-a-lane-c.mjs` | green |
| `node scripts/verify-rcap-grade-a-fulfillment-authority.mjs` | green, 69 checks, 0 commercially eligible |
| `node scripts/verify-rcap-lane-f-commercial-admission.mjs` | green, 52 checks, 10 points governed once each |
| `node scripts/verify-rcap-lane-i-oregon-first-packet.mjs` | green, 68 checks |
| `node scripts/verify-rcap-lane-i-oregon-first-packet.mjs --mutations` | 10/10 caught |
| `npm run typecheck` | clean |
| `git diff --check` | clean |

## Captain patch requests

Ordered. Nothing after step 1 changes the commercial outcome on its own.

1. **Finding 4** — raise the three Oregon records to
   `rcap-grade-a-fulfillment-authority/v2` and bind `packetCompleteness`, using
   the values in `data/rcap-lane-c/oregon/lane-i-product-path.json` → `tierB`.
   Until this is done, granting both owner proofs still leaves every admission
   point refusing.
2. **Finding 1** — bind `artifactValidation` to the finalized fileable PDF rather
   than to the launch graph's text composition, or state in the record that the
   two are different objects. Today the record's artifact proof is about a
   document nobody files.
3. **Finding 2** — derive `packetSpecification.sha256` from the packet-set
   manifest's content in
   `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`.
4. **Finding 5** — either load Oregon packet specifications into
   `src/lib/rcap/grade-a/packet-specification.ts` or make the null-vs-null family
   comparison explicit, so it cannot silently stop checking.
5. **Findings 3 and Q2** — route the two counsel questions to the named legal
   reviewer with the approval packet. Not a lane's and not a captain's to answer.
6. **Wire the lane gate into the `test` chain** in `package.json`, which this
   lane may not edit. Append, do not replace:
   ```
   && node scripts/verify-rcap-lane-i-oregon-first-packet.mjs
   && node scripts/verify-rcap-lane-i-oregon-first-packet.mjs --mutations
   ```
   Note that the source checks recompute from the mounted corpus when it is
   present and report the mode either way; the gate does not require the corpus
   to run, and it never reads a digest back out of a committed record and calls
   it a recomputation.

Separately outstanding and not a lane's: the independent human visual review, and
production-overlay admission, which additionally needs a PDF implementation
freeze naming these families and per-family `artifact-provenance.json` hashed
from installed bytes.
