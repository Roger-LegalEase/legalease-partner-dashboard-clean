import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const screeningFlow = await readFile(
  "src/components/expungement-ai/screening/ScreeningFlow.tsx",
  "utf8"
);
const resumeClient = await readFile(
  "src/components/expungement-ai/screening/ResumeScreeningClient.tsx",
  "utf8"
);
const saveRoute = await readFile(
  "src/app/api/expungement-ai/screening/save-resume/route.ts",
  "utf8"
);
const resumeService = await readFile(
  "src/lib/expungement-ai/screening-resume-service.ts",
  "utf8"
);

assert.match(resumeClient, /sessionStorage\.setItem/);
assert.match(screeningFlow, /sessionStorage\.getItem/);
assert.match(saveRoute, /sessionId: payload\.sessionId/);
assert.match(resumeService, /\.upsert\(\{/);
assert.doesNotMatch(screeningFlow, /End clinic session|Reset device/i);

const iterations = Array.from({ length: 10 }, (_, index) => ({
  participant: `synthetic-participant-${String(index + 1).padStart(2, "0")}`,
  status: "NOT_RUN_NO_CLINIC_SESSION_BOUNDARY",
  leakageAssertion: "NOT_PROVABLE",
  reason:
    "No Clinic Mode route, assisted-session boundary, or product reset action exists; running the ordinary authenticated flow would not satisfy the acceptance contract."
}));

assert.equal(iterations.length, 10);
assert.ok(iterations.every((entry) => entry.leakageAssertion === "NOT_PROVABLE"));

console.log(
  JSON.stringify(
    {
      result: "FAIL_CLOSED",
      verdict: "UNSAFE",
      dedicatedResetAction: false,
      sensitiveSessionStorageDetected: true,
      callerSuppliedSessionIdUpsertDetected: true,
      iterations
    },
    null,
    2
  )
);
