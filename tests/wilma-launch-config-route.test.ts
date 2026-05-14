import { describe, expect, it } from "vitest";
import { createWilmaConfigRouteHandler } from "@/app/api/wilma/config/route";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";

describe("/api/wilma/config route", () => {
  it("returns public launch status without internal rollout details", async () => {
    const handler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(config({ rolloutPercent: 100 }))
    });

    const response = await handler(new Request("http://localhost:3000/api/wilma/config?anonymousId=device"));
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.allowedStates).toEqual(["IL", "PA", "MD", "DC", "MS", "TX"]);
    expect(data.rolloutPercent).toBeUndefined();
    expect(data.killSwitch).toBeUndefined();
    expect(data.betaTokens).toBeUndefined();
  });

  it("returns maintenance copy when offline", async () => {
    const handler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(config({ maintenanceMode: true }))
    });

    const response = await handler(new Request("http://localhost:3000/api/wilma/config"));
    const data = (await response.json()) as { available: boolean; mode: string; message: string };

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.mode).toBe("maintenance");
    expect(data.message).toBe("Wilma is temporarily offline while we make updates. Please check back soon.");
  });

  it("enforces beta-only status for public config", async () => {
    const handler = createWilmaConfigRouteHandler({
      currentUser: async () => null,
      launchBackend: backend(config({ betaOnly: true, betaAllowedEmails: ["beta@example.com"] }))
    });

    const blocked = await handler(new Request("http://localhost:3000/api/wilma/config"));
    const allowed = await handler(new Request("http://localhost:3000/api/wilma/config?email=beta@example.com"));

    expect(((await blocked.json()) as { available: boolean; mode: string })).toMatchObject({
      available: false,
      mode: "beta_only"
    });
    expect(((await allowed.json()) as { available: boolean }).available).toBe(true);
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
