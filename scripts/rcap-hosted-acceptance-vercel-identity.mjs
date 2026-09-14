#!/usr/bin/env node

export const HOSTED_VERCEL_TEAM_SLUG = "roger947s-projects";
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

  // Vercel pagination.next is the next request's until timestamp; only null
  // proves exhaustion. See https://vercel.com/docs/rest-api/reference/endpoints/teams/list-all-teams.
  const teams = [], cursors = new Set(), teamIds = new Set();
  let until = null, complete = false;
  const refuse = code => { const error = new Error(code); error.code = code; throw error; };
  for (let page = 0; page < 20; page++) {
    const url = `https://api.vercel.com/v2/teams?limit=100${until === null ? "" : `&until=${until}`}`;
    const document = await getJson(url, { token, fetchImpl });
    if (!Array.isArray(document?.teams) || document.teams.length > 100
        || !document.pagination || !Object.hasOwn(document.pagination, "next")) refuse("TEAM_PAGINATION_INVALID");
    for (const item of document.teams) {
      if (!TEAM_ID.test(item?.id ?? "") || typeof item.slug !== "string" || !item.slug) refuse("TEAM_LIST_IDENTITY_INVALID");
      if (teamIds.has(item.id)) refuse("TEAM_PAGINATION_DUPLICATE_IDENTITY");
      teamIds.add(item.id); teams.push(item);
    }
    const next = document.pagination.next;
    if (next === null) { complete = true; break; }
    if (!Number.isSafeInteger(next) || next < 0) refuse("TEAM_PAGINATION_CURSOR_INVALID");
    if (cursors.has(next) || (until !== null && next >= until)) refuse("TEAM_PAGINATION_CURSOR_LOOP");
    cursors.add(next); until = next;
  }
  if (!complete) refuse("TEAM_PAGINATION_LIMIT");
  const matchingTeams = teams.filter(candidate => candidate.slug === HOSTED_VERCEL_TEAM_SLUG);
  if (matchingTeams.length > 1) refuse("TEAM_SLUG_AMBIGUOUS");
  const team = matchingTeams[0];
  if (!team) throw new Error(`Vercel token cannot resolve pinned team slug ${HOSTED_VERCEL_TEAM_SLUG}`);
  if (!TEAM_ID.test(team.id ?? "")) throw new Error(`pinned Vercel team ${HOSTED_VERCEL_TEAM_SLUG} returned no canonical team_ id`);

  const projectUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(HOSTED_VERCEL_PROJECT_NAME)}?teamId=${encodeURIComponent(team.id)}`;
  const project = await getJson(projectUrl, { token, fetchImpl });
  if (project?.name !== HOSTED_VERCEL_PROJECT_NAME) {
    throw new Error(`Vercel project identity mismatch; expected ${HOSTED_VERCEL_PROJECT_NAME}`);
  }
  if (!PROJECT_ID.test(project.id ?? "")) {
    throw new Error(`pinned Vercel project ${HOSTED_VERCEL_PROJECT_NAME} returned no canonical prj_ id`);
  }
  const owningTeamId = project.accountId ?? project.teamId ?? project.ownerId ?? null;
  if (owningTeamId !== null && owningTeamId !== team.id) {
    throw new Error(`Vercel project ${HOSTED_VERCEL_PROJECT_NAME} does not belong to ${HOSTED_VERCEL_TEAM_SLUG}`);
  }

  return Object.freeze({
    teamSlug: HOSTED_VERCEL_TEAM_SLUG,
    teamId: team.id,
    projectName: HOSTED_VERCEL_PROJECT_NAME,
    projectId: project.id
  });
}
