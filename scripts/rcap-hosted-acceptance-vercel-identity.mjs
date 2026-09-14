#!/usr/bin/env node

export const HOSTED_VERCEL_TEAM_SLUG = "roger947s-projects";
export const HOSTED_VERCEL_TEAM_ID = "team_4qLmZK9WI6xIy5vjYC0IF3ae";
export const HOSTED_VERCEL_PROJECT_ID = "prj_cdgwGzFqIHgEUlzEburSLaZETdQV";
export const HOSTED_VERCEL_PROJECT_NAME = "legalease-partner-dashboard-clean";

export function expectedHostedReturnOrigin(applicationSha) {
  if (!/^[0-9a-f]{40}$/.test(applicationSha ?? "")) {
    throw new Error("one exact lowercase 40-character application SHA is required for the hosted return origin");
  }
  // A SHA-scoped Preview alias is known before `next build`, so Checkout
  // return URLs can be baked into one exact deployment without naming
  // Production or a mutable shared alias.
  return `https://legalease-rcap-${applicationSha.slice(0, 12)}-${HOSTED_VERCEL_TEAM_SLUG}.vercel.app`;
}

const TEAM_ID = /^team_[A-Za-z0-9_]+$/;
const PROJECT_ID = /^prj_[A-Za-z0-9_]+$/;

async function getJson(url, { token, fetchImpl }) {
  let response, text;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(15000)
    });
    text = await response.text();
  } catch {
    throw new Error("Vercel identity read failed or timed out");
  }
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced in the error below */ }
  if (!response.ok) {
    throw new Error(`Vercel identity lookup returned HTTP ${response.status}`);
  }
  if (json === null) throw new Error("Vercel identity lookup returned non-JSON data");
  return json;
}

export function hostedVercelScopedUrl(pathname, identity) {
  if (!identity || !TEAM_ID.test(identity.teamId ?? "")) {
    throw new Error("a resolved Vercel team_ id is required");
  }
  const joiner = pathname.includes("?") ? "&" : "?";
  return `https://api.vercel.com${pathname}${joiner}teamId=${encodeURIComponent(identity.teamId)}`;
}

export function hostedVercelCliEnvironment(identity) {
  if (!identity || !TEAM_ID.test(identity.teamId ?? "") || !PROJECT_ID.test(identity.projectId ?? "")) {
    throw new Error("resolved Vercel team_ and prj_ ids are required for the CLI environment");
  }
  return {
    VERCEL_ORG_ID: identity.teamId,
    VERCEL_PROJECT_ID: identity.projectId
  };
}

export async function resolveHostedVercelIdentity({
  token = process.env.VERCEL_TOKEN ?? "",
  fetchImpl = globalThis.fetch
} = {}) {
  if (!token) throw new Error("VERCEL_TOKEN is required to resolve the pinned nonproduction project");
  if (typeof fetchImpl !== "function") throw new Error("a fetch implementation is required");

  // Pin the canonical identity: scoped PATs need not enumerate account teams.
  const projectUrl = hostedVercelScopedUrl(
    `/v9/projects/${encodeURIComponent(HOSTED_VERCEL_PROJECT_NAME)}`,
    { teamId: HOSTED_VERCEL_TEAM_ID }
  );
  const project = await getJson(projectUrl, { token, fetchImpl });
  const refuse = code => { const error = new Error(code); error.code = code; throw error; };
  if (project?.name !== HOSTED_VERCEL_PROJECT_NAME) refuse("PINNED_PROJECT_NAME_MISMATCH");
  if (project.id !== HOSTED_VERCEL_PROJECT_ID) refuse("PINNED_PROJECT_ID_MISMATCH");
  // Require affirmative ownership evidence and reject conflicting owner fields.
  const owners = [project.accountId, project.teamId, project.ownerId].filter(value => value !== undefined);
  if (owners.length === 0 || owners.some(value => value !== HOSTED_VERCEL_TEAM_ID)) {
    refuse("PINNED_PROJECT_TEAM_MISMATCH");
  }

  return Object.freeze({
    teamSlug: HOSTED_VERCEL_TEAM_SLUG,
    teamId: HOSTED_VERCEL_TEAM_ID,
    projectName: HOSTED_VERCEL_PROJECT_NAME,
    projectId: project.id
  });
}
