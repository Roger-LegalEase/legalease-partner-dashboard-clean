#!/usr/bin/env node
/**
 * What the server must still be holding after each section is saved.
 *
 * "The missing count went down" is a weak invariant. It passes while a value
 * silently fails to persist, while an unrelated fact quietly falls out of
 * resolution, and while the participant's earlier work is overwritten by a
 * later save — as long as the net number improves. It is also wrong in the
 * other direction: answering a gate question legitimately ADDS work, because
 * the dependants it controls only become relevant once the gate is answered.
 * A monotonic rule forces that correct behaviour to look like a failure.
 *
 * So the rule is about identity, not arithmetic:
 *
 *   - every value the participant just submitted is resolved afterwards;
 *   - every fact that was already resolved stays resolved, unless the
 *     participant changed the fact that supported it;
 *   - the missing set may grow ONLY by conditional dependants that the
 *     just-submitted answer activated, and by nothing else;
 *   - the journey may not arrive at Review with any fact the packet needs
 *     still unresolved.
 *
 * Every refusal names the exact fact ids, because "readback failed" tells
 * nobody what broke.
 */

/**
 * @param {object} input
 * @param {(factId: string) => string[]} input.conditionalDependents
 *   Facts that become relevant once `factId` is answered. Supplied by the
 *   route's own collection resolver, never guessed from the screen: the
 *   allowance for new work has to come from the same authority that decides
 *   what is conditional, or it is not an allowance, it is a loophole.
 * @param {(factId: string) => string[]} [input.supportingFacts]
 *   Facts whose value a resolved fact was derived from. Changing one of these
 *   is the only innocent reason a previously resolved fact may go missing.
 */
export function createPacketReadbackInvariant({ conditionalDependents, supportingFacts = () => [] }) {
  /** Missing set as of the last accepted readback. null before the first. */
  let previousMissing = null;
  /** Every fact id the participant has submitted a value for, ever. */
  const submittedEver = new Map();
  const steps = [];
  const failures = [];

  return {
    /**
     * Record one save and its server readback.
     *
     * @param {object} step
     * @param {Record<string, unknown>} step.submitted Values sent by this save.
     * @param {string[]} step.missingInputIds The server's own recomputed list.
     * @param {string} [step.label] The section, for the failure message.
     */
    record({ submitted, missingInputIds, label = "a section" }) {
      const missing = new Set(missingInputIds ?? []);
      const submittedIds = Object.keys(submitted ?? {}).filter((id) => {
        const value = submitted[id];
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        return String(value).trim() !== "";
      });

      // 1. Every value just submitted must have persisted. A fact the
      //    participant just answered that the server still calls missing did
      //    not survive the round trip.
      const lost = submittedIds.filter((id) => missing.has(id));
      if (lost.length > 0) {
        failures.push(`${label}: the server still reports ${lost.length} just-answered fact(s) as missing, so the answer did not persist: ${lost.sort().join(", ")}`);
      }

      // 2. Nothing answered earlier may quietly disappear.
      const reappeared = [...submittedEver.keys()].filter((id) => missing.has(id) && !submittedIds.includes(id));
      if (reappeared.length > 0) {
        failures.push(`${label}: ${reappeared.length} previously saved answer(s) disappeared and are being asked for again: ${reappeared.sort().join(", ")}`);
      }

      if (previousMissing) {
        // 3. The missing set may only grow for a reason this save supplies.
        //    There are exactly two innocent reasons, and anything else is the
        //    shape a regression takes:
        //
        //      - the answer just given activated a conditional dependant, so
        //        the new work is work the participant's own answer created;
        //      - the participant changed a fact that a resolved fact rested
        //        on, so the thing derived from it has to be asked again.
        //
        //    A fact that was resolved and is now missing with neither reason
        //    behind it was lost, however tidy the totals look.
        const activated = new Set(submittedIds.flatMap((id) => conditionalDependents(id) ?? []));
        const supportChanged = (id) => (supportingFacts(id) ?? []).some((support) => submittedIds.includes(support));
        const unexplained = [...missing].filter((id) =>
          !previousMissing.has(id) && !activated.has(id) && !supportChanged(id));
        if (unexplained.length > 0) {
          failures.push(`${label}: ${unexplained.length} fact(s) became required and nothing in this save explains them, so they were resolved and are missing again: ${unexplained.sort().join(", ")}`);
        }
      }

      for (const id of submittedIds) submittedEver.set(id, true);
      previousMissing = missing;
      steps.push({ label, submitted: submittedIds.length, missing: missing.size, missingInputIds: [...missing].sort() });
      return { missing: missing.size };
    },

    /**
     * The journey has reached Review. Nothing the packet needs may still be
     * unresolved here: Review is where the participant is told they are ready,
     * and telling them that while a required fact is absent is the failure the
     * whole pre-payment boundary exists to prevent.
     */
    atReview() {
      if (previousMissing === null) {
        failures.push("Review was reached without a single server readback, so nothing was proven.");
      } else if (previousMissing.size > 0) {
        failures.push(`Review was reached with ${previousMissing.size} fact(s) the packet needs still unresolved: ${[...previousMissing].sort().join(", ")}`);
      }
      return this.summary();
    },

    summary() {
      return {
        savesObserved: steps.length,
        factsSubmitted: submittedEver.size,
        missingAtEnd: previousMissing ? [...previousMissing].sort() : null,
        steps,
        failures
      };
    }
  };
}
