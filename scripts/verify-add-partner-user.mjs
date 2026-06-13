import fs from "fs";
import cp from "child_process";

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

function gitDiffNames() {
  try {
    return cp.execSync("git diff --name-only", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const routePath = "src/app/internal/partner-users/invite/route.ts";
const pagePath = "src/app/internal/partner-users/new/page.tsx";
const clientPath = "src/app/internal/partner-users/new/AddPartnerUserForm.tsx";
const servicePath = "src/lib/partners/add-partner-user.ts";
const setPasswordPath = "src/app/auth/set-password/page.tsx";
const redirectPath = "src/lib/auth/redirect.ts";
const packagePath = "package.json";

for (const file of [routePath, pagePath, clientPath, servicePath, setPasswordPath, redirectPath, packagePath]) {
  failIf(!fs.existsSync(file), `Required file missing: ${file}`);
}

const routeSource = read(routePath);
const pageSource = read(pagePath);
const clientSource = read(clientPath);
const serviceSource = read(servicePath);
const setPasswordSource = read(setPasswordPath);
const redirectSource = read(redirectPath);
const packageSource = read(packagePath);

const gateIndex = indexOfOrFail(routeSource, "await requireInternalAdminRouteAccess()", "Route gate");
const bodyParseIndex = indexOfOrFail(routeSource, "await request.json()", "Route body parse");
failIf(gateIndex > bodyParseIndex, "Route must require internal_admin before parsing the request body.");
failIf(!routeSource.includes('status: 401'), "Route must return 401 for unauthenticated access.");
failIf(!routeSource.includes('status: 403'), "Route must return 403 for non-internal-admin access.");
failIf(!routeSource.includes("SessionPartnerError"), "Route must handle session authorization failures explicitly.");
failIf(!routeSource.includes("isSameOriginRequest(request)") || !routeSource.includes('request.headers.get("origin")') || !routeSource.includes('request.headers.get("referer")'), "Route must enforce same-origin Origin/Referer protection before invite writes.");
failIf(!routeSource.includes("failureResponse") || !routeSource.includes("ok: false") || !routeSource.includes("outcome") || !routeSource.includes("message"), "Route failures must use the normalized ok/outcome/message envelope.");
failIf(!routeSource.includes("ok: true") || !routeSource.includes("email: result.email") || !routeSource.includes("partnerSlug: result.partnerSlug") || !routeSource.includes("role: result.role"), "Route success must return ok, outcome, message, email, partnerSlug, and role.");
failIf(routeSource.includes("authUserId: result.code") || routeSource.includes("authUserId: result.authUserId"), "Route must not return auth user ids in client-visible failure responses.");

const pageGateIndex = indexOfOrFail(pageSource, 'resolveInternalAdminPageAccess("/internal/partner-users/new")', "Page gate");
const partnerLoadIndex = indexOfOrFail(pageSource, "getAllPartnerRecords()", "Partner select data load");
failIf(pageGateIndex > partnerLoadIndex, "Page must run internal_admin gate before partner data access.");

failIf(!serviceSource.includes('export const addPartnerUserRoles = ["partner_admin", "partner_staff"] as const'), "Allowed roles must be partner_admin and partner_staff only.");
failIf(serviceSource.includes('"internal_admin"') || serviceSource.includes("'internal_admin'"), "Add Partner User service must not contain internal_admin as a creatable role.");
failIf(clientSource.includes("internal_admin"), "Client form must not include internal_admin role.");
failIf(!clientSource.includes('value="partner_admin"') || !clientSource.includes('value="partner_staff"'), "Client form must expose only partner_admin and partner_staff role options.");

const validateIndex = indexOfOrFail(serviceSource, "validateAddPartnerUserInput(input)", "Input validation");
const partnerExistsIndex = indexOfOrFail(serviceSource, "validatePartnerExists(supabase, validated.partnerSlug)", "Partner slug validation");
const inviteIndex = indexOfOrFail(serviceSource, "inviteOrFindAuthUser(supabase, validated.email, redirectTo, validated.name)", "Auth invite");
const insertIndex = indexOfOrFail(serviceSource, "insertPartnerUserMapping(supabase", "Mapping insert");
failIf(!(validateIndex < partnerExistsIndex && partnerExistsIndex < inviteIndex && inviteIndex < insertIndex), "Operation order must be validate input -> validate partner -> invite/find auth user -> insert mapping.");

failIf(!serviceSource.includes("emailPattern") || !serviceSource.includes("maxEmailLength"), "Service must validate and cap email addresses.");
failIf(!serviceSource.includes(".toLowerCase()"), "Service must normalize email/slug values.");
failIf(!serviceSource.includes("Choose an existing partner."), "Missing clean non-existent partner error.");
failIf(!serviceSource.includes("process.env.NEXT_PUBLIC_APP_URL") || !serviceSource.includes('url.pathname = "/auth/set-password"') || !serviceSource.includes('url.search = "?next=/partner/dashboard"'), "Invites must build redirectTo from NEXT_PUBLIC_APP_URL for the set-password page with partner dashboard next path.");
failIf(serviceSource.includes("absoluteAppUrl(") || serviceSource.includes("localAppUrl") || serviceSource.includes("localhost"), "Invite redirect must not use localhost fallback helpers.");
failIf(!serviceSource.includes("redirectTo:"), "Supabase invite must pass redirectTo.");
failIf(!serviceSource.includes("deleteUser(invited.authUser.id)"), "Mapping failure after a new invite must attempt auth user cleanup.");
failIf(!serviceSource.includes('code: "partial_state"') || !serviceSource.includes("authUserId: invited.authUser.id"), "Cleanup failure must report explicit partial state with auth user id.");
failIf(!serviceSource.includes("findAuthUserByEmail") || !serviceSource.includes('"existing_user_mapped"') || !serviceSource.includes('"already_mapped"'), "Already-existing auth users must be handled without duplicate/crash.");
failIf(!serviceSource.includes(".maybeSingle()"), "Existing mapping and partner checks should avoid raw row dumps.");
failIf(!serviceSource.includes('status: "active"') || !serviceSource.includes("invited_email"), "Mapping insert must match partner_users row shape.");

for (const forbidden of ["getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "service_role", "auth.admin", "createClient("]) {
  failIf(clientSource.includes(forbidden), `Client component includes forbidden admin/server marker: ${forbidden}`);
  failIf(setPasswordSource.includes(forbidden), `Set-password page includes forbidden admin/server marker: ${forbidden}`);
}

failIf(!setPasswordSource.includes('"use client"'), "Set-password page must be a client component.");
failIf(!setPasswordSource.includes("createBrowserSupabaseClient()"), "Set-password page must use the browser Supabase client.");
failIf(!setPasswordSource.includes("exchangeCodeForSession(code)"), "Set-password page must handle auth code invite links.");
failIf(!setPasswordSource.includes("setSession({ access_token: accessToken, refresh_token: refreshToken })"), "Set-password page must handle hash token invite links.");
failIf(!setPasswordSource.includes("updateUser({ password })"), "Set-password page must set the invited user's password.");
failIf(!setPasswordSource.includes("scrubAuthUrl"), "Set-password page must scrub auth tokens from the URL.");
failIf(setPasswordSource.includes("console.log") || setPasswordSource.includes("console.warn") || setPasswordSource.includes("console.error"), "Set-password page must not log invite links or auth tokens.");
for (const status of ['"checking"', '"no_session_found"', '"code_exchange_failed"', '"hash_session_failed"', '"update_user_failed"', '"password_validation_failed"', '"success"']) {
  failIf(!setPasswordSource.includes(status), `Set-password diagnostic status missing: ${status}`);
}
failIf(!setPasswordSource.includes("safeAuthDiagnostic") || !setPasswordSource.includes("safeDiagnosticText"), "Set-password diagnostics must be sanitized before display.");
failIf(!setPasswordSource.includes("[redacted-url]") || !setPasswordSource.includes("[redacted-url-part]") || !setPasswordSource.includes("[redacted]"), "Set-password diagnostics must redact URLs, URL parts, and token-shaped strings.");
failIf(!setPasswordSource.includes("const minimumPasswordLength = 12"), "Set-password page must require at least 12 password characters.");
failIf(!setPasswordSource.includes("validatePassword(password, confirmPassword)"), "Set-password page must validate passwords before updateUser.");
failIf(!setPasswordSource.includes("Use at least 12 characters with a letter, a number, and a symbol."), "Set-password page must show the visible password requirements helper text.");
failIf(!setPasswordSource.includes('id="password-requirements"'), "Set-password page must expose password requirements near the password fields.");
failIf(!setPasswordSource.includes("password.length < minimumPasswordLength"), "Set-password page must enforce the minimum password length locally.");
failIf(!setPasswordSource.includes("/[A-Za-z]/.test(password)") || !setPasswordSource.includes("/[0-9]/.test(password)") || !setPasswordSource.includes("/[^A-Za-z0-9]/.test(password)"), "Set-password page must require a letter, number, and symbol locally.");
failIf(!setPasswordSource.includes("Passwords must match."), "Set-password page must explain password confirmation failures.");
failIf(!setPasswordSource.includes("const weakPasswordMessage = passwordRequirementsMessage"), "Set-password page must map weak-password errors to the visible password requirement text.");
failIf(!setPasswordSource.includes("This invite link is no longer active. Please request a new invitation."), "Set-password page must show a safe missing-session error.");
failIf(!setPasswordSource.includes("This invite link is invalid or has expired. Please request a new invitation."), "Set-password page must show a safe invalid-token error.");
failIf(!setPasswordSource.includes("We could not set your password. Please try again or request a new invitation."), "Set-password page must show a safe fallback updateUser error.");
failIf(!setPasswordSource.includes("window.location.assign(safeAppRedirectPath(nextPath))"), "Set-password success must redirect to the safe next path, defaulting to /partner/dashboard.");
failIf(!setPasswordSource.includes("scrubAuthUrl(detectedNextPath)") || setPasswordSource.indexOf("scrubAuthUrl(detectedNextPath)") < setPasswordSource.indexOf("exchangeCodeForSession(code)"), "Set-password page must not scrub the URL before session exchange is attempted.");
const sessionBeforeUpdateIndex = setPasswordSource.indexOf("const { data: sessionData, error: sessionError } = await supabase.auth.getSession()");
const updateUserIndex = setPasswordSource.indexOf("updateUser({ password })");
const validationBeforeUpdateIndex = setPasswordSource.indexOf("const validationMessage = validatePassword(password, confirmPassword)");
failIf(sessionBeforeUpdateIndex === -1 || updateUserIndex === -1 || sessionBeforeUpdateIndex > updateUserIndex, "Set-password page must confirm an active session immediately before updateUser.");
failIf(validationBeforeUpdateIndex === -1 || updateUserIndex === -1 || validationBeforeUpdateIndex > updateUserIndex, "Set-password page must validate locally before updateUser.");
failIf(setPasswordSource.includes("{invalidInviteMessage}") || setPasswordSource.includes("Please use the latest invitation link"), "Set-password page must not show the old generic invite failure copy.");
for (const forbidden of ["window.location.href", "document.cookie", "localStorage", "sessionStorage"]) {
  failIf(setPasswordSource.includes(forbidden), `Set-password page must not read or log sensitive browser state: ${forbidden}`);
}
failIf(!clientSource.includes("Partner user invitation created."), "Client must show invited_and_mapped success copy.");
failIf(!clientSource.includes("That user already has the requested partner access."), "Client must show already_mapped success copy.");
failIf(!clientSource.includes("Existing user was granted partner access."), "Client must show existing user mapping success copy.");
failIf(!clientSource.includes("result.ok === true") || !clientSource.includes("isSuccessfulInviteStatus(result.outcome)"), "Client must treat HTTP 2xx plus ok:true/outcome as success.");
failIf(!clientSource.includes("isSubmittingRef.current"), "Client must prevent double submit.");
failIf(!clientSource.includes("Status: Invitation created") || !clientSource.includes("Ask the user to check their inbox and set their password."), "Client must render the normalized success panel.");
failIf(!redirectSource.includes("safeAppRedirectPath"), "Shared safe redirect helper missing.");
failIf(!redirectSource.includes("value.startsWith(\"/\")") || !redirectSource.includes("!value.startsWith(\"//\")") || !redirectSource.includes("hasUrlScheme"), "Redirect helper must allow only relative app paths.");
failIf(!redirectSource.includes("fallback = defaultPartnerAuthRedirect") || !redirectSource.includes("return fallback"), "Redirect helper must reject external next URLs to /partner/dashboard fallback.");

failIf(!routePath.startsWith("src/app/internal/"), "Write route must live under /internal so the production proxy token layer applies.");
failIf(routePath.startsWith("src/app/api/"), "Write route must not be a new public /api surface.");

const changedFiles = gitDiffNames();
const restrictedRoutes = [
  "src/app/partner/dashboard/page.tsx",
  "src/app/p/we-must-vote/page.tsx",
  "src/app/intake/we-must-vote/page.tsx",
  "src/app/request-pilot/page.tsx",
  "src/app/api/request-pilot/route.ts",
  "src/app/internal/pilot-requests/page.tsx",
  "src/app/api/internal/pilot-requests/status/route.ts",
  "src/app/dashboard/partners/page.tsx",
  "src/app/internal/partners/admin/page.tsx",
  "src/app/api/health/route.ts"
];

for (const restricted of restrictedRoutes) {
  failIf(changedFiles.includes(restricted), `Restricted route changed unexpectedly: ${restricted}`);
}

for (const file of changedFiles) {
  if (file.startsWith("supabase/")) {
    failures.push(`Supabase migration/RLS file changed unexpectedly: ${file}`);
  }
}

failIf(!packageSource.includes('"partners:verify-add-partner-user": "node scripts/verify-add-partner-user.mjs"'), "package.json script missing for add partner user verifier.");

if (failures.length > 0) {
  console.error("Add Partner User verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Add Partner User verification passed.");
console.log("- Internal route gate runs before body parsing.");
console.log("- Unauthenticated and non-internal-admin outcomes are denied.");
console.log("- internal_admin cannot be created through this flow.");
console.log("- Partner slug and email are validated server-side.");
console.log("- Existing-user and cleanup/partial-state paths are present.");
console.log("- Service-role/admin helpers are absent from the client component.");
console.log("- No Supabase migration/RLS files or restricted routes changed.");
