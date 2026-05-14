import React from "react";
import { describe, expect, it } from "vitest";
import {
  assertAdminCanManageBeta,
  canStartMonitoringCheckout,
  canStartRecordCheckCheckout,
  getBetaFlagStatus,
  isBetaApprovedUser
} from "@/lib/beta";
import { notificationTemplateTypes, renderNotificationTemplate } from "@/lib/notifications/templates";
import { preferredCustomerTerms, prohibitedCustomerTerms } from "@/lib/legal-copy";
import BetaDisclaimerPage from "@/app/beta-disclaimer/page";
import DataDeletionPage from "@/app/data-deletion/page";
import PrivacyPage from "@/app/privacy/page";
import SupportPage from "@/app/support/page";
import TermsPage from "@/app/terms/page";

const betaEnv = {
  BETA_ACCESS_ENABLED: "true",
  BETA_INVITE_ONLY: "false",
  BETA_MAX_USERS: 0,
  BETA_APPROVED_EMAILS: "",
  BETA_INVITE_CODES: "",
  RECORD_CHECK_PURCHASE_ENABLED: "true",
  MONITORING_PURCHASE_ENABLED: "true",
  AI_SUMMARY_ENABLED: "true",
  ADMIN_RETRY_ENABLED: "true",
  DATA_DELETION_REQUEST_ENABLED: "true"
} as const;

const customer = { email: "customer@example.com", role: "CUSTOMER" as const };

describe("beta launch controls", () => {
  it("blocks checkout when beta access is disabled", () => {
    expect(
      canStartRecordCheckCheckout(customer, {
        configEnv: { ...betaEnv, BETA_ACCESS_ENABLED: "false" }
      })
    ).toEqual({ allowed: false, reason: "beta_disabled" });
  });

  it("blocks non-approved users in invite-only mode", () => {
    expect(
      isBetaApprovedUser(customer, {
        configEnv: { ...betaEnv, BETA_INVITE_ONLY: "true", BETA_APPROVED_EMAILS: "other@example.com" }
      })
    ).toEqual({ allowed: false, reason: "invite_required" });
  });

  it("allows approved beta users and invite-code holders to start checkout", () => {
    expect(
      canStartRecordCheckCheckout(customer, {
        configEnv: { ...betaEnv, BETA_INVITE_ONLY: "true", BETA_APPROVED_EMAILS: "customer@example.com" }
      }).allowed
    ).toBe(true);
    expect(
      canStartRecordCheckCheckout(customer, {
        inviteCode: "BETA-123",
        configEnv: { ...betaEnv, BETA_INVITE_ONLY: "true", BETA_INVITE_CODES: "beta-123" }
      }).allowed
    ).toBe(true);
  });

  it("blocks paused purchase paths", () => {
    expect(
      canStartRecordCheckCheckout(customer, {
        configEnv: { ...betaEnv, RECORD_CHECK_PURCHASE_ENABLED: "false" }
      })
    ).toEqual({ allowed: false, reason: "record_check_disabled" });
    expect(
      canStartMonitoringCheckout(customer, {
        configEnv: { ...betaEnv, MONITORING_PURCHASE_ENABLED: "false" }
      })
    ).toEqual({ allowed: false, reason: "monitoring_disabled" });
  });

  it("summarizes beta flag status without exposing invite codes", () => {
    expect(
      getBetaFlagStatus({
        ...betaEnv,
        BETA_INVITE_ONLY: "true",
        BETA_MAX_USERS: 25,
        BETA_APPROVED_EMAILS: "one@example.com,two@example.com",
        BETA_INVITE_CODES: "secret-one,secret-two"
      })
    ).toMatchObject({
      betaInviteOnly: true,
      betaMaxUsers: 25,
      approvedEmailCount: 2,
      inviteCodeCount: 2
    });
  });

  it("does not let non-admins manage beta settings", () => {
    expect(() => assertAdminCanManageBeta({ role: "CUSTOMER" })).toThrow(/Admin role required/);
    expect(() => assertAdminCanManageBeta({ role: "ADMIN" })).not.toThrow();
  });
});

describe("legal placeholder pages and copy", () => {
  it("renders required placeholder pages", () => {
    (globalThis as typeof globalThis & { React?: typeof React }).React = React;
    expect(TermsPage()).toBeTruthy();
    expect(PrivacyPage()).toBeTruthy();
    expect(BetaDisclaimerPage()).toBeTruthy();
    expect(SupportPage()).toBeTruthy();
    expect(DataDeletionPage()).toBeTruthy();
  });

  it("tracks preferred and prohibited customer-facing legal copy terms", () => {
    expect(preferredCustomerTerms).toContain("Consumer self-check");
    expect(preferredCustomerTerms).toContain("Expungement-readiness review");
    expect(prohibitedCustomerTerms).toContain("Risk score");
    expect(preferredCustomerTerms).not.toContain("You are eligible");
  });
});

describe("privacy-safe notification templates", () => {
  it("renders every beta notification template without sensitive report detail", () => {
    const prohibited = /\b(ssn|social security|date of birth|dob|driver'?s? license|raw payload|criminal record details)\b/i;
    for (const type of notificationTemplateTypes) {
      const template = renderNotificationTemplate(type);
      expect(template.subject).not.toMatch(prohibited);
      expect(template.body).not.toMatch(prohibited);
      expect(template.body).toMatch(/log in|hosted flow|support|dashboard|request|payment|monitoring|review/i);
    }
  });
});
