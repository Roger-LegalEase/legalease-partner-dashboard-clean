export type PartnerDashboardActionLayerInput = {
  started: number;
  completed: number;
};

export type PartnerDashboardSemanticMetric = {
  id: "intake_completion" | "intakes_not_completed";
  label: string;
  value: string;
  detail: string;
  source: string;
  numerator: string;
  denominator: string;
  meaning: string;
  labelDoesNotOverclaim: true;
  actionFraming: "no";
};

export type PartnerDashboardRecommendedAction = {
  label: "Recommended next action";
  body: string;
  source: string;
  numerator: string;
  denominator: string;
  meaning: string;
  labelDoesNotOverclaim: true;
  actionFraming: "yes";
  actionFramingReason: string;
};

export type PartnerDashboardActionLayer = {
  started: number;
  completed: number;
  completionRate: number;
  notCompleted: number;
  metrics: PartnerDashboardSemanticMetric[];
  recommendedAction: PartnerDashboardRecommendedAction;
};

export function computePartnerDashboardActionLayer(input: PartnerDashboardActionLayerInput): PartnerDashboardActionLayer {
  const started = normalizeCount(input.started);
  const completed = Math.min(normalizeCount(input.completed), started);

  // SOURCE: RLS-scoped public.rcap_intake_sessions rows loaded through resolveSessionPartner() in the dashboard repository.
  // NUMERATOR / DENOMINATOR: completed intakes / started intake sessions.
  // MEANING: The share of RLS-visible intake sessions that have status = completed or a completed_at timestamp.
  // LABEL: Intake completion. LABEL <= MEANING: does not claim legal success, eligibility, conversion, filing, or outcome.
  const completionRate = started === 0 ? 0 : Math.round((completed / started) * 100);

  // SOURCE: The same RLS-scoped public.rcap_intake_sessions summary used for intake completion.
  // NUMERATOR / DENOMINATOR: started intake sessions - completed intake sessions / no rate denominator.
  // MEANING: Intake sessions visible to this partner that are not counted as completed; this does not prove abandonment.
  // LABEL: Intakes not completed. LABEL <= MEANING: neutral count with no follow-up, failure, or eligibility claim.
  const notCompleted = Math.max(started - completed, 0);

  const metrics: PartnerDashboardSemanticMetric[] = [
    {
      id: "intake_completion",
      label: "Intake completion",
      value: `${completionRate}%`,
      detail: `${formatCount(completed)} of ${formatCount(started)} started intakes are completed`,
      source: "public.rcap_intake_sessions.status and public.rcap_intake_sessions.completed_at, RLS-scoped to the session partner",
      numerator: "completed intake sessions",
      denominator: "started intake sessions",
      meaning: "The share of this partner's visible intake sessions that have status = completed or a completed_at timestamp.",
      labelDoesNotOverclaim: true,
      actionFraming: "no"
    },
    {
      id: "intakes_not_completed",
      label: "Intakes not completed",
      value: formatCount(notCompleted),
      detail: "Started intakes minus completed intakes",
      source: "public.rcap_intake_sessions rows, RLS-scoped to the session partner",
      numerator: "started intake sessions minus completed intake sessions",
      denominator: "none",
      meaning: "The number of this partner's visible intake sessions that are not counted as completed; it does not prove abandonment.",
      labelDoesNotOverclaim: true,
      actionFraming: "no"
    }
  ];

  return {
    started,
    completed,
    completionRate,
    notCompleted,
    metrics,
    recommendedAction: buildRecommendedAction(started)
  };
}

function buildRecommendedAction(started: number): PartnerDashboardRecommendedAction {
  if (started === 0) {
    return {
      label: "Recommended next action",
      body: "Share your intake link.",
      source: "public.rcap_intake_sessions row count, RLS-scoped to the session partner",
      numerator: "started intake sessions",
      denominator: "none",
      meaning: "No intake sessions are visible for this partner yet.",
      labelDoesNotOverclaim: true,
      actionFraming: "yes",
      actionFramingReason: "A zero started-intake count supports the limited recommendation to share the existing intake link."
    };
  }

  return {
    label: "Recommended next action",
    body: "Keep sharing the program.",
    source: "public.rcap_intake_sessions row count, RLS-scoped to the session partner",
    numerator: "started intake sessions",
    denominator: "none",
    meaning: "At least one intake session is visible for this partner.",
    labelDoesNotOverclaim: true,
    actionFraming: "yes",
    actionFramingReason: "The recommendation is generic program continuation and does not claim urgency, abandonment, conversion, filing, or outcome."
  };
}

function normalizeCount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function formatCount(value: number) {
  return value.toLocaleString();
}
