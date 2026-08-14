import "server-only";

/**
 * Which deployment environment this server process is running in.
 *
 * One classifier, shared, because there were two and one of them was wrong.
 * `consumer-delivery-control.ts` was corrected to read the Vercel variables;
 * `stripe/server.ts` was left keying on NODE_ENV with a comment claiming that
 * was right. It was not. On Vercel, EVERY optimized Next.js build sets
 * NODE_ENV=production — Preview included — so `VERCEL_ENV === "production" ||
 * NODE_ENV === "production"` is true on a Preview deployment, and the Stripe
 * guard refused a sandbox key with "must not use a test key in production".
 * Two copies of a rule this consequential drift; one copy cannot.
 *
 * `unknown` is not a gap in the enum. It is the fail-closed verdict, and every
 * caller is expected to treat it at least as strictly as `production`.
 */
export type DeploymentEnvironment = "production" | "preview" | "development" | "unknown";

const TARGET_ENV_VAR = "VERCEL_TARGET_ENV";
const VERCEL_ENV_VAR = "VERCEL_ENV";
const NODE_ENV_VAR = "NODE_ENV";

/** Exactly these three, exactly this spelling. */
const KNOWN_VERCEL_ENVIRONMENTS = new Set(["production", "preview", "development"]);
/** NODE_ENV values this codebase is prepared to classify. */
const KNOWN_NODE_ENVIRONMENTS = new Set(["production", "development", "test"]);

/**
 * Read through a computed key, never as a literal `process.env.VERCEL_ENV`.
 *
 * Next.js substitutes statically-written `process.env.X` at BUILD time, and
 * NODE_ENV in particular compiles to a literal — a production build's chunk
 * reads `"production"===process.env.VERCEL_ENV||1`, making the production
 * branch unconditionally true on every deployment. A computed lookup cannot be
 * substituted, so these are genuine runtime reads.
 *
 * Trimmed but NOT case-folded. Surrounding whitespace is a paste artifact and
 * carries no meaning; a different case is a different value, and Vercel emits
 * these lowercase. Accepting "Production" would mean accepting a value this
 * code cannot be sure came from Vercel at all.
 */
function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * The rules, in the order they bite:
 *
 *   * Both Vercel variables present and disagreeing — CONTRADICTORY, and the
 *     answer is `unknown`. Deliberately checked FIRST and never resolved by
 *     precedence: choosing one of two disagreeing sources is exactly the kind
 *     of inference a payment control must not make.
 *   * Either present variable outside the three known environments — including
 *     a Vercel custom environment name, a blank-after-trim value or wrong
 *     casing — UNSUPPORTED, and the answer is `unknown`.
 *   * Otherwise the declared Vercel environment.
 *   * Neither Vercel variable present — this is not a Vercel deployment.
 *     Classify from NODE_ENV, which is what local runs and the repository's own
 *     ephemeral harnesses drive. An unsupported or missing NODE_ENV is
 *     `unknown` rather than a guess.
 *
 * Nothing a browser controls reaches this function. Neither variable is exposed
 * under a NEXT_PUBLIC_ name, so a request header, query parameter or body field
 * has no path into the classification.
 */
export function resolveDeploymentEnvironment(): DeploymentEnvironment {
  const target = readEnv(TARGET_ENV_VAR);
  const vercel = readEnv(VERCEL_ENV_VAR);

  if (target && vercel && target !== vercel) return "unknown";

  const declared = [target, vercel].filter(Boolean);
  if (declared.length > 0) {
    if (declared.some((value) => !KNOWN_VERCEL_ENVIRONMENTS.has(value))) return "unknown";
    return (target || vercel) as DeploymentEnvironment;
  }

  const node = readEnv(NODE_ENV_VAR);
  if (!KNOWN_NODE_ENVIRONMENTS.has(node)) return "unknown";
  // `test` is a development-class runtime for every purpose here: it must never
  // be permitted to reach a live payment credential.
  return node === "production" ? "production" : "development";
}

/**
 * True for a real production runtime AND for a runtime that cannot be
 * identified. Callers use this to decide whether a production-only restriction
 * applies, so an unidentified environment must be treated as the strict one.
 */
export function isProductionRuntimeEnvironment(): boolean {
  const environment = resolveDeploymentEnvironment();
  return environment === "production" || environment === "unknown";
}

export const serverRuntimeEnvironmentContract = {
  classifierEnvVars: [TARGET_ENV_VAR, VERCEL_ENV_VAR] as const,
  nonVercelFallbackEnvVar: NODE_ENV_VAR,
  browserSuppliedEnvironmentAccepted: false,
  contradictionResolvedByPrecedence: false,
  unidentifiedEnvironmentFailsClosed: true
} as const;
