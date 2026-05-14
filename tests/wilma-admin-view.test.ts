import { describe, expect, it } from "vitest";
import {
  asWilmaAdminDecision,
  asWilmaAdminFacts,
  wilmaConversionLabel,
  wilmaLaunchConfigSummary,
  wilmaReasonCodes
} from "@/wilma/admin/view";

describe("Wilma admin views", () => {
  it("parses facts and decisions for admin display", () => {
    const facts = asWilmaAdminFacts({ state: "IL", county: "Cook" });
    const decision = asWilmaAdminDecision({
      status: "likely_eligible_for_document_prep",
      ruleVersion: "wilma_service_fit_pr3_v1",
      reasonCodes: ["il_supported_state"]
    });

    expect(facts).toMatchObject({ state: "IL", county: "Cook" });
    expect(decision?.status).toBe("likely_eligible_for_document_prep");
    expect(wilmaReasonCodes(decision)).toEqual(["il_supported_state"]);
  });

  it("labels Wilma conversion state", () => {
    expect(wilmaConversionLabel(null, undefined, null)).toBe("chat started");
    expect(wilmaConversionLabel(null, undefined, "client@example.com")).toBe("email captured");
    expect(wilmaConversionLabel(null, "PAID", "client@example.com")).toBe("paid checkout");
    expect(wilmaConversionLabel(new Date("2026-01-01"), "PAID", "client@example.com")).toBe("document handoff");
  });

  it("summarizes launch config for admin display", () => {
    expect(
      wilmaLaunchConfigSummary({
        publicEnabled: true,
        betaOnly: true,
        allowedStates: ["IL", "TX"],
        rolloutPercent: 25,
        maintenanceMode: false,
        killSwitch: false,
        betaAllowedEmails: ["beta@example.com"],
        betaTokens: ["token"]
      })
    ).toEqual([
      { label: "Public enabled", value: "yes" },
      { label: "Beta only", value: "yes" },
      { label: "Allowed states", value: "IL, TX" },
      { label: "Rollout percent", value: "25%" },
      { label: "Maintenance mode", value: "off" },
      { label: "Kill switch", value: "off" }
    ]);
  });
});
