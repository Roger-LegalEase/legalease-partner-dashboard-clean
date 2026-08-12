# Lane C component deferral authoring contract

This contract is correction evidence, not a promotion or approval. It applies
only to the 31 components frozen in
`data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json`.

Each assigned component directory contains `deferral-treatment.json` and
`fixtures/canonical.json`. The treatment has this shape:

```json
{
  "schemaVersion": "rcap-official-form-deferral-treatment/v1",
  "trackId": "exact assignment trackId",
  "componentId": "exact assignment componentId",
  "unitId": "exact assignment unitId",
  "role": "exact assignment role",
  "candidateDisposition": "exact_supported_deferral",
  "participantTreatment": {
    "absentComponent": { "en": "...", "es": "...", "evidenceRefs": ["dependency-record"] },
    "specificReason": { "en": "...", "es": "...", "evidenceRefs": ["dependency-record"] },
    "destination": {
      "name": "named issuing authority, court, agency, clerk, or official resource",
      "kind": "issuing_authority | court | agency | clerk | official_resource",
      "url": null,
      "en": "...",
      "es": "...",
      "evidenceRefs": ["dependency-record"]
    },
    "nextAction": { "en": "...", "es": "...", "evidenceRefs": ["dependency-record"] },
    "gather": { "en": ["..."], "es": ["..."], "evidenceRefs": ["dependency-record"] },
    "doNot": { "en": ["..."], "es": ["..."], "evidenceRefs": ["dependency-record"] },
    "packetAbsenceDisclosure": { "en": "...", "es": "...", "evidenceRefs": ["captain-assignment"] },
    "briefcase": {
      "preserved": { "en": ["..."], "es": ["..."], "evidenceRefs": ["captain-assignment"] },
      "outstanding": { "en": ["..."], "es": ["..."], "evidenceRefs": ["captain-assignment"] },
      "return": { "en": "...", "es": "...", "evidenceRefs": ["captain-assignment"] }
    },
    "payment": {
      "paymentAllowed": false,
      "checkoutSuppressed": true,
      "en": "...",
      "es": "...",
      "evidenceRefs": ["captain-assignment"]
    },
    "credit": {
      "packetCreditConsumption": "none",
      "partnerCreditConsumed": false,
      "en": "...",
      "es": "...",
      "evidenceRefs": ["captain-assignment"]
    },
    "escalation": {
      "actor": "named participant-facing actor",
      "en": "...",
      "es": "...",
      "evidenceRefs": ["dependency-record"]
    }
  },
  "authority": [{ "citation": "... or null", "sourceRef": "...", "supports": ["..."] }],
  "evidence": [
    {
      "id": "dependency-record",
      "path": "repo-relative dependency.json path",
      "sha256": "assignment-pinned dependency hash",
      "sourceRef": "dependency provenance or assignment sourceRef"
    },
    {
      "id": "captain-assignment",
      "path": "data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json",
      "sha256": "d78251fd9f0741f0f080dcebb73f229f3fc8b259568ae422d11db0ffbc9a141a",
      "sourceRef": "routes[trackId=...].components[componentId=...]"
    }
  ],
  "runtimeContract": {
    "classification": "component_deferral",
    "paymentAllowed": false,
    "checkoutSuppressed": true,
    "packetCreditConsumption": "none",
    "partnerCreditConsumed": false,
    "briefcaseHandoffRequired": true,
    "requiresCaptainPatch": true
  }
}
```

If committed evidence does not identify an exact component or a named official
destination, use `held_on_source_or_design`, state the exact missing evidence in
both languages, and do not invent it. A URL by itself is not a destination.

All participant strings must be substantive in English and Spanish. They must
not expose registry vocabulary, lane names, source/blocker labels, runtime
terms, implementation status, or approval language. They must not say “coming
soon”, “research required”, or “unknown”. Product-behaviour statements are
requirements for the captain-owned integration, not assertions that the shared
runtime already implements them.

`fixtures/canonical.json` points to `../deferral-treatment.json`, repeats the
four assignment identities, and uses this exact expectation shape:

```json
{
  "schemaVersion": "rcap-official-form-deferral-fixture/v1",
  "treatmentPath": "../deferral-treatment.json",
  "trackId": "...",
  "componentId": "...",
  "unitId": "...",
  "role": "...",
  "expected": {
    "candidateDisposition": "exact_supported_deferral",
    "paymentAllowed": false,
    "checkoutSuppressed": true,
    "packetCreditConsumption": "none",
    "partnerCreditConsumed": false,
    "briefcaseHandoffRequired": true,
    "evidenceIds": ["dependency-record", "captain-assignment"]
  }
}
```

The lane verifier mutates the canonical treatment in memory; mutation fixtures
do not duplicate legal copy.

Route `participant-instructions.md` must identify every absent component in
English and Spanish and disclose the packet, Briefcase, payment, checkout, and
credit treatment. Route `handoff.md` may record
`candidate_ready_for_independent_review` only after every assigned component
passes. It must never mark a route approved, terminal, promoted, or live.
