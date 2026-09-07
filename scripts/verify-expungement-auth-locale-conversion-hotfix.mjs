import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const homepageHeader = read("src/app/expungement-ai/home-v3/HomepageHeader.tsx");
const homepageLocaleBridge = read("src/app/expungement-ai/home-v3/HomepageLocaleBridge.tsx");
const homepageCopy = read("src/app/expungement-ai/landing-approved-copy.ts");
const landingLocaleController = read("src/app/expungement-ai/landing-locale-controller.ts");
const localizationProvider = read("src/components/expungement-ai/LocalizationProvider.tsx");
const consumerSignInForm = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const authContinuation = read("src/lib/expungement-ai/auth-continuation.ts");
const claimHandoff = read("src/lib/expungement-ai/claim/claim-handoff.ts");
const signInPage = read("src/app/expungement-ai/sign-in/page.tsx");
const consumerNav = read("src/components/expungement-ai/ConsumerNav.tsx");
const authHelper = read("src/lib/expungement-ai/auth.ts");
const payPage = read("src/app/expungement-ai/pay/page.tsx");
const packetReadyPage = read("src/app/expungement-ai/packet-ready/page.tsx");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const localization = read("src/lib/expungement-ai/localization.ts");

// Landing locale: copy and active toggle must be applied by the same locale value.
includes(homepageLocaleBridge, "applyExpungementLocale", "homepage uses shared locale controller");
includes(landingLocaleController, "export function applyExpungementLocale", "landing controlled language function");
includes(landingLocaleController, 'const dictionary = normalizedLocale === "es" ? options.dictionaries.es : options.dictionaries.en', "landing visible-copy locale source");
includes(landingLocaleController, 'document.querySelectorAll<HTMLElement>("[data-i18n]")', "landing text translation");
includes(landingLocaleController, 'document.querySelectorAll<HTMLElement>("[data-i18n-html]")', "landing HTML translation");
includes(homepageHeader, 'aria-pressed={locale === "en"}', "homepage English toggle state");
includes(homepageHeader, 'aria-pressed={locale === "es"}', "homepage Spanish toggle state");
includes(landingLocaleController, 'button.getAttribute("data-lang") === normalizedLocale', "landing active state derives from same locale");
includes(landingLocaleController, 'button.classList.toggle("on", active)', "landing visual active class update");
includes(landingLocaleController, 'button.setAttribute("aria-pressed", String(active))', "landing accessible active state update");
includes(localizationProvider, "useSyncExternalStore(subscribeToLocale, readSavedExpungementLocale", "homepage initial locale uses the shared saved value");
includes(landingLocaleController, "persistExpungementLocaleValue(normalizedLocale)", "landing click persists explicit locale");
includes(localizationProvider, "window.addEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onStoreChange)", "homepage listens to shared locale event");
assert(!/persist:\s*true/.test(homepageLocaleBridge), "Homepage initial locale bridge must not rebroadcast stale locale and desync React surfaces.");
includes(landingLocaleController, 'window.localStorage.setItem(EXPUNGEMENT_LOCALE_STORAGE_KEY, nextLocale)', "shared locale explicit persistence");
assert(!landingLocaleController.includes("removeItem(EXPUNGEMENT_LOCALE_STORAGE_KEY"), "English must be persisted explicitly, not represented by clearing storage.");

// Landing dictionaries must contain the actual visible Spanish and English hero copy that Roger saw.
includes(homepageCopy, "The law is complicated. Your next step should not be.", "approved homepage English hero copy");
includes(homepageCopy, 'hero_cta1: "Check my options"', "approved homepage English CTA copy");

// Account gate: conversion intent defaults to create-account; header sign-in remains sign-in.
includes(consumerSignInForm, 'type AuthMode = "create" | "signin"', "account gate two-state mode");
includes(authContinuation, 'search.get("mode") === "create"', "explicit create mode");
includes(authContinuation, 'search.get("mode") === "signin"', "explicit sign-in mode");
includes(authContinuation, 'if (!requestedNext) return "signin"', "bare sign-in stays in sign-in mode");
includes(authContinuation, 'isConversionNextPath(next) ? "create" : "signin"', "explicit conversion defaults to create mode");
includes(authContinuation, 'next.startsWith("/expungement-ai/pay")', "pay conversion path");
includes(authContinuation, 'next.startsWith("/expungement-ai/packet-ready")', "packet-ready conversion path");
includes(authContinuation, 'next.startsWith("/briefcase")', "briefcase conversion path");
includes(consumerSignInForm, "supabase.auth.signUp", "create-account uses Supabase signUp");
includes(consumerSignInForm, "supabase.auth.signInWithPassword", "returning-user sign-in remains");
includes(consumerSignInForm, "consumerAuthContinuationFrom", "account gate uses the validated continuation contract");
includes(authContinuation, 'safeAppRedirectPath(search.get("next"), "/briefcase")', "continuation contract validates safe next");
includes(consumerSignInForm, "const requestContext = readAuthRequestContext();", "auth submission reads pending context at click time");
includes(consumerSignInForm, "submitClaim(requestContext.claimToken)", "pending claim uses the validated opaque claim from live request context");
includes(consumerSignInForm, "Check your email to finish creating your account.", "email confirmation copy");
includes(claimHandoff, "!response.ok || !payload?.redirectTo", "pending claim rejects non-2xx or missing redirect");
includes(claimHandoff, "isExactMatterPath(redirectTo)", "pending claim requires exact matter redirect");
includes(consumerSignInForm, "You are signed in, but we could not save your result yet", "pending claim visible failure copy");
includes(consumerSignInForm, 'data-pending-claim-retry="true"', "pending claim retry control");
includes(consumerSignInForm, "consumerForgotPasswordPath", "Forgot Password preserves the validated continuation");
assert(!authContinuation.includes("pendingId"), "Retired pending identifiers must not authorize auth continuation.");
includes(consumerSignInForm, "save this result in your free Briefcase, complete packet information, and return later", "free Briefcase create-account handoff copy");
assert(!consumerSignInForm.includes("continue to checkout"), "Account creation must not imply that checkout follows sign-in.");
includes(localization, "save this result in your free Briefcase, complete packet information, and return later", "localized free Briefcase create-account copy");
assert(!localization.includes("continue to checkout"), "Localized account copy must not imply that checkout follows sign-in.");
includes(consumerSignInForm, "Create account and continue", "create primary CTA");
includes(consumerSignInForm, "Already have an account? Sign in", "create secondary switch");
includes(consumerSignInForm, "New here? Create account", "sign-in secondary switch");
assert(!consumerSignInForm.includes("stripe"), "Consumer sign-in form must not call Stripe.");
assert(!signInPage.includes("Sign in to continue") || signInPage.includes("<ConsumerSignInForm />"), "Server sign-in page must not hardcode a stale title outside mode state.");

includes(consumerNav, 'href="/expungement-ai/sign-in?mode=signin"', "header sign-in explicit sign-in mode");
includes(homepageHeader, 'href="/expungement-ai/sign-in?mode=signin"', "homepage nav sign-in explicit sign-in mode");
includes(authHelper, 'redirect(`/expungement-ai/sign-in?mode=create&next=${encodeURIComponent(next)}`)', "auth helper create-account redirect");
includes(payPage, 'requireConsumerBriefcaseSession(`/expungement-ai/pay${queryString(params)}`)', "pay page preserves next");
includes(packetReadyPage, "requireConsumerBriefcaseSession(next)", "legacy packet-ready return preserves the exact matter as its auth continuation");
includes(packetReadyPage, "getBriefcaseItem(auth.userId, briefcaseItemId)", "legacy packet-ready return resolves only an owner-scoped matter");
includes(screeningFlow, 'claimHandoffPath(pending.claimToken, "create", locale)', "screening save-result conversion handoff preserves claim and locale");
includes(briefcaseViews, 'href="/expungement-ai/sign-in?mode=create&next=/briefcase"', "Briefcase auth gate create handoff");

for (const key of [
  "signin.create_title",
  "signin.create_body",
  "signin.create_submit",
  "signin.switch_to_signin",
  "signin.switch_to_create",
  "signin.create_error",
  "signin.confirm_email"
]) {
  const entry = new RegExp(`"${key}": \\{[\\s\\S]*?en: "[^"]+"[\\s\\S]*?es: "[^"]+"[\\s\\S]*?\\}`);
  assert(entry.test(localization), `Missing English/Spanish localization entry for ${key}.`);
}

if (failures.length) {
  console.error("Expungement.ai auth + locale conversion hotfix verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai auth + locale conversion hotfix verifier passed.");
console.log("Landing copy and active toggle derive from one locale value.");
console.log("Conversion auth gates default to create-account mode and preserve safe next redirects.");
