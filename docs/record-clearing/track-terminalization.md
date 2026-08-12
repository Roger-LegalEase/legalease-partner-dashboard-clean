# 497-track terminalization — window 2026-08-12-w3

Terminality is a build fact: the participant treatment is complete, routed and
unconditioned. Counsel review promotion is the separate launch gate.

## Position

| Metric | Value |
|---|---|
| tracksTerminal | 278 / 497 |
| tracksWithRuntimeCoverage | 285 / 497 |
| jobsRemainingToLaunch | 104 |
| tracksTerminalizedThisWindow | 1 |
| unknownTrackDispositions | 0 |
| unownedBlockers | 0 |

## Required treatments for the 219 nonterminal tracks

| Treatment | Tracks |
|---|---|
| production_packet | 131 |
| complete_guidance | 63 |
| complete_composed_route | 16 |
| deliberate_scope_exclusion | 0 |
| exact_supported_deferral | 9 |

## Nonterminal tracks by lane

| Lane | Scope | Tracks |
|---|---|---|
| B | guidance, exclusions, exact deferrals | 72 |
| C | controlled pleadings and composed routes | 72 |
| D | official PDFs, AcroForms and overlays | 67 |
| E | XFA and hardest technical families | 8 |

F reviews every family through its review archetype; review throughput is
reported per window rather than assigned track counts.

## Top blockers

- **DEC-COUNSEL-wv-61-11-26-class-fidelity** — 3 track(s), owner Roger (with counsel), deadline 2026-08-15
- **DEC-COUNSEL-ky-431073-predicate-fidelity** — 2 track(s), owner Roger (with counsel), deadline 2026-08-15
- **DEC-AR-ar-misdemeanor-dwi-seal** — 1 track(s), owner Roger (with counsel), deadline 2026-08-14
- **DEC-TX-tx_exp_acquittal** — 1 track(s), owner Roger (with counsel), deadline 2026-08-14
- **DEC-COUNSEL-pa-3019-guidance-depth-fidelity** — 1 track(s), owner Roger (with counsel), deadline 2026-08-15

Every blocker carries an owner, a deadline, required evidence, a recommended
decision and a fallback terminal disposition; none sits in generic waiting.

Jobs marked runtimeWiringRequired need compiled-pathway routing in src/lib/rcap-engine, which is a frozen worker image input. Terminal A lands that wiring after worker publication at the freeze SHA (or an explicit re-fingerprint), integrating lane output that is data/docs-only in the meantime.
