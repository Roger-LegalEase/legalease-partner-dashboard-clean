import { env, type Env } from "@/lib/env";

type CheckrRequest = {
  path: string;
  method: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
};

export type CheckrWorkLocation = {
  country: string;
  state: string;
  city: string;
};

export type CheckrContinuousCheckInput = {
  candidateId: string;
  type?: "criminal";
  nodeCustomId?: string;
  workLocation?: CheckrWorkLocation;
};

export type CheckrContinuousCheck = {
  id: string;
  status?: string;
};

export type CheckrCandidateInput = {
  email: string;
  customId: string;
};

export type CheckrCandidate = {
  id: string;
  email: string;
  custom_id?: string;
};

export type CheckrInvitationInput = {
  candidateId: string;
  packageSlug?: string;
  nodeCustomId?: string;
  workLocation?: CheckrWorkLocation;
};

export type CheckrInvitation = {
  id: string;
  invitation_url: string;
  status?: string;
  expires_at?: string;
  completed_at?: string;
};

export type CheckrReport = {
  id: string;
  status?: string;
  result?: string;
};

export function buildCreateContinuousCheckRequest(
  input: CheckrContinuousCheckInput,
  configEnv: Env = env
): CheckrRequest {
  return {
    path: "/continuous_checks",
    method: "POST",
    body: removeUndefined({
      candidate_id: input.candidateId,
      type: input.type ?? "criminal",
      node_custom_id: input.nodeCustomId ?? emptyToUndefined(configEnv.CHECKR_NODE_CUSTOM_ID),
      work_locations: [input.workLocation ?? defaultWorkLocation(configEnv)]
    })
  };
}

export function buildCancelContinuousCheckRequest(continuousCheckId: string): CheckrRequest {
  return {
    path: `/continuous_checks/${encodeURIComponent(continuousCheckId)}`,
    method: "DELETE"
  };
}

export function buildCreateCandidateRequest(input: CheckrCandidateInput): CheckrRequest {
  return {
    path: "/candidates",
    method: "POST",
    body: { email: input.email, custom_id: input.customId }
  };
}

export function buildCreateInvitationRequest(
  input: CheckrInvitationInput,
  configEnv: Env = env
): CheckrRequest {
  if (!input.packageSlug && !configEnv.CHECKR_PACKAGE_SLUG) {
    throw new Error("CHECKR_PACKAGE_SLUG is required to create Checkr invitations.");
  }

  return {
    path: "/invitations",
    method: "POST",
    body: removeUndefined({
      candidate_id: input.candidateId,
      package: input.packageSlug ?? configEnv.CHECKR_PACKAGE_SLUG,
      node_custom_id: input.nodeCustomId ?? emptyToUndefined(configEnv.CHECKR_NODE_CUSTOM_ID),
      work_locations: [input.workLocation ?? defaultWorkLocation(configEnv)]
    })
  };
}

export function buildRetrieveReportRequest(reportId: string): CheckrRequest {
  return { path: `/reports/${encodeURIComponent(reportId)}`, method: "GET" };
}

export async function createCandidate(input: CheckrCandidateInput): Promise<CheckrCandidate> {
  return checkrFetch<CheckrCandidate>(buildCreateCandidateRequest(input));
}

export async function createInvitation(input: CheckrInvitationInput): Promise<CheckrInvitation> {
  return checkrFetch<CheckrInvitation>(buildCreateInvitationRequest(input));
}

export async function retrieveReport(reportId: string): Promise<CheckrReport> {
  return checkrFetch<CheckrReport>(buildRetrieveReportRequest(reportId));
}

export async function createContinuousCheck(input: CheckrContinuousCheckInput): Promise<CheckrContinuousCheck> {
  return checkrFetch<CheckrContinuousCheck>(buildCreateContinuousCheckRequest(input));
}

export async function cancelContinuousCheck(continuousCheckId: string): Promise<void> {
  await checkrFetch<unknown>(buildCancelContinuousCheckRequest(continuousCheckId));
}

export function createLegalEaseCandidateCustomId(caseId: string): string {
  return `legalease_case_${caseId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function defaultWorkLocation(configEnv: Env): CheckrWorkLocation {
  if (!configEnv.CHECKR_WORK_LOCATION_STATE || !configEnv.CHECKR_WORK_LOCATION_CITY) {
    throw new Error("CHECKR_WORK_LOCATION_STATE and CHECKR_WORK_LOCATION_CITY are required for Checkr actions.");
  }

  return {
    country: configEnv.CHECKR_WORK_LOCATION_COUNTRY,
    state: configEnv.CHECKR_WORK_LOCATION_STATE,
    city: configEnv.CHECKR_WORK_LOCATION_CITY
  };
}

async function checkrFetch<T>(request: CheckrRequest): Promise<T> {
  if (!env.CHECKR_API_KEY) {
    throw new Error("CHECKR_API_KEY is required for Checkr runtime actions.");
  }

  const response = await fetch(`${env.CHECKR_BASE_URL}${request.path}`, {
    method: request.method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.CHECKR_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: request.body ? JSON.stringify(request.body) : undefined
  });

  if (!response.ok) {
    throw new Error(`Checkr request failed with ${response.status}: ${await response.text()}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function removeUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}
