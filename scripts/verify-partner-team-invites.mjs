import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function failIf(condition, message) {
  if (condition) failures.push(message);
}

function indexOfOrFail(source, needle, label) {
  const index = source.indexOf(needle);
  failIf(index === -1, `${label} missing: ${needle}`);
  return index;
}

const files = {
  page: "src/app/partner/team/page.tsx",
  form: "src/app/partner/team/PartnerTeamInviteForm.tsx",
  route: "src/app/partner/team/invite/route.ts",
  service: "src/lib/partners/partner-team.ts",
  rateLimit: "src/lib/partners/partner-team-rate-limit.ts",
  dashboard: "src/app/partner/dashboard/page.tsx",
  dashboardVerifier: "scripts/verify-partner-dashboard-rls-isolation.mjs"
};

for (const file of Object.values(files)) {
  failIf(!fs.existsSync(file), `Required file missing: ${file}`);
}

const pageSource = read(files.page);
const formSource = read(files.form);
const routeSource = read(files.route);
const serviceSource = read(files.service);
const rateLimitSource = read(files.rateLimit);
const dashboardSource = read(files.dashboard);
const dashboardVerifierSource = read(files.dashboardVerifier);

const sameOriginIndex = indexOfOrFail(routeSource, "if (!isSameOriginRequest(request))", "Same-origin gate");
const partnerAdminGateIndex = indexOfOrFail(routeSource, "const gate = await requirePartnerAdmin(requestId)", "Partner admin gate");
const bodyParseIndex = indexOfOrFail(routeSource, "body = await request.json()", "Body parse");
const rateLimitIndex = indexOfOrFail(routeSource, "await checkPartnerTeamInviteRateLimit", "Invite rate limit");
const inviteIndex = indexOfOrFail(routeSource, "await invitePartnerStaffForCurrentPartner(input)", "Constrained invite call");
failIf(!(sameOriginIndex < partnerAdminGateIndex && partnerAdminGateIndex < bodyParseIndex), "POST route must enforce same-origin and partner_admin before body parsing.");
failIf(!(bodyParseIndex < rateLimitIndex && rateLimitIndex < inviteIndex), "POST route must enforce invite rate limit before invite creation.");

failIf(!routeSource.includes('request.headers.get("origin")') || !routeSource.includes('request.headers.get("referer")') || !routeSource.includes("return false;"), "POST route must reject missing/invalid same-origin signals.");
failIf(!routeSource.includes('sessionPartner.kind !== "partner" || sessionPartner.role !== "partner_admin"'), "POST route must require a partner_admin session.");
failIf(!routeSource.includes("resolveSessionPartner()"), "POST route must derive identity from resolveSessionPartner().");
failIf(!routeSource.includes("const input = body && typeof body === \"object\" ? (body as { email?: unknown; name?: unknown }) : {}"), "POST route must read only safe invite fields from the body.");
failIf(routeSource.includes("body.partnerSlug") || routeSource.includes("body.partner_slug") || routeSource.includes("body.role"), "POST route must not read partner slug or role from the request body.");
failIf(!routeSource.includes("partnerSlug: gate.sessionPartner.partnerSlug") || !routeSource.includes('role: "partner_staff"'), "POST route must return only the session partner slug and forced partner_staff role.");
failIf(!routeSource.includes('"rate_limited"') || !routeSource.includes("Too many invite attempts. Please try again later."), "POST route must expose safe rate-limit failure output.");
for (const forbidden of ["inviteLink", "action_link", "access_token", "refresh_token", "document.cookie", "headers.entries", "Object.fromEntries(request.headers", "stack"]) {
  failIf(routeSource.includes(forbidden), `POST route must not return or expose sensitive marker: ${forbidden}`);
}

failIf(!serviceSource.includes("export type PartnerStaffInviteInput = {\n  email?: unknown;\n  name?: unknown;\n};"), "Partner staff invite input must accept only email and optional name.");
const wrapperIndex = indexOfOrFail(serviceSource, "export async function invitePartnerStaffForCurrentPartner(input: PartnerStaffInviteInput)", "Constrained wrapper");
const wrapperBody = serviceSource.slice(wrapperIndex, serviceSource.indexOf("export function failureMessageForAddPartnerUser", wrapperIndex));
failIf(wrapperBody.includes("sessionPartner:") || wrapperBody.includes("partnerSlug?:") || wrapperBody.includes("role?:") || wrapperBody.includes("input.partnerSlug") || wrapperBody.includes("input.role"), "Constrained wrapper must not accept session, partnerSlug, or role as invite inputs.");
failIf(!wrapperBody.includes("const sessionPartner = await resolvePartnerAdminSession()"), "Constrained wrapper must derive the partner admin session internally.");
failIf(!wrapperBody.includes("partnerSlug: sessionPartner.partnerSlug") || !wrapperBody.includes('role: "partner_staff"'), "Constrained wrapper must derive partnerSlug from session and force partner_staff.");
failIf(!serviceSource.includes(".eq(\"partner_slug\", sessionPartner.partnerSlug)") || !serviceSource.includes("row.partner_slug !== sessionPartner.partnerSlug"), "Team list must be scoped and filtered to the resolved session partner.");
failIf(!serviceSource.includes('.in("role", ["partner_admin", "partner_staff"])'), "Team list must exclude internal_admin users.");

failIf(!rateLimitSource.includes("perPartnerHourly: 10") || !rateLimitSource.includes("perPartnerDaily: 25") || !rateLimitSource.includes("perTargetEmailDaily: 3"), "Partner invite rate-limit caps must be configured.");
failIf(!rateLimitSource.includes("createHmac") || !rateLimitSource.includes("RATE_LIMIT_HASH_SECRET") || rateLimitSource.includes("p_bucket_key: input.email"), "Invite rate limiter must hash target email buckets.");
failIf(!rateLimitSource.includes('p_scope: partnerInviteRateLimitScope') || !rateLimitSource.includes("increment_request_rate_limit_bucket"), "Invite rate limiter must use the shared rate-limit RPC.");

failIf(!pageSource.includes("resolveSessionPartner()"), "/partner/team page must derive identity from the authenticated session.");
failIf(!pageSource.includes('href: "/sign-in?next=/partner/team"'), "Unauthenticated /partner/team must redirect to sign-in with next path.");
failIf(!pageSource.includes('sessionPartner.kind === "internal_admin"') || !pageSource.includes('href: "/dashboard/partners"'), "Internal admin behavior must redirect to internal partner dashboard.");
failIf(!pageSource.includes('sessionPartner.role !== "partner_admin"'), "Partner staff and no-admin partner identities must be denied on /partner/team.");
failIf(!pageSource.includes("getPartnerTeamPageData(access.sessionPartner)") || pageSource.includes("searchParams") || pageSource.includes("params:"), "/partner/team page must not accept partner identity from route params or query.");
failIf(pageSource.includes("internal_admin users") || pageSource.includes("auth_user_id"), "/partner/team page must not render auth IDs or internal admin users.");

failIf(!formSource.includes("const payload = {\n      email:") || formSource.includes("partnerSlug: String(formData") || formSource.includes("role: String(formData"), "Client form payload must include only email/name and no slug/role selector values.");
failIf(formSource.includes('name="partnerSlug"') || formSource.includes('name="role"') || formSource.includes("<select"), "Client form must not expose partner or role selectors.");
failIf(!formSource.includes('type="email"') || !formSource.includes("maxLength={254}") || !formSource.includes("maxLength={120}"), "Client form must validate email shape and cap email/name lengths.");
failIf(!formSource.includes("isSubmittingRef.current") || !formSource.includes("safelyResetForm(form)") || !formSource.includes("return;\n      }\n\n      setState({ kind: \"error\""), "Client form must prevent double submit and preserve success state before failure handling.");
failIf(!formSource.includes("Status: Invitation created") || !formSource.includes("Ask the user to check their inbox and set their password.") || !formSource.includes("Partner staff"), "Client form must render the required safe success panel.");
for (const forbidden of ["getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "service_role", "auth.admin", "console.log", "console.warn", "console.error", "inviteLink", "access_token", "refresh_token"]) {
  failIf(formSource.includes(forbidden), `Client form includes forbidden marker: ${forbidden}`);
}

failIf(!dashboardSource.includes('dashboard.role === "partner_admin" ? <ManageTeamCard /> : null'), "Dashboard must show active manage-team link only for partner_admin users.");
failIf(!dashboardSource.includes('href="/partner/team"'), "Dashboard partner_admin link must target /partner/team.");
failIf(!dashboardVerifierSource.includes("assertPartnerTeamAccess"), "Dashboard RLS verifier must exercise partner-team access behavior.");

if (failures.length > 0) {
  console.error("Partner team invite verifier failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner team invite verifier passed.");
console.log("- Partner route derives slug from resolveSessionPartner and forces partner_staff.");
console.log("- Partner-facing wrapper accepts only email/name invite input.");
console.log("- Same-origin, partner_admin, and rate-limit gates run before invite creation.");
console.log("- Client form exposes no partner or role selector and preserves success state.");
console.log("- Team list is scoped to the resolved partner and excludes internal_admin users.");
