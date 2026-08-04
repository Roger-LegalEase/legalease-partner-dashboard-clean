# Colorado JDF official-form family preflight

This directory is the fail-closed implementation boundary for the eight
Colorado tracks owned by `IMP-OF-04-co-jdf-family` and their fifteen declared
official-form identities.

The adopted legal design is read-only. This preflight does not rename,
substitute, or re-point a normalized JDF identity:

- `JDF-417-ORDER` has no matching retained identity. Existing authority
  evidence identifies JDF 418 as a distinct order, but using it requires an
  authorized legal-design amendment.
- `JDF-684` is an order denying a municipal petition, not the grant order
  expected by the normalized `proposed_order` component. JDF 686 is a distinct
  grant-order identity and is not silently substituted.
- `JDF-2370` is a retained instruction guide, not a participant motion. JDF
  2371 is a distinct motion and is not silently substituted.

Thirteen exact retained identities have registry-pinned hashes, byte lengths,
document roles, revisions, and Master Library paths. None of their source
binaries is materialized in this workspace. The other two normalized
identities are explicit unresolved declarations and intentionally have no
resolver source.

No captain assignment, assignment anchor, or portable projection is present
in this checkout. The recorded private paths and portable locators are
identity evidence only; they are not normative materialization contracts and
do not authorize a worker to download, copy, reconstruct, or project bytes.

JDF 680 and JDF 683 are the two retained flat-PDF overlay candidates. Their
coordinate arrays remain empty because the exact source bytes are absent and
no reproducible coordinate-approval record is available here. Historical
build-first samples and generic low-confidence review anchors are derived
artifacts, not source binaries or approval evidence.

Every component, field map, packet assembly, and review scaffold remains
runtime-disabled. Run the focused verifier with:

```text
node scripts/verify-rcap-colorado-jdf-official-form-preflight.mjs
```

`--require-ready` is intentionally fail-closed until exact bytes, identity
reconciliation, source inspection, mappings, technical review, visual review,
and legal-output review are complete.

The factory plan's canonical lane outputs are present as disabled boundaries:

```text
node scripts/verify-rcap-colorado-acroform-fill.mjs
node scripts/verify-rcap-colorado-flat-pdf-overlay.mjs
```

All three verifiers inspect repository metadata and code only. They do not
resolve, stat, or read a recorded `private/` source path. Until a captain
assignment supplies an assignment anchor and portable projection, every
retained identity reports `captain_assignment_required`.
