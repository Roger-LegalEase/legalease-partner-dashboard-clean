# BLOCKER-5 — Proposed new authorization for the pinned Mississippi proof

Lane J. **Prepared, not applied.** None of the three protected files has been
modified. `git status --porcelain` is clean apart from this lane's own
documents.

Protected and untouched:

- `data/expungement-ai/screening-parity-approved-deltas.json`
- `scripts/lib/screening-parity-deltas.mjs`
- `scripts/verify-screening-verification-finetune.mjs`

Proposed edit as a diff: `patches/blocker-5-mississippi-proof-proposed.diff`

---

## 1. The current approved expectation

`data/expungement-ai/screening-parity-approved-deltas.json` →
`runtimeReauthorizations[0]`, id `public-profile-lifecycle-validation-2026-08-26`:

```json
{
  "id": "public-profile-lifecycle-validation-2026-08-26",
  "deltaId": "md-pardon-signed-date-2026-08-25",
  "path": "src/lib/rcap-engine/public-profile-projection.ts",
  "priorSha256": "30a6360e99e93895757604fcdefa7a59dac94b78e1a622ea59112e6ffa78d8e9",
  "newSha256":  "c744aa842bcf24ec943d6f1238a57726ac682f24802165ab7dd3591bcd98be73",
  "proofPath":   "scripts/verify-screening-verification-finetune.mjs",
  "proofSha256": "74624c8464e40e02c272b967ebeba42452681d163ea4be6d013af01778b7759d",
  "authorizedBy": "Roger Roman via the controlling 2026-08-26 targeted fine-tune directive",
  "authorizedOn": "2026-08-26",
  "scope":       "post_projection_question_lifecycle_validation_only",
  "environment": "repository_non_production_only"
}
```

The proof it names is currently at exactly that hash — verified by
`sha256sum scripts/verify-screening-verification-finetune.mjs`. The approval is
intact; the proof is what has gone stale.

The specific expectation, at `scripts/verify-screening-verification-finetune.mjs:711`:

```js
assert.doesNotThrow(() => assertCheckoutAllowed(protectedVerification.snapshot));
```

In plain terms: *this route reaches checkout without throwing.*

## 2. The current fixture route

`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`

Built in the fixture at lines 358–462:
`residency_or_location: "Jackson, Mississippi"`,
`pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal"`,
carried through `serverFacts.pathway_id` into the protected verification
snapshot the assertion consumes.

## 3. Why that expectation is no longer truthful

Running the proof today:

```
AssertionError [ERR_ASSERTION]: Got unwanted exception.
Actual message: "participant delivery refused:
  MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal
  cannot prove it delivers the packet it promises (missing fulfillment record)."
    at assertPacketFulfillmentProven (src/lib/expungement-ai/packet-fulfillment-authority.ts:201)
    at assertPacketRouteCanDeliver   (src/lib/expungement-ai/payment-adapter.ts:500)
    at assertCheckoutAllowed         (src/lib/expungement-ai/payment-adapter.ts:529)
```

Two things happened after the proof was signed on 2026-08-26.

**First**, `assertCheckoutAllowed` gained `assertPacketRouteCanDeliver`, which
consults `data/rcap-ledger/packet-fulfillment-records.json`. That ledger holds
exactly one record — `ND:first-offense-possession-sealing` — and its own note is
explicit: *"An empty set is universal refusal."* Mississippi has no record and
the refusal is correct.

**Second, and controlling**, the owner's decision of 2026-08-28,
`data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`,
authority **Roger Roman**:

> "The legacy packet generators for Illinois, District of Columbia,
> Pennsylvania, **Mississippi** and Texas-Harris are not approved commercial
> fulfillment paths. Do not restore their direct-consumer price. Do not create
> a state-specific exception… They may not authorize checkout, sponsored
> entitlement, packet-credit consumption, render jobs, participant delivery, or
> commercially deliverable status."

So the proof does not merely disagree with the current code. It asserts, as an
approved expectation, the exact opposite of a decision the owner has since made
in writing. Leaving it in place means the suite is pinned to proving that
Mississippi can sell.

**This is a stale proof, not a regression.** The runtime is behaving correctly
and the refusal is the desired behaviour. Nothing in the product is broken.

## 4. The current correct commercial denial

`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` is
**denied at checkout**, by `PacketFulfillmentNotProvenError`, with:

- `routeKey`: `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
- `missing`: `["fulfillment record"]`
- `detail`: *"…has no packet fulfillment record, so no commercial authority is
  granted. A route sells only what it can prove it delivers."*

That is the denial the replacement expectation should assert.

## 5. Assertions removed and added

**Removed — exactly one line (711):**

```js
assert.doesNotThrow(() => assertCheckoutAllowed(protectedVerification.snapshot));
```

**Added — five lines:**

```js
assert.throws(
  () => assertCheckoutAllowed(protectedVerification.snapshot),
  /cannot prove it delivers the packet it promises/,
  "a route with no Grade-A fulfillment record is refused at checkout, whatever its verification proves"
);
```

Net: **1 line removed, 5 added.** Nothing else in the file changes.

**Verified sufficient.** A scratch copy of the proof carrying only this change
was run at the base SHA and printed `screening-verification-finetune: OK`,
exit 0. The scratch copy was deleted; the worktree is clean. So this is the
whole edit — there is no second stale assertion behind the first.

## 6. Why the change is a weakening under the existing approval

`scripts/lib/screening-parity-deltas.mjs`, `validateProofRevisions`:

```js
if (revision.linesRemoved > 0) {
  reject(`${where} removes ${revision.linesRemoved} line(s) from the proof;
    weakening a proof needs a new authorization, not a revision`);
}
```

and the comment above it:

> "A proof may be strengthened under a standing approval; it may not be
> weakened… A revision that removes lines is rejected here rather than accepted
> with a note, because 'we also deleted some assertions' is precisely the change
> that needs a person."

The edit removes one line. `linesRemoved` is 1, so it cannot be recorded as a
`proofRevisions` entry under the standing 2026-08-26 approval. The precedent
entry — the 2026-08-27 revision, 82 lines added, 0 removed — is what a
strengthening looks like; this is not that.

The substance matches the mechanism. Replacing "checkout succeeds" with
"checkout is refused" flips the direction of a commercial assertion. Even though
the new assertion is *stricter* about the product, it *removes* the proof that
the happy path works, and the mechanism is right to route that through a person.

## 7. Preferred replacement architecture

**Recommended: keep the fixture, invert the assertion. Do not add a Mississippi
fulfillment record.**

The proof's subject is the protected-verification lifecycle — CAS behaviour,
forged mirrors, no-op saves, protected precedence. The route identity is
incidental scenery. Inverting one assertion keeps the file's subject intact,
keeps the fixture's 300-plus lines of established snapshot data, and makes the
proof assert the true thing: *verification proving out does not by itself open
checkout; fulfillment authority is a separate gate that fails closed.*

That is a stronger claim about the system than the one it replaces. It is also
the claim the 2026-08-28 owner decision makes.

**Adding a Mississippi fulfillment record is the wrong fix and is out of scope
for this lane.** It would assert that a proven, specified, rendered Mississippi
packet exists, and none does. It would also contradict the owner decision
directly and create the state-specific exception the decision's
`noLegacyExceptionRule` forbids: *"There is no state-specific commercial
exception and none may be created."*

### 7a. Option — synthetic local v2 record

Introduce a synthetic fulfillment record inside the proof's own module scope
(never in `data/rcap-ledger/packet-fulfillment-records.json`) so the fixture
route can be made to pass fulfillment, and keep `assert.doesNotThrow`.

- *For:* preserves an executed happy path through `assertCheckoutAllowed`.
- *Against:* `packet-fulfillment-authority.ts` builds `RECORDS` at module load
  from a static import, so a synthetic record means either mutating the tracked
  ledger — which the module's own comment rejects: *"Testing it by writing rows
  into the ledger and re-importing the module would mean mutating a tracked file
  to prove a rule about tracked files, and a module cache makes the second
  import a lie anyway"* — or introducing an injection seam into the commercial
  authority path, which is a wider and riskier change than the one being
  authorized. It also puts a fabricated Mississippi packet claim inside the
  proof, one refactor away from looking like evidence.
- **Not recommended.**

### 7b. Option — route-separated verification

Split the proof: keep the Mississippi fixture for every
verification-lifecycle assertion, and exercise `assertCheckoutAllowed`'s happy
path against `ND:first-offense-possession-sealing`, the one route that genuinely
holds a complete fulfillment record.

- *For:* keeps both directions proven — refusal on a route without a record,
  admission on a route with one — with no fabricated data anywhere.
- *Against:* materially larger. It needs a second protected-verification
  snapshot built from the ND profile with ND's fifteen required facts, so it is
  a new fixture rather than an edited assertion, and it widens the authorization
  from one line to a new fixture block.
- **Recommended as a follow-up, not as this authorization.** The ND happy path
  belongs in the Grade-A fulfillment proof
  (`scripts/verify-rcap-grade-a-fulfillment-authority.mjs`), where the record
  already lives, rather than in a projection-lifecycle proof.

## 8. Exact files requiring a new approval

Three, and all three must move together or the suite is inconsistent:

| # | File | Exact change |
|---|---|---|
| 1 | `scripts/verify-screening-verification-finetune.mjs` | Line 711 replaced per §5. −1 / +5. |
| 2 | `data/expungement-ai/screening-parity-approved-deltas.json` | `runtimeReauthorizations[0].proofSha256` → the new hash, and a new `proofRevisions` entry recording the change. See §10 on why the revision entry alone is not enough. |
| 3 | `scripts/lib/screening-parity-deltas.mjs` | The module constant `RUNTIME_REAUTHORIZATION_PROOF_SHA256` (line 172) → the new hash. This file is not itself hash-pinned, but the constant is compared against the approval record and against the live file hash, so leaving it stale fails the check from the other side. |

No other file changes. `src/lib/rcap-engine/public-profile-projection.ts` and
its `priorSha256` / `newSha256` are untouched: this authorization concerns the
proof, not the projection it proves.

## 9. Proposed new proof hash after the authorized edit

```
903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642
```

superseding

```
74624c8464e40e02c272b967ebeba42452681d163ea4be6d013af01778b7759d
```

Computed by writing the §5 edit into a scratch copy at base
`148382ab2a2acbe673b6d35c8967f5a908342e60` and hashing it. **The hash is only
valid for the byte-exact edit in
`patches/blocker-5-mississippi-proof-proposed.diff`.** Any change to the
assertion text, the message string or the whitespace produces a different hash,
and the value must then be recomputed from the file that actually results — not
copied from here.

## 10. Approval records to update

**One authorization record, three fields, plus one module constant.**

The honest structure is a **new authorization record**, not a revision of the
2026-08-26 one, because §6 establishes that the mechanism reserves revisions for
strengthening. Two shapes are available:

- **(a) Supersede.** Add a second entry to `runtimeReauthorizations` with a new
  id (e.g. `mississippi-commercial-denial-truth-2026-08-29`), a new
  `authorizedOn`, and its own `proofRevisions` chain starting at
  `903b1b6e…954642`; mark the 2026-08-26 entry as superseded for the proof it
  names. Cleanest history, but `RUNTIME_REAUTHORIZATION_PROOF_SHA256` is a
  single module-level constant, so two live entries pointing at one proof would
  need the constant's shape to change too.
- **(b) Re-sign in place.** Keep id
  `public-profile-lifecycle-validation-2026-08-26`, move `authorizedOn` to the
  new signing date, replace `proofSha256`, and reset `proofRevisions` to a
  single entry at the new hash with a reason naming this weakening and the
  authorization that permitted it. Smaller and it fits the existing schema
  without change.

**(b) is recommended**, on the condition that the reason string records that a
line was removed and names the authorization — otherwise the history reads as if
the proof had only ever been strengthened, which is exactly the fiction the
mechanism exists to prevent.

Under (b), the `proofRevisions` entry must satisfy `validateProofRevisions`:
exact keys `commit`, `date`, `author`, `linesAdded`, `linesRemoved`, `sha256`,
`reason`; `date` not before `authorizedOn`; `sha256` equal to
`proofSha256`; and `linesRemoved` **0**, which is only truthful if the new
authorization treats `903b1b6e…954642` as the chain's origin rather than as a
revision of `74624c84…7b759d`. That is the concrete reason a revision cannot
carry this change, and the reason the approver's statement below must say so
explicitly.

`scripts/test-expungement-parity-delta-mutations.mjs` currently passes 26/26 and
must be re-run after any of this lands: its mutations include *"the runtime
reauthorization breaks its exact prior-hash chain"*, *"the runtime
reauthorization substitutes a different proof"* and *"the superseded hash is
dropped after a re-pin"*, all of which bear directly on this edit.

## 11. Exact approver statement

To be issued by **Roger Roman**. Nothing here is self-authorized by this lane.

> I authorize a new proof authorization for
> `scripts/verify-screening-verification-finetune.mjs`, replacing proof hash
> `74624c8464e40e02c272b967ebeba42452681d163ea4be6d013af01778b7759d` with
> `903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642`.
>
> The authorized edit is exactly the one at line 711: the single assertion
> `assert.doesNotThrow(() => assertCheckoutAllowed(protectedVerification.snapshot))`
> is replaced by an `assert.throws` requiring the refusal
> `/cannot prove it delivers the packet it promises/`. One line removed, five
> added, byte-for-byte as recorded in
> `docs/rcap/grade-a/lane-j/patches/blocker-5-mississippi-proof-proposed.diff`.
> No other line of that file is authorized to change.
>
> I acknowledge this is a weakening under the standing 2026-08-26 authorization,
> because it removes a line, and that it therefore cannot be recorded as a proof
> revision. It is authorized because the removed assertion asserted that
> `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
> reaches checkout, which contradicts my decision of 2026-08-28 recorded in
> `data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`.
> The replacement asserts the refusal that decision requires.
>
> I authorize the corresponding update of
> `data/expungement-ai/screening-parity-approved-deltas.json`
> (`runtimeReauthorizations[0].proofSha256` and its `proofRevisions` chain, reset
> to a single entry at the new hash whose reason names this weakening and this
> statement) and of the `RUNTIME_REAUTHORIZATION_PROOF_SHA256` constant in
> `scripts/lib/screening-parity-deltas.mjs`.
>
> This authorization does **not** authorize: adding a Mississippi packet
> fulfillment record; any change to `data/rcap-ledger/packet-fulfillment-records.json`;
> opening checkout, sponsored entitlement, packet-credit consumption, a render
> job or participant delivery for any Mississippi route or any other legacy
> route; any change to `src/lib/rcap-engine/public-profile-projection.ts` or to
> the `md-pardon-signed-date-2026-08-25` delta; any legal conclusion; any
> migration, deployment, staging or production change.
>
> Environment: repository, non-production only.
>
> Signed: Roger Roman — date: ____________

## 12. What engineering may do the moment that statement exists

1. Apply `patches/blocker-5-mississippi-proof-proposed.diff` to
   `scripts/verify-screening-verification-finetune.mjs`.
2. Recompute the file's sha256 and confirm it is `903b1b6e…954642`. If it is
   not, stop: the edit is not the authorized one.
3. Update `runtimeReauthorizations[0].proofSha256` and its `proofRevisions` in
   `data/expungement-ai/screening-parity-approved-deltas.json` per §10(b).
4. Update `RUNTIME_REAUTHORIZATION_PROOF_SHA256` in
   `scripts/lib/screening-parity-deltas.mjs`.
5. Run, and require green on all three:
   - `node scripts/verify-screening-verification-finetune.mjs`
   - `node scripts/test-expungement-parity-delta-mutations.mjs`
   - `node scripts/verify-expungement-plain-language-values.mjs`

Steps 1 through 4 are indivisible: any subset leaves the approval and the proof
disagreeing, which is the state this blocker exists to prevent.
