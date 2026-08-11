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
 *     partial public launch `all51LaunchRule` forbids.
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

export type ConsumerDeliveryAccess = {
  allowed: boolean;
  state: ConsumerDeliveryRouteState;
  reason: string;
};

/**
 * Local rather than imported from the Stripe module, which owns the repository's
 * other copy of this check. Reaching into that module would make the delivery
 * control depend on the payment SDK loading, which is the wrong direction for a
 * gate whose whole job is to answer even when other things are broken.
 */
function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/** Unrecognised, absent, or wrongly-cased values all resolve to `disabled`. */
export function resolveConsumerDeliveryRouteState(): ConsumerDeliveryRouteState {
  const raw = (process.env[ROUTE_STATE_ENV] ?? "").trim().toLowerCase();
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
    if (isProductionRuntime()) {
      return {
        allowed: false,
        state,
        reason: "A scoped staging state is refused in a production runtime; that would be a partial public launch."
      };
    }

    const scope = stagingScope();
    if (scope.length === 0) {
      return {
        allowed: false,
        state,
        reason: `${STAGING_SCOPE_ENV} names no test context, so the scoped state authorizes nobody.`
      };
    }
    if (!subjectId || !scope.includes(subjectId)) {
      return {
        allowed: false,
        state,
        reason: "The caller is outside the configured staging test scope."
      };
    }

    return { allowed: true, state, reason: "The caller is inside the configured staging test scope." };
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
  partialStateRolloutAllowed: all51LaunchRule.partialStateRolloutAllowed
} as const;
