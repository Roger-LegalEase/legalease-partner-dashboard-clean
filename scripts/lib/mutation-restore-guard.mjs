/**
 * Makes a mutation harness restore its files even when it is killed.
 *
 * Every mutation harness in this repository edits TRACKED source in place and
 * restores it in a `finally`. That covers a thrown exception. It does not cover
 * a signal: `finally` never runs on SIGTERM or SIGINT, so a harness killed
 * mid-run — by a CI step timeout, by a developer pressing Ctrl-C, by anything
 * that reaches for the process — leaves the mutated bytes on disk.
 *
 * That is not a tidiness problem. The consumer payment harness deletes the
 * payment-authority check from the render route as one of its mutations. A run
 * killed at that moment leaves a working tree in which a paid-payment check has
 * been removed from tracked source, where the next `git add` can commit it and
 * the next test run will fail in a way that points anywhere but here. This
 * happened: a ten-minute step timeout stranded exactly that mutation, and the
 * following run reported a payment-gate failure that was really a leftover.
 *
 * Registering the restore here closes the window for every signal a process can
 * actually handle, and for the two failure modes that otherwise bypass `finally`
 * — an uncaught exception and an unhandled rejection.
 *
 * SIGKILL remains uncatchable by definition. Nothing in userspace can fix that;
 * the harnesses' own `git`-visible diff is the backstop, which is why the
 * restore is idempotent and safe to call twice.
 */

/**
 * @param {() => void} restore idempotent function returning every mutated file
 *   to its original bytes.
 * @returns {() => void} a disposer that removes the handlers, for a harness
 *   that wants to exit cleanly without them firing again.
 */
export function registerMutationRestore(restore) {
  let done = false;
  const runOnce = () => {
    if (done) return;
    done = true;
    try {
      restore();
    } catch (error) {
      // Report and keep going: a restore that throws must not mask the signal
      // or swallow the original failure.
      console.error(`mutation restore failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onSignal = (signal) => () => {
    runOnce();
    console.error(`\nmutation harness interrupted by ${signal}; files restored.`);
    // Re-raise with the conventional exit code so a supervising process still
    // sees a signal death rather than a clean exit it might mistake for a pass.
    process.exit(signal === "SIGINT" ? 130 : 143);
  };

  const handlers = [
    ["SIGINT", onSignal("SIGINT")],
    ["SIGTERM", onSignal("SIGTERM")],
    ["SIGHUP", onSignal("SIGHUP")]
  ];
  for (const [signal, handler] of handlers) process.on(signal, handler);

  const onFatal = (label) => (error) => {
    runOnce();
    console.error(`\nmutation harness ${label}: ${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  };
  const uncaught = onFatal("uncaught exception");
  const unhandled = onFatal("unhandled rejection");
  process.on("uncaughtException", uncaught);
  process.on("unhandledRejection", unhandled);

  // `exit` cannot do async work, but the restores here are synchronous writes.
  const onExit = () => runOnce();
  process.on("exit", onExit);

  return () => {
    for (const [signal, handler] of handlers) process.off(signal, handler);
    process.off("uncaughtException", uncaught);
    process.off("unhandledRejection", unhandled);
    process.off("exit", onExit);
  };
}
