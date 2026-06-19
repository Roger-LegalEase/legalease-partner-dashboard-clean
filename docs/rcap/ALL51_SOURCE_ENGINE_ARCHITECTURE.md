# All-51 Source Engine Architecture

LegalEase RCAP and Expungement.ai now share one server-only source-driven engine under `src/lib/rcap-engine/`.

## Runtime Boundaries

- Full internal profiles live in `src/lib/rcap-engine/compiled/profiles/`.
- Public browser profiles are projected from the designer-safe `all51.json` contract while retaining the internal profile version and source guardrails.
- `POST /api/expungement-ai/evaluate` calls `evaluateExpungementAiMatter`, which calls the shared deterministic evaluator.
- RCAP integration calls `evaluateRcapMatter`, which maps the neutral result to case-level statuses from `RCAP_SOURCE_OF_TRUTH_v2.md`.
- Consumer packet generation uses `source_driven_packet_plan` artifacts only. The old MVP generators and generic all-51 fallback are removed from active runtime.

## Deterministic Evaluation Order

The evaluator applies hard stops, missing facts, timing/completion blockers, exclusion/review conditions, automatic guidance routes, and packet routes without LLM calls or client-authored pathway fields.

## Public API

- `GET /api/expungement-ai/profiles/{state}` returns only consumer-safe profile fields.
- `POST /api/expungement-ai/evaluate` evaluates one matter against a profile version and answer map.

## Payment and Fulfillment

Payment remains clamped to `packet_ready` / `packet_ready_with_caution` plus engine `paymentAllowed=true`. Packet generation requires an owned Briefcase item and confirmed payment or dry-run test mode.
