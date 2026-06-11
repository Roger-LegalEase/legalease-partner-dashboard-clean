import "server-only";

export type ReadinessStatus = "ready" | "required_before_deploy" | "not_started" | "deferred";

export type ReadinessItem = {
  label: string;
  status: ReadinessStatus;
  description: string;
};

export type ReadinessSection = {
  title: string;
  description: string;
  items: ReadinessItem[];
};

export const readinessStatusLabels: Record<ReadinessStatus, string> = {
  ready: "Ready",
  required_before_deploy: "Required before deploy",
  not_started: "Not started",
  deferred: "Deferred"
};

export const commandCenterReadinessSections: ReadinessSection[] = [
  {
    title: "Partner acquisition pipeline",
    description: "Public-to-internal workflow for partner pilot interest and operator follow-up.",
    items: [
      {
        label: "Partner Program landing page",
        status: "ready",
        description: "General partner-facing landing page is available for organizations exploring a pilot."
      },
      {
        label: "Public pilot request form",
        status: "ready",
        description: "Prospective partners can submit pilot interest through the public form."
      },
      {
        label: "Write-only server intake",
        status: "ready",
        description: "Pilot request submissions are handled server-side without exposing the internal queue."
      },
      {
        label: "Internal pilot request queue",
        status: "ready",
        description: "LegalEase operators can review submitted pilot requests behind the internal admin gate."
      },
      {
        label: "Pilot request status workflow",
        status: "ready",
        description: "Operators can move requests through the current review states."
      }
    ]
  },
  {
    title: "Partner dashboard",
    description: "Authenticated partner reporting and action-layer readiness.",
    items: [
      {
        label: "Authenticated partner dashboard",
        status: "ready",
        description: "Partner users have a dedicated dashboard experience after sign-in."
      },
      {
        label: "Partner-scoped identity",
        status: "ready",
        description: "Dashboard access resolves the signed-in partner identity before loading dashboard content."
      },
      {
        label: "Dashboard analytics action layer",
        status: "ready",
        description: "Dashboard summary logic is separated from the page surface for verifier coverage."
      },
      {
        label: "Dashboard reads use partner context",
        status: "ready",
        description: "Partner dashboard reads use the authenticated partner context rather than broad administrative reads."
      }
    ]
  },
  {
    title: "Security controls",
    description: "High-level launch controls only; this view intentionally avoids security internals.",
    items: [
      {
        label: "Public intake writes server-side",
        status: "ready",
        description: "Browser submissions do not expose an internal read surface."
      },
      {
        label: "Internal surfaces gated",
        status: "ready",
        description: "Internal operator pages require an authenticated LegalEase internal admin identity."
      },
      {
        label: "Partner dashboard isolation",
        status: "ready",
        description: "Partner dashboard access is verified against partner-scoped isolation expectations."
      },
      {
        label: "Shared rate limiter",
        status: "ready",
        description: "Public pilot request intake uses the shared server-side limiter."
      },
      {
        label: "Observability",
        status: "ready",
        description: "Operational events are recorded without exposing sensitive request details to public users."
      },
      {
        label: "Legacy internal admin surfaces",
        status: "ready",
        description: "Existing internal admin tools remain behind the internal admin gate."
      },
      {
        label: "Health endpoint",
        status: "ready",
        description: "The health endpoint remains a narrow liveness check."
      }
    ]
  },
  {
    title: "Production deployment checklist",
    description: "Items LegalEase should confirm before and immediately after the first production deployment.",
    items: [
      {
        label: "Rate limiter production secret",
        status: "required_before_deploy",
        description: "Set RATE_LIMIT_HASH_SECRET in the production hosting environment before deploying."
      },
      {
        label: "Supabase production connection",
        status: "required_before_deploy",
        description: "Set the required Supabase production connection variables in the hosting environment."
      },
      {
        label: "Auth/session production configuration",
        status: "required_before_deploy",
        description: "Set the required authentication and session variables in the hosting environment."
      },
      {
        label: "Phase 24 migration",
        status: "ready",
        description: "Confirm the shared rate-limit bucket migration is applied before production traffic."
      },
      {
        label: "Production deployment",
        status: "not_started",
        description: "No production deployment has been performed from this launch baseline."
      },
      {
        label: "Post-deploy health check",
        status: "required_before_deploy",
        description: "Run the health check after deploy and confirm the liveness response is healthy."
      },
      {
        label: "Post-deploy pilot request smoke test",
        status: "required_before_deploy",
        description: "Submit a safe smoke-test pilot request after deploy and verify expected behavior."
      },
      {
        label: "Partner dashboard isolation verifier",
        status: "required_before_deploy",
        description: "Run the partner dashboard isolation verifier before launch sign-off."
      },
      {
        label: "Pilot queue verifier",
        status: "required_before_deploy",
        description: "Run the internal pilot queue verifier before launch sign-off."
      },
      {
        label: "Legacy internal admin gate verifier",
        status: "required_before_deploy",
        description: "Run the legacy internal admin gate verifier before launch sign-off."
      },
      {
        label: "Observability safety verifier",
        status: "required_before_deploy",
        description: "Run the observability safety verifier before launch sign-off."
      },
      {
        label: "Rate-limit verifier",
        status: "required_before_deploy",
        description: "Run the pilot request rate-limit verifier before launch sign-off."
      }
    ]
  },
  {
    title: "Deferred items",
    description: "Useful follow-ups that are not required for the current production readiness decision.",
    items: [
      {
        label: "Richer alerting vendor",
        status: "deferred",
        description: "A dedicated alerting provider can be selected later if operating needs require it."
      },
      {
        label: "Managed rate-limit cache",
        status: "deferred",
        description: "Redis or Upstash can be evaluated later if traffic patterns require it."
      },
      {
        label: "Test-suite coverage audit",
        status: "deferred",
        description: "A broader coverage audit can follow the production readiness pass."
      },
      {
        label: "Pilot request status timestamps",
        status: "deferred",
        description: "Status-change timestamps can be added to improve operator history."
      },
      {
        label: "Production smoke-test checklist",
        status: "deferred",
        description: "A reusable runbook can be formalized after the first production smoke test."
      }
    ]
  }
];
