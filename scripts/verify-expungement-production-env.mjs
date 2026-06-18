const isProduction = process.env.NODE_ENV === "production";
const failures = [];
const warnings = [];

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function requireEnv(name, description) {
  const ok = present(name);
  printStatus(name, ok, description);
  if (!ok) failures.push(`${name} is missing.`);
}

function optionalEnv(name, description) {
  printStatus(name, present(name), description, "optional");
}

function warnOrFail(condition, message) {
  if (condition) return;
  if (isProduction) failures.push(message);
  else warnings.push(message);
}

function printStatus(name, ok, description, mode = "required") {
  const label = ok ? "present" : "missing";
  console.log(`${name}: ${label} (${mode}; ${description})`);
}

console.log("Expungement.ai production env audit");
console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "unset"}`);
console.log("Secret values are never printed.");

requireEnv("NEXT_PUBLIC_APP_URL", "consumer app base URL");
optionalEnv("NEXT_PUBLIC_EXPUNGEMENT_AI_URL", "separate Expungement.ai public URL, if used");

requireEnv("NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL");
requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "browser-safe Supabase anon key");
optionalEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only Supabase service role key; must never be exposed client-side");
warnOrFail(
  !present("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"),
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must not be configured; service role keys are server-only."
);

requireEnv("STRIPE_SECRET_KEY", "server-side Stripe Checkout key");
requireEnv("STRIPE_WEBHOOK_SECRET", "Stripe webhook signature secret");
optionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "only required if client-side Stripe.js checkout is introduced");
console.log("CONSUMER_PACKET_PRICE_CENTS: present (code constant; 5000 cents)");

optionalEnv("WILMA_PROVIDER_API_KEY", "required only when replacing placeholder Wilma provider behavior with a live provider");
optionalEnv("WILMA_KILL_SWITCH_ENABLED", "Wilma kill-switch flag/config");
optionalEnv("WILMA_SYSTEM_PROMPT_VERSION", "system prompt version identifier");
warnOrFail(
  present("WILMA_KILL_SWITCH_ENABLED") || present("WILMA_SYSTEM_PROMPT_VERSION"),
  "Wilma kill-switch config and system prompt version must be reviewed before production launch."
);

optionalEnv("EXPUNGEMENT_PACKET_ARTIFACT_BUCKET", "packet artifact bucket/config, if external storage is introduced");

if (failures.length) {
  if (isProduction) {
    console.error("Expungement.ai production env audit failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.warn("Expungement.ai production env audit warnings for local/dev mode:");
  for (const failure of failures) console.warn(`- ${failure}`);
}

if (warnings.length) {
  console.warn("Expungement.ai production env audit warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(isProduction
  ? "Expungement.ai production env audit passed."
  : "Expungement.ai production env audit completed in local/dev warning mode.");
