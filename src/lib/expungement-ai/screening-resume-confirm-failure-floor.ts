export const resumeConfirmFailureFloorMs = 100;

type Wait = (milliseconds: number) => Promise<void>;

const wait: Wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function waitForResumeConfirmFailureFloor(
  startedAt: number,
  now = Date.now,
  waitFor = wait
) {
  const remainingMs = resumeConfirmFailureFloorMs - (now() - startedAt);
  if (remainingMs > 0) {
    await waitFor(remainingMs);
  }
}
