import "server-only";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import {
  requireInternalAdminSession,
  requirePartnerSession,
  SessionPartnerError
} from "@/lib/partners/session-partner";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";

export type PartnerOnboardingContext = {
  authUserId: string;
  workEmail: string | null;
  partnerSlug: string;
  role: "partner_admin" | "partner_staff" | "partner_viewer";
};

export type InternalOnboardingContext = {
  authUserId: string;
  partnerSlug: string;
  role: "internal_admin";
};

export async function requirePartnerOnboardingContext(
  options: { write?: boolean; includeEmail?: boolean } = {}
): Promise<PartnerOnboardingContext> {
  assertFeatureEnabled();

  try {
    const session = await requirePartnerSession();
    if (options.write && session.role !== "partner_admin") {
      throw new Phase1OnboardingError(
        "forbidden",
        "Partner administrator access is required to change program setup."
      );
    }

    let workEmail: string | null = null;
    if (options.includeEmail) {
      const supabase = await createServerSupabaseAuthClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== session.authUserId) {
        throw new Phase1OnboardingError(
          "unauthenticated",
          "Your session expired. Sign in again to continue."
        );
      }
      workEmail = data.user.email?.trim().toLowerCase() ?? null;
    }

    return {
      authUserId: session.authUserId,
      workEmail,
      partnerSlug: session.partnerSlug,
      role: session.role
    };
  } catch (error) {
    if (error instanceof Phase1OnboardingError) throw error;
    if (error instanceof SessionPartnerError) {
      throw new Phase1OnboardingError(
        error.code === "unauthenticated" ? "unauthenticated" : "forbidden",
        error.code === "unauthenticated"
          ? "Sign in to access program setup."
          : "Your account is not authorized for this partner workspace."
      );
    }
    throw error;
  }
}

export async function requireInternalOnboardingContext(
  requestedPartnerSlug: string
): Promise<InternalOnboardingContext> {
  assertFeatureEnabled();
  const partnerSlug = normalizePartnerSlug(requestedPartnerSlug);

  try {
    const session = await requireInternalAdminSession();
    return {
      authUserId: session.authUserId,
      partnerSlug,
      role: "internal_admin"
    };
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      throw new Phase1OnboardingError(
        error.code === "unauthenticated" ? "unauthenticated" : "forbidden",
        "Internal administrator access is required."
      );
    }
    throw error;
  }
}

function assertFeatureEnabled(): void {
  if (!isRcapPartnerOnboardingEnabled()) {
    throw new Phase1OnboardingError("feature_disabled", "Program setup is not available.");
  }
}

function normalizePartnerSlug(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(normalized)) {
    throw new Phase1OnboardingError("workspace_not_found", "Partner workspace not found.");
  }
  return normalized;
}
