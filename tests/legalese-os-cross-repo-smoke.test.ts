import { describe, expect, it } from "vitest";
import {
  emitLegalEaseOsEvent,
  normalizeLegalEaseOsEventPayload
} from "@/lib/legalese-os-events";

const runCrossRepoSmoke = process.env.RUN_LEGALEASE_OS_CROSS_REPO_SMOKE === "true";
const localCommandCenterEndpoint = process.env.LEGALEASE_OS_EVENTS_ENDPOINT;
const localCommandCenterSecret = process.env.LEGALEASE_OS_EVENTS_SECRET;
const localExporterEnabled = process.env.LEGALEASE_OS_EVENTS_ENABLED;

const smokeEvent = {
  source_system: "expungement_ai",
  event_type: "engine.health_changed",
  occurred_at: "2026-06-18T18:00:00.000Z",
  subject_type: "engine",
  subject_ref: "local-smoke-engine",
  jurisdiction: "ALL",
  metrics: { smoke: true, local_only: true },
  summary: "Local LegalEase OS exporter smoke event.",
  recommended_operator_action: "Confirm local Command Center received event.",
  pii_classification: "none"
} as const;

const forbiddenFragments = [
  "Jane Person",
  "client@example.com",
  "212-555-1212",
  "1975-04-12",
  "123-45-6789",
  "dismissed",
  "criminal history",
  "wilma transcript",
  "raw_facts",
  "raw_request",
  "raw_response",
  "raw_packet",
  "provider_payload",
  "local-smoke-engine",
  "cs_test_",
  "pi_test_",
  "payment_intent",
  "stripe",
  "tok_",
  "sk_",
  "whsec_"
];

describe("LegalEase OS cross-repo smoke", () => {
  it("is skipped by default but keeps the local smoke event safe", () => {
    if (runCrossRepoSmoke) {
      expect(localExporterEnabled).toBe("true");
      expect(localCommandCenterEndpoint).toBeTruthy();
      expect(localCommandCenterSecret).toBeTruthy();
      return;
    }

    const normalized = normalizeLegalEaseOsEventPayload(smokeEvent);
    const serialized = JSON.stringify(normalized);

    expect(normalized).toMatchObject({
      source_system: "expungement_ai",
      event_type: "engine.health_changed",
      subject_type: "engine",
      jurisdiction: "ALL",
      summary: "Local LegalEase OS exporter smoke event.",
      recommended_operator_action: "Confirm local Command Center received event.",
      pii_classification: "none"
    });
    expect(normalized.subject_ref_hash).toBeTruthy();
    expect(normalized.idempotency_key).toBeTruthy();
    expect(serialized).not.toContain(smokeEvent.subject_ref);
    expectNoForbiddenFragments(serialized);
  });

  (runCrossRepoSmoke ? it : it.skip)(
    "sends one safe signed event to a running local Command Center",
    async () => {
      expect(localExporterEnabled).toBe("true");
      expect(localCommandCenterEndpoint).toMatch(/^http:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/os-loops\/events$/);
      expect(localCommandCenterSecret).toBeTruthy();

      const result = await emitLegalEaseOsEvent(smokeEvent, {
        configEnv: {
          LEGALEASE_OS_EVENTS_ENABLED: localExporterEnabled,
          LEGALEASE_OS_EVENTS_ENDPOINT: localCommandCenterEndpoint,
          LEGALEASE_OS_EVENTS_SECRET: localCommandCenterSecret
        }
      });

      expect(result.enabled).toBe(true);
      expect(result.sent).toBe(true);
      expect(result.status).toBeGreaterThanOrEqual(200);
      expect(result.status).toBeLessThan(300);
      expect(result.idempotency_key).toBeTruthy();
    }
  );
});

function expectNoForbiddenFragments(value: string) {
  for (const fragment of forbiddenFragments) {
    expect(value).not.toContain(fragment);
  }
}
