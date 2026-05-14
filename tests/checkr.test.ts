import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";
import {
  buildCancelContinuousCheckRequest,
  buildCreateCandidateRequest,
  buildCreateContinuousCheckRequest,
  buildCreateInvitationRequest,
  buildRetrieveReportRequest,
  createLegalEaseCandidateCustomId
} from "@/lib/checkr";

const env = parseEnv({
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  RECORDSHIELD_BASIC_PRICE_CENTS: "4900",
  RECORDSHIELD_FAMILY_PRICE_CENTS: "9900",
  RECORDSHIELD_BUSINESS_PRICE_CENTS: "19900",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_RECORD_CHECK: "price_record_check",
  STRIPE_PRICE_MONITORING_MONTHLY: "price_monitoring_monthly",
  STRIPE_PRICE_MONITORING_ANNUAL: "price_monitoring_annual",
  STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
  CHECKR_API_KEY: "checkr_test_123",
  CHECKR_BASE_URL: "https://api.checkr-staging.com/v1",
  CHECKR_PACKAGE_SLUG: "recordshield_background_check",
  CHECKR_NODE_CUSTOM_ID: "legal_ease_node",
  CHECKR_WORK_LOCATION_COUNTRY: "US",
  CHECKR_WORK_LOCATION_STATE: "NY",
  CHECKR_WORK_LOCATION_CITY: "New York"
});

describe("Checkr request builders", () => {
  it("builds candidate creation with only email and LegalEase custom_id", () => {
    const request = buildCreateCandidateRequest({
      email: "customer@example.com",
      customId: createLegalEaseCandidateCustomId("case:123")
    });

    expect(request).toEqual({
      path: "/candidates",
      method: "POST",
      body: {
        email: "customer@example.com",
        custom_id: "legalease_case_case_123"
      }
    });
    expect(JSON.stringify(request.body)).not.toMatch(/ssn|dob|driver/i);
  });

  it("builds hosted invitation creation with package, node, and work location", () => {
    const request = buildCreateInvitationRequest({ candidateId: "cand_123" }, env);

    expect(request).toEqual({
      path: "/invitations",
      method: "POST",
      body: {
        candidate_id: "cand_123",
        package: "recordshield_background_check",
        node_custom_id: "legal_ease_node",
        work_locations: [
          {
            country: "US",
            state: "NY",
            city: "New York"
          }
        ]
      }
    });
    expect(JSON.stringify(request.body)).not.toMatch(/ssn|dob|driver/i);
  });

  it("builds report retrieval and continuous check requests", () => {
    expect(buildRetrieveReportRequest("report/123")).toEqual({
      path: "/reports/report%2F123",
      method: "GET"
    });
    expect(buildCreateContinuousCheckRequest({ candidateId: "cand_123" }, env)).toMatchObject({
      path: "/continuous_checks",
      method: "POST",
      body: {
        candidate_id: "cand_123",
        node_custom_id: "legal_ease_node"
      }
    });
    expect(buildCancelContinuousCheckRequest("cc/123")).toEqual({
      path: "/continuous_checks/cc%2F123",
      method: "DELETE"
    });
  });
});
