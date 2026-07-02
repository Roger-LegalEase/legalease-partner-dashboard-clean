export type RawProfileResult = { ok: true; value: unknown } | { ok: false; error: string };

export type ProfileFetchOptions = {
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

const DEFAULT_PROFILE_FETCH_TIMEOUT_MS = 10_000;
const PROFILE_LOAD_ERROR = "We could not load this state's questions. Please try again.";

export async function fetchJsonWithTimeout(
  url: string,
  options: ProfileFetchOptions = {}
): Promise<RawProfileResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROFILE_FETCH_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const nativeTimeoutSignal = supportsNativeAbortSignalTimeout() && !isMobileWebKit()
    ? AbortSignal.timeout(timeoutMs)
    : null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const abortFromNativeTimeout = () => controller.abort();

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const timeoutTask = new Promise<RawProfileResult>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, error: PROFILE_LOAD_ERROR });
    }, timeoutMs);
  });

  nativeTimeoutSignal?.addEventListener("abort", abortFromNativeTimeout, { once: true });

  const fetchTask = (async (): Promise<RawProfileResult> => {
    try {
      const response = await fetcher(url, {
        headers: { accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) {
        return { ok: false, error: `Profile request failed (${response.status}).` };
      }
      return { ok: true, value: (await response.json()) as unknown };
    } catch {
      return { ok: false, error: PROFILE_LOAD_ERROR };
    }
  })();

  try {
    return await Promise.race([fetchTask, timeoutTask]);
  } finally {
    nativeTimeoutSignal?.removeEventListener("abort", abortFromNativeTimeout);
    clearTimer();
  }
}

export function supportsNativeAbortSignalTimeout() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";
}

function isMobileWebKit() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return /\b(iPad|iPhone|iPod)\b/i.test(userAgent) || (/\bSafari\b/i.test(userAgent) && /\bMobile\b/i.test(userAgent));
}
