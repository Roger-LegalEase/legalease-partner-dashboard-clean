import { describe, expect, it, vi } from "vitest";
import { createWilmaChatRouteHandler } from "@/app/api/wilma/chat/route";
import { evaluateWilmaLaunchAccess } from "@/wilma/launch/evaluateLaunchAccess";
import { getWilmaLaunchConfig } from "@/wilma/launch/config";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import type { WilmaFactExtractor } from "@/wilma/chat/orchestrator";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";

describe("Wilma launch access", () => {
  it("blocks when the public flag is disabled", () => {
    const decision = evaluateWilmaLaunchAccess(config({ publicEnabled: false }), { state: "IL" });

    expect(decision).toMatchObject({
      allowed: false,
      reason: "wilma_disabled",
      message: "Wilma is not available right now. Please check back soon."
    });
  });

  it("blocks maintenance mode with maintenance copy", () => {
    const decision = evaluateWilmaLaunchAccess(config({ maintenanceMode: true }), { state: "IL" });

    expect(decision).toMatchObject({
      allowed: false,
      reason: "wilma_maintenance",
      message: "Wilma is temporarily offline while we make updates. Please check back soon."
    });
  });

  it("kill switch blocks public chat", async () => {
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({ facts: {} }))
    };
    const botVerifier = vi.fn(async () => ({ allowed: true }));
    const handler = createWilmaChatRouteHandler({
      backend: createInMemoryWilmaBackend(),
      extractor,
      currentUser: async () => null,
      verifyBotProtection: botVerifier,
      checkRateLimit: async () => allowedRateLimit(),
      launchBackend: backend(config({ killSwitch: true }))
    });

    const response = await handler(jsonRequest({ message: "My case was dismissed.", state: "IL" }));
    const data = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(503);
    expect(data.error).toBe("wilma_kill_switch");
    expect(data.message).toBe("Wilma is not available right now. Please check back soon.");
    expect(botVerifier).not.toHaveBeenCalled();
    expect(extractor.extractFacts).not.toHaveBeenCalled();
  });

  it("allowed states can restrict launch to a subset without changing rules", async () => {
    const extractor: WilmaFactExtractor = {
      extractFacts: vi.fn(async () => ({ facts: {} }))
    };
    const handler = createWilmaChatRouteHandler({
      backend: createInMemoryWilmaBackend(),
      extractor,
      currentUser: async () => null,
      verifyBotProtection: async () => ({ allowed: true }),
      checkRateLimit: async () => allowedRateLimit(),
      launchBackend: backend(config({ allowedStates: ["IL"] }))
    });

    const response = await handler(jsonRequest({ message: "Texas acquittal.", state: "TX" }));
    const data = (await response.json()) as { status: string; reasonCodes: string[] };

    expect(response.status).toBe(200);
    expect(data.status).toBe("outside_supported_scope");
    expect(data.reasonCodes).toEqual(["state_not_enabled_for_beta"]);
    expect(extractor.extractFacts).not.toHaveBeenCalled();
  });

  it("beta-only mode blocks non-beta users and allows beta token users", () => {
    const launchConfig = config({ betaOnly: true, betaTokens: ["let-me-in"] });

    expect(evaluateWilmaLaunchAccess(launchConfig, { state: "IL" })).toMatchObject({
      allowed: false,
      reason: "beta_access_required"
    });
    expect(evaluateWilmaLaunchAccess(launchConfig, { state: "IL", betaToken: "let-me-in" })).toMatchObject({
      allowed: true
    });
  });

  it("rollout percent is evaluated server-side with stable buckets", () => {
    const denied = evaluateWilmaLaunchAccess(config({ rolloutPercent: 0 }), { state: "IL", anonymousId: "a" });
    const allowed = evaluateWilmaLaunchAccess(config({ rolloutPercent: 100 }), { state: "IL", anonymousId: "a" });

    expect(denied).toMatchObject({ allowed: false, reason: "rollout_not_selected" });
    expect(allowed).toMatchObject({ allowed: true });
  });

  it("parses launch env controls", () => {
    const parsed = getWilmaLaunchConfig({
      WILMA_PUBLIC_ENABLED: "false",
      WILMA_BETA_ONLY: "true",
      WILMA_ALLOWED_STATES: "IL,TX,ZZ",
      WILMA_ROLLOUT_PERCENT: "25",
      WILMA_MAINTENANCE_MODE: "true",
      WILMA_KILL_SWITCH: "true",
      WILMA_BETA_ALLOWED_EMAILS: "beta@example.com",
      WILMA_BETA_TOKENS: "alpha"
    });

    expect(parsed).toMatchObject({
      publicEnabled: false,
      betaOnly: true,
      allowedStates: ["IL", "TX"],
      rolloutPercent: 25,
      maintenanceMode: true,
      killSwitch: true,
      betaAllowedEmails: ["beta@example.com"],
      betaTokens: ["alpha"]
    });
  });
});

function config(overrides: Partial<WilmaLaunchConfig> = {}): WilmaLaunchConfig {
  return {
    publicEnabled: true,
    betaOnly: false,
    allowedStates: ["IL", "PA", "MD", "DC", "MS", "TX"],
    rolloutPercent: 100,
    maintenanceMode: false,
    killSwitch: false,
    betaAllowedEmails: [],
    betaTokens: [],
    ...overrides
  };
}

function backend(launchConfig: WilmaLaunchConfig) {
  return {
    async getLaunchConfig() {
      return launchConfig;
    }
  };
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/wilma/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-legalease-device-id": String(body.anonymousId ?? "device")
    },
    body: JSON.stringify({
      anonymousId: "device",
      ...body
    })
  });
}

function allowedRateLimit() {
  return {
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: new Date("2026-01-01T00:00:00.000Z"),
    provider: "memory" as const
  };
}
