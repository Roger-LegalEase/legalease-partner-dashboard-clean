# D adoption continuity — reconciled, and mostly not a counsel problem

**Codex input:** `985cb0457b5b1c73f1a446bb1dfb0638c5e8b6c3` on `codex/rcap-d-adoption-continuity`, based on `0a4eaff5`
**Reconciled against:** the final D family handoff `40699489` and the 67-track queue
**Machine-readable:** `data/rcap-all50/review-artifacts/d-adoption-reconciliation.json`, `data/rcap-all50/review-artifacts/d-roger-adoption-decision-packet.json`

Codex classified 67 tracks and opened zero counsel jobs. That restraint was
right, and the reconciliation below keeps it: the reason 36 tracks could not be
classified is almost never that a lawyer needs to answer something.

## What the reconciliation changed

| Reconciled status | Tracks |
|---|---|
| `current_layout_only_continuity_applies` | 5 |
| `current_standing_adoption_applies` | 10 |
| `insufficient_component_bridge` | 36 |
| `outside_standing_scope` | 13 |
| `stale_due_to_substantive_family_change` | 3 |
| **total** | **67** |

## The 18 reported continuity closures

10 standing-adoption and 5 layout-only determinations survive contact with the
final family bytes. 3 do not, and all of them are Washington: their
CRRLJ families are the ones D-FIX-3 is correcting, and their participant
artifacts were re-rendered in v3. Continuity is not withdrawn there — it is
re-checked once the corrected artifact is accepted.

Two Colorado tracks keep their standing adoption and are still blocked, on a
held family rather than on adoption. Those are different gates with different
owners, and collapsing them would have sent a source hold to a lawyer.

The one Virginia track whose family was re-rendered in v3 keeps its continuity:
the re-render produced an approved artifact, and a changed artifact hash is not
a changed legal statement.

## The 36 unclassifiable tracks are engineering, not law

36 of them have no component bridge at all — either no exact family relationship
resolves, or their pinned component relationships are unresolved. There is
nothing for an adoption record to attach to yet. 0 are downstream of a family
that is held or under correction.

That leaves **0** tracks where every engineering prerequisite is closed and a
genuine adoption question could exist. Counsel work is created only there.

## One decision packet, thirteen tracks

The 13 outside-standing-scope tracks are in `data/rcap-all50/review-artifacts/d-roger-adoption-decision-packet.json`, each with its
jurisdiction, families, authority, why standing adoption does not reach it,
whether the obstacle is legal scope or missing metadata, the recommended
disposition, the supported fallback, and what stays blocked either way. No row
asks anyone to open a repository file or run a migration.

## What did not happen

No track promoted. No ledger regenerated. No family artifact, review
disposition, launch flag, migration, worker or staging record touched.
