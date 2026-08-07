# Wave integration provenance corrections

Integration commits whose recorded scope is narrower than what they actually
carry. The commits are published and are not rewritten; this is the correction
of record.

## 69b215d — "feat(record-clearing): integrate ND and WI pleadings"

The subject names two implementations. The commit carries four, because
`git checkout <commit> -- <path>` leaves its paths staged and the first commit
of the phase took everything that was staged.

Every payload is the exact worker blob and every worker branch is unchanged.

| Implementation | Worker branch | Worker commit |
| --- | --- | --- |
| North Dakota custom pleading | `rcap-factory/rcap-nd-custom-pleading-8e2164b3-eefc48ea` | `9e4e4099c43a1276958f83fd31f0f4bf95d937a2` |
| Wisconsin custom pleading | `rcap-factory/rcap-wi-custom-pleading-e5a9d38e-7dc4fef6` | `0120a3213552dc307788fd6026b130241aa91db8` |
| New York guidance | `rcap-factory/rcap-ny-guidance-implementation-f88576f0-60d051c3` | `ab900aa61ed9ae9fe96925cfc9168025bb775e5d` |
| Oklahoma guidance | `rcap-factory/rcap-ok-guidance-implementation-916e92d6-6122f3ae` | `2608a5f354dc8648fdbdf96c14e262d6028743ad` |

Integrating the Oklahoma module in the same commit does not register it. It is
blocked with `implementationState: correction_required`, carries no packet
proof, no review manifest and no output-review job, and is integrated only so
its copy correction has a canonical integrated parent.

North Dakota and New York are both valid completions that preceded their
coordination claims. North Dakota finished against fingerprint `eefc48ea` and a
later `SESSION_B` reservation moved the key to `936d912d`; New York finished
against `60d051c3` and a later `SESSION_C` reservation moved it to `1fa58117`.
In both cases the claim was the only differing field — tracks, components,
owned paths, expected outputs, commit subject, legal-design inputs and renderer
interfaces were byte-identical — so both branches are accepted as they stand.
The underlying defect is fixed in `bf06ee8`, which takes `assignmentClaim` out
of the branch fingerprint.

## bf06ee8 — "fix(record-clearing): stabilize worker claims and integrate wave decisions"

Same cause, corrected in the message before that commit was pushed: it carries
the claim/fingerprint repair *and* the five integrated decision blobs.
