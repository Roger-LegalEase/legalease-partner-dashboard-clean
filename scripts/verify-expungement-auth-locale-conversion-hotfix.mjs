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

const landingInteractions = read("src/app/expungement-ai/ExpungementLandingInteractions.tsx");
const landingHandoff = read("src/app/expungement-ai/ExpungementLandingHandoff.tsx");
const landingLocaleController = read("src/app/expungement-ai/landing-locale-controller.ts");
const landingHandoffUtils = read("src/app/expungement-ai/landing-handoff-utils.ts");
const localizationProvider = read("src/components/expungement-ai/LocalizationProvider.tsx");
const consumerSignInForm = read("src/components/expungement-ai/ConsumerSignInForm.tsx");
const signInPage = read("src/app/expungement-ai/sign-in/page.tsx");
const consumerNav = read("src/components/expungement-ai/ConsumerNav.tsx");
const authHelper = read("src/lib/expungement-ai/auth.ts");
const payPage = read("src/app/expungement-ai/pay/page.tsx");
const packetReadyPage = read("src/app/expungement-ai/packet-ready/page.tsx");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const localization = read("src/lib/expungement-ai/localization.ts");

// Landing locale: copy and active toggle must be applied by the same locale value.
includes(landingInteractions, "applyExpungementLocale", "landing uses shared locale controller");
includes(landingLocaleController, "export function applyExpungementLocale", "landing controlled language function");
includes(landingLocaleController, 'const dictionary = normalizedLocale === "es" ? options.dictionaries.es : options.dictionaries.en', "landing visible-copy locale source");
includes(landingLocaleController, 'document.querySelectorAll<HTMLElement>("[data-i18n]")', "landing text translation");
includes(landingLocaleController, 'document.querySelectorAll<HTMLElement>("[data-i18n-html]")', "landing HTML translation");
includes(landingInteractions, 'document.querySelectorAll<HTMLButtonElement>("[data-lang]")', "landing toggle state update");
includes(landingLocaleController, 'button.getAttribute("data-lang") === normalizedLocale', "landing active state derives from same locale");
includes(landingLocaleController, 'button.classList.toggle("on", active)', "landing visual active class update");
includes(landingLocaleController, 'button.setAttribute("aria-pressed", String(active))', "landing accessible active state update");
includes(landingInteractions, "applyLanguage(readSavedExpungementLocale()", "landing initial locale applies copy and active state together");
includes(landingLocaleController, "persistExpungementLocaleValue(normalizedLocale)", "landing click persists explicit locale");
includes(landingInteractions, "window.addEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onSharedLanguageChange)", "landing listens to shared locale event");
assert(!/applyLanguage\(initialLanguage,\s*\{\s*persist:\s*true\s*\}/.test(landingInteractions), "Landing initial load must not rebroadcast stale locale and desync React surfaces.");
includes(landingLocaleController, 'window.localStorage.setItem(EXPUNGEMENT_LOCALE_STORAGE_KEY, nextLocale)', "shared locale explicit persistence");
assert(!landingLocaleController.includes("removeItem(EXPUNGEMENT_LOCALE_STORAGE_KEY"), "English must be persisted explicitly, not represented by clearing storage.");

// Landing dictionaries must contain the actual visible Spanish and English hero copy that Roger saw.
includes(landingHandoffUtils, "Find out if your record can be cleared", "landing English hero copy");
includes(landingHandoffUtils, "Check my record free", "landing English CTA copy");

// Account gate: conversion intent defaults to create-account; header sign-in remains sign-in.
includes(consumerSignInForm, 'type AuthMode = "create" | "signin"', "account gate two-state mode");
includes(consumerSignInForm, 'params.get("mode") === "create"', "explicit create mode");
includes(consumerSignInForm, 'params.get("mode") === "signin"', "explicit sign-in mode");
includes(consumerSignInForm, 'isConversionNextPath(next) ? "create" : "signin"', "conversion default create mode");
includes(consumerSignInForm, 'next.startsWith("/expungement-ai/pay")', "pay conversion path");
includes(consumerSignInForm, 'next.startsWith("/expungement-ai/packet-ready")', "packet-ready conversion path");
includes(consumerSignInForm, 'next.startsWith("/briefcase")', "briefcase conversion path");
includes(consumerSignInForm, "supabase.auth.signUp", "create-account uses Supabase signUp");
includes(consumerSignInForm, "supabase.auth.signInWithPassword", "returning-user sign-in remains");
includes(consumerSignInForm, "safeAppRedirectPath", "account gate preserves safe next");
includes(consumerSignInForm, "Check your email to finish creating your account.", "email confirmation copy");
includes(consumerSignInForm, "Create account and continue", "create primary CTA");
includes(consumerSignInForm, "Already have an account? Sign in", "create secondary switch");
includes(consumerSignInForm, "New here? Create account", "sign-in secondary switch");
assert(!consumerSignInForm.includes("stripe"), "Consumer sign-in form must not call Stripe.");
assert(!signInPage.includes("Sign in to continue") || signInPage.includes("<ConsumerSignInForm />"), "Server sign-in page must not hardcode a stale title outside mode state.");

includes(consumerNav, 'href="/expungement-ai/sign-in?mode=signin"', "header sign-in explicit sign-in mode");
includes(landingHandoffUtils, 'href="/expungement-ai/sign-in?mode=signin"', "landing nav sign-in explicit sign-in mode");
includes(authHelper, 'redirect(`/expungement-ai/sign-in?mode=create&next=${encodeURIComponent(next)}`)', "auth helper create-account redirect");
includes(payPage, 'requireConsumerBriefcaseSession(`/expungement-ai/pay${queryString(params)}`)', "pay page preserves next");
includes(packetReadyPage, 'requireConsumerBriefcaseSession(`/expungement-ai/packet-ready${queryString(params)}`)', "packet-ready page preserves next");
includes(screeningFlow, 'mode: "create"', "screening save-result conversion handoff");
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
