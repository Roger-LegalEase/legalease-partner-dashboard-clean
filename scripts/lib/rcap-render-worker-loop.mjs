// Signal-aware polling loop for the containerized render worker.
//
// In a container the worker runs as PID 1, where a signal with no installed
// handler is ignored outright — so without these handlers `docker stop` (and
// every platform's SIGTERM) burns the full kill grace and ends in SIGKILL.
// With them, shutdown matches the deployment spec: the in-flight cycle always
// finishes, no new cycle starts, and the process exits cleanly. A hard kill
// remains safe (the claim lease expires and the job converges); this makes
// the graceful path the normal one instead of never happening.

/** Claim lease seconds from RCAP_WORKER_CLAIM_SECONDS; default 600. */
export function resolveClaimSeconds(env = process.env) {
  const raw = env.RCAP_WORKER_CLAIM_SECONDS;
  if (raw === undefined || raw === "") return 600;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`RCAP_WORKER_CLAIM_SECONDS must be a positive number of seconds, got "${raw}".`);
  }
  return Math.floor(value);
}

/**
 * Runs cycles until a stop signal arrives. Resolves with the signal name
 * once the in-flight cycle (if any) has finished. An idle sleep is
 * interrupted immediately by a signal.
 */
export async function runRenderWorkerLoop({
  runCycle,
  log = console.log,
  idleDelayMs = 3000,
  signals = ["SIGTERM", "SIGINT"]
}) {
  let stopSignal = null;
  let wake = () => {};
  const handlers = new Map();
  for (const signal of signals) {
    const handler = () => {
      if (stopSignal) return;
      stopSignal = signal;
      log(JSON.stringify({ event: "worker_stop_requested", signal }));
      wake();
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  try {
    while (!stopSignal) {
      const result = await runCycle();
      if (result.outcome !== "idle") log(JSON.stringify(result));
      if (stopSignal) break;
      if (result.outcome === "idle") {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, idleDelayMs);
          wake = () => {
            clearTimeout(timer);
            resolve();
          };
        });
        wake = () => {};
      }
    }
    log(JSON.stringify({ event: "worker_stopped", signal: stopSignal }));
    return stopSignal;
  } finally {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  }
}
