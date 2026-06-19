# Evaluate API Contract

`POST /api/expungement-ai/evaluate`

```ts
type ScreeningEvaluationRequest = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  answers: Record<string, string | string[] | number | boolean | null>;
};
```

The endpoint returns the `ScreeningEvaluation` contract from `src/lib/rcap-engine/contracts.ts`.

Important behavior:

- Unsupported jurisdictions return `404` with `unsupported_jurisdiction`.
- Stale profile versions return `409` with `profile_version_mismatch` and the current version.
- Unknown question IDs return `400`.
- Context-only answers are ignored for routing.
- Client-authored pathway, result, timing, payment, and packet fields are not accepted.
