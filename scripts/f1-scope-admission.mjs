/*
 * Did the delivery scope ADMIT the in-scope identity, and refuse the outsider?
 *
 * Its own module so the rule can be tested without standing up a Supabase
 * stack: f1-ephemeral-staging-stack.mjs does real work at load time, so
 * importing it from a test is not available.
 *
 * requestConsumerPacketRenderInternal (src/lib/expungement-ai/consumer-render-
 * request.ts) checks the delivery scope FIRST and only then resolves the item,
 * so the status the render route returns says exactly how far a request got:
 *
 *   401 unauthenticated · 503 route_disabled        — the scope refused it
 *   404 item_not_found                              — ownership refused it
 *   403 route_not_renderable · 402 payment_required — past both
 *
 * The case this serves, route_scoped_refuses_outsiders, previously required A
 * to reach exactly 402. That asserted more than the scope: requireCurrent-
 * PacketVerification sits between admission and payment, and the staging stack
 * has never seeded a verification for A, so 402 was never reachable and the
 * case failed for a reason that had nothing to do with scoping — a payment
 * test wearing a scope test's name.
 *
 * This is not the looser rule it might look like. A must still reach a gate
 * that only an admitted, owning request can reach; a scope that refuses A
 * fails, and so does an outsider who is not refused. Seeding a current
 * verification so the strict 402 becomes reachable would prove more and is
 * worth doing; asserting it while it cannot be reached proves nothing.
 */
export function scopeAdmissionVerdict({ appUp, authStatus, anonStatus }) {
  const gate = authStatus === 402 ? "admitted by the delivery scope and stopped by the payment gate"
    : authStatus === 403 ? "admitted by the delivery scope and stopped by a downstream gate on the packet itself"
      : authStatus === 503 ? "REFUSED BY THE DELIVERY SCOPE ITSELF"
        : authStatus === 401 ? "refused as unauthenticated, so the scope was never reached"
          : authStatus === 404 ? "admitted by the scope and refused by item ownership"
            : `stopped with an unexpected status (${authStatus})`;
  return {
    passed: Boolean(appUp) && (authStatus === 402 || authStatus === 403) && anonStatus === 401,
    gate
  };
}
