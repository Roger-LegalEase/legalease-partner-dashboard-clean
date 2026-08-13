import "server-only";

import { all51LaunchRule } from "@/lib/rcap/state-promotion-rules";

/**
 * The server-side control that keeps the consumer render path closed.
 *
 * This exists for one specific window: the migration sequence 49 → 53 has to be
 * applied to an environment before the route that depends on it can work, and
 * between those two moments the route must refuse rather than half-work. It is
 * also the thing that lets staging exercise the path with a named test user
 * while production stays dark.
 *
 * Three deliberate choices:
 *
 *   * It is read from the environment, server-side, and is never exposed under
 *     a NEXT_PUBLIC_ name. A browser cannot see it, let alone set it.
 *   * Anything it does not recognise means `disabled`. A typo in a deploy
 *     variable must not read as "on" — the failure mode of a misread payment
 *     control is delivering paid work for free, or delivering it to the wrong
 *     person.
 *   * `staging_scoped` is refused outright in a production runtime. A scope list
 *     is a staging affordance; honouring it in production would be exactly the
 *     partial public launch `all51LaunchRule` forbids. Which runtime is which is
 *     decided by `resolveDeploymentEnvironment` below, from the server-side
 *     Vercel variables rather than from NODE_ENV — see that function for why
 *     NODE_ENV could not answer this question at all.
 *
 * It is not a second launch-control system. Per-state promotion still belongs to
 * the state-promotion manifest, and the single nationwide flip still belongs to
 * `all51LaunchRule` — this control cannot enable one state, only the whole
 * consumer render path, and only where that rule already permits it.
 */

export type ConsumerDeliveryRouteState = "disabled" | "staging_scoped" | "live";

const ROUTE_STATE_ENV = "RCAP_CONSUMER_DELIVERY_ROUTE_STATE";
const STAGING_SCOPE_ENV = "RCAP_CONSUMER_DELIVERY_STAGING_SCOPE";

const KNOWN_STATES = new Set<ConsumerDeliveryRouteState>(["disabled", "staging_scoped", "live"]);

/**
 * How this runtime is classified for the purpose of the production refusal.
 * `unknown` is not a gap in the enum — it is the fail-closed verdict, and it is
 * treated exactly as strictly as `production`.
 */
export type DeploymentEnvironment = "production" | "preview" | "development" | "unknown";

const TARGET_ENV_VAR = "VERCEL_TARGET_ENV";
const VERCEL_ENV_VAR = "VERCEL_ENV";
const KNOWN_ENVIRONMENTS = new Set(["production", "preview", "development"]);

/**
 * Read through a computed key, never as a literal `process.env.VERCEL_ENV`.
 *
 * This is the whole reason the previous classifier could not work. Next.js
 * substitutes statically-written `process.env.X` references at BUILD time, and
 * `NODE_ENV` in particular compiles to a literal — a production build's chunk
 * read `"production"===process.env.VERCEL_ENV||1`, so the production branch was
 * unconditionally true on every deployment, Preview included. A computed lookup
 * cannot be substituted, so these are genuine runtime reads of the values Vercel
 * sets on the running instance.
 */
function readEnv(name: string): string {
  // Trimmed but NOT case-folded. Surrounding whitespace is a paste artifact and
  // carries no meaning; a different case is a different value, and Vercel emits
  // these lowercase. Accepting "Production" would mean accepting a value this
  // control cannot be sure came from Vercel at all.
  return (process.env[name] ?? "").trim();
}

/**
 * Which Vercel environment this server is running in.
 *
 * Server-side only. Neither variable is exposed under a NEXT_PUBLIC_ name, so a
 * browser can neither read nor set the classification: a request header, query
 * parameter or body field has no path into this function at all. The only
 * inputs are the two process variables Vercel populates on the instance.
 *
 * The rules, in the order they bite:
 *
 *   * Neither variable present — this is not a Vercel deployment. Classify by
 *     NODE_ENV, which is what the repository's own ephemeral harnesses drive,
 *     and which still resolves a locally-built production server to
 *     `production`. That preserves the existing local test behaviour without
 *     weakening the production rule: a real Vercel production deployment always
 *     sets VERCEL_ENV, so this branch cannot be how production is reached.
 *   * Either variable carries a value outside the three known environments —
 *     including a Vercel custom environment name — the value is UNSUPPORTED and
 *     the answer is `unknown`.
 *   * Both present and disagreeing — CONTRADICTORY, and the answer is
 *     `unknown`. Guessing which of two disagreeing sources to believe is
 *     exactly the kind of inference a payment control must not make.
 *   * Otherwise the declared environment, preferring VERCEL_TARGET_ENV.
 *
 * Deliberately local rather than shared with the Stripe module's own
 * production check. That one still keys on NODE_ENV and is right to: it decides
 * whether a dry-run checkout may execute, where a locally-built production
 * server should be refused too. This one answers a different question — which
 * Vercel environment is serving — and a build-time constant cannot answer it.
 */
export function resolveDeploymentEnvironment(): DeploymentEnvironment {
  const target = readEnv(TARGET_ENV_VAR);
  const vercel = readEnv(VERCEL_ENV_VAR);
  const declared = [target, vercel].filter(Boolean);

  if (declared.length === 0) {
    return process.env.NODE_ENV === "production" ? "production" : "development";
  }
  if (declared.some((value) => !KNOWN_ENVIRONMENTS.has(value))) return "unknown";
  if (target && vercel && target !== vercel) return "unknown";

  return (target || vercel) as DeploymentEnvironment;
}

export type ConsumerDeliveryAccess = {
  allowed: boolean;
  state: ConsumerDeliveryRouteState;
  reason: string;
  /** Present whenever the classification took part in the decision. */
  environment?: DeploymentEnvironment;
};

/**
 * Unrecognised, absent, or wrongly-cased values all resolve to `disabled`.
 *
 * This previously lower-cased before matching, which meant `Staging_Scoped` and
 * `STAGING_SCOPED` both opened the route — the opposite of what this comment
 * has always promised. Every value set anywhere in the repository, the F1
 * workflow and the hosted matrix is already exact lowercase, so requiring an
 * exact match costs nothing and closes the gap between the contract and the
 * code. A payment control should be the last place where a near-miss is read
 * generously.
 */
export function resolveConsumerDeliveryRouteState(): ConsumerDeliveryRouteState {
  const raw = (process.env[ROUTE_STATE_ENV] ?? "").trim();
  if (!KNOWN_STATES.has(raw as ConsumerDeliveryRouteState)) return "disabled";
  return raw as ConsumerDeliveryRouteState;
}

function stagingScope(): string[] {
  return (process.env[STAGING_SCOPE_ENV] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * @param subjectId the session-derived identifier for the caller. It must come
 *   from a server-verified session — passing a request-supplied value here would
 *   turn the staging scope into an open door.
 */
export function resolveConsumerDeliveryAccess({ subjectId }: { subjectId: string | null }): ConsumerDeliveryAccess {
  const state = resolveConsumerDeliveryRouteState();

  if (state === "disabled") {
    return {
      allowed: false,
      state,
      reason: `${ROUTE_STATE_ENV} is not enabling the consumer render path.`
    };
  }

  if (state === "staging_scoped") {
    const environment = resolveDeploymentEnvironment();

    // The production refusal admits nobody. It is checked before the scope list
    // is even read, so a named test identity cannot reach the scope comparison
    // in production — being on the list is not a bypass, because the list is
    // never consulted.
    if (environment === "production") {
      return {
        allowed: false,
        state,
        environment,
        reason: "A scoped staging state is refused in a production runtime; that would be a partial public launch."
      };
    }

    // Missing, malformed, contradictory or unsupported: refuse on exactly the
    // same terms as production. An environment this control cannot identify is
    // not a staging environment by default.
    if (environment === "unknown") {
      return {
        allowed: false,
        state,
        environment,
        reason: "The deployment environment could not be identified from the server-side Vercel variables, so the scoped state fails closed."
      };
    }

    const scope = stagingScope();
    if (scope.length === 0) {
      return {
        allowed: false,
        state,
        environment,
        reason: `${STAGING_SCOPE_ENV} names no test context, so the scoped state authorizes nobody.`
      };
    }
    if (!subjectId || !scope.includes(subjectId)) {
      return {
        allowed: false,
        state,
        environment,
        reason: "The caller is outside the configured staging test scope."
      };
    }

    return { allowed: true, state, environment, reason: "The caller is inside the configured staging test scope." };
  }

  // `live` is the one nationwide flip. It carries no per-jurisdiction argument
  // on purpose: there is no way to spell "enable this for one state" here, so
  // this control cannot become the mechanism for a partial rollout.
  if (all51LaunchRule.partialStateRolloutAllowed) {
    return {
      allowed: false,
      state,
      reason: "The all-51 launch rule no longer forbids partial rollout; refusing until that is reconciled."
    };
  }

  return { allowed: true, state, reason: "The consumer render path is live nationwide." };
}

export const consumerDeliveryControlContract = {
  routeStateEnvVar: ROUTE_STATE_ENV,
  stagingScopeEnvVar: STAGING_SCOPE_ENV,
  defaultState: "disabled" as const,
  browserReadable: false,
  distinguishesProduction: true,
  // Named so a verifier can assert WHICH signal classifies the deployment, not
  // merely that some check exists. NODE_ENV is deliberately absent: it is a
  // build-time constant on every Vercel deployment and cannot tell Preview from
  // Production.
  environmentClassifierEnvVars: [TARGET_ENV_VAR, VERCEL_ENV_VAR] as const,
  browserSuppliedEnvironmentAccepted: false,
  unidentifiedEnvironmentFailsClosed: true,
  partialStateRolloutAllowed: all51LaunchRule.partialStateRolloutAllowed
} as const;
