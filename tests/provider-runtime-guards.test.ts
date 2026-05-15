import { describe, expect, it } from "vitest";
import { createRecordCheckCheckoutSession } from "@/lib/billing/checkout";
import { buildCreateInvitationRequest } from "@/lib/checkr";
import { parseEnv } from "@/lib/env";

const user = {
  id: "user_123",
  email: "customer@example.com",
  role: "CUSTOMER" as const
};

describe("runtime provider guards", () => {
  it("fails safely when Stripe checkout runs without Stripe price env", async () => {
    const configEnv = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });

    await expect(
      createRecordCheckCheckoutSession(user, {
        configEnv,
        stripeClient: {
          checkout: {
            sessions: {
              create: async () => ({ url: "https://checkout.example.com" })
            }
          },
          billingPortal: {
            sessions: {
              create: async () => ({ url: "https://billing.example.com" })
            }
          }
        }
      })
    ).rejects.toThrow(/Stripe checkout is not configured/);
  });

  it("fails safely when Checkr invitation creation runs without Checkr package env", () => {
    const configEnv = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      CHECKR_WORK_LOCATION_STATE: "NY",
      CHECKR_WORK_LOCATION_CITY: "New York"
    });

    expect(() => buildCreateInvitationRequest({ candidateId: "candidate_123" }, configEnv)).toThrow(
      /CHECKR_PACKAGE_SLUG/
    );
  });
});
