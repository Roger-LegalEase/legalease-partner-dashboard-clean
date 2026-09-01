# IV-E independent verification report

## Scope and independence

IV-E attempted each assigned family exactly once without changing packet bytes, overlays, builders, receipts, decisions, claims, queues, launch authority, commercial routing, or Production. The collision gate found no active Claude verification owner and no active packet-byte rewrite for an assigned family.

## Results

| Family | Verdict | Decisive independent finding |
| --- | --- | --- |
| `vt_seal_felony-set` | `PASS_COMPLETE_INDEPENDENT` | Current `RASTER_PASS` receipt binds the recomputed six-page canonical and boundary hashes; the three-component combined packet matches; the independent completeness verifier returned all nine counters zero; instructions cover destination, fee/waiver and service unknown-stops, participant completion, prosecutor/court-owned fields, and self-help limits. |
| `vt_seal_pardon-set` | `FAIL_REPAIR_REQUIRED` | Hashes, six-page packet, component set, receipt, and completeness counters pass, but `participant-instructions.md` omits a filing destination and omits fee/waiver and service/notice treatment or explicit unknown-input stops. |
| `wa_vac_cannabis-set` | `BLOCKED_RASTER_RECEIPT` | The packet component set contains the one-page CRRLJ-09.0800 petition and two-page CRRLJ-09.0870 proposed order, but the exact current queue receipt binds only CRRLJ-09.0800. The required proposed-order hashes and pages therefore have no current receipt binding. This is a receipt block, not a finding that the proposed-order repository bytes are defective. |

## Independent measurements

All current queue-bound hashes were recomputed from repository bytes with SHA-256. Page counts were read independently with `pdf-lib`. The completeness verifier was run independently for every family and returned `PASS_COMPLETE` with all nine counters zero for each. Source bindings passed for all three families. The Vermont combined packet component sets and the Washington two-form component set were compared against their field maps, source receipts, fixture manifests, and rendered-artifact records.

The family preflight was also run. Source, corpus, toolchain, minimum-ancestor, stale-artifact, and operational-path checks passed. Its overall readiness result was not used as a packet verdict because writing the required collision guard made the worktree intentionally non-clean; additionally, the two Vermont families are assigned by the current packet-factory assignment file rather than the older cloud-dispatch lookup used by that preflight invocation.

## Raster artifacts

The repository contained receipt metadata (workflow run, successful job, artifact id/digest, hash bindings, and canary dependency), which was inspected. Direct GitHub artifact retrieval could not be attempted because repository authorization was not present in the task environment. No receipt JSON or PNG set from the downloadable artifact was claimed as directly inspected, and the download limitation was not restated as a packet defect.

## Repair payload

One bounded, family-specific repair payload was written for `vt_seal_pardon-set`. It authorizes only the assigned repair lane to add the missing filing destination, fee/waiver treatment, and service/notice treatment to participant instructions. It prohibits packet-byte, overlay/builder, source, decision, claim, queue, launch, and Production changes. Because the repair is instruction-only, it does not require PDF rerendering; it does require a new independent verifier.

## Authority

This report opens zero commercial routes, grants no launch authority, and touches no Production system.
